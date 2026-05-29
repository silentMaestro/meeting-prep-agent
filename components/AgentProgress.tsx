"use client";

import { useEffect, useRef, useState } from "react";
import { Meeting, AgentEvent, MeetingBrief } from "@/types";

interface Props {
  meeting: Meeting;
  onBriefReady: (brief: MeetingBrief) => void;
}

interface Step {
  text: string;
  status: "running" | "done" | "error";
}

export default function AgentProgress({ meeting, onBriefReady }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSteps([]);
    const controller = new AbortController();

    fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meeting }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: AgentEvent = JSON.parse(line.slice(6));
            if (event.type === "status") {
              setSteps((s) => [...s.slice(0, -1).map(x => x.status === "running" ? { ...x, status: "done" as const } : x), { text: event.message, status: "running" }]);
            } else if (event.type === "attendee_done") {
              setSteps((s) => [...s.map(x => x.status === "running" ? { ...x, status: "done" as const } : x), { text: `Researched ${event.attendee.name}`, status: "done" }]);
            } else if (event.type === "news_done") {
              setSteps((s) => [...s.map(x => x.status === "running" ? { ...x, status: "done" as const } : x), { text: `News for ${event.news.company}`, status: "done" }]);
            } else if (event.type === "brief_done") {
              setSteps((s) => s.map(x => ({ ...x, status: "done" as const })));
              onBriefReady(event.brief);
            } else if (event.type === "error") {
              setSteps((s) => [...s.map(x => x.status === "running" ? { ...x, status: "error" as const } : x), { text: event.message, status: "error" }]);
            }
          } catch {}
        }
      }
    }).catch(() => {});

    return () => controller.abort();
  }, [meeting.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  return (
    <div className="flex flex-col items-center justify-start min-h-full px-4 py-8 md:py-16">
      <div className="w-full max-w-md">
        {/* Spinner header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-14 h-14 mb-4">
            <div className="w-14 h-14 rounded-full border-[3px] border-blue-100" />
            <div className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin" />
          </div>
          <h2 className="font-semibold text-gray-900 text-center">{meeting.title}</h2>
          <p className="text-sm text-gray-400 mt-0.5">Researching attendees…</p>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                step.status === "running"
                  ? "bg-blue-50 border border-blue-100"
                  : step.status === "error"
                  ? "bg-red-50 border border-red-100"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {step.status === "running" && (
                  <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                )}
                {step.status === "done" && (
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                )}
                {step.status === "error" && (
                  <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className={`text-sm ${
                step.status === "running" ? "text-blue-700 font-medium" :
                step.status === "error" ? "text-red-600" : "text-gray-600"
              }`}>
                {step.text}
              </p>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
