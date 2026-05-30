import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUpcomingMeetings } from "@/lib/calendar";
import { getUserCalendarConnections, getValidAccessToken } from "@/lib/calendar-connections";
import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUserId = (session as any).dbUserId as string | undefined;
  if (!dbUserId) return NextResponse.json({ error: "No user record" }, { status: 400 });

  const connections = await getUserCalendarConnections(dbUserId);
  if (connections.length === 0) return NextResponse.json({ meetings: [], noCalendars: true });

  // ── 1. Serve from DB immediately ──────────────────────────────────────
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setMilliseconds(-1);

  const dbMeetings = await db.meeting.findMany({
    where: {
      userId: dbUserId,
      startAt: { gte: startOfToday, lte: endOfTomorrow },
    },
    include: {
      meetingContacts: {
        include: { contact: { select: { email: true, name: true } } },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const cached = dbMeetings.map(m => ({
    id: m.gcalEventId,
    title: m.title,
    start: m.startAt.toISOString(),
    end: m.endAt.toISOString(),
    description: m.description ?? undefined,
    location: m.location ?? undefined,
    hasBrief: !!m.briefJson,
    attendees: m.meetingContacts.map(mc => ({
      email: mc.contact.email,
      displayName: mc.contact.name,
    })),
  }));

  // ── 2. Kick off background Google refresh (fire-and-forget) ───────────
  refreshFromGoogle(dbUserId, connections).catch(console.error);

  // Return DB data immediately — stale-while-revalidate pattern
  return NextResponse.json({
    meetings: cached,
    cached: true,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}

async function refreshFromGoogle(userId: string, connections: Awaited<ReturnType<typeof getUserCalendarConnections>>) {
  const allMeetings: any[] = [];
  const seen = new Set<string>();

  const results = await Promise.allSettled(
    connections.map(async (conn) => {
      const accessToken = await getValidAccessToken(conn.id);
      const meetings = await getUpcomingMeetings(accessToken);
      return meetings.map((m: any) => ({ ...m, calendarAccount: conn.accountEmail }));
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const m of result.value) {
        if (!seen.has(m.id)) { seen.add(m.id); allMeetings.push(m); }
      }
    }
  }

  await persistMeetings(userId, allMeetings);
}

async function persistMeetings(userId: string, meetings: any[]) {
  for (const m of meetings) {
    const meeting = await db.meeting.upsert({
      where: { userId_gcalEventId: { userId, gcalEventId: m.id } },
      create: {
        userId, gcalEventId: m.id, title: m.title,
        startAt: new Date(m.start), endAt: new Date(m.end),
        description: m.description, location: m.location,
      },
      update: {
        title: m.title, startAt: new Date(m.start), endAt: new Date(m.end),
        description: m.description, location: m.location,
      },
    });

    for (const attendee of m.attendees) {
      const contact = await db.contact.upsert({
        where: { userId_email: { userId, email: attendee.email } },
        create: { userId, email: attendee.email, name: attendee.displayName ?? attendee.email.split("@")[0], lastMetAt: new Date(m.start) },
        update: { name: attendee.displayName ?? attendee.email.split("@")[0], lastMetAt: new Date(m.start) },
      });
      await db.meetingContact.upsert({
        where: { meetingId_contactId: { meetingId: meeting.id, contactId: contact.id } },
        create: { meetingId: meeting.id, contactId: contact.id },
        update: {},
      });
    }
  }
}
