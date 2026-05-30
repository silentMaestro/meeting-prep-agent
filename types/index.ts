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

export type ActivityType =
  | "focus"
  | "build"
  | "exercise"
  | "break"
  | "meeting"
  | "reminder"
  | "lunch"
  | "learning"
  | "other";

export interface ActivityConfig {
  label: string;
  emoji: string;
  color: string;       // tailwind bg color class
  border: string;      // tailwind border color class
  text: string;        // tailwind text color class
  defaultDuration: number; // minutes
}

export const ACTIVITY_CONFIGS: Record<ActivityType, ActivityConfig> = {
  focus:    { label: "Focus Time",    emoji: "🎯", color: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300", defaultDuration: 90 },
  build:    { label: "Personal Build", emoji: "💻", color: "bg-blue-500/15",   border: "border-blue-500/30",   text: "text-blue-300",   defaultDuration: 60 },
  exercise: { label: "Exercise",       emoji: "🏃", color: "bg-emerald-500/15",border: "border-emerald-500/30",text: "text-emerald-300", defaultDuration: 60 },
  break:    { label: "Break",          emoji: "☕", color: "bg-amber-500/15",  border: "border-amber-500/30",  text: "text-amber-300",  defaultDuration: 30 },
  meeting:  { label: "Meeting",        emoji: "👥", color: "bg-zinc-700/50",   border: "border-zinc-600/50",   text: "text-zinc-300",   defaultDuration: 60 },
  reminder: { label: "Reminder",       emoji: "🔔", color: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-300", defaultDuration: 15 },
  lunch:    { label: "Lunch",          emoji: "🍽", color: "bg-yellow-500/15", border: "border-yellow-500/30", text: "text-yellow-300", defaultDuration: 60 },
  learning: { label: "Learning",       emoji: "📚", color: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-300", defaultDuration: 45 },
  other:    { label: "Other",          emoji: "✏️", color: "bg-zinc-800",      border: "border-zinc-700",      text: "text-zinc-300",   defaultDuration: 30 },
};

export interface TimeBlock {
  id: string;
  title: string;
  start: string;        // ISO
  end: string;          // ISO
  type: ActivityType;
  isFree?: boolean;     // true = unscheduled gap
  gcalEventId?: string; // set after creating in Google Calendar
  description?: string;
}

export interface DayPlan {
  date: string;
  blocks: TimeBlock[];
  freeMinutes: number;
  suggestedBlocks: Omit<TimeBlock, "id" | "gcalEventId">[];
}

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "attendee_done"; attendee: AttendeeResearch }
  | { type: "news_done"; news: CompanyNews }
  | { type: "brief_done"; brief: MeetingBrief }
  | { type: "error"; message: string };
