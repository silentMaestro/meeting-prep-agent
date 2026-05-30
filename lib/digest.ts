import { db } from "./db";

export interface DigestData {
  user: { name: string | null; email: string };
  date: string;
  meetings: DigestMeeting[];
  actionItems: DigestActionItem[];
  contacts: DigestContact[];
}

export interface DigestMeeting {
  id: string;
  title: string;
  startAt: string;
  attendees: { name: string; role: string | null; email: string }[];
  hasBrief: boolean;
  agenda?: string;
  topQuestions?: string[];
}

export interface DigestActionItem {
  id: string;
  description: string;
  dueDate: string | null;
  contactName: string | null;
  meetingTitle: string | null;
  status: string;
  isOverdue: boolean;
}

export interface DigestContact {
  name: string;
  role: string | null;
  company: string | null;
  lastMetAt: string | null;
  daysSinceLastMet: number | null;
  meetingToday: boolean;
}

export async function buildDigest(userId: string): Promise<DigestData> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

  // Today's + tomorrow's meetings
  const meetings = await db.meeting.findMany({
    where: {
      userId,
      startAt: { gte: startOfToday, lt: endOfTomorrow },
      status: { not: "CANCELLED" },
    },
    include: {
      meetingContacts: {
        include: { contact: true },
      },
    },
    orderBy: { startAt: "asc" },
  });

  // Open + overdue action items
  const actionItems = await db.actionItem.findMany({
    where: {
      userId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    include: {
      contact: { select: { name: true } },
      meeting: { select: { title: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // Contacts you haven't spoken to in 60+ days (relationship nudges)
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const neglectedContacts = await db.contact.findMany({
    where: {
      userId,
      lastMetAt: { lt: sixtyDaysAgo },
    },
    orderBy: { lastMetAt: "asc" },
    take: 5,
  });

  // Build digest meetings
  const digestMeetings: DigestMeeting[] = meetings.map((m) => {
    const brief = m.briefJson as any;
    return {
      id: m.gcalEventId,
      title: m.title,
      startAt: m.startAt.toISOString(),
      attendees: m.meetingContacts.map((mc) => ({
        name: mc.contact.name,
        role: mc.contact.role,
        email: mc.contact.email,
      })),
      hasBrief: !!m.briefJson,
      agenda: brief?.agenda,
      topQuestions: brief?.suggestedQuestions?.slice(0, 2),
    };
  });

  // Build action items
  const digestActions: DigestActionItem[] = actionItems.map((a) => ({
    id: a.id,
    description: a.description,
    dueDate: a.dueDate?.toISOString() ?? null,
    contactName: a.contact?.name ?? null,
    meetingTitle: a.meeting?.title ?? null,
    status: a.status,
    isOverdue: a.dueDate ? a.dueDate < now : false,
  }));

  // Build contact nudges
  const todayMeetingEmails = new Set(
    meetings.flatMap((m) => m.meetingContacts.map((mc) => mc.contact.email))
  );

  const digestContacts: DigestContact[] = neglectedContacts.map((c) => {
    const daysSince = c.lastMetAt
      ? Math.floor((now.getTime() - c.lastMetAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      name: c.name,
      role: c.role,
      company: c.company,
      lastMetAt: c.lastMetAt?.toISOString() ?? null,
      daysSinceLastMet: daysSince,
      meetingToday: todayMeetingEmails.has(c.email),
    };
  });

  return {
    user: { name: user.name, email: user.email },
    date: now.toISOString(),
    meetings: digestMeetings,
    actionItems: digestActions,
    contacts: digestContacts,
  };
}

export function renderDigestEmail(data: DigestData): string {
  const dateStr = new Date(data.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const overdue = data.actionItems.filter((a) => a.isOverdue);
  const dueSoon = data.actionItems.filter((a) => !a.isOverdue);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #f3f4f6; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 12px; }
    .meeting { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .meeting:last-child { border-bottom: none; padding-bottom: 0; }
    .meeting-title { font-weight: 600; color: #111827; font-size: 15px; }
    .meeting-time { color: #6b7280; font-size: 13px; margin-top: 2px; }
    .meeting-agenda { color: #374151; font-size: 13px; margin-top: 6px; background: #eff6ff; border-radius: 8px; padding: 8px 10px; }
    .attendee { display: inline-block; background: #f3f4f6; border-radius: 20px; padding: 2px 10px; font-size: 12px; color: #374151; margin: 4px 4px 0 0; }
    .action { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
    .action:last-child { border-bottom: none; }
    .overdue { color: #dc2626; }
    .nudge { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
    .nudge:last-child { border-bottom: none; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .cta { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Good morning, ${data.user.name?.split(" ")[0] ?? "there"} 👋</h1>
    <p class="subtitle">${dateStr} · Your day at a glance</p>

    ${data.meetings.length > 0 ? `
    <div class="card">
      <div class="label">📅 Today's Meetings (${data.meetings.length})</div>
      ${data.meetings.map((m) => `
        <div class="meeting">
          <div class="meeting-title">${m.title}</div>
          <div class="meeting-time">${new Date(m.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · ${m.attendees.length} attendee${m.attendees.length !== 1 ? "s" : ""}</div>
          <div style="margin-top: 6px;">
            ${m.attendees.map((a) => `<span class="attendee">${a.name}</span>`).join("")}
          </div>
          ${m.agenda ? `<div class="meeting-agenda">${m.agenda}</div>` : ""}
          ${m.topQuestions?.length ? `
            <div style="margin-top: 6px; font-size: 12px; color: #6b7280;">
              💬 ${m.topQuestions.join(" · ")}
            </div>` : ""}
        </div>
      `).join("")}
    </div>` : ""}

    ${overdue.length > 0 ? `
    <div class="card">
      <div class="label">🔴 Overdue (${overdue.length})</div>
      ${overdue.map((a) => `
        <div class="action overdue">
          ⚠️ ${a.description}
          ${a.contactName ? `<span style="color:#9ca3af"> · ${a.contactName}</span>` : ""}
        </div>
      `).join("")}
    </div>` : ""}

    ${dueSoon.length > 0 ? `
    <div class="card">
      <div class="label">✅ Open Actions (${dueSoon.length})</div>
      ${dueSoon.slice(0, 5).map((a) => `
        <div class="action">
          · ${a.description}
          ${a.dueDate ? `<span style="color:#9ca3af"> · due ${new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>` : ""}
        </div>
      `).join("")}
      ${dueSoon.length > 5 ? `<div style="font-size:12px;color:#9ca3af;margin-top:8px">+${dueSoon.length - 5} more</div>` : ""}
    </div>` : ""}

    ${data.contacts.length > 0 ? `
    <div class="card">
      <div class="label">💬 Relationships to warm up</div>
      ${data.contacts.map((c) => `
        <div class="nudge">
          <strong>${c.name}</strong>${c.role ? ` · ${c.role}` : ""}
          <span style="color:#9ca3af"> · ${c.daysSinceLastMet} days since last contact</span>
        </div>
      `).join("")}
    </div>` : ""}

    <a href="${process.env.NEXTAUTH_URL ?? "https://your-app.vercel.app"}" class="cta">
      Open Pocket PA →
    </a>

    <p style="font-size:12px;color:#9ca3af;margin-top:24px;text-align:center;">
      Pocket PA · <a href="${process.env.NEXTAUTH_URL}/api/digest/unsubscribe" style="color:#9ca3af">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}
