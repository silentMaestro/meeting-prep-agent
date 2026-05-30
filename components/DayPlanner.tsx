"use client";

import { useEffect, useState, useCallback } from "react";
import { TimeBlock, ActivityType, ACTIVITY_CONFIGS, DayPlan } from "@/types";
import ActivityPicker from "./ActivityPicker";

const HOUR_HEIGHT = 64; // px per hour
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;

function timeToOffset(iso: string): number {
  const d = new Date(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, (hours - DAY_START_HOUR) * HOUR_HEIGHT);
}

function blockHeight(start: string, end: string): number {
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return Math.max((mins / 60) * HOUR_HEIGHT, 24);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(start: string, end: string) {
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function nowOffset(): number | null {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  if (hours < DAY_START_HOUR || hours > DAY_END_HOUR) return null;
  return (hours - DAY_START_HOUR) * HOUR_HEIGHT;
}

interface FreeSlot { start: string; end: string; }

function computeFreeSlots(blocks: TimeBlock[], dateStr: string): FreeSlot[] {
  const dayStart = new Date(`${dateStr}T07:00:00`);
  const dayEnd   = new Date(`${dateStr}T20:00:00`);
  const sorted = [...blocks]
    .filter(b => !b.isFree)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const slots: FreeSlot[] = [];
  let cursor = dayStart.getTime();

  for (const b of sorted) {
    const bStart = new Date(b.start).getTime();
    const bEnd   = new Date(b.end).getTime();
    if (bStart > cursor + 15 * 60 * 1000) {
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(bStart).toISOString() });
    }
    cursor = Math.max(cursor, bEnd);
  }
  if (cursor < dayEnd.getTime() - 15 * 60 * 1000) {
    slots.push({ start: new Date(cursor).toISOString(), end: dayEnd.toISOString() });
  }
  return slots;
}

