import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUpcomingMeetings } from "@/lib/calendar";
import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string;
  const dbUserId = (session as any).dbUserId as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  try {
    const meetings = await getUpcomingMeetings(accessToken);

    // Persist meetings + contacts to DB in the background
    if (dbUserId) {
      persistMeetingsAndContacts(dbUserId, meetings).catch(console.error);
    }

    return NextResponse.json({ meetings });
  } catch (err: any) {
    console.error("Calendar error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function persistMeetingsAndContacts(userId: string, meetings: any[]) {
  for (const m of meetings) {
    // Upsert meeting
    const meeting = await db.meeting.upsert({
      where: { userId_gcalEventId: { userId, gcalEventId: m.id } },
      create: {
        userId,
        gcalEventId: m.id,
        title: m.title,
        startAt: new Date(m.start),
        endAt: new Date(m.end),
        description: m.description,
        location: m.location,
      },
      update: {
        title: m.title,
        startAt: new Date(m.start),
        endAt: new Date(m.end),
        description: m.description,
        location: m.location,
      },
    });

    // Upsert each attendee as a contact + link to meeting
    for (const attendee of m.attendees) {
      const contact = await db.contact.upsert({
        where: { userId_email: { userId, email: attendee.email } },
        create: {
          userId,
          email: attendee.email,
          name: attendee.displayName ?? attendee.email.split("@")[0],
          lastMetAt: new Date(m.start),
        },
        update: {
          name: attendee.displayName ?? attendee.email.split("@")[0],
          lastMetAt: new Date(m.start),
        },
      });

      // Link contact to meeting (ignore if already exists)
      await db.meetingContact.upsert({
        where: { meetingId_contactId: { meetingId: meeting.id, contactId: contact.id } },
        create: { meetingId: meeting.id, contactId: contact.id },
        update: {},
      });
    }
  }
}
