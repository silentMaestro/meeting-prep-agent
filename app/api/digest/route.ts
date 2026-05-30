import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";
import { buildDigest } from "@/lib/digest";

// GET /api/digest — returns today's digest (cached or freshly built)
export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUserId = (session as any).dbUserId as string | undefined;
  if (!dbUserId) return NextResponse.json({ error: "No user record" }, { status: 400 });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Check for a digest already sent today
  const existing = await db.digest.findFirst({
    where: {
      userId: dbUserId,
      sentAt: { gte: startOfToday },
    },
    orderBy: { sentAt: "desc" },
  });

  if (existing) {
    return NextResponse.json({ digest: existing.contentJson, cached: true });
  }

  // Build fresh digest on demand (no email sent)
  const data = await buildDigest(dbUserId);
  return NextResponse.json({ digest: data, cached: false });
}
