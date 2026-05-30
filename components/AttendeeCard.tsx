import { AttendeeResearch } from "@/types";

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-lg shadow-violet-900/30">
      {initials}
    </div>
  );
}

function LinkPill({ label, url }: { label: string; url: string }) {
  const isLinkedIn = label.toLowerCase().includes("linkedin");
  const isGitHub = label.toLowerCase().includes("github");
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
        isLinkedIn ? "bg-[#0A66C2]/15 text-[#5BA4F5] hover:bg-[#0A66C2]/25" :
        isGitHub   ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" :
                     "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {isLinkedIn && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )}
      {isGitHub && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
      )}
      {!isLinkedIn && !isGitHub && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      )}
      {label}
    </a>
  );
}

export default function AttendeeCard({ attendee }: { attendee: AttendeeResearch }) {
  const validLinks = (attendee.links ?? []).filter((l) => l.url?.startsWith("http"));

  return (
    <div className="bg-[#141414] border border-white/8 rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <Avatar name={attendee.name} />
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-semibold text-zinc-100 text-sm leading-snug">{attendee.name}</h3>
          {attendee.role !== "Unknown" && (
            <p className="text-xs text-zinc-400 mt-0.5">{attendee.role}</p>
          )}
          <p className="text-xs text-zinc-600 mt-0.5">{attendee.email}</p>
          {validLinks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {validLinks.map((link, i) => <LinkPill key={i} label={link.label} url={link.url} />)}
            </div>
          )}
        </div>
      </div>

      {attendee.bio && attendee.bio !== "No public profile found" && attendee.bio !== "Research unavailable." && (
        <div className="px-4 pb-3">
          <p className="text-sm text-zinc-400 leading-relaxed">{attendee.bio}</p>
        </div>
      )}

      {(attendee.recentActivity.length > 0 || attendee.talkingPoints.length > 0) && (
        <div className="border-t border-white/6">
          {attendee.recentActivity.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Recent Activity</p>
              <ul className="space-y-1.5">
                {attendee.recentActivity.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex gap-2 leading-snug">
                    <span className="text-zinc-700 flex-shrink-0 mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {attendee.talkingPoints.length > 0 && (
            <div className={`px-4 py-3 ${attendee.recentActivity.length > 0 ? "border-t border-white/6" : ""}`}>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Talking Points</p>
              <ul className="space-y-2">
                {attendee.talkingPoints.map((point, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-4 h-4 rounded-md bg-violet-500/15 text-violet-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-300 leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
