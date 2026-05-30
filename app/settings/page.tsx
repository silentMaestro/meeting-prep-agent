"use client";

import { useSession } from "next-auth/react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import ConnectedCalendars from "@/components/ConnectedCalendars";
import SignInButton from "@/components/SignInButton";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) { router.replace("/auth/signin"); return null; }

  const user = session.user;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="bg-[#0f0f0f] border-b border-white/6 px-4 py-3 flex items-center gap-3 safe-top">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-white/6 text-zinc-500 hover:text-zinc-300 -ml-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-semibold text-zinc-100 text-sm">Settings</h1>
      </header>

      <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-8 pb-24 md:pb-8">
        {/* Profile */}
        <section>
          <SectionLabel>Account</SectionLabel>
          <div className="bg-[#141414] rounded-2xl border border-white/6 px-4 py-4 flex items-center gap-3">
            {user?.image ? (
              <img src={user.image} alt="" className="w-10 h-10 rounded-full ring-1 ring-white/10 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{user?.name ?? "—"}</p>
              <p className="text-xs text-zinc-600 truncate">{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Connected Calendars */}
        <section>
          <SectionLabel>📅 Connected Calendars</SectionLabel>
          <Suspense fallback={<div className="h-32 bg-zinc-900 rounded-2xl animate-pulse" />}>
            <ConnectedCalendars showOnboardingPrompt />
          </Suspense>
        </section>

        {/* Sign out */}
        <section>
          <SectionLabel>Session</SectionLabel>
          <div className="bg-[#141414] rounded-2xl border border-white/6 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-zinc-400">Signed in as <span className="text-zinc-300">{user?.email}</span></p>
            <SignInButton compact={false} />
          </div>
        </section>
      </div>
    </div>
  );
}
