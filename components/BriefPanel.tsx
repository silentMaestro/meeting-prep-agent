import { MeetingBrief } from "@/types";
import AttendeeCard from "./AttendeeCard";

export default function BriefPanel({ brief }: { brief: MeetingBrief }) {
  return (
    <div className="space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{brief.title}</h2>
        <p className="text-xs text-gray-400 mt-1">
          Generated {new Date(brief.generatedAt).toLocaleString()}
        </p>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Agenda</h3>
        <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm">{brief.agenda}</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Attendees</h3>
        <div className="space-y-3">
          {brief.attendees.map((a) => (
            <AttendeeCard key={a.email} attendee={a} />
          ))}
        </div>
      </section>

      {brief.companyNews.some((n) => n.articles.length > 0) && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Company News</h3>
          {brief.companyNews.map((cn) =>
            cn.articles.length > 0 ? (
              <div key={cn.company} className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{cn.company}</p>
                <ul className="space-y-2">
                  {cn.articles.map((a, i) => (
                    <li key={i} className="text-sm border-l-2 border-gray-200 pl-3">
                      <p className="font-medium text-gray-800">{a.title}</p>
                      <p className="text-gray-500 text-xs">{a.source} · {a.date}</p>
                      {a.snippet && <p className="text-gray-600 text-xs mt-1">{a.snippet}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </section>
      )}

      {brief.suggestedQuestions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Suggested Questions</h3>
          <ul className="space-y-2">
            {brief.suggestedQuestions.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-blue-500 font-semibold flex-shrink-0">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
