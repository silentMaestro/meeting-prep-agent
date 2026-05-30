"use client";

import { useEffect, useRef, useState } from "react";
import { Meeting, AgentEvent, MeetingBrief } from "@/types";

interface Step {
  id: string;
  label: string;
  status: "running" | "done" | "error";
}

interface Props {
  meeting: Meeting;
  onBriefReady: (brief: MeetingBrief) => void;
}

export default function AgentProgress({ meeting, onBriefReady }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [statusMsg, setStatusMsg] = useState("Preparing research…");
  const [globalStatus, setGlobalStatus] = useState<"running" | "done" | "error">("running");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const es = new EventSource(`/api/research?meetingId=${meeting.id}`);

    es.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);

      if (event.type === "status") {
        setStatusMsg(event.message);
        // Add a step row for notable status messages
        if (event.message.startsWith("Researching")) {
          const email = event.message.replace("Researching ", "");
          setSteps((prev) =>
            prev.find((s) => s.id === email)
              ? prev
              : [...prev, { id: email, label: `Researching ${email}`, status: "running" }]
          );
        } else if (event.message.startsWith("Synthesizing")) {
          setSteps((prev) => [...prev, { id: "__synth", label: "Synthesizing brief", status: "running" }]);
        }
      } else if (event.type === "attendee_done") {
        const email = event.attendee.email;
        setSteps((prev) =>
          prev.map((s) =>
            s.id === email ? { ...s, status: "done", label: `Researched ${email}` } : s
          )
        );
      } else if (event.type === "news_done") {
        // no-op for step display
      } else if (event.type === "brief_done") {
        setSteps((prev) =>
          prev.map((s) => s.id === "__synth" ? { ...s, status: "done", label: "Brief ready" } : s)
        );
        setGlobalStatus("done");
        onBriefReady(event.brief);
        es.close();
      } else if (event.type === "error") {
        setGlobalStatus("error");
        setStatusMsg(event.message);
        setSteps((prev) => prev.map((s) => s.status === "running" ? { ...s, status: "error" } : s));
        es.close();
      }
    };

    es.onerror = () => { setGlobalStatus("error"); es.close(); };
    return () => es.close();
  }, [meeting.id]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 py-12">
      {/* Status icon */}
      <div className="mb-5">
        {globalStatus === "running" && (
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        )}
        {globalStatus === "done" && (
          <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        )}
        {globalStatus === "error" && (
          <div className="w-10 h-10 bg-red-500/15 border border-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
        )}
      </div>

      <h2 className="text-sm font-semibold text-zinc-300 mb-1 text-center">
        {globalStatus === "running" ? "Researching meeting…" : globalStatus === "done" ? "Research complete" : "Research failed"}
      </h2>
      <p className="text-xs text-zinc-600 mb-8 text-center max-w-xs">{globalStatus === "running" ? statusMsg : meeting.title}</p>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-2">
        {steps.map((step) => (
          <div key={step.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
            step.status === "running" ? "bg-blue-500/8 border-blue-500/20" :
            step.status === "done"    ? "bg-zinc-900/50 border-white/4" :
                                        "bg-red-500/8 border-red-500/20"
          }`}>
            <div className="flex-shrink-0">
              {step.status === "running" && (
                <div className="w-3 h-3 border-[1.5px] border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
              )}
              {step.status === "done" && (
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
              {step.status === "error" && (
                <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className={`text-xs font-medium ${
              step.status === "running" ? "text-zinc-300" :
              step.status === "done"    ? "text-zinc-500" :
                                          "text-red-400"
            }`}>{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
