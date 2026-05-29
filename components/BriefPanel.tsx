import { MeetingBrief } from "@/types";
import AttendeeCard from "./AttendeeCard";

export default function BriefPanel({ brief }: { brief: MeetingBrief }) {
  const hasNews = brief.companyNews.some((n) => n.articles.length > 0);

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-6 pb-24 md:pb-8">

      {/* Meta */}
      <div>
        <p className="text-xs text-gray-400 mb-1">
          {new Date(brief.generatedAt).toLocaleString([], {
            weekday: "short", month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit"
          })}
        </p>
        <h1 className="text-xl font-bold text-gray-900 leading-snug">{brief.title}</h1>
      </div>

      {/* Agenda */}
      <section className="bg-blue-50 rounded-2xl px-4 py-4">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">Agenda</p>
        <p className="text-sm text-blue-900 leading-relaxed">{brief.agenda}</p>
      </section>

      {/* Suggested Questions */}
      {brief.suggestedQuestions.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Questions to Ask</p>
          <div className="space-y-2">
            {brief.suggestedQuestions.map((q, i) => (
              <div key={i} className="flex gap-3 items-start bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-snug">{q}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Attendees */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Attendees ({brief.attendees.length})
        </p>
        <div className="space-y-3">
          {brief.attendees.map((a) => (
            <AttendeeCard key={a.email} attendee={a} />
          ))}
        </div>
      </section>

      {/* Company News */}
      {hasNews && (
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company News</p>
          <div className="space-y-3">
            {brief.companyNews.map((cn) =>
              cn.articles.length > 0 ? (
                <div key={cn.company} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 border-b border-gray-50">
                    <p className="text-xs font-semibold text-gray-500">{cn.company}</p>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {cn.articles.map((a, i) => (
                      <li key={i} className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{a.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.source} · {a.date}</p>
                        {a.snippet && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{a.snippet}</p>
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
