import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";

// GET /api/connect — list all calendar connections for the current user
export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUserId = (session as any).dbUserId as string;

  const connections = await db.calendarConnection.findMany({
    where: { userId: dbUserId },
    select: {
      id: true,
      provider: true,
      accountEmail: true,
      label: true,
      scopes: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ connections });
}

// DELETE /api/connect?id=<connectionId> — remove a calendar connection
export async function DELETE(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUserId = (session as any).dbUserId as string;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Verify ownership before deleting
  const conn = await db.calendarConnection.findFirst({ where: { id, userId: dbUserId } });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.calendarConnection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
