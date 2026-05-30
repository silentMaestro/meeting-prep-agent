import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse, connection } from "next/server";

// GET /api/connect/google
// Redirects the user to Google's OAuth consent screen requesting calendar access.
// After approval Google redirects to /api/connect/google/callback.
export async function GET() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/connect/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",           // force consent so we always get a refresh_token
    include_granted_scopes: "false",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
