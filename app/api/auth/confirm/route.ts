import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";

// GET /api/auth/confirm?token=xxx
// Called when user clicks the verification link in their email.
export async function GET(req: Request) {
  await connection();

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${base}/auth/signin?error=missing_token`);
  }

  const record = await db.verificationToken.findUnique({ where: { token } });

  if (!record) {
    return NextResponse.redirect(`${base}/auth/signin?error=invalid_token`);
  }

  if (record.usedAt) {
    return NextResponse.redirect(`${base}/auth/signin?verified=already`);
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.redirect(`${base}/auth/signin?error=expired_token`);
  }

  // Mark token as used + verify the user's email in one transaction
  await db.$transaction([
    db.verificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { email: record.email },
      data: { emailVerified: new Date() },
    }),
  ]);

  // Redirect to sign-in with a success flag — user now signs in to get their session
  return NextResponse.redirect(`${base}/auth/signin?verified=1`);
}
