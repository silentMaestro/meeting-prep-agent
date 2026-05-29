# Pocket PA — Roadmap

The current app does one thing: research attendees before a meeting. The vision is broader — a PA that handles the full lifecycle of a professional relationship and workday, not just pre-meeting prep.

---

## Where we are

- Google Calendar integration (upcoming meetings, attendees)
- Per-attendee web research (LinkedIn, company, news)
- Meeting brief synthesis (agenda, talking points, suggested questions)
- SSE streaming progress UI
- Deployed on Vercel

---

## Phase 2 — Post-Meeting Intelligence

The meeting happened. Now what?

### Action Item Extraction
After a meeting, paste in your notes or a transcript. The agent reads it and extracts:
- Committed action items (who owns what, by when)
- Open questions that need follow-up
- Decisions made

Stores them per-meeting, surfaces overdue items on the dashboard.

### Follow-Up Email Drafting
Based on the meeting brief + your notes, draft a follow-up email to each attendee. Knows context: what was discussed, what was agreed, what you need from them. One-click copy or send via Gmail API.

### Meeting Notes Summariser
Paste a raw transcript or voice memo. Get back a clean structured summary: context, decisions, actions, next steps. Attached to the meeting record permanently.

---

## Phase 3 — Relationship Memory

Right now every meeting starts cold. A PA remembers people.

### Contact Intelligence Layer
Per person, persist across meetings:
- Every meeting you've had with them (date, topic, outcome)
- Their role changes over time
- Topics they care about (extracted from briefs + your notes)
- Last touchpoint and what was discussed

When you meet them again, the brief shows history: "Last met 3 months ago, you were discussing X, they were about to launch Y."

### Relationship Health Signals
Flag contacts you haven't spoken to in a while. Surface "warm up before meeting" alerts if you haven't interacted with someone in 90+ days. Think lightweight CRM, not Salesforce.

### Personal CRM Export
Export your contact intelligence as a CSV or sync to HubSpot/Notion. Every relationship enriched automatically just by using the app.

---

## Phase 4 — Daily Briefing

The app proactively briefs you, not the other way around.

### Morning Digest
Every morning at 8am (configurable), email or push notification with:
- Today's meetings with one-line summaries of who you're meeting
- Any overdue action items
- News mentions of key contacts or their companies
- "Warm up" nudges for neglected relationships

### Pre-Meeting Alert
30 minutes before a meeting, push a brief to your phone. No need to open the app — it finds you.

### News Monitoring
Track companies and people you meet regularly. Surface relevant news automatically:  
"Acme Corp just raised a Series B — you're meeting their CTO tomorrow."

---

## Phase 5 — Communication Layer

### Gmail Integration
- Summarise long email threads before meetings
- Draft replies in your voice (learns your tone over time)
- Surface emails from meeting attendees in the brief: "They emailed you 2 weeks ago about X"

### Slack Integration
Search your Slack history for conversations with attendees. Surface relevant threads in the brief. Post meeting summaries to a channel automatically.

### Calendar Intelligence
- Detect back-to-back meetings and flag prep time conflicts
- Suggest agenda based on previous meeting outcomes
- Auto-decline or flag meetings with no agenda

---

## Phase 6 — Voice & Mobile

### Voice Notes
Record a 2-minute voice memo after a meeting on your phone. Transcribed, summarised, action items extracted, stored against the meeting record automatically.

### Mobile PWA
Progressive web app optimised for iPhone. Pre-meeting brief as a native-feeling card. Swipe through attendees. Tap to call/email. Works offline for reading briefs.

### Siri / Shortcuts Integration
"Hey Siri, brief me on my next meeting" → PA reads out a 60-second audio summary.

---

## Phase 7 — Proactive Agent Mode

This is where it becomes a real PA.

### Autonomous Research Loop
The agent runs overnight, not just on-demand. By the time you wake up, every meeting for the next 3 days is already fully researched with fresh news and updated profiles.

### Relationship Suggestions
"You haven't spoken to Jane in 4 months. She just got promoted. Good time to reach out." Drafts a congratulations message for your review.

### Pre-read Surfacing
Detects when an attendee has published something recently (article, talk, tweet thread) and surfaces it: "Read this before your call — it's what they're focused on."

### Meeting Outcome Prediction
Based on relationship history and attendee profiles, flags meetings likely to need extra prep or that carry high stakes.

---

## Technical Foundations Needed

These cut across phases and should be built early:

| Foundation | Why it's needed |
|---|---|
| **Persistent database** (Postgres via Supabase or Neon) | Store contacts, meeting history, action items, notes |
| **Background jobs** (Vercel Cron or Inngest) | Morning digest, overnight research, news monitoring |
| **Gmail OAuth scope** | Email summarisation, follow-up drafts, send on behalf |
| **Push notifications** (web push or Resend email) | Pre-meeting alerts, morning digest delivery |
| **Vector store** (pgvector or Pinecone) | Semantic search over notes, emails, past meetings |
| **Auth upgrade** (store user prefs, multiple users) | Currently single-user assumption baked in |

---

## What to build next (recommended order)

1. **Persistent DB + contact memory** — everything else depends on remembering people
2. **Post-meeting notes + action item extraction** — closes the loop on the meeting lifecycle  
3. **Follow-up email drafting** — immediately useful, high value per effort
4. **Morning digest via email** — turns the app from pull to push; makes it a habit
5. **Gmail thread surfacing in briefs** — adds context that web search can't find
