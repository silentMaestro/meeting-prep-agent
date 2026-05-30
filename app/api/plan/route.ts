import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TimeBlock, ActivityType, DayPlan } from "@/types";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

function toISO(date: Date) { return date.toISOString(); }

function computeFreeSlots(
  events: { start: string; end: string }[],
  dayStart: Date,
  dayEnd: Date
): { start: string; end: string }[] {
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const slots: { start: string; end: string }[] = [];
  let cursor = dayStart.getTime();

  for (const ev of sorted) {
    const evStart = new Date(ev.start).getTime();
    const evEnd = new Date(ev.end).getTime();
    if (evStart > cursor + 15 * 60 * 1000) {
      slots.push({ start: toISO(new Date(cursor)), end: toISO(new Date(evStart)) });
    }
    cursor = Math.max(cursor, evEnd);
  }
  if (cursor < dayEnd.getTime() - 15 * 60 * 1000) {
    slots.push({ start: toISO(new Date(cursor)), end: toISO(dayEnd) });
  }
  return slots;
}

export async function GET(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.dbUserId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const dayStart = new Date(`${dateStr}T07:00:00`);
  const dayEnd   = new Date(`${dateStr}T20:00:00`);

  // ── Read from DB (fast, no Google call) ──────────────────────────────
  const dbMeetings = await db.meeting.findMany({
    where: {
      userId,
      startAt: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { startAt: "asc" },
  });

  const allEvents: TimeBlock[] = dbMeetings.map(m => ({
    id: m.gcalEventId,
    gcalEventId: m.gcalEventId,
    title: m.title,
    start: m.startAt.toISOString(),
    end: m.endAt.toISOString(),
    type: (m.activityType ?? "meeting") as ActivityType,
    description: m.description ?? undefined,
  }));

  // If DB is empty (first load before any meetings fetch), fall back gracefully
  const freeSlots = computeFreeSlots(allEvents, dayStart, dayEnd);
  const freeMinutes = freeSlots.reduce((acc, s) =>
    acc + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000, 0);

  // Ask Claude to suggest how to fill free slots
  let suggestedBlocks: Omit<TimeBlock, "id" | "gcalEventId">[] = [];
  if (freeSlots.length > 0) {
    try {
      const prompt = `You are a productivity assistant. Given these free time slots and existing meetings, suggest how to fill the free time with focused, healthy activities.

Date: ${dateStr}
Existing meetings: ${JSON.stringify(allEvents.map(e => ({ title: e.title, start: e.start, end: e.end })))}
Free slots: ${JSON.stringify(freeSlots)}

Activity types available: focus (deep work), build (personal project), exercise, break, lunch, learning, reminder, other.

For each free slot, suggest 1 activity block. Keep suggestions realistic — include a lunch break around noon, exercise if there's a 45+ min slot, focus blocks for long morning slots.

Respond with a JSON array of blocks:
[{ "title": "string", "start": "ISO", "end": "ISO", "type": "ActivityType", "description": "short reason" }]

Only return the JSON array, no other text.`;

      const msg = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
      const parsed = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, ""));
      suggestedBlocks = Array.isArray(parsed) ? parsed : [];
    } catch { suggestedBlocks = []; }
  }

  const plan: DayPlan = { date: dateStr, blocks: allEvents, freeMinutes, suggestedBlocks };
  return NextResponse.json({ plan });
}
