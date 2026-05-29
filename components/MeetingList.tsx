"use client";

import { useEffect, useState } from "react";
import { Meeting } from "@/types";

interface Props {
  selectedId: string | null;
  onSelect: (meeting: Meeting) => void;
}

function groupMeetings(meetings: Meeting[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  return {
    Today: meetings.filter((m) => {
      const d = new Date(m.start);
      return d >= today && d < tomorrow;
    }),
    Tomorrow: meetings.filter((m) => {
      const d = new Date(m.start);
      return d >= tomorrow && d < dayAfter;
    }),
  };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "Now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `in ${hrs}h`;
}

function MeetingSkeleton() {
  return (
    <div className="px-4 py-3 space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 items-start animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-3.5 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
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

  useEffect(() => {
    fetch("/api/meetings")
      .then((r) => r.json())
      .then((data) => {
        setMeetings(data.meetings ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <MeetingSkeleton />;

  if (error) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-red-500">Could not load calendar</p>
        <p className="text-xs text-gray-400 mt-1">{error}</p>
      </div>
    );
  }

  const groups = groupMeetings(meetings);
  const hasAny = groups.Today.length > 0 || groups.Tomorrow.length > 0;

  if (!hasAny) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-medium text-gray-500">No meetings coming up</p>
        <p className="text-xs text-gray-400 mt-1">Meetings with external attendees will appear here</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {(["Today", "Tomorrow"] as const).map((label) =>
        groups[label].length > 0 ? (
          <div key={label}>
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {label}
            </p>
            <div className="space-y-0.5 px-2">
              {groups[label].map((m) => {
                const isSelected = selectedId === m.id;
                const isNow = new Date(m.start) <= new Date() && new Date(m.end) >= new Date();
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all ${
                      isSelected
                        ? "bg-blue-50 ring-1 ring-blue-100"
                        : "hover:bg-gray-50 active:bg-gray-100"
                    }`}
                  >
                    {/* Time block */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center ${
                      isNow ? "bg-blue-600 text-white" : isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className="text-[10px] font-semibold leading-none">
                        {new Date(m.start).toLocaleTimeString([], { hour: "numeric" }).replace(" ", "")}
                      </span>
                      <span className="text-[9px] leading-none mt-0.5 opacity-70">
                        {new Date(m.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).slice(-2)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={`text-sm font-medium truncate leading-snug ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                        {m.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {m.attendees.length} {m.attendees.length === 1 ? "person" : "people"}
                        </span>
                        {label === "Today" && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className={`text-xs font-medium ${isNow ? "text-blue-600" : "text-gray-400"}`}>
                              {timeUntil(m.start)}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Attendee avatars */}
                      <div className="flex gap-1 mt-1.5">
                        {m.attendees.slice(0, 4).map((a) => (
                          <div
                            key={a.email}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold"
                            title={a.displayName ?? a.email}
                          >
                            {(a.displayName ?? a.email)[0].toUpperCase()}
                          </div>
                        ))}
                        {m.attendees.length > 4 && (
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[9px] font-medium">
                            +{m.attendees.length - 4}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
