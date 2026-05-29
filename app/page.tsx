"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import MeetingList from "@/components/MeetingList";
import AgentProgress from "@/components/AgentProgress";
import BriefPanel from "@/components/BriefPanel";
import SignInButton from "@/components/SignInButton";
import { Meeting, MeetingBrief } from "@/types";

export default function Home() {
  const { data: session, status } = useSession();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [brief, setBrief] = useState<MeetingBrief | null>(null);
  const [briefs, setBriefs] = useState<Record<string, MeetingBrief>>({});
  const [researching, setResearching] = useState(false);
  const [mobileView, setMobileView] = useState<"meetings" | "brief">("meetings");

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
          <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Pocket PA</h1>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Research every meeting attendee automatically. Walk in prepared every time.
          </p>
        </div>
        <SignInButton />
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Connects to your Google Calendar. Read-only access — we never modify your events.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0 safe-top">
        <div className="flex items-center gap-2">
          {/* Back button on mobile when viewing brief */}
          {mobileView === "brief" && (
            <button
              onClick={() => setMobileView("meetings")}
              className="md:hidden -ml-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 mr-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">
            {mobileView === "brief" && selectedMeeting
              ? <span className="truncate max-w-[160px] block">{selectedMeeting.title}</span>
              : "Pocket PA"}
          </span>
        </div>
        <SignInButton compact />
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — always visible on desktop, hidden on mobile when viewing brief */}
        <div className={`
          w-full md:w-80 md:flex-shrink-0 bg-white md:border-r border-gray-100 flex flex-col
          ${mobileView === "brief" ? "hidden md:flex" : "flex"}
        `}>
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming Meetings</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MeetingList selectedId={selectedMeeting?.id ?? null} onSelect={handleSelectMeeting} />
          </div>
        </div>

        {/* Main panel — hidden on mobile when viewing list */}
        <div className={`
          flex-1 overflow-y-auto
          ${mobileView === "meetings" ? "hidden md:block" : "block"}
        `}>
          {!selectedMeeting && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-700">Select a meeting</p>
                <p className="text-sm text-gray-400 mt-0.5">Tap any meeting to generate a research brief</p>
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
      </div>
    </div>
  );
}
