"use client";

import { useEffect, useState } from "react";
import { DigestData } from "@/lib/digest";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-zinc-600 italic">{message}</p>;
}

export default function DigestPanel() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    fetch("/api/digest")
      .then((r) => r.json())
      .then((data) => {
        setDigest(data.digest as DigestData);
        setCached(data.cached);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-600">
        Could not load digest
      </div>
    );
  }

  const overdue = digest.actionItems.filter((a) => a.isOverdue);
  const open = digest.actionItems.filter((a) => !a.isOverdue);
  const dateStr = new Date(digest.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-zinc-100">
            Good morning{digest.user.name ? `, ${digest.user.name.split(" ")[0]}` : ""} 👋
          </h1>
          {cached && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              cached
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-600">{dateStr}</p>
      </div>

      {/* Meetings */}
      <section>
        <SectionLabel>📅 Today's meetings ({digest.meetings.length})</SectionLabel>
        {digest.meetings.length === 0 ? (
          <EmptyState message="Nothing on the calendar today." />
        ) : (
          <div className="space-y-2">
            {digest.meetings.map((m) => (
              <div key={m.id} className="bg-[#141414] rounded-2xl border border-white/6 overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-100 text-sm leading-snug">{m.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(m.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {" · "}{m.attendees.length} {m.attendees.length === 1 ? "person" : "people"}
                      </p>
                    </div>
                    {m.hasBrief && (
                      <span className="flex-shrink-0 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium mt-0.5">
                        briefed
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {m.attendees.map((a) => (
                      <span key={a.email} className="inline-flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-400">
                        <span className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                          {a.name[0].toUpperCase()}
                        </span>
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
                {m.agenda && (
                  <div className="px-4 pb-3 border-t border-white/4 pt-2.5">
                    <p className="text-xs text-zinc-500 leading-relaxed">{m.agenda}</p>
                  </div>
                )}
                {m.topQuestions && m.topQuestions.length > 0 && (
                  <div className="px-4 pb-3 flex gap-2 flex-wrap">
                    {m.topQuestions.map((q, i) => (
                      <span key={i} className="text-xs bg-zinc-800 text-zinc-400 rounded-lg px-2 py-1">
                        💬 {q}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Overdue */}
      {overdue.length > 0 && (
        <section>
          <SectionLabel>🔴 Overdue ({overdue.length})</SectionLabel>
          <div className="bg-red-500/8 rounded-2xl border border-red-500/20 divide-y divide-red-500/10 overflow-hidden">
            {overdue.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0 text-sm">⚠</span>
                <div>
                  <p className="text-sm font-medium text-red-300">{a.description}</p>
                  {(a.contactName || a.meetingTitle) && (
                    <p className="text-xs text-red-500/70 mt-0.5">
                      {[a.contactName, a.meetingTitle].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Open actions */}
      {open.length > 0 && (
        <section>
          <SectionLabel>✅ Open actions ({open.length})</SectionLabel>
          <div className="bg-[#141414] rounded-2xl border border-white/6 divide-y divide-white/4 overflow-hidden">
            {open.slice(0, 6).map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-4 h-4 rounded border border-zinc-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300">{a.description}</p>
                  {a.dueDate && (
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Due {new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {open.length > 6 && (
              <div className="px-4 py-2.5 text-xs text-zinc-600">+{open.length - 6} more</div>
            )}
          </div>
        </section>
      )}

      {/* Relationship nudges */}
      {digest.contacts.length > 0 && (
        <section>
          <SectionLabel>💬 Relationships to warm up</SectionLabel>
          <div className="bg-[#141414] rounded-2xl border border-white/6 divide-y divide-white/4 overflow-hidden">
            {digest.contacts.map((c, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{c.name}</p>
                  {c.role && <p className="text-xs text-zinc-600">{c.role}</p>}
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0">{c.daysSinceLastMet}d ago</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {overdue.length === 0 && open.length === 0 && digest.contacts.length === 0 && digest.meetings.length === 0 && (
        <div className="text-center py-12 text-zinc-600 text-sm">
          Nothing on your plate today. Enjoy the quiet. 🎉
        </div>
      )}
    </div>
  );
}
