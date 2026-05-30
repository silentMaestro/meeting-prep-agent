import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// GET /api/contacts/[id] — contact detail with meeting history
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.dbUserId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const contact = await db.contact.findFirst({
    where: { id, userId },
    include: {
      meetingContacts: {
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              startAt: true,
              endAt: true,
              briefJson: true,
              notes: true,
            },
          },
        },
        orderBy: { meeting: { startAt: "desc" } },
      },
      actionItems: {
        where: { status: { not: "DONE" } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      researchSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ contact: {
    id: contact.id,
    email: contact.email,
    name: contact.name,
    role: contact.role,
    company: contact.company,
    bio: contact.bio,
    linkedinUrl: contact.linkedinUrl,
    lastMetAt: contact.lastMetAt,
    notes: contact.notes,
    meetings: contact.meetingContacts.map(mc => ({
      id: mc.meeting.id,
      title: mc.meeting.title,
      date: mc.meeting.startAt,
      hasBrief: !!mc.meeting.briefJson,
    })),
    actionItems: contact.actionItems,
    latestSnapshot: contact.researchSnapshots[0] ?? null,
  }});
}

// PATCH /api/contacts/[id] — update notes
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.dbUserId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { notes } = await req.json();

  const contact = await db.contact.updateMany({
    where: { id, userId },
    data: { notes },
  });

  return NextResponse.json({ ok: true });
}
