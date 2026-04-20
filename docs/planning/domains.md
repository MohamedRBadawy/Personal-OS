# Personal OS — Life Domains

> Every domain of the user's life must have a home in this system. This document tracks all domains, their current coverage, and what is missing. The domains and status below reflect Mohamed's instance — the reference implementation. Update when a domain's status changes.

---

## Domain Map

### 1. Goals & Life Direction
**What it covers:** Everything Mohamed wants — hierarchical: Vision → Goal → Project → Task. Dependencies between goals. Leverage scoring (which goal unblocks the most others). Connection to the north star.

| Item | Status |
|------|--------|
| Node hierarchy (Vision → Task) | ✅ Built |
| Dependency tracking (blocked by / enables) | ✅ Built |
| Kanban, list, tree views | ✅ Built |
| Strategic prioritization / leverage scoring | ✅ Built |
| Goal decomposition (AI-assisted breakdown) | 🔧 Partial |
| Connection to daily routine | ❌ Weak — goals exist but don't surface in daily flow |
| Connection to north star (€1,000/mo) | ❌ Not explicit |
| AI-suggested next action per goal | 🔧 Partial — exists but not proactive |

**What's needed:** Goals must flow into the daily surface automatically. The system should know which goal is most relevant today and surface its next task without Mohamed having to navigate there.

---

### 2. Self / Profile
**What it covers:** Facts about Mohamed — personality, physical profile, values, constraints, family situation, financial position, known patterns and weaknesses.

| Item | Status |
|------|--------|
| About Me profile (20+ fields) | ✅ Built |
| Profile injected into AI context | ✅ Built |
| Personality / INTP context | ✅ Built |
| Known weakness tracking (instinct-over-plan) | 🔧 Partial — stored but not actively surfaced |
| Pattern recognition over time | ❌ Missing |
| AI uses profile for proactive suggestions | 🔧 Partial |

**What's needed:** Profile should be the foundation that shapes every AI interaction — not just a static form. Over time, the system should learn from Mohamed's behavior and update its understanding of him.

---

### 3. Finance
**What it covers:** Income tracking, expense tracking, debt repayment, €1,000/mo independent income goal, business income, forex.

| Item | Status |
|------|--------|
| Income / expense logging | ✅ Built |
| Multi-currency (EUR/USD/EGP) | ✅ Built |
| Category filtering and charts | ✅ Built |
| €1,000/mo progress bar | ✅ Built |
| Debt tracking and repayment timeline | 🔧 Partial |
| Business income vs. employment income split | 🔧 Partial |
| North star visibility on home surface | ❌ Not prominent enough |
| Financial forecast / projections | ❌ Missing |
| AI alerts on financial anomalies | ❌ Missing |

**What's needed:** The €1,000/mo goal and current position toward it should be permanently visible on the home surface. The system should alert when income or expenses diverge from the plan.

---

### 4. Business Development
**What it covers:** The Operations Clarity Audit service, outreach to prospects, client tracking, equity partnerships (perfumes, laptops), freelance pipeline, proposals, follow-ups.

| Item | Status |
|------|--------|
| Pipeline / opportunities tracking | ✅ Built |
| Marketing hub with campaigns | ✅ Built |
| Client tracking with follow-up dates | ✅ Built |
| Outreach tracking (sent / replied / converted) | 🔧 Partial |
| Proposal drafts and status | 🔧 Partial |
| Equity partnership tracking | ❌ Missing |
| LinkedIn outreach integration | ❌ Missing |
| Revenue per client / deal value | ❌ Missing |
| AI-drafted outreach messages | ❌ Missing |
| Connection to €1,000/mo goal | ❌ Not explicit |

**What's needed:** Business development is the primary path to the north star. It needs to be a first-class domain with outreach tracking, deal pipeline, and direct connection to the €1,000/mo progress.

---

### 5. Health
**What it covers:** Physical health, exercise, nutrition (low-carb), mood, mental state, sleep, weight, spiritual health.

| Item | Status |
|------|--------|
| Body composition logging | ✅ Built |
| Meal tracking | ✅ Built |
| Workout logging | ✅ Built |
| Mood logging | ✅ Built |
| Habit tracking | ✅ Built |
| Spiritual logging (prayer, Quran, adhkar) | ✅ Built |
| Health direction dashboard | ✅ Built |
| Health goal profiles with targets | ✅ Built |
| Health signals panel | ✅ Built |
| Consistent daily use | ❌ Not yet — exists but not pulling Mohamed in |
| AI health insights | 🔧 Partial |
| Exercise routine integration | ❌ No structured exercise plan |
| Wearable data | ❌ No wearable device |

**What's needed:** The health module is comprehensive in scope but not embedded in the daily routine. Inline logging from the home surface (already partially built) needs to make logging feel effortless, not like a chore.

---

### 6. Daily Routine & Schedule
**What it covers:** Fixed daily structure (prayer times as anchors), block-by-block routine, day schedule with time-blocking, available slot detection.

