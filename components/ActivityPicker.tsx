"use client";

import { ActivityType, ACTIVITY_CONFIGS, TimeBlock } from "@/types";
import { useState } from "react";

interface Props {
  slot: { start: string; end: string };
  preset?: Omit<TimeBlock, "id" | "gcalEventId"> | null;
  onConfirm: (block: Omit<TimeBlock, "id" | "gcalEventId"> & { attendees?: string; location?: string }) => void;
  onClose: () => void;
}

const ACTIVITY_ORDER: ActivityType[] = [
  "focus", "build", "exercise", "lunch", "break", "learning", "reminder", "meeting", "other"
];

function toTimeStr(iso: string) {
  return new Date(iso).toTimeString().slice(0, 5);
}

function buildISO(timeStr: string, referenceISO: string) {
  // Take the date portion directly from the string — never go through UTC conversion,
  // which shifts evening times to the next day in behind-UTC timezones.
  const date = referenceISO.split("T")[0];
  return `${date}T${timeStr}:00`;
}

function slotDuration(start: string, end: string) {
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Generate 15-min interval options within the slot
function timeOptions(slotStart: string, slotEnd: string) {
  const options: string[] = [];
  let cur = new Date(slotStart).getTime();
  const end = new Date(slotEnd).getTime();
  while (cur <= end) {
    options.push(new Date(cur).toTimeString().slice(0, 5));
    cur += 15 * 60 * 1000;
  }
  return options;
}

function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2, "0")}${ampm}`;
}

export default function ActivityPicker({ slot, preset, onConfirm, onClose }: Props) {
  const [step, setStep] = useState<"time" | "activity" | "details">(preset ? "details" : "time");
  const [customStart, setCustomStart] = useState(toTimeStr(preset?.start ?? slot.start));
  const [customEnd, setCustomEnd]     = useState(toTimeStr(preset?.end ?? slot.end));
  const [selected, setSelected]       = useState<ActivityType | null>(preset?.type ?? null);
  const [title, setTitle]             = useState(preset?.title ?? "");
  const [attendees, setAttendees]     = useState("");
  const [location, setLocation]       = useState("");
  const [description, setDescription] = useState(preset?.description ?? "");

  const startOptions = timeOptions(slot.start, slot.end);
  const endOptions   = timeOptions(
    buildISO(customStart, slot.start),
    slot.end
  ).filter(t => t > customStart);

  function handleSelectActivity(type: ActivityType) {
    setSelected(type);
    if (!title) setTitle(ACTIVITY_CONFIGS[type].label);
    // Default duration
    const startMs = new Date(buildISO(customStart, slot.start)).getTime();
    const slotEndMs = new Date(slot.end).getTime();
    const defaultMs = ACTIVITY_CONFIGS[type].defaultDuration * 60 * 1000;
    const endMs = Math.min(startMs + defaultMs, slotEndMs);
    setCustomEnd(new Date(endMs).toTimeString().slice(0, 5));
    setStep("details");
  }

  function handleConfirm() {
    if (!selected) return;
    onConfirm({
      title: title || ACTIVITY_CONFIGS[selected].label,
      start: buildISO(customStart, slot.start),
      end:   buildISO(customEnd, slot.start),
      type: selected,
      description,
      ...(selected === "meeting" ? { attendees, location } : {}),
    });
  }

  const cfg = selected ? ACTIVITY_CONFIGS[selected] : null;
  const duration = (() => {
    const startMs = new Date(buildISO(customStart, slot.start)).getTime();
    const endMs   = new Date(buildISO(customEnd,   slot.start)).getTime();
    const mins = Math.round((endMs - startMs) / 60000);
    if (mins <= 0) return "";
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60); const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== "time" && (
              <button
                onClick={() => { setStep(step === "details" ? "activity" : "time"); setSelected(null); }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors mr-1"
              >
                <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {step === "time" ? "Choose a time range" : step === "activity" ? "What do you want to do?" : cfg?.label}
              </h3>
              <p className="text-xs text-zinc-500">
                {step === "time"
                  ? `${formatTime(slot.start)} – ${formatTime(slot.end)} · ${slotDuration(slot.start, slot.end)} available`
                  : `${timeLabel(customStart)} – ${timeLabel(customEnd)} · ${duration}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors flex-shrink-0">
            <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Time range */}
        {step === "time" && (
          <div className="px-5 py-5 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-2">Start</label>
                <select
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 appearance-none"
                >
                  {startOptions.slice(0, -1).map(t => (
                    <option key={t} value={t}>{timeLabel(t)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-2.5 text-zinc-600">→</div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-2">End</label>
                <select
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 appearance-none"
                >
                  {endOptions.map(t => (
                    <option key={t} value={t}>{timeLabel(t)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual bar */}
            <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-violet-500/60 rounded-full"
                style={{
                  left: `${((new Date(buildISO(customStart, slot.start)).getTime() - new Date(slot.start).getTime()) / (new Date(slot.end).getTime() - new Date(slot.start).getTime())) * 100}%`,
                  width: `${((new Date(buildISO(customEnd, slot.start)).getTime() - new Date(buildISO(customStart, slot.start)).getTime()) / (new Date(slot.end).getTime() - new Date(slot.start).getTime())) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-zinc-500 text-center">{duration} selected out of {slotDuration(slot.start, slot.end)} available</p>

            <button
              onClick={() => setStep("activity")}
              disabled={customEnd <= customStart}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
            >
              Choose activity →
            </button>
          </div>
        )}

        {/* Step 2: Activity type */}
        {step === "activity" && (
          <div className="px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_ORDER.map(type => {
                const c = ACTIVITY_CONFIGS[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectActivity(type)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-white/6 bg-zinc-900 hover:border-white/16 hover:bg-zinc-800 transition-all group"
                  >
                    <span className="text-2xl leading-none">{c.emoji}</span>
                    <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 text-center leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === "details" && cfg && (
          <div className="px-5 py-4 space-y-3">
            {/* Time range (editable, shown when coming from suggestion) */}
            {preset && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Start</label>
                  <select
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 appearance-none"
                  >
                    {timeOptions(slot.start, slot.end).slice(0, -1).map(t => (
                      <option key={t} value={t}>{timeLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2 text-zinc-600">→</div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">End</label>
                  <select
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 appearance-none"
                  >
                    {timeOptions(buildISO(customStart, slot.start), slot.end).filter(t => t > customStart).map(t => (
                      <option key={t} value={t}>{timeLabel(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {/* Title */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={cfg.label}
                className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>

            {/* Meeting-specific fields */}
            {selected === "meeting" && (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Attendees <span className="text-zinc-700 normal-case font-normal">(emails, comma-separated)</span></label>
                  <input
                    value={attendees}
                    onChange={e => setAttendees(e.target.value)}
                    placeholder="jane@company.com, bob@company.com"
                    className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">Location / Link</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Zoom link or room name"
                    className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </>
            )}

            {/* Description / notes for all types */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest block mb-1.5">
                {selected === "meeting" ? "Agenda / Notes" : "Notes"} <span className="text-zinc-700 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={selected === "meeting" ? "What's this meeting about?" : "Any notes…"}
                rows={2}
                className="w-full bg-zinc-900 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>

            <button
              onClick={handleConfirm}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${cfg.color} ${cfg.text} border ${cfg.border} hover:opacity-90`}
            >
              {cfg.emoji} Add to calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
