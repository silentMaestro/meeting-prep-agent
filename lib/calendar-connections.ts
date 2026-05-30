/**
 * Helpers for reading and refreshing CalendarConnection tokens.
 * The meetings route (and any future calendar writes) should use
 * getValidAccessToken() rather than reading the session directly.
 */

import { db } from "./db";

/** Returns a valid access token for the given connection, refreshing if needed. */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const conn = await db.calendarConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  // If token expires in more than 5 minutes, it's still valid
  if (conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return conn.accessToken;
  }

  if (!conn.refreshToken) {
    throw new Error(`No refresh token for calendar connection ${connectionId}. User must reconnect.`);
  }

  // Refresh the access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed for connection ${connectionId}: ${body}`);
  }

  const tokens = await res.json();
  const { access_token, expires_in } = tokens;

  const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

  // Persist the new token
  await db.calendarConnection.update({
    where: { id: connectionId },
    data: { accessToken: access_token, expiresAt },
  });

  return access_token;
}

/** Returns all calendar connections for a user with fresh tokens. */
export async function getUserCalendarConnections(userId: string) {
  return db.calendarConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}
