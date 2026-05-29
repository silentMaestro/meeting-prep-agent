# Pocket PA — Roadmap

The current app does one thing: research attendees before a meeting. The vision is a PA that handles the full lifecycle of a professional relationship and workday — and is always in your pocket.

---

## Where we are

- Google Calendar integration (upcoming meetings, attendees)
- Per-attendee web research (LinkedIn, company, news)
- Meeting brief synthesis (agenda, talking points, suggested questions)
- SSE streaming progress UI
- Deployed on Vercel

---

## Immediate Next Steps (brainstorm)

These are the concrete decisions to make before building anything else.

### 1. Database Schema Design
Everything downstream depends on this. Get it right once.

Questions to answer:
- Do we store one user (you) or build multi-tenant from the start?
- How do we model a "contact" — by email, by LinkedIn URL, by name+company?
- Do we version contact data over time (e.g. track when someone changed jobs)?
- Where do meeting notes live — attached to the calendar event ID, or to a contact?
- How granular are action items — just free text, or structured (owner, due date, status)?
- Do we want full-text search, semantic search (vectors), or both?

Proposed tables to discuss:
```
users
contacts          (email, name, company, role, linkedin_url, notes, last_met_at)
meetings          (gcal_event_id, title, start_at, brief_json, notes, summary)
meeting_contacts  (meeting_id, contact_id)  ← join table
action_items      (meeting_id, contact_id, description, due_date, status, owner)
attachments       (meeting_id, drive_file_id, title, extracted_text)
digests           (user_id, sent_at, content_json)
```

Stack recommendation: **Supabase** (Postgres + pgvector + auth storage + file storage, free tier, one-click setup).

---

### 2. Mobile-First UI Redesign

The current layout is desktop-only (two-column, sidebar). On mobile it breaks.

The app needs to work as a **Progressive Web App (PWA)** — installable on iPhone home screen, offline-capable for reading briefs, native-feeling navigation.

Design decisions to make:
- **Bottom tab bar** on mobile: Today / Contacts / Actions / Settings
- **Brief card** optimised for one-handed reading — swipe between attendees
- **Tap to call / tap to email** directly from attendee card
- **Add to home screen** prompt on first visit
- **Offline mode** — cache the current day's briefs so they're readable without signal (e.g. in a lift before walking into a meeting)

PWA requirements to add:
- `manifest.json` with app name, icons, theme colour
- Service worker for offline caching of briefs
- Responsive Tailwind layout (stack vertically on mobile, sidebar on desktop)
- Viewport meta + touch-friendly tap targets (min 44px)

---

### 3. Calendar Attachment Reading

Google Calendar events often have attachments — agendas, proposals, pitch decks, pre-reads. The agent should read them automatically and surface key points in the brief.

How it works:
- Calendar API already returns `attachments[]` on each event (file ID + MIME type)
- Add `drive.readonly` to OAuth scope
- For Google Docs/Slides: Drive export API → plain text, no parsing needed
- For PDFs: download + `pdf-parse` npm package
- For external links in description: fetch + cheerio HTML extraction
- Pass extracted text to the agent as additional context before synthesis

Questions to answer:
- What's the max doc length before we need to chunk/summarise first?
- Should we show the user which attachments were read?
- Handle confidential/restricted Drive files gracefully?

---

### 4. Follow-Up Scheduling

After a meeting, the agent drafts a follow-up and suggests next steps.

Two modes to decide between:
- **Draft only** — agent writes a follow-up email and calendar invite for your review. You approve and send manually. Lower risk, better for high-stakes relationships.
- **Auto-schedule** — agent creates the calendar invite directly after you approve action items. Faster, requires `calendar` write scope.

Flow:
1. Meeting ends → you open the app (or get a push notification)
2. Paste notes or transcript (or connect Otter/Fireflies later)
3. Agent extracts action items, decisions, open questions
4. Agent drafts follow-up email per attendee
5. Agent suggests follow-up meeting time based on freebusy API
6. You approve → one tap to send email + create calendar event

OAuth scope changes needed:
- Upgrade `calendar.readonly` → `https://www.googleapis.com/auth/calendar`
- Add `https://www.googleapis.com/auth/gmail.send` (for sending follow-ups)

---

### 5. Morning Digest

Turns the app from something you open, to something that briefs you.

Delivery options to pick:
- **Email** (simplest — use Resend, free tier, 3000 emails/month)
- **Push notification** (requires service worker + web push subscription)
- **Both** — email as default, push as opt-in

Digest content:
- Today's meetings with one-line attendee summaries
- Overdue action items
- News about people/companies you're meeting today
- "Haven't spoken to X in 90 days — you meet them tomorrow" alerts

