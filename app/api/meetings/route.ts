import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUpcomingMeetings } from "@/lib/calendar";
import { getUserCalendarConnections, getValidAccessToken } from "@/lib/calendar-connections";
import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUserId = (session as any).dbUserId as string | undefined;
  if (!dbUserId) {
    return NextResponse.json({ error: "No user record" }, { status: 400 });
  }

  // Get all connected calendars for this user
  const connections = await getUserCalendarConnections(dbUserId);

  if (connections.length === 0) {
    // No calendars connected yet — return empty with a hint
    return NextResponse.json({ meetings: [], noCalendars: true });
  }

  // Fetch meetings from all connected accounts in parallel, merge and deduplicate
  const results = await Promise.allSettled(
    connections.map(async (conn) => {
      const accessToken = await getValidAccessToken(conn.id);
      const meetings = await getUpcomingMeetings(accessToken);
      return meetings.map((m: any) => ({ ...m, calendarAccount: conn.accountEmail }));
    })
  );

  const allMeetings: any[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const m of result.value) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          allMeetings.push(m);
        }
      }
    }
  }

  // Sort by start time
  allMeetings.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Persist in background
  persistMeetingsAndContacts(dbUserId, allMeetings).catch(console.error);

  return NextResponse.json({ meetings: allMeetings });
}

async function persistMeetingsAndContacts(userId: string, meetings: any[]) {
  for (const m of meetings) {
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

      await db.meetingContact.upsert({
        where: { meetingId_contactId: { meetingId: meeting.id, contactId: contact.id } },
        create: { meetingId: meeting.id, contactId: contact.id },
        update: {},
      });
    }
  }
}
