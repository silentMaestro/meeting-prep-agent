import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUpcomingMeetings } from "@/lib/calendar";
import { NextResponse, connection } from "next/server";

export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  try {
    const meetings = await getUpcomingMeetings(accessToken);
    return NextResponse.json({ meetings });
  } catch (err: any) {
    console.error("Calendar error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
