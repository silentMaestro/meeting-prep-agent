import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.dbUserId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { dayStartTime: true, dayEndTime: true, timezone: true },
  });

  return NextResponse.json({ settings: user });
}

export async function PATCH(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.dbUserId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { dayStartTime, dayEndTime } = body;

  // Validate HH:MM format
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (dayStartTime && !timeRe.test(dayStartTime))
    return NextResponse.json({ error: "Invalid dayStartTime" }, { status: 400 });
  if (dayEndTime && !timeRe.test(dayEndTime))
    return NextResponse.json({ error: "Invalid dayEndTime" }, { status: 400 });

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(dayStartTime ? { dayStartTime } : {}),
      ...(dayEndTime ? { dayEndTime } : {}),
    },
    select: { dayStartTime: true, dayEndTime: true },
  });

  return NextResponse.json({ settings: updated });
}
