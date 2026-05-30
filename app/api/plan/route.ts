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

// Infer meal times from day start/end (HH:MM strings)
function mealHints(dateStr: string, dayStartTime: string, dayEndTime: string): string {
  const [startH] = dayStartTime.split(":").map(Number);
  const [endH]   = dayEndTime.split(":").map(Number);

  // Breakfast: 30min after day start (if starts before 10am)
  const breakfastH = startH < 10 ? startH + 0.5 : null;
  // Lunch: noon, or midpoint of morning if day starts late
  const lunchH = startH < 13 ? 12 : Math.round((startH + 14) / 2);
  // Dinner: 2h before day end (if day ends after 5pm)
  const dinnerH = endH > 17 ? endH - 2 : null;

  const fmt = (h: number) => {
    const hh = Math.floor(h);
    const mm = (h % 1) === 0.5 ? "30" : "00";
    const ampm = hh < 12 ? "am" : "pm";
    return `${hh % 12 || 12}:${mm}${ampm}`;
  };

  const meals = [];
  if (breakfastH !== null) meals.push(`- Breakfast around ${fmt(breakfastH)} (~30 min)`);
  meals.push(`- Lunch around ${fmt(lunchH)} (~45 min)`);
  if (dinnerH !== null) meals.push(`- Dinner around ${fmt(dinnerH)} (~1 hour)`);

  return meals.join("\n");
}

export async function GET(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.dbUserId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  // Fetch user day schedule settings
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { dayStartTime: true, dayEndTime: true },
  });
  const dayStartTime = user?.dayStartTime ?? "07:00";
  const dayEndTime   = user?.dayEndTime   ?? "22:00";

  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd   = new Date(`${dateStr}T23:59:59`);

  const dbMeetings = await db.meeting.findMany({
    where: { userId, startAt: { gte: dayStart, lte: dayEnd } },
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

  // Free slots use the user's configured day window
  const workStart = new Date(`${dateStr}T${dayStartTime}:00`);
  const workEnd   = new Date(`${dateStr}T${dayEndTime}:00`);
  const freeSlots = computeFreeSlots(allEvents, workStart, workEnd);
  const freeMinutes = freeSlots.reduce((acc, s) =>
    acc + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000, 0);

  let suggestedBlocks: Omit<TimeBlock, "id" | "gcalEventId">[] = [];
  if (freeSlots.length > 0) {
    try {
      const meals = mealHints(dateStr, dayStartTime, dayEndTime);
      const prompt = `You are a productivity assistant helping plan someone's day.

Date: ${dateStr}
Day runs: ${dayStartTime} – ${dayEndTime}
Existing meetings: ${JSON.stringify(allEvents.map(e => ({ title: e.title, start: e.start, end: e.end })))}
Free slots: ${JSON.stringify(freeSlots)}

This person eats 3 meals a day. Reserve time for:
${meals}

Activity types: focus (deep work), build (personal project), exercise, break, lunch, learning, reminder, other.
Use "lunch" type for all meal blocks.

For remaining free time suggest realistic activities:
- Long morning slots (60+ min) → focus or build
- 45+ min gaps → exercise if not already scheduled
- Short gaps (15–30 min) → break or reminder
- Afternoon lulls (2–4pm) → break or learning

Respond ONLY with a JSON array:
[{ "title": "string", "start": "ISO", "end": "ISO", "type": "ActivityType", "description": "one-line reason" }]`;

      const msg = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
      const parsed = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, ""));
      suggestedBlocks = (Array.isArray(parsed) ? parsed : [])
        .sort((a: { start: string }, b: { start: string }) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
        );
    } catch { suggestedBlocks = []; }
  }

  const plan: DayPlan = { date: dateStr, blocks: allEvents, freeMinutes, suggestedBlocks };
  return NextResponse.json({ plan });
}
