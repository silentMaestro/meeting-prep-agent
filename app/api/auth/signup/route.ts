import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  await connection();

  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if account already exists
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    if (existing.emailVerified) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    // Unverified account — resend the verification email
    await sendVerificationEmail(normalizedEmail, existing.name ?? name ?? undefined);
    return NextResponse.json({ ok: true, message: "Verification email resent" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash,
      emailVerified: null, // not verified yet
    },
  });

  await sendVerificationEmail(normalizedEmail, user.name ?? undefined);

  return NextResponse.json({ ok: true });
}
