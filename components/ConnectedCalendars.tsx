"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface CalendarConnection {
  id: string;
  provider: string;
  accountEmail: string;
  label: string | null;
  scopes: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function ConnectedCalendars({ showOnboardingPrompt = false }: { showOnboardingPrompt?: boolean }) {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const justConnected = searchParams.get("connected");
  const connectError = searchParams.get("error");

  useEffect(() => {
    fetch("/api/connect")
      .then((r) => r.json())
      .then((d) => { setConnections(d.connections ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [justConnected]);

  async function disconnect(id: string) {
    setDisconnecting(id);
    await fetch(`/api/connect?id=${id}`, { method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
    setDisconnecting(null);
  }

  return (
    <div className="space-y-4">
      {justConnected === "google" && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Google Calendar connected successfully.
        </div>
      )}
      {connectError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          Could not connect calendar: {connectError}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-zinc-900 rounded-2xl animate-pulse" />)}
        </div>
      ) : connections.length === 0 ? (
        showOnboardingPrompt ? (
          <div className="bg-violet-500/8 border border-violet-500/20 rounded-2xl px-5 py-6 text-center space-y-3">
            <div className="w-10 h-10 bg-violet-500/15 rounded-xl flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Connect your first calendar</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Pocket PA needs calendar access to research meetings, surface action items, and send your daily digest.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl px-4 py-4 text-center">
            <p className="text-sm font-medium text-amber-300">No calendars connected</p>
            <p className="text-xs text-amber-500/70 mt-0.5">Connect a calendar below to start syncing.</p>
          </div>
        )
      ) : (
        <div className="bg-[#141414] rounded-2xl border border-white/6 divide-y divide-white/4 overflow-hidden">
          {connections.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/8 flex items-center justify-center flex-shrink-0">
                {c.provider === "google" && <GoogleIcon />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{c.accountEmail}</p>
                <p className="text-xs text-zinc-600 capitalize">{c.provider} Calendar{c.label ? ` · ${c.label}` : ""}</p>
              </div>
              <button
                onClick={() => disconnect(c.id)}
                disabled={disconnecting === c.id}
                className="flex-shrink-0 text-xs text-zinc-600 hover:text-red-400 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-40"
              >
                {disconnecting === c.id ? "…" : "Disconnect"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add calendar */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Add calendar</p>
        <a
          href="/api/connect/google"
          className="flex items-center gap-3 bg-[#141414] border border-white/6 hover:border-white/12 rounded-2xl px-4 py-3 transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/8 flex items-center justify-center flex-shrink-0">
            <GoogleIcon />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-300">Google Calendar</p>
            <p className="text-xs text-zinc-600">Personal, work, or any Google account</p>
          </div>
          <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </a>
      </div>
    </div>
  );
}
