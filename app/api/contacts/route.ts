import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// GET /api/contacts — list all contacts with meeting counts
export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.dbUserId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await db.contact.findMany({
    where: { userId },
    include: {
      _count: { select: { meetingContacts: true } },
    },
    orderBy: { lastMetAt: "desc" },
  });

  return NextResponse.json({ contacts: contacts.map(c => ({
    id: c.id,
    email: c.email,
    name: c.name,
    role: c.role,
    company: c.company,
    bio: c.bio,
    linkedinUrl: c.linkedinUrl,
    lastMetAt: c.lastMetAt,
    meetingCount: c._count.meetingContacts,
  }))});
}
