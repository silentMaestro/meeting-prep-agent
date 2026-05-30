"use client";

import { ActivityType, ACTIVITY_CONFIGS, TimeBlock } from "@/types";
import { useState } from "react";

interface Props {
  slot: { start: string; end: string };
  onConfirm: (block: Omit<TimeBlock, "id" | "gcalEventId">) => void;
  onClose: () => void;
}

const ACTIVITY_ORDER: ActivityType[] = [
  "focus", "build", "exercise", "lunch", "break", "learning", "reminder", "other"
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function slotDuration(start: string, end: string) {
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function ActivityPicker({ slot, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<ActivityType | null>(null);
  const [title, setTitle] = useState("");
  const [customStart, setCustomStart] = useState(
    new Date(slot.start).toTimeString().slice(0, 5)
  );
  const [customEnd, setCustomEnd] = useState(
    new Date(slot.end).toTimeString().slice(0, 5)
  );

  function buildISOFromTime(timeStr: string, referenceISO: string) {
    const date = new Date(referenceISO).toISOString().split("T")[0];
    return `${date}T${timeStr}:00`;
  }

  function handleSelect(type: ActivityType) {
    setSelected(type);
    if (!title) setTitle(ACTIVITY_CONFIGS[type].label);
    // Default end time based on activity duration
    const start = new Date(slot.start);
    const defaultMins = ACTIVITY_CONFIGS[type].defaultDuration;
    const slotMins = (new Date(slot.end).getTime() - start.getTime()) / 60000;
    const useMins = Math.min(defaultMins, slotMins);
    const end = new Date(start.getTime() + useMins * 60000);
    setCustomEnd(end.toTimeString().slice(0, 5));
  }

  function handleConfirm() {
    if (!selected) return;
    const startISO = buildISOFromTime(customStart, slot.start);
    const endISO = buildISOFromTime(customEnd, slot.start);
    onConfirm({
      title: title || ACTIVITY_CONFIGS[selected].label,
      start: startISO,
      end: endISO,
      type: selected,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-zinc-100">Add to your day</h3>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
              <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            {formatTime(slot.start)} – {formatTime(slot.end)} · {slotDuration(slot.start, slot.end)} free
          </p>
        </div>

        {/* Activity grid */}
        <div className="px-4 py-4">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">What do you want to do?</p>
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITY_ORDER.map((type) => {
              const cfg = ACTIVITY_CONFIGS[type];
              const isSelected = selected === type;
              return (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? `${cfg.color} ${cfg.border}`
                      : "bg-zinc-900 border-white/6 hover:border-white/12"
                  }`}
                >
                  <span className="text-xl leading-none">{cfg.emoji}</span>
                  <span className={`text-[10px] font-medium leading-tight text-center ${isSelected ? cfg.text : "text-zinc-500"}`}>
                    {cfg.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details (shown after selection) */}
        {selected && (
          <div className="px-4 pb-4 space-y-3">
            <div className="border-t border-white/6 pt-4">
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={ACTIVITY_CONFIGS[selected].label}
                className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Start</label>
                <input
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">End</label>
                <input
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${ACTIVITY_CONFIGS[selected].color} ${ACTIVITY_CONFIGS[selected].text} border ${ACTIVITY_CONFIGS[selected].border} hover:opacity-90`}
            >
              {ACTIVITY_CONFIGS[selected].emoji} Add {title || ACTIVITY_CONFIGS[selected].label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