export default function DayPlanner() {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addedBlocks, setAddedBlocks] = useState<TimeBlock[]>([]);
  const [pickerSlot, setPickerSlot] = useState<FreeSlot | null>(null);
  const [pickerPreset, setPickerPreset] = useState<Omit<TimeBlock, "id" | "gcalEventId"> | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "suggest">("timeline");
  const [now, setNow] = useState<number | null>(nowOffset());

  // Update now-line every minute
  useEffect(() => {
    const t = setInterval(() => setNow(nowOffset()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/plan")
      .then(r => r.json())
      .then(d => { setPlan(d.plan); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const allBlocks = plan ? [...plan.blocks, ...addedBlocks] : [];
  const freeSlots = plan ? computeFreeSlots(allBlocks, plan.date) : [];
  const totalFreeHours = freeSlots.reduce((acc, s) =>
    acc + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3600000, 0);

  async function handleAddBlock(block: Omit<TimeBlock, "id" | "gcalEventId"> & { attendees?: string; location?: string }) {
    setSaving(true);
    setPickerSlot(null);
    try {
      const res = await fetch("/api/plan/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: block.title,
          start: block.start,
          end: block.end,
          description: block.description || `Added via Pocket PA · ${ACTIVITY_CONFIGS[block.type].label}`,
          attendees: (block as any).attendees,
          location: (block as any).location,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          activityType: block.type,
        }),
      });
      const data = await res.json();
      const newBlock: TimeBlock = { ...block, id: data.eventId ?? crypto.randomUUID(), gcalEventId: data.eventId };
      setAddedBlocks(prev => [...prev, newBlock]);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveBlock(block: TimeBlock) {
    if (!block.gcalEventId) {
      setAddedBlocks(prev => prev.filter(b => b.id !== block.id));
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/plan/events?eventId=${block.gcalEventId}`, { method: "DELETE" });
      setAddedBlocks(prev => prev.filter(b => b.id !== block.id));
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleAcceptSuggestion(suggested: Omit<TimeBlock, "id" | "gcalEventId">) {
    await handleAddBlock(suggested);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-600">
        Could not load day plan
      </div>
    );
  }

  const dateLabel = new Date(plan.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/6 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Day Planner</h2>
            <p className="text-xs text-zinc-600">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <div className="w-3.5 h-3.5 border-[1.5px] border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />}
            <span className="text-xs text-zinc-600 bg-zinc-900 border border-white/6 px-2 py-1 rounded-lg">
              {totalFreeHours.toFixed(1)}h free
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-xl p-1">
          {(["timeline", "suggest"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "timeline" ? "📅 Timeline" : "✨ Suggestions"}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline view */}
      {activeTab === "timeline" && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>

            {/* Hour grid lines */}
            {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
              <div key={i} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: i * HOUR_HEIGHT }}>
                <span className="text-[10px] text-zinc-700 w-10 text-right flex-shrink-0">
                  {((DAY_START_HOUR + i) % 12 || 12)}{(DAY_START_HOUR + i) < 12 ? "am" : "pm"}
                </span>
                <div className="flex-1 border-t border-white/4" />
              </div>
            ))}

            {/* Now line */}
            {now !== null && (
              <div className="absolute left-0 right-0 flex items-center gap-2 z-20 pointer-events-none" style={{ top: now }}>
                <div className="w-10 flex-shrink-0" />
                <div className="flex-1 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <div className="flex-1 border-t border-red-400/60" />
                </div>
              </div>
            )}

            {/* Event blocks */}
            <div className="absolute inset-0 ml-12">
              {/* Existing calendar events */}
              {allBlocks.filter(b => !b.isFree).map((block) => {
                const cfg = ACTIVITY_CONFIGS[block.type];
                const top = timeToOffset(block.start);
                const height = blockHeight(block.start, block.end);
                const isAdded = addedBlocks.some(b => b.id === block.id);

                return (
                  <div
                    key={block.id}
                    className={`absolute left-0 right-2 rounded-xl border px-3 py-2 overflow-hidden group transition-all ${cfg.color} ${cfg.border}`}
                    style={{ top, height: height - 2 }}
                  >
                    <div className="flex items-start justify-between gap-1 h-full">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm leading-none">{cfg.emoji}</span>
                          <p className={`text-xs font-semibold truncate leading-snug ${cfg.text}`}>{block.title}</p>
                        </div>
                        {height > 40 && (
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            {formatTime(block.start)} · {formatDuration(block.start, block.end)}
                          </p>
                        )}
                      </div>
                      {isAdded && (
                        <button
                          onClick={() => handleRemoveBlock(block)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-black/30 flex items-center justify-center flex-shrink-0"
                        >
                          <svg className="w-2.5 h-2.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Free slot tap areas */}
              {freeSlots.map((slot, i) => {
                const top = timeToOffset(slot.start);
                const height = blockHeight(slot.start, slot.end);
                if (height < 24) return null;
                return (
                  <button
                    key={i}
                    onClick={() => setPickerSlot(slot)}
                    className="absolute left-0 right-2 rounded-xl border border-dashed border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group flex items-center justify-center gap-1.5"
                    style={{ top: top + 2, height: height - 4 }}
                  >
                    <svg className="w-3 h-3 text-zinc-700 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {height > 40 && (
                      <span className="text-[10px] text-zinc-700 group-hover:text-violet-400 transition-colors font-medium">
                        {formatDuration(slot.start, slot.end)} free — tap to fill
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Suggestions view */}
      {activeTab === "suggest" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {plan.suggestedBlocks.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">
              No free time to fill today 🎉
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 mb-4">
                Claude suggests filling your {totalFreeHours.toFixed(1)} free hours like this:
              </p>
              {plan.suggestedBlocks.map((block, i) => {
                const cfg = ACTIVITY_CONFIGS[block.type as ActivityType];
                const alreadyAdded = addedBlocks.some(
                  b => b.start === block.start && b.end === block.end
                );
                return (
                  <div key={i} className={`rounded-2xl border ${cfg.color} ${cfg.border} px-4 py-3 flex items-center gap-3`}>
                    <span className="text-2xl flex-shrink-0">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${cfg.text}`}>{block.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {formatTime(block.start)} – {formatTime(block.end)} · {formatDuration(block.start, block.end)}
                      </p>
                      {block.description && (
                        <p className="text-xs text-zinc-600 mt-1 italic">{block.description}</p>
                      )}
                    </div>
                    {alreadyAdded ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex-shrink-0 font-medium">
                        Added ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setPickerPreset(block);
                          setPickerSlot({ start: block.start, end: block.end });
                        }}
                        className="flex-shrink-0 text-[10px] font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        Adjust & add
                      </button>
                    )}
                  </div>
                );
              })}

              {plan.suggestedBlocks.some(b => !addedBlocks.some(a => a.start === b.start)) && (
                <button
                  onClick={() => plan.suggestedBlocks
                    .filter(b => !addedBlocks.some(a => a.start === b.start))
                    .forEach(b => handleAcceptSuggestion(b))
                  }
                  className="w-full py-3 rounded-2xl border border-violet-500/20 bg-violet-500/8 text-sm font-semibold text-violet-400 hover:bg-violet-500/15 transition-all mt-2"
                >
                  ✨ Add all suggestions to calendar
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Activity Picker modal */}
      {pickerSlot && (
        <ActivityPicker
          slot={pickerSlot}
          preset={pickerPreset}
          onConfirm={handleAddBlock}
          onClose={() => { setPickerSlot(null); setPickerPreset(null); }}
        />
      )}
    </div>
  );
}
