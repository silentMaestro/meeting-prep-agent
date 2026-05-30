"use client";

import { useEffect, useState, useCallback } from "react";
import { TimeBlock, ActivityType, ACTIVITY_CONFIGS, DayPlan, Meeting } from "@/types";
import ActivityPicker from "./ActivityPicker";

const HOUR_HEIGHT = 64;
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

// Overlap layout — returns column index and total columns for each block
interface LayoutBlock extends TimeBlock {
  col: number;
  totalCols: number;
}

function layoutBlocks(blocks: TimeBlock[]): LayoutBlock[] {
  const sorted = [...blocks].sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const result: LayoutBlock[] = [];
  // Groups of overlapping blocks
  const groups: TimeBlock[][] = [];

  for (const block of sorted) {
    const bStart = new Date(block.start).getTime();
    const bEnd   = new Date(block.end).getTime();
    let placed = false;
    for (const group of groups) {
      // Check if this block overlaps any block in the group
      const overlaps = group.some(g => {
        const gStart = new Date(g.start).getTime();
        const gEnd   = new Date(g.end).getTime();
        return bStart < gEnd && bEnd > gStart;
      });
      if (overlaps) {
        group.push(block);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([block]);
  }

  for (const group of groups) {
    const totalCols = group.length;
    group.forEach((block, i) => {
      result.push({ ...block, col: i, totalCols });
    });
  }
  return result;
}

interface EventDetailSheetProps {
  block: TimeBlock;
  meeting?: Meeting; // full meeting data if available
  onClose: () => void;
  onDelete: (block: TimeBlock) => Promise<void>;
  onBrief?: (meeting: Meeting) => void;
  isAdded: boolean;
}

function EventDetailSheet({ block, meeting, onClose, onDelete, onBrief, isAdded }: EventDetailSheetProps) {
  const cfg = ACTIVITY_CONFIGS[block.type];
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onDelete(block);
    onClose();
  }

  const attendees = meeting?.attendees ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b border-white/6 ${cfg.color}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{cfg.emoji}</span>
              <div>
                <p className={`text-sm font-bold ${cfg.text}`}>{block.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatTime(block.start)} – {formatTime(block.end)} · {formatDuration(block.start, block.end)}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-colors flex-shrink-0">
              <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Description */}
          {block.description && (
            <p className="text-xs text-zinc-500 leading-relaxed">{block.description}</p>
          )}

          {/* Attendees */}
          {attendees.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Attendees</p>
              <div className="space-y-1.5">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                      {(a.displayName ?? a.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-300 truncate">{a.displayName ?? a.email}</p>
                      {a.displayName && <p className="text-[10px] text-zinc-600 truncate">{a.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {/* Brief button — only for meetings with attendees */}
            {block.type === "meeting" && meeting && onBrief && (
              <button
                onClick={() => { onBrief(meeting); onClose(); }}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all"
              >
                ✨ Generate brief
              </button>
            )}

            {/* Delete — only for blocks that were added or are deletable calendar events */}
            {(isAdded || block.gcalEventId) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50 ${block.type === "meeting" && meeting && onBrief ? "px-4" : "flex-1"}`}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
}

export default function DayPlanner({ meetings, onSelectMeeting }: Props) {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addedBlocks, setAddedBlocks] = useState<TimeBlock[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [pickerSlot, setPickerSlot] = useState<FreeSlot | null>(null);
  const [pickerPreset, setPickerPreset] = useState<Omit<TimeBlock, "id" | "gcalEventId"> | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "suggest">("timeline");
  const [now, setNow] = useState<number | null>(nowOffset());
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(nowOffset()), 60000);
    return () => clearInterval(t);
  }, []);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/plan");
      const d = await res.json();
      if (d.plan) setPlan(d.plan);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlan();

    // Trigger background Google Calendar refresh, then re-fetch plan
    setSyncing(true);
    fetch("/api/meetings")
      .then(() => new Promise(r => setTimeout(r, 2500)))
      .then(() => fetchPlan())
      .finally(() => setSyncing(false));
  }, [fetchPlan]);

  // Merge: plan.blocks + addedBlocks, minus removedIds
  const allBlocks = plan
    ? [...plan.blocks.filter(b => !removedIds.has(b.id)), ...addedBlocks]
    : [];
  const freeSlots = plan ? computeFreeSlots(allBlocks, plan.date) : [];
  const totalFreeHours = freeSlots.reduce((acc, s) =>
    acc + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3600000, 0);

  async function handleAddBlock(block: Omit<TimeBlock, "id" | "gcalEventId"> & { attendees?: string; location?: string }) {
    setSaving(true);
    setPickerSlot(null);
    setPickerPreset(null);
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
    if (block.gcalEventId) {
      setSaving(true);
      try {
        await fetch(`/api/plan/events?eventId=${block.gcalEventId}`, { method: "DELETE" });
      } catch (e) { console.error(e); }
      finally { setSaving(false); }
    }
    // Remove from local state
    setAddedBlocks(prev => prev.filter(b => b.id !== block.id));
    setRemovedIds(prev => new Set([...prev, block.id]));
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

  const nonFreeBlocks = allBlocks.filter(b => !b.isFree);
  const laidOut = layoutBlocks(nonFreeBlocks);

  // Find the full Meeting object for a given block
  function meetingForBlock(block: TimeBlock): Meeting | undefined {
    return meetings.find(m => m.id === block.gcalEventId || m.id === block.id);
  }

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
            {(saving || syncing) && (
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-[1.5px] border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                {syncing && <span className="text-[10px] text-zinc-600">Syncing…</span>}
              </div>
            )}
            <span className="text-xs text-zinc-600 bg-zinc-900 border border-white/6 px-2 py-1 rounded-lg">
              {totalFreeHours.toFixed(1)}h free
            </span>
          </div>
        </div>

        <div className="flex gap-1 bg-zinc-900 rounded-xl p-1">
          {(["timeline", "suggest"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
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

            {/* Event blocks with overlap layout */}
            <div className="absolute inset-0 ml-12">
              {laidOut.map((block) => {
                const cfg = ACTIVITY_CONFIGS[block.type];
                const top = timeToOffset(block.start);
                const height = blockHeight(block.start, block.end);
                const isAdded = addedBlocks.some(b => b.id === block.id);

                // Overlap positioning
                const colWidth = 100 / block.totalCols;
                const left = `${block.col * colWidth}%`;
                const width = `calc(${colWidth}% - ${block.totalCols > 1 ? "4px" : "8px"})`;

                return (
                  <button
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className={`absolute rounded-xl border px-2 py-1.5 overflow-hidden group transition-all hover:brightness-110 text-left ${cfg.color} ${cfg.border} ${block.totalCols > 1 ? "right-0" : "right-2"}`}
                    style={{ top, height: height - 2, left, width }}
                  >
                    <div className="flex items-start gap-1 h-full">
                      <span className="text-sm leading-none flex-shrink-0">{cfg.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-semibold truncate leading-snug ${cfg.text}`}>{block.title}</p>
                        {height > 40 && (
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            {formatTime(block.start)} · {formatDuration(block.start, block.end)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
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
                    .forEach(b => handleAddBlock(b))
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

      {/* Event detail sheet */}
      {selectedBlock && (
        <EventDetailSheet
          block={selectedBlock}
          meeting={meetingForBlock(selectedBlock)}
          isAdded={addedBlocks.some(b => b.id === selectedBlock.id)}
          onClose={() => setSelectedBlock(null)}
          onDelete={handleRemoveBlock}
          onBrief={onSelectMeeting}
        />
      )}
    </div>
  );
}
