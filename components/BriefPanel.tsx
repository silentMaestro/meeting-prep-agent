import { MeetingBrief } from "@/types";
import AttendeeCard from "./AttendeeCard";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

export default function BriefPanel({ brief }: { brief: MeetingBrief }) {
  const hasNews = brief.companyNews.some((n) => n.articles.length > 0);

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-6 pb-24 md:pb-8">

      {/* Meta */}
      <div>
        <p className="text-xs text-zinc-600 mb-1">
          {new Date(brief.generatedAt).toLocaleString([], {
            weekday: "short", month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit"
          })}
        </p>
        <h1 className="text-lg font-bold text-zinc-100 leading-snug">{brief.title}</h1>
      </div>

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
