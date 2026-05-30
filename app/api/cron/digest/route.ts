import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";
import { buildDigest, renderDigestEmail } from "@/lib/digest";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Called by Vercel Cron — secured by CRON_SECRET header
export async function GET(req: Request) {
  await connection();

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

  // Find users whose digest time matches current UTC hour (within 30 min window)
  // For now, send to all enabled users — time-zone matching can be refined later
  const users = await db.user.findMany({
    where: { digestEnabled: true },
  });

  const results: { email: string; status: string }[] = [];

  for (const user of users) {
    try {
      const data = await buildDigest(user.id);
      const html = renderDigestEmail(data);

      // Save digest record
      await db.digest.create({
        data: {
          userId: user.id,
          contentJson: data as any,
        },
      });

      // Send email
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "Pocket PA <digest@your-domain.com>",
          to: user.email,
          subject: `Your day at a glance — ${new Date(data.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
          html,
        });
      }

      results.push({ email: user.email, status: "sent" });
    } catch (err: any) {
      console.error(`Digest failed for ${user.email}:`, err);
      results.push({ email: user.email, status: `error: ${err.message}` });
    }
  }

  return NextResponse.json({ ok: true, results, time: currentTimeStr });
}
