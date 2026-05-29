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

export interface AttendeeResearch {
  email: string;
  name: string;
  bio: string;
  role: string;
  recentActivity: string[];
  talkingPoints: string[];
  links: { label: string; url: string }[];
}

export interface CompanyNews {
  company: string;
  articles: { title: string; snippet: string; date: string; source: string }[];
}

export interface MeetingBrief {
  meetingId: string;
  title: string;
  agenda: string;
  attendees: AttendeeResearch[];
  companyNews: CompanyNews[];
  suggestedQuestions: string[];
  generatedAt: string;
}

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "attendee_done"; attendee: AttendeeResearch }
  | { type: "news_done"; news: CompanyNews }
  | { type: "brief_done"; brief: MeetingBrief }
  | { type: "error"; message: string };
