"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Meeting } from "@/types";

interface Props {
  selectedId: string | null;
  onSelect: (meeting: Meeting) => void;
}

function groupMeetings(meetings: Meeting[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
  return {
    Today: meetings.filter((m) => { const d = new Date(m.start); return d >= today && d < tomorrow; }),
    Tomorrow: meetings.filter((m) => { const d = new Date(m.start); return d >= tomorrow && d < dayAfter; }),
  };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function MeetingSkeleton() {
  return (
    <div className="px-3 py-2 space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 items-center p-3 rounded-xl animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-zinc-800 rounded w-3/4" />
            <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MeetingList({ selectedId, onSelect }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noCalendars, setNoCalendars] = useState(false);

  useEffect(() => {
    fetch("/api/meetings")
      .then((r) => r.json())
      .then((data) => {
        setMeetings(data.meetings ?? []);
        setNoCalendars(!!data.noCalendars);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <MeetingSkeleton />;

  if (error) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-red-400">Could not load calendar</p>
        <p className="text-xs text-zinc-600 mt-1">{error}</p>
      </div>
    );
  }

  if (noCalendars) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
        <div className="w-10 h-10 bg-zinc-900 border border-white/6 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-400">No calendar connected</p>
          <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">Connect your Google Calendar to see meetings.</p>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all"
        >
          Connect Calendar →
        </Link>
      </div>
    );
  }

  const groups = groupMeetings(meetings);
  const allEmpty = Object.values(groups).every((g) => g.length === 0);

  if (allEmpty) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-zinc-500">Nothing scheduled today or tomorrow</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 space-y-4">
      {(Object.entries(groups) as [string, Meeting[]][]).map(([label, items]) =>
        items.length === 0 ? null : (
          <div key={label}>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-1">{label}</p>
            <div className="space-y-0.5">
              {items.map((m) => {
                const until = timeUntil(m.start);
                const isSelected = m.id === selectedId;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                      isSelected
                        ? "bg-blue-600/15 border border-blue-500/20"
                        : "hover:bg-white/4 border border-transparent"
                    }`}
                  >
                    {/* Time block */}
                    <div className={`w-9 flex-shrink-0 text-right ${isSelected ? "text-blue-400" : "text-zinc-600"}`}>
                      <p className="text-[11px] font-semibold leading-tight">{formatTime(m.start).split(" ")[0]}</p>
                      <p className="text-[9px] leading-tight">{formatTime(m.start).split(" ")[1]}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate leading-snug ${isSelected ? "text-zinc-100" : "text-zinc-300 group-hover:text-zinc-100"}`}>
                        {m.title}
                      </p>
                      <p className="text-xs text-zinc-600 truncate mt-0.5">
                        {m.attendees.length} {m.attendees.length === 1 ? "person" : "people"}
                      </p>
                    </div>
                    {until && (
                      <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        {until}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
