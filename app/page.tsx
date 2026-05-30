"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AgentProgress from "@/components/AgentProgress";
import BriefPanel from "@/components/BriefPanel";
import DayPlanner from "@/components/DayPlanner";
import SnapshotView from "@/components/SnapshotView";
import ContactList from "@/components/ContactList";
import BottomNav from "@/components/BottomNav";
import ConnectedCalendars from "@/components/ConnectedCalendars";
import { signOut } from "next-auth/react";
import { Meeting, MeetingBrief } from "@/types";
import { useEffect, useRef } from "react";

type Tab = "snapshot" | "plan" | "contacts" | "settings";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("snapshot");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [brief, setBrief] = useState<MeetingBrief | null>(null);
  const [briefs, setBriefs] = useState<Record<string, MeetingBrief>>({});
  const [researching, setResearching] = useState(false);
  const [refreshContext, setRefreshContext] = useState<string | undefined>(undefined);

  // Shared meetings state — fetched once, passed to all tabs
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [noCalendars, setNoCalendars] = useState(false);
  const fetchedRef = useRef(false);
  const [dayStart, setDayStart] = useState("07:00");
  const [dayEnd, setDayEnd] = useState("22:00");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Load day schedule settings
  useEffect(() => {
    if (!session) return;
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings?.dayStartTime) setDayStart(d.settings.dayStartTime);
      if (d.settings?.dayEndTime) setDayEnd(d.settings.dayEndTime);
    }).catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session || fetchedRef.current) return;
    fetchedRef.current = true;
    fetch("/api/meetings")
      .then(r => r.json())
      .then(d => {
        setMeetings(d.meetings ?? []);
        setNoCalendars(!!d.noCalendars);
        setMeetingsLoading(false);
      })
      .catch(() => setMeetingsLoading(false));
  }, [session]);

  async function handleSelectMeeting(meeting: Meeting) {
    setSelectedMeeting(meeting);
    // If we have it in memory, show instantly
    if (briefs[meeting.id]) {
      setBrief(briefs[meeting.id]);
      setResearching(false);
      return;
    }
    // If the meeting has a stored brief, fetch it directly from DB (no agent needed)
    if ((meeting as any).hasBrief) {
      setBrief(null);
      setResearching(false);
      try {
        const res = await fetch(`/api/research?meetingId=${encodeURIComponent(meeting.id)}`);
        const data = await res.json();
        if (data.brief) {
          setBriefs(prev => ({ ...prev, [meeting.id]: data.brief }));
          setBrief(data.brief);
          return;
        }
      } catch {}
    }
    // No brief yet — run the agent
    setBrief(null);
    setResearching(true);
  }

  function handleBriefReady(b: MeetingBrief) {
    setBriefs(prev => ({ ...prev, [b.meetingId]: b }));
    setBrief(b);
    setResearching(false);
    setRefreshContext(undefined);
  }

  function handleBack() {
    setSelectedMeeting(null);
    setBrief(null);
    setResearching(false);
    setRefreshContext(undefined);
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    router.replace("/auth/signin");
    return null;
  }

  const showBriefView = selectedMeeting && (researching || brief);

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#0a0a0a]">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f] border-b border-white/6 flex-shrink-0 safe-top">
        <div className="flex items-center gap-2">
          {showBriefView && (
            <button
              onClick={handleBack}
              className="p-1.5 -ml-1 rounded-lg hover:bg-white/6 text-zinc-500 hover:text-zinc-300 transition-all mr-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <span className="font-semibold text-zinc-100 text-sm tracking-tight">
            {showBriefView && selectedMeeting
              ? <span className="truncate max-w-[200px] block text-zinc-300 text-xs">{selectedMeeting.title}</span>
              : "Pocket PA"}
          </span>
        </div>

        {/* Desktop tab strip */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-900 rounded-xl p-1">
          {(["snapshot", "plan", "contacts", "settings"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); handleBack(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                tab === t ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "snapshot" ? "Today" : t}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Brief overlay (full screen on mobile, right panel on desktop) */}
        {showBriefView && (
          <div className="w-full md:flex-1 flex flex-col overflow-hidden">
            {researching && selectedMeeting && (
              <AgentProgress meeting={selectedMeeting} onBriefReady={handleBriefReady} refreshContext={refreshContext} />
            )}
            {!researching && brief && (
              <div className="flex-1 overflow-y-auto">
                <BriefPanel
                  brief={brief}
                  onRefresh={(context) => {
                    if (selectedMeeting) {
                      setBriefs(prev => {
                        const next = { ...prev };
                        delete next[selectedMeeting.id];
                        return next;
                      });
                    }
                    setRefreshContext(context || undefined);
                    setBrief(null);
                    setResearching(true);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Normal tab content */}
        {!showBriefView && (
          <>
            {tab === "snapshot" && (
              <div className="flex flex-col w-full overflow-hidden">
                <SnapshotView
                  meetings={meetings}
                  loading={meetingsLoading}
                  noCalendars={noCalendars}
                  onSelectMeeting={handleSelectMeeting}
                />
              </div>
            )}

            {tab === "plan" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <DayPlanner meetings={meetings} onSelectMeeting={handleSelectMeeting} />
              </div>
            )}

            {tab === "contacts" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <ContactList />
              </div>
            )}

            {tab === "settings" && (
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
                  {/* Profile */}
                  <div className="bg-[#141414] border border-white/6 rounded-2xl px-4 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {session.user?.name?.[0]?.toUpperCase() ?? session.user?.email?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 truncate">{session.user?.name ?? "Your account"}</p>
                      <p className="text-xs text-zinc-600 truncate">{session.user?.email}</p>
                    </div>
                  </div>

                  {/* Calendars */}
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Calendars</p>
                    <ConnectedCalendars showOnboardingPrompt />
                  </div>

                  {/* Day Schedule */}
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Day Schedule</p>
                    <div className="bg-[#141414] border border-white/6 rounded-2xl px-4 py-4 space-y-4">
                      <p className="text-xs text-zinc-500">Used for free-time suggestions and meal planning in your day planner.</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Day starts</label>
                          <select
                            value={dayStart}
                            onChange={e => setDayStart(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 appearance-none"
                          >
                            {Array.from({ length: 13 }, (_, i) => i + 4).map(h => {
                              const val = `${String(h).padStart(2, "0")}:00`;
                              const label = h < 12 ? `${h}:00 am` : h === 12 ? "12:00 pm" : `${h - 12}:00 pm`;
                              return <option key={val} value={val}>{label}</option>;
                            })}
                          </select>
                        </div>
                        <div className="flex items-end pb-2 text-zinc-600">→</div>
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Day ends</label>
                          <select
                            value={dayEnd}
                            onChange={e => setDayEnd(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 appearance-none"
                          >
                            {Array.from({ length: 13 }, (_, i) => i + 12).map(h => {
                              const val = `${String(h).padStart(2, "0")}:00`;
                              const label = h === 12 ? "12:00 pm" : `${h - 12}:00 pm`;
                              return <option key={val} value={val}>{label}</option>;
                            })}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setSavingSchedule(true);
                          await fetch("/api/settings", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dayStartTime: dayStart, dayEndTime: dayEnd }),
                          });
                          setSavingSchedule(false);
                        }}
                        disabled={savingSchedule}
                        className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
                      >
                        {savingSchedule ? "Saving…" : "Save schedule"}
                      </button>
                    </div>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="w-full py-3 rounded-2xl border border-red-500/20 text-sm font-medium text-red-400 hover:bg-red-500/8 transition-all"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav (mobile only) */}
      <BottomNav active={showBriefView ? tab : tab} onChange={t => { setTab(t); handleBack(); }} />
    </div>
  );
}
