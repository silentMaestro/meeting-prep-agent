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

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 text-sm">Error: {error}</div>;
  }

  const groups = groupMeetings(meetings);

  if (meetings.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center mt-8">
        No meetings with external attendees in the next 2 days.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {(["Today", "Tomorrow"] as const).map((label) =>
        groups[label].length > 0 ? (
          <div key={label}>
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
              {label}
            </p>
            {groups[label].map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                  selectedId === m.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                }`}
              >
                <p className="font-medium text-gray-900 text-sm truncate">{m.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(m.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {m.attendees.length} attendee{m.attendees.length !== 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}
