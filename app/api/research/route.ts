import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { runResearchAgent } from "@/lib/agent";
import { Meeting, AgentEvent, MeetingBrief } from "@/types";
import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/research?meetingId=xxx — fetch stored brief from DB instantly
export async function GET(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  const dbUserId = (session as any)?.dbUserId as string | undefined;
  if (!dbUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meetingId");
  if (!meetingId) return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });

  const row = await db.meeting.findUnique({
    where: { userId_gcalEventId: { userId: dbUserId, gcalEventId: meetingId } },
    select: { briefJson: true },
  });

  if (!row?.briefJson) return NextResponse.json({ brief: null });
  return NextResponse.json({ brief: row.briefJson as unknown as MeetingBrief });
}

export async function POST(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { meeting, refreshContext }: { meeting: Meeting; refreshContext?: string } = await req.json();
  const dbUserId = (session as any).dbUserId as string | undefined;

  // No cache — run the agent and stream + save
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const event of runResearchAgent(meeting, refreshContext)) {
          send(event);

          // When brief is ready, persist to DB
          if (event.type === "brief_done" && dbUserId) {
            await saveBriefToDB(dbUserId, meeting, event.brief).catch(console.error);
          }
        }
      } catch (err: any) {
        send({ type: "error", message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function saveBriefToDB(userId: string, meeting: Meeting, brief: MeetingBrief) {
  // Save brief JSON to meeting record
  const dbMeeting = await db.meeting.upsert({
    where: { userId_gcalEventId: { userId, gcalEventId: meeting.id } },
    create: {
      userId,
      gcalEventId: meeting.id,
      title: meeting.title,
      startAt: new Date(meeting.start),
      endAt: new Date(meeting.end),
      description: meeting.description,
      briefJson: brief as any,
    },
    update: { briefJson: brief as any },
  });

  // Save research snapshots per attendee
  for (const attendee of brief.attendees) {
    const contact = await db.contact.upsert({
      where: { userId_email: { userId, email: attendee.email } },
      create: {
        userId,
        email: attendee.email,
        name: attendee.name,
        role: attendee.role !== "Unknown" ? attendee.role : undefined,
        bio: attendee.bio,
        linkedinUrl: attendee.links?.find((l) => l.label.toLowerCase().includes("linkedin"))?.url,
        lastMetAt: new Date(meeting.start),
      },
      update: {
        name: attendee.name,
        role: attendee.role !== "Unknown" ? attendee.role : undefined,
        bio: attendee.bio,
        linkedinUrl: attendee.links?.find((l) => l.label.toLowerCase().includes("linkedin"))?.url,
        lastMetAt: new Date(meeting.start),
      },
    });

    // Save point-in-time snapshot
    await db.researchSnapshot.create({
      data: {
        contactId: contact.id,
        meetingId: dbMeeting.id,
        bio: attendee.bio,
        role: attendee.role,
        links: attendee.links as any,
        rawJson: attendee as any,
      },
    });
  }
}
