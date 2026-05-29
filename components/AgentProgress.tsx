"use client";

import { useEffect, useRef, useState } from "react";
import { Meeting, AgentEvent, MeetingBrief } from "@/types";

interface Props {
  meeting: Meeting;
  onBriefReady: (brief: MeetingBrief) => void;
}

export default function AgentProgress({ meeting, onBriefReady }: Props) {
  const [steps, setSteps] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSteps([]);
    setDone(false);

    const es = new EventSource(`/api/research?meetingId=${meeting.id}`, { withCredentials: true });

    // POST via fetch + ReadableStream since EventSource only does GET
    const controller = new AbortController();

    fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meeting }),
      signal: controller.signal,
    }).then(async (res) => {
      es.close();
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: AgentEvent = JSON.parse(line.slice(6));
            if (event.type === "status") {
              setSteps((s) => [...s, event.message]);
            } else if (event.type === "attendee_done") {
              setSteps((s) => [...s, `✓ Researched ${event.attendee.name}`]);
            } else if (event.type === "news_done") {
              setSteps((s) => [...s, `✓ News for ${event.news.company} (${event.news.articles.length} articles)`]);
            } else if (event.type === "brief_done") {
              setSteps((s) => [...s, "✓ Brief ready!"]);
              setDone(true);
              onBriefReady(event.brief);
            } else if (event.type === "error") {
              setSteps((s) => [...s, `✗ Error: ${event.message}`]);
            }
          } catch {}
        }
      }
    });

    return () => {
      controller.abort();
      es.close();
    };
  }, [meeting.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  return (
    <div className="p-4 bg-gray-900 rounded-lg font-mono text-sm h-full overflow-y-auto">
      <p className="text-gray-400 mb-3 text-xs uppercase tracking-wider">
        Researching: {meeting.title}
      </p>
      {steps.map((s, i) => (
        <div key={i} className={`mb-1 ${s.startsWith("✓") ? "text-green-400" : s.startsWith("✗") ? "text-red-400" : "text-gray-300"}`}>
          {!s.startsWith("✓") && !s.startsWith("✗") && (
            <span className="text-blue-400 mr-1">&gt;</span>
          )}
          {s}
        </div>
      ))}
      {!done && steps.length > 0 && (
        <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
