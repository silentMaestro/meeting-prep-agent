"use client";

import { useState } from "react";
import { MeetingBrief } from "@/types";
import AttendeeCard from "./AttendeeCard";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

interface Props {
  brief: MeetingBrief;
  onRefresh?: (context: string) => void;
}

export default function BriefPanel({ brief, onRefresh }: Props) {
  const hasNews = brief.companyNews.some((n) => n.articles.length > 0);
  const [showRefresh, setShowRefresh] = useState(false);
  const [refreshContext, setRefreshContext] = useState("");

  function handleRefresh() {
    onRefresh?.(refreshContext.trim());
    setShowRefresh(false);
    setRefreshContext("");
  }

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-6 pb-24 md:pb-8">

      {/* Meta + refresh */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-600 mb-1">
            {new Date(brief.generatedAt).toLocaleString([], {
              weekday: "short", month: "short", day: "numeric",
              hour: "numeric", minute: "2-digit"
            })}
          </p>
          <h1 className="text-lg font-bold text-zinc-100 leading-snug">{brief.title}</h1>
        </div>
        {onRefresh && (
          <button
            onClick={() => setShowRefresh(v => !v)}
            className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-white/8 px-2.5 py-1.5 rounded-lg transition-all mt-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* Refresh panel */}
      {showRefresh && (
        <div className="bg-zinc-900 border border-white/8 rounded-2xl px-4 py-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-400">What should the refresh focus on?</p>
          <input
            value={refreshContext}
            onChange={e => setRefreshContext(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleRefresh()}
            placeholder="e.g. their recent funding round, new product launch… or leave blank"
            autoFocus
            className="w-full bg-[#0a0a0a] border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
            >
              Re-run research
            </button>
            <button
              onClick={() => { setShowRefresh(false); setRefreshContext(""); }}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agenda */}
      <section className="bg-violet-500/8 border border-violet-500/20 rounded-2xl px-4 py-4">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-1.5">Agenda</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{brief.agenda}</p>
      </section>

      {/* Suggested Questions */}
      {brief.suggestedQuestions.length > 0 && (
        <section>
          <SectionLabel>Questions to Ask</SectionLabel>
          <div className="space-y-2">
            {brief.suggestedQuestions.map((q, i) => (
              <div key={i} className="flex gap-3 items-start bg-[#141414] border border-white/6 rounded-xl px-4 py-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-zinc-300 leading-snug">{q}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Attendees */}
      <section>
        <SectionLabel>Attendees ({brief.attendees.length})</SectionLabel>
        <div className="space-y-3">
          {brief.attendees.map((a) => (
            <AttendeeCard key={a.email} attendee={a} />
          ))}
        </div>
      </section>

      {/* Company News */}
      {hasNews && (
        <section>
          <SectionLabel>Company News</SectionLabel>
          <div className="space-y-3">
            {brief.companyNews.map((cn) =>
              cn.articles.length > 0 ? (
                <div key={cn.company} className="bg-[#141414] border border-white/6 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/4">
                    <p className="text-xs font-semibold text-zinc-500">{cn.company}</p>
                  </div>
                  <ul className="divide-y divide-white/4">
                    {cn.articles.map((a, i) => (
                      <li key={i} className="px-4 py-3">
                        <p className="text-sm font-medium text-zinc-200 leading-snug">{a.title}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{a.source} · {a.date}</p>
                        {a.snippet && (
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{a.snippet}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </section>
      )}
    </div>
  );
}
