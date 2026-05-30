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
  refreshContext?: string;
}

export default function AgentProgress({ meeting, onBriefReady, refreshContext }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [statusMsg, setStatusMsg] = useState("Preparing research…");
  const [globalStatus, setGlobalStatus] = useState<"running" | "done" | "error">("running");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const abortController = new AbortController();

    async function streamResearch() {
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meeting, refreshContext }),
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          setGlobalStatus("error");
          setStatusMsg(`Server error: ${res.status}`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));

              if (event.type === "status") {
                setStatusMsg(event.message);
                if (event.message.startsWith("Researching")) {
                  const name = event.message.replace("Researching ", "").replace("...", "");
                  setSteps((prev) =>
                    prev.find((s) => s.id === name)
                      ? prev
                      : [...prev, { id: name, label: `Researching ${name}`, status: "running" }]
                  );
                } else if (event.message.startsWith("Synthesizing")) {
                  setSteps((prev) => [...prev, { id: "__synth", label: "Synthesizing brief", status: "running" }]);
                }
              } else if (event.type === "attendee_done") {
                const email = event.attendee.email;
                setSteps((prev) =>
                  prev.map((s) =>
                    s.id === email || s.label.includes(event.attendee.name)
                      ? { ...s, status: "done", label: `Researched ${event.attendee.name}` }
                      : s
                  )
                );
              } else if (event.type === "brief_done") {
                setSteps((prev) =>
                  prev.map((s) => s.id === "__synth" ? { ...s, status: "done", label: "Brief ready" } : s)
                );
                setGlobalStatus("done");
                onBriefReady(event.brief);
              } else if (event.type === "error") {
                setGlobalStatus("error");
                setStatusMsg(event.message);
                setSteps((prev) => prev.map((s) => s.status === "running" ? { ...s, status: "error" } : s));
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setGlobalStatus("error");
          setStatusMsg(err.message ?? "Connection failed");
        }
      }
    }

    streamResearch();
    return () => abortController.abort();
  }, [meeting.id, refreshContext]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 py-12">
      {/* Status icon */}
      <div className="mb-5">
        {globalStatus === "running" && (
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
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
            step.status === "running" ? "bg-violet-500/8 border-violet-500/20" :
            step.status === "done"    ? "bg-zinc-900/50 border-white/4" :
                                        "bg-red-500/8 border-red-500/20"
          }`}>
            <div className="flex-shrink-0">
              {step.status === "running" && (
                <div className="w-3 h-3 border-[1.5px] border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
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
