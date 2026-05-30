import { Resend } from "resend";
import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Creates a verification token in the DB and sends the email. */
export async function sendVerificationEmail(email: string, name?: string) {
  // Expire any previous unused tokens for this email
  await db.verificationToken.updateMany({
    where: { email, type: "EMAIL_VERIFY", usedAt: null },
    data: { usedAt: new Date() }, // mark as used / invalidated
  });

  const record = await db.verificationToken.create({
    data: {
      email,
      type: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/confirm?token=${record.token}`;
  const firstName = name?.split(" ")[0] ?? "there";

  if (!process.env.RESEND_API_KEY) {
    // Dev fallback — log the link so you can click it locally
    console.log(`\n📧 [DEV] Verify email for ${email}:\n${verifyUrl}\n`);
    return;
  }

  await resend.emails.send({
    from: "Pocket PA <noreply@pocketpa.app>",
    to: email,
    subject: "Confirm your Pocket PA account",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 480px; margin: 48px auto; padding: 0 16px;">
    <div style="background: white; border-radius: 20px; padding: 40px 32px; border: 1px solid #f3f4f6;">
      <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-size: 24px;">👋</span>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 8px;">Welcome to Pocket PA, ${firstName}</h1>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
        Click the button below to confirm your email address and activate your account.
        This link expires in 24 hours.
      </p>
      <a href="${verifyUrl}"
         style="display: block; background: #2563eb; color: white; text-decoration: none; text-align: center;
                padding: 14px 24px; border-radius: 12px; font-size: 15px; font-weight: 600;">
        Confirm my email →
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; text-align: center;">
        If you didn't create this account you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