| Item | Status |
|------|--------|
| Daily routine with block indicator (● NOW) | ✅ Built |
| Block editing and notes | ✅ Built |
| Routine analytics and week matrix | ✅ Built |
| Day schedule with timeline | ✅ Built |
| Routine overlay on schedule | ✅ Built |
| AI morning briefing | ✅ Built |
| Google Calendar integration | ❌ Missing |
| Prayer time auto-sync | ❌ Missing |
| Available slot detection → task suggestion | 🔧 Partial |
| Scheduled Telegram morning brief (05:20) | ❌ Not scheduled |
| Scheduled Telegram EOD summary (20:30) | ❌ Not scheduled |

**What's needed:** Telegram scheduled pushes are the most impactful near-term gap — Mohamed gets briefed and summarized without opening the app. Google Calendar integration would complete the schedule picture.

---

### 7. Learning
**What it covers:** What to learn, in what order, why, tracking what has been learned, connecting learning to goals.

| Item | Status |
|------|--------|
| Learning log (basic) | 🔧 Partial — exists in analytics app |
| Learning roadmap | ❌ Missing |
| What to learn next (AI-suggested) | ❌ Missing |
| Learning connected to goals | ❌ Not linked |
| Time blocks for learning in routine | 🔧 Partial — routine has a learning block |
| Resources / bookmarks | ❌ Missing |

**What's needed:** A dedicated learning module where each item is linked to the goal it serves. AI suggests what to learn next based on current goals and skill gaps. Learning is not standalone — it feeds the goal hierarchy.

---

### 8. Family & Kyrgyzstan
**What it covers:** Goals for the children, educational milestones, family activities, the Kyrgyzstan move — its conditions, timeline, and preparation steps.

| Item | Status |
|------|--------|
| Family goals (basic) | 🔧 Partial — exists in analytics app |
| Kyrgyzstan move tracking | ❌ Missing |
| Children's milestones | ❌ Missing |
| Family schedule / commitments | ❌ Missing |
| Evening Quran with kids tracking | ❌ Missing |
| Trigger condition (€1,000/mo) linked to move | ❌ Not explicit in system |

**What's needed:** The Kyrgyzstan move is the most important long-term goal in the system. It needs a dedicated presence — with its trigger condition (€1,000/mo) explicitly linked to the finance tracker, and preparation steps tracked in the goal hierarchy.

---

### 9. Automations & Agents
**What it covers:** Background agents doing work toward goals, scheduled Telegram pushes, n8n automations, AI-triggered actions.

| Item | Status |
|------|--------|
| Telegram bot (manual commands) | ✅ Built |
| Management commands for brief/summary | ✅ Built (not scheduled) |
| Scheduled Telegram pushes | ❌ Missing |
| Background agents | ❌ Missing |
| n8n automation layer | ❌ Not started |
| AI-triggered actions | ❌ Missing |
| Recurring task creation | ❌ Missing |

**What's needed:** This is the highest-leverage missing layer. Even one scheduled Telegram push (morning brief at 05:20) would immediately change how Mohamed starts his day. This should be prioritized as infrastructure, not as a feature.

---

### 10. Self-Knowledge & Patterns
**What it covers:** Understanding Mohamed's own patterns over time — what energizes him, what drains him, when he is most productive, what consistently goes wrong, what consistently works.

| Item | Status |
|------|--------|
| Static profile (personality, constraints) | ✅ Built |
| Weekly review (guided modal) | ✅ Built |
| Journal for reflection | ✅ Built |
| Pattern detection over time | ❌ Missing |
| Behavioral insights (AI-derived) | ❌ Missing |
| Known weakness surfacing | ❌ Not active |

**What's needed:** The system should build a living picture of Mohamed's patterns — not just store what he tells it, but observe what he logs, when he logs it, what he avoids, and reflect that back with insight.

---

### 11. Marketing (Personal Brand)
**What it covers:** LinkedIn presence, positioning as an operational systems consultant, content, outreach, Clarity Dash portfolio.

| Item | Status |
|------|--------|
| Marketing hub with channels | ✅ Built |
| Campaign tracking | ✅ Built |
| Action log with follow-up tracker | ✅ Built |
| LinkedIn content planning | ❌ Missing |
| Portfolio (Clarity Dash) tracking | ❌ Missing |
| Personal brand positioning | ❌ Missing |
| AI-drafted content / outreach | ❌ Missing |

---

### 12. Relationships & Contacts
**What it covers:** Family, collaborators, clients, prospects, people who matter.

| Item | Status |
|------|--------|
| Contacts with follow-up dates | ✅ Built |
| Follow-up due alerts | 🔧 Partial |
| Gmail integration | ❌ Missing |
| Relationship context (who is this person, why they matter) | ❌ Missing |
| Connection to pipeline / business | ❌ Not linked |

---

## Domain Priority Order

Based on the north star and current gaps, this is the order in which domains need attention:

1. **Navigation & Interaction** — foundational; everything else depends on this being right
2. **Automations / Agents** — highest leverage; changes daily experience immediately
3. **Business Development** — direct path to €1,000/mo
4. **Goals ↔ Daily flow** — connects intention to action
5. **Family & Kyrgyzstan** — the most important long-term goal, currently invisible in the system
6. **Learning** — feeds business development and goals
7. **Self-knowledge / Patterns** — deepens everything else over time
