import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";

// GET /api/connect/google/callback
// Google redirects here after the user approves calendar access.
// We exchange the code for tokens and store them in CalendarConnection.
export async function GET(req: Request) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=unauthenticated`);
  }

  const dbUserId = (session as any).dbUserId as string | undefined;
  if (!dbUserId) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=no_user`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=${error ?? "missing_code"}`
    );
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/connect/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("Token exchange failed:", body);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=token_exchange`);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in, scope } = tokens;

  // Fetch the Google account email so we know which account was connected
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const userInfo = await userInfoRes.json();
  const accountEmail: string = userInfo.email;

  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : null;

  // Upsert so reconnecting the same account refreshes the tokens
  await db.calendarConnection.upsert({
    where: {
      userId_provider_accountEmail: {
        userId: dbUserId,
        provider: "google",
        accountEmail,
      },
    },
    create: {
      userId: dbUserId,
      provider: "google",
      accountEmail,
      accessToken: access_token,
      refreshToken: refresh_token ?? null,
      expiresAt,
      scopes: scope ?? null,
    },
    update: {
      accessToken: access_token,
      // Only overwrite refresh_token if Google issued a new one
      ...(refresh_token ? { refreshToken: refresh_token } : {}),
      expiresAt,
      scopes: scope ?? null,
    },
  });

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?connected=google`);
}
