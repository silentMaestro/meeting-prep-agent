"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MeetingList from "@/components/MeetingList";
import AgentProgress from "@/components/AgentProgress";
import BriefPanel from "@/components/BriefPanel";
import DigestPanel from "@/components/DigestPanel";
import SignInButton from "@/components/SignInButton";
import { Meeting, MeetingBrief } from "@/types";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [brief, setBrief] = useState<MeetingBrief | null>(null);
  const [briefs, setBriefs] = useState<Record<string, MeetingBrief>>({});
  const [researching, setResearching] = useState(false);
  const [mobileView, setMobileView] = useState<"meetings" | "brief" | "digest">("meetings");

  function handleSelectMeeting(meeting: Meeting) {
    setSelectedMeeting(meeting);
    setMobileView("brief");
    if (briefs[meeting.id]) {
      setBrief(briefs[meeting.id]);
      setResearching(false);
    } else {
      setBrief(null);
      setResearching(true);
    }
  }

  function handleBriefReady(b: MeetingBrief) {
    setBriefs((prev) => ({ ...prev, [b.meetingId]: b }));
    setBrief(b);
    setResearching(false);
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.replace("/auth/signin");
    return null;
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-5 py-4 bg-[#0f0f0f] border-b border-white/6 flex-shrink-0 safe-top">
        <div className="flex items-center gap-2.5">
          {/* Back button on mobile */}
          {(mobileView === "brief" || mobileView === "digest") && (
            <button
              onClick={() => setMobileView("meetings")}
              className="md:hidden -ml-1 p-1.5 rounded-lg hover:bg-white/6 text-zinc-400 mr-0.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <span className="font-semibold text-zinc-100 text-sm tracking-tight">
            {mobileView === "brief" && selectedMeeting
              ? <span className="truncate max-w-[180px] block text-zinc-300">{selectedMeeting.title}</span>
              : mobileView === "digest" ? "Today"
              : "Pocket PA"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobileView(mobileView === "digest" ? "meetings" : "digest")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mobileView === "digest"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/6"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
            Today
          </button>
          <Link
            href="/settings"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/6 transition-all"
          >
            <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </Link>
          <SignInButton compact />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Digest view */}
        {mobileView === "digest" && (
          <div className="w-full flex flex-1 overflow-hidden">
            <div className="hidden md:flex w-72 flex-shrink-0 border-r border-white/6 flex-col bg-[#0f0f0f]">
              <div className="px-4 pt-5 pb-2">
                <h2 className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Meetings</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MeetingList selectedId={selectedMeeting?.id ?? null} onSelect={(m) => { handleSelectMeeting(m); }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DigestPanel />
            </div>
          </div>
        )}

        {/* Normal layout */}
        {mobileView !== "digest" && (
          <>
            <div className={`w-full md:w-72 md:flex-shrink-0 border-r border-white/6 flex flex-col bg-[#0f0f0f] ${mobileView === "brief" ? "hidden md:flex" : "flex"}`}>
              <div className="px-4 pt-5 pb-2">
                <h2 className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Meetings</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MeetingList selectedId={selectedMeeting?.id ?? null} onSelect={handleSelectMeeting} />
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${mobileView === "meetings" ? "hidden md:block" : "block"}`}>
              {!selectedMeeting && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl border border-white/6 flex items-center justify-center">
                    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-400 text-sm">Select a meeting</p>
                    <p className="text-xs text-zinc-600 mt-1">Tap any meeting to generate a research brief</p>
                  </div>
                </div>
              )}
              {selectedMeeting && researching && (
                <AgentProgress meeting={selectedMeeting} onBriefReady={handleBriefReady} />
              )}
              {selectedMeeting && !researching && brief && (
                <BriefPanel brief={brief} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
