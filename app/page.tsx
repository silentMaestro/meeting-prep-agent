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

  function handleSelectMeeting(meeting: Meeting) {
    setSelectedMeeting(meeting);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meeting Prep Agent</h1>
          <p className="text-gray-500">AI-powered research for every meeting</p>
        </div>
        <SignInButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="font-bold text-gray-900">Meeting Prep Agent</h1>
        <SignInButton />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <MeetingList selectedId={selectedMeeting?.id ?? null} onSelect={handleSelectMeeting} />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedMeeting && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Select a meeting to generate a research brief
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
