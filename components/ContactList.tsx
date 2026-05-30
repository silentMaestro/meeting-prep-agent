"use client";

import { useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string | null;
  company: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  lastMetAt: string | null;
  meetingCount: number;
}

interface ContactDetail extends Contact {
  notes: string | null;
  meetings: { id: string; title: string; date: string; hasBrief: boolean }[];
  actionItems: { id: string; description: string; dueDate: string | null }[];
}

function daysSince(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "lg" ? "w-14 h-14 text-base" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function ContactCard({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  const days = daysSince(contact.lastMetAt);
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-all group border-b border-white/4 last:border-0"
    >
      <Avatar name={contact.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 truncate">{contact.name}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {[contact.role, contact.company].filter(Boolean).join(" · ") || contact.email}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        {days !== null ? (
          <p className="text-[10px] text-zinc-600">{days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`}</p>
        ) : null}
        {contact.meetingCount > 0 && (
          <p className="text-[10px] text-zinc-700">{contact.meetingCount} {contact.meetingCount === 1 ? "meeting" : "meetings"}</p>
        )}
      </div>
    </button>
  );
}

function ContactDetail({ contactId, onBack }: { contactId: string; onBack: () => void }) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${contactId}`)
      .then(r => r.json())
      .then(d => { setContact(d.contact); setNotes(d.contact?.notes ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, [contactId]);

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!contact) return null;

  const days = daysSince(contact.lastMetAt);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/6 flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/6 text-zinc-500 hover:text-zinc-300 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-zinc-200">{contact.name}</p>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Profile */}
        <div className="flex items-start gap-4">
          <Avatar name={contact.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-zinc-100">{contact.name}</h2>
            {contact.role && <p className="text-sm text-zinc-400 mt-0.5">{contact.role}</p>}
            {contact.company && <p className="text-xs text-zinc-600">{contact.company}</p>}
            <p className="text-xs text-zinc-600 mt-1">{contact.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {days !== null && (
                <span className="text-[10px] bg-zinc-800 border border-white/6 text-zinc-400 px-2 py-0.5 rounded-full">
                  Last met {days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}
                </span>
              )}
              {contact.meetings.length > 0 && (
                <span className="text-[10px] bg-zinc-800 border border-white/6 text-zinc-400 px-2 py-0.5 rounded-full">
                  {contact.meetings.length} {contact.meetings.length === 1 ? "meeting" : "meetings"}
                </span>
              )}
              {contact.linkedinUrl && (
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] bg-[#0A66C2]/15 border border-[#0A66C2]/20 text-[#5BA4F5] px-2 py-0.5 rounded-full hover:bg-[#0A66C2]/25 transition-colors">
                  LinkedIn ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {contact.bio && contact.bio !== "No public profile found" && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">About</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{contact.bio}</p>
          </div>
        )}

        {/* Open action items */}
        {contact.actionItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Open Actions</p>
            <div className="bg-[#141414] rounded-2xl border border-white/6 divide-y divide-white/4 overflow-hidden">
              {contact.actionItems.map(a => (
                <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-4 h-4 rounded border border-zinc-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-300">{a.description}</p>
                    {a.dueDate && (
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Due {new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meeting history */}
        {contact.meetings.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Meeting History</p>
            <div className="bg-[#141414] rounded-2xl border border-white/6 divide-y divide-white/4 overflow-hidden">
              {contact.meetings.map(m => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{m.title}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {new Date(m.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {m.hasBrief && (
                    <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      briefed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Your Notes</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes about this person…"
            rows={4}
            className="w-full bg-[#141414] border border-white/8 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 resize-none"
          />
          {savingNotes && <p className="text-[10px] text-zinc-600 mt-1">Saving…</p>}
        </div>
      </div>
    </div>
  );
}

export default function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/contacts")
      .then(r => r.json())
      .then(d => { setContacts(d.contacts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (selectedId) return <ContactDetail contactId={selectedId} onBack={() => setSelectedId(null)} />;

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full bg-zinc-900 border border-white/6 rounded-xl pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            {contacts.length === 0 ? (
              <>
                <p className="text-sm font-medium text-zinc-400">No contacts yet</p>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Contacts are automatically saved when you research a meeting brief.
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No contacts match "{search}"</p>
            )}
          </div>
        ) : (
          <div className="bg-[#141414] mx-4 rounded-2xl border border-white/6 overflow-hidden">
            {filtered.map(c => (
              <ContactCard key={c.id} contact={c} onClick={() => setSelectedId(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
