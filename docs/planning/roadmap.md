# Personal OS — Roadmap

> Living document. Phases are ordered by dependency and impact, not by time. Update status as work completes. Do not add calendar dates — they go stale. Use phases instead.

---

## Guiding Rules

- Every feature ships into daily use on the day it lands — no "finish building first" phase
- Never add a new top-level page without removing or merging an existing one
- AI and agents are not optional layers — every phase must advance the agent infrastructure
- The north star (€1,000/mo → Kyrgyzstan) must become more visible with each phase

---

## Phase 1 — Navigation & Interaction Redesign

**Why first:** Everything else built on top of broken navigation compounds the problem. This phase unblocks all future work by establishing a structure that can absorb new features without becoming cluttered.

**Outcome:** Mohamed opens the app and immediately knows where he is, what to do, and how to capture anything. 35+ pages collapses into 5–7 hubs with a clear principle.

### Navigation redesign
- [ ] Define the three-layer navigation principle (Execution / Awareness / Direction)
- [ ] Map all 35+ existing pages to the three layers
- [ ] Design the hub structure (5–7 top-level destinations)
- [ ] Identify pages to merge, remove, or demote to tabs
- [ ] Implement new navigation shell — sidebar + mobile nav rebuilt from scratch
- [ ] Migrate all existing pages into the new hub structure

### Interaction model redesign
- [ ] Define the capture model — one gesture from anywhere, system routes automatically
- [ ] Redesign Quick Capture: voice input support, auto-categorization, no required fields
- [ ] Define the "surfaces come to Mohamed" principle — what gets pushed vs. what is pulled
- [ ] Implement context-aware home surface: content changes based on time of day and what is active

### Proposed hub structure (to be validated)
| Hub | Layer | What lives here |
|-----|-------|----------------|
| **Now** | Execution | Today's priorities, schedule, inline logging, active tasks |
| **Goals** | Direction | Goal hierarchy, life plan, Kyrgyzstan milestone, north star progress |
| **Build** | Execution | Business development, pipeline, outreach, marketing, proposals |
| **Life** | Awareness | Health, routine, finance, family, journal |
| **Learn** | Direction | Learning roadmap, resources, what to study next |
| **Intelligence** | Awareness | Agents status, analytics, patterns, weekly review, AI insights |
| **Profile** | Direction | About Me, self-knowledge, contacts |

---

## Phase 2 — Agent Infrastructure

**Why second:** This is the highest-leverage missing layer. Even one scheduled Telegram push changes the daily experience immediately. Agents do work so Mohamed focuses on decisions.

**Outcome:** Mohamed receives a morning brief on Telegram without opening the app. Background processes are running. The system acts on his behalf.

### Scheduled Telegram agents
- [ ] Schedule morning brief at 05:20 Cairo time (management command exists, needs Render cron)
- [ ] Schedule EOD summary at 20:30 Cairo time
- [ ] Weekly review reminder on chosen evening
- [ ] Prayer time reminders (optional — if useful alongside existing apps)

### Conversational assistant
- [ ] Persistent chat interface with full context (all domains, not just goals)
- [ ] Assistant can take action: create a goal, log a habit, add a contact, draft a message
- [ ] Assistant knows: today's schedule, current priorities, recent logs, active goals
- [ ] Assistant suggests: what to focus on, what to capture, what to learn next

### Background agents (n8n layer)
- [ ] Set up n8n instance (self-hosted or cloud)
- [ ] Agent: capture inbox processor — routes Quick Captures to correct domain automatically
- [ ] Agent: follow-up tracker — surfaces overdue contacts and opportunities daily
- [ ] Agent: goal progress monitor — checks if active goals have had any progress this week
- [ ] Agent: outreach drafter — given a prospect, drafts a first message for approval

---

## Phase 3 — Missing Domain Completion

**Why third:** Navigation is clean, agents are running, now fill the gaps that make the system incomplete.

**Outcome:** Every domain in Mohamed's life has a home. Nothing important lives only in his head.

### Kyrgyzstan & Family
- [ ] Create Kyrgyzstan milestone in the goal hierarchy — with trigger condition explicitly linked to finance tracker
- [ ] Family goals module: children's milestones, educational goals, family activities
- [ ] Evening Quran session tracker (linked to routine)
- [ ] Relocation preparation checklist (visa, savings target, logistics)

### Learning
- [ ] Learning module: items linked to the goal they serve
- [ ] AI-suggested learning: given current goals and gaps, what should be studied next?
- [ ] Learning time block in routine linked to module
- [ ] Resource bookmarks with notes
- [ ] Progress tracking: what has been learned, when, how it connects to goals

### Business Development (depth)
- [ ] Equity partnership tracking (perfumes, laptops — % stake, status, next actions)
- [ ] Revenue tracking per client / deal value
- [ ] Outreach sequence tracking (sent → replied → meeting → proposal → closed)
- [ ] AI-drafted outreach messages given a prospect's context
- [ ] Clarity Dash portfolio link and case study tracking
- [ ] Direct connection: pipeline value → €1,000/mo progress bar

### Self-Knowledge & Patterns
- [ ] Weekly pattern summary: what got done, what was avoided, what energy levels looked like
- [ ] AI-derived behavioral insights (from journal + logs + goal completion patterns)
- [ ] Known weakness surfacing: system flags when instinct-over-plan pattern is detected

---

## Phase 4 — Deep Integrations

**Why fourth:** External data makes the system more complete without Mohamed having to input it manually.

**Outcome:** The app knows about calendar events, emails, and external opportunities without manual entry.

### Google Calendar → Day Schedule
- [ ] Pull today's calendar events into the schedule timeline
- [ ] Show meeting blocks alongside routine blocks
- [ ] Available slot detection accounts for both routine and calendar

### Gmail → Contacts
- [ ] Surface recent email threads per contact in the contacts module
- [ ] Flag contacts with overdue follow-up based on last email date
- [ ] AI summary of last conversation per contact

### LinkedIn / Freelancer / Upwork
- [ ] Monitor for new inbound messages or opportunities (via automation)
- [ ] Surface in pipeline automatically

---

## Phase 5 — Intelligence Deepening

**Why last:** This phase requires the data and patterns from all previous phases to be meaningful.

**Outcome:** The system genuinely helps Mohamed think — not just organizes data, but surfaces insights, predicts risks, and recommends direction.

### Prioritization engine
- [ ] Given all active goals, domains, and current state — AI produces a ranked priority list each morning
- [ ] Priority accounts for: leverage (what unblocks most), urgency, energy level, time available
- [ ] Mohamed approves or adjusts — system learns from adjustments

### Progress visibility
- [ ] North star dashboard: €1,000/mo current vs. target, trajectory, milestone distance
- [ ] Domain health scores: each domain gets a weekly signal (improving / stable / declining)
- [ ] Goal velocity: which goals are moving, which are stalled, which are at risk

### Predictive signals
- [ ] Debt-free date tracker (updates automatically from finance logs)
- [ ] Kyrgyzstan readiness score: how close to trigger condition
- [ ] Business pipeline health: projected income from current opportunities

---

## What Is NOT on the Roadmap

These decisions are made — not deferred:

- **No formal authentication.** The app is for a small trusted group. Lightweight user identification (username selector, no password) is sufficient — no OAuth, no email verification, no password reset flows.
- **No mobile app.** Telegram is the mobile interface. The web app is the desktop interface.
- **No public features.** No public profiles, no social layer, no sharing.
- **No Arabic UI yet.** Full Arabic/RTL interface is planned but deferred — it will be activated as a named feature when confirmed.
- **No new top-level pages** until Phase 1 navigation redesign is complete.
