import { AttendeeResearch } from "@/types";

export default function AttendeeCard({ attendee }: { attendee: AttendeeResearch }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
          {attendee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{attendee.name}</h3>
          <p className="text-sm text-gray-500">{attendee.role}</p>
          <p className="text-xs text-gray-400">{attendee.email}</p>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3">{attendee.bio}</p>

      {attendee.recentActivity.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Recent Activity</p>
          <ul className="space-y-1">
            {attendee.recentActivity.map((item, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-400 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {attendee.talkingPoints.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Talking Points</p>
          <ul className="space-y-1">
            {attendee.talkingPoints.map((point, i) => (
              <li key={i} className="text-sm text-blue-700 bg-blue-50 rounded px-2 py-1">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
