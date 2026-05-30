"use client";

import { Meeting } from "@/types";

interface SnapshotMeeting extends Meeting {
  hasBrief?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) {
    const past = Math.abs(diff);
    const mins = Math.floor(past / 60000);
    if (mins < 60) return { label: `${mins}m ago`, past: true };
    return { label: `${Math.floor(mins / 60)}h ago`, past: true };
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { label: `in ${mins}m`, past: false };
  return { label: `in ${Math.floor(mins / 60)}h`, past: false };
}

function groupByDay(meetings: SnapshotMeeting[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
  return {
    Today: meetings.filter(m => { const d = new Date(m.start); return d >= today && d < tomorrow; }),
    Tomorrow: meetings.filter(m => { const d = new Date(m.start); return d >= tomorrow && d < dayAfter; }),
  };
}

interface Props {
  meetings: Meeting[];
  loading: boolean;
  noCalendars: boolean;
  onSelectMeeting: (meeting: Meeting) => void;
}

export default function SnapshotView({ meetings, loading, noCalendars, onSelectMeeting }: Props) {

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const groups = groupByDay(meetings);
  const todayMeetings = groups.Today;
  const nextMeeting = todayMeetings.find(m => new Date(m.start) > now);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-6 pb-4 space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{greeting} 👋</h1>
          <p className="text-sm text-zinc-600 mt-0.5">{dateStr}</p>
        </div>

        {/* Next up callout */}
        {!loading && nextMeeting && (() => {
          const t = timeUntil(nextMeeting.start);
          return (
            <button
              onClick={() => onSelectMeeting(nextMeeting)}
              className="w-full text-left bg-violet-500/8 border border-violet-500/20 rounded-2xl px-4 py-4 hover:bg-violet-500/12 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-widest">Next up</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  !t.past && new Date(nextMeeting.start).getTime() - Date.now() < 15 * 60 * 1000
                    ? "bg-red-500/15 text-red-400"
                    : "bg-violet-500/15 text-violet-400"
                }`}>{t.label}</span>
              </div>
              <p className="text-sm font-semibold text-zinc-100">{nextMeeting.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatTime(nextMeeting.start)} · {nextMeeting.attendees.length} {nextMeeting.attendees.length === 1 ? "person" : "people"}
              </p>
            </button>
          );
        })()}

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Today", value: todayMeetings.length, sub: "meetings" },
              { label: "Tomorrow", value: groups.Tomorrow.length, sub: "meetings" },
              { label: "Briefed", value: todayMeetings.filter(m => m.hasBrief).length, sub: "of today" },
            ].map(stat => (
              <div key={stat.label} className="bg-[#141414] border border-white/6 rounded-2xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-zinc-100">{stat.value}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Meeting list */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : noCalendars ? (
          <div className="bg-zinc-900 rounded-2xl border border-white/6 px-4 py-6 text-center space-y-3">
            <p className="text-sm font-medium text-zinc-400">No calendar connected</p>
            <p className="text-xs text-zinc-600">Connect your Google Calendar in Settings to see your meetings.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {(Object.entries(groups) as [string, SnapshotMeeting[]][]).map(([label, items]) =>
              items.length === 0 ? null : (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
                  <div className="space-y-2">
                    {items.map(m => {
                      const t = timeUntil(m.start);
                      const isPast = t.past;
                      return (
                        <button
                          key={m.id}
                          onClick={() => onSelectMeeting(m)}
                          className="w-full text-left bg-[#141414] border border-white/6 hover:border-white/12 rounded-2xl px-4 py-3.5 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isPast ? "text-zinc-500" : "text-zinc-100"}`}>
                                {m.title}
                              </p>
                              <p className="text-xs text-zinc-600 mt-0.5">
                                {formatTime(m.start)} · {m.attendees.length} {m.attendees.length === 1 ? "person" : "people"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {m.hasBrief && (
                                <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full font-medium">
                                  briefed
                                </span>
                              )}
                              {!isPast && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  new Date(m.start).getTime() - Date.now() < 15 * 60 * 1000
                                    ? "text-red-400 bg-red-500/10"
                                    : "text-emerald-400 bg-emerald-500/10"
                                }`}>{t.label}</span>
                              )}
                            </div>
                          </div>
                          {m.attendees.length > 0 && (
                            <div className="flex items-center gap-1 mt-2.5">
                              {m.attendees.slice(0, 5).map((a, i) => (
                                <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 border border-[#141414]" style={{ marginLeft: i > 0 ? -6 : 0 }}>
                                  {(a.displayName ?? a.email)[0].toUpperCase()}
                                </div>
                              ))}
                              {m.attendees.length > 5 && (
                                <span className="text-[10px] text-zinc-600 ml-2">+{m.attendees.length - 5}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
            {Object.values(groups).every(g => g.length === 0) && (
              <div className="text-center py-10 text-zinc-600 text-sm">
                Nothing scheduled today or tomorrow 🎉
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
