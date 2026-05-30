import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserCalendarConnections, getValidAccessToken } from "@/lib/calendar-connections";

// POST /api/plan/events — create a calendar event
export async function POST(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, start, end, description, colorId } = await req.json();

  const connections = await getUserCalendarConnections(userId);
  if (!connections.length) return NextResponse.json({ error: "No calendars connected" }, { status: 400 });

  const conn = connections[0];
  const token = await getValidAccessToken(conn.id);

  const body = {
    summary: title,
    description: description ?? "",
    start: { dateTime: start, timeZone: "UTC" },
    end: { dateTime: end, timeZone: "UTC" },
    ...(colorId ? { colorId } : {}),
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const event = await res.json();
  return NextResponse.json({ eventId: event.id });
}

// DELETE /api/plan/events?eventId=xxx — delete a calendar event
export async function DELETE(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  const userId2 = (session?.user as any)?.id as string | undefined;
  if (!userId2) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  const connections = await getUserCalendarConnections(userId2);
  if (!connections.length) return NextResponse.json({ error: "No calendars connected" }, { status: 400 });

  const conn = connections[0];
  const token = await getValidAccessToken(conn.id);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
