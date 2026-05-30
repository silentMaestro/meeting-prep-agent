import { google } from "googleapis";

export interface Attendee {
  email: string;
  displayName?: string;
}

export interface Meeting {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: Attendee[];
  description?: string;
  location?: string;
}

export async function getUpcomingMeetings(accessToken: string): Promise<Meeting[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  // Start of today (midnight) so past meetings still show
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  // End of tomorrow (11:59:59pm)
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setMilliseconds(-1);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: startOfToday.toISOString(),
    timeMax: endOfTomorrow.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 20,
  });

  const events = response.data.items ?? [];
  const selfEmail = (await calendar.calendarList.get({ calendarId: "primary" }))
    .data.id ?? "";

  return events
    .filter((e) => e.attendees && e.attendees.length > 1)
    .map((e) => ({
      id: e.id!,
      title: e.summary ?? "Untitled",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      description: e.description ?? undefined,
      location: e.location ?? undefined,
      attendees: (e.attendees ?? [])
        .filter((a) => a.email !== selfEmail && !a.self)
        .map((a) => ({ email: a.email!, displayName: a.displayName ?? undefined })),
    }))
    .filter((m) => m.attendees.length > 0);
}