Infrastructure needed:
- Vercel Cron job (`vercel.json` → runs at 7am daily)
- Or Inngest (better for reliability, retries, observability)

---

## Phase 3 — Relationship Memory (after foundations)

Every meeting starts cold right now. A real PA remembers.

### Contact Intelligence
Per person, persist and grow over time:
- Every meeting, when and what was discussed
- Role changes (detected from updated LinkedIn research)
- Topics they care about (extracted from briefs + notes)
- Sentiment signals (was the meeting productive? tense?)

When you meet them again: "Last met 6 weeks ago re: Q3 budget. They were pushing for X. You committed to Y."

### Relationship Health
- Flag contacts not spoken to in 60/90/180 days
- "Warm-up" alerts before meeting someone you haven't seen in a while
- Strength score per relationship (frequency + recency + engagement)

### CRM Export
One-click export to CSV, or live sync to HubSpot / Notion / Airtable via their APIs.

---

## Phase 4 — Communication Layer

### Gmail Integration
- Surface recent email threads from attendees in the brief
- Summarise long threads ("14 emails about the contract — here's where it stands")
- Draft replies in your voice (learns tone from sent mail history)

### Slack Integration
- Search Slack history for conversations with attendees
- Post meeting summaries to a channel automatically
- "/brief my-next-meeting" slash command

### Calendar Intelligence
- Flag back-to-back meetings with no prep buffer
- Detect meetings with no agenda and suggest one based on history
- "You always run over with this person — block 15 extra minutes"

---

## Phase 5 — Voice & Deep Mobile

### Voice Notes
Record a voice memo on your phone after a meeting. Auto-transcribed (Whisper API), summarised, action items extracted, stored against the meeting record. No typing required.

### Siri / Shortcuts
"Hey Siri, brief me on my next meeting" → PA reads out a 90-second audio summary using TTS.

### Wearable Glance
Apple Watch complication or notification showing next meeting + top 2 talking points. No phone needed.

---

## Phase 6 — Proactive Agent Mode

The PA acts without being asked.

### Overnight Research Loop
Vercel Cron runs at midnight. Every meeting for the next 3 days is pre-researched by the time you wake up. Morning digest includes fresh briefs, no waiting.

### Proactive Relationship Nudges
"Jane just got promoted to VP — you worked together 2 years ago. Send a note?" Agent drafts the message, you approve.

### Pre-read Detection
Attendee published an article or gave a talk in the last 30 days. Surfaced automatically: "Read this before your call — it's exactly what they're focused on right now."

---

## Technical Foundations

| Foundation | Required for | Effort |
|---|---|---|
| **Supabase** (Postgres + pgvector) | Everything | Medium — schema design is the hard part |
| **Mobile PWA** (manifest + service worker) | Mobile use | Low-medium — mostly UI work |
| **Drive API** (`drive.readonly` scope) | Attachment reading | Low |
| **Calendar write scope** | Follow-up scheduling | Low (scope change + write endpoints) |
| **Vercel Cron / Inngest** | Morning digest, overnight research | Low |
| **Resend** (email delivery) | Morning digest | Low |
| **Web Push** (service worker) | Pre-meeting alerts on mobile | Medium |
| **Whisper API** | Voice notes | Low |
| **Gmail API** (`gmail.readonly` + `gmail.send`) | Email layer | Medium |

---

## Recommended Build Order

| Step | What | Why first |
|---|---|---|
| 1 | **Database schema + Supabase setup** | Unblocks everything — no memory without storage |
| 2 | **Mobile PWA + responsive layout** | Makes it usable on the go from day one |
| 3 | **Calendar attachment reading** | Immediate brief quality improvement, low effort |
| 4 | **Post-meeting notes + action items** | Closes the meeting lifecycle loop |
| 5 | **Follow-up email drafting** | High value, builds on action items |
| 6 | **Morning digest via email** | Turns it from a tool into a habit |
| 7 | **Contact memory + relationship history** | Compounds in value over time |
| 8 | **Gmail thread surfacing** | Adds context web search can't find |
| 9 | **Overnight autonomous research** | Makes the app fully proactive |

---

## Open Questions to Answer

- Multi-user from the start, or stay single-user (you) for now?
- Supabase or Neon for the database? (Supabase has more built-ins; Neon is leaner)
- Self-host the service worker or use a push service (OneSignal, Expo)?
- Voice notes via browser mic or require mobile app?
- How opinionated should the follow-up flow be — fully automated approval or always manual?
- Should contacts be deduplicated automatically (same person, different email) or manually merged?
