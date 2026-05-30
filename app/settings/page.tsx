"use client";

import { useSession } from "next-auth/react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import ConnectedCalendars from "@/components/ConnectedCalendars";
import SignInButton from "@/components/SignInButton";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    router.replace("/");
    return null;
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 safe-top">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 -ml-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-semibold text-gray-900 text-sm">Settings</h1>
      </header>

      <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-8 pb-24 md:pb-8">
        {/* Profile */}
        <section>
          <SectionLabel>Account</SectionLabel>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3">
            {user?.image ? (
              <img src={user.image} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <SignInButton compact />
          </div>
        </section>

        {/* Connected Calendars */}
        <section>
          <SectionLabel>📅 Connected Calendars</SectionLabel>
          <Suspense fallback={<div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />}>
            <ConnectedCalendars />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
