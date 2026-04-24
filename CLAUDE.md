# Personal OS — Project Bible

> This file is the source of truth for every session. Read it first. Never ask the owner to repeat this context.

---

## Who is building this and why

**Owner:** Mohamed (INTP) — thinks in systems, generates ideas faster than he can execute them, needs everything out of his head and into a trusted external system.

**Core problem being solved:**
- Too many things competing for attention: personal goals, family responsibilities, problems to fix, business ideas, hopes, plans
- No single place where everything lives and connects
- Hard to know what to do next, in what order, and why
- Wants to achieve a lot — in the shortest time possible — without losing track of anything

**The app IS the system.** It is not a tool he checks occasionally. It is the operating layer for his entire life.

---

## The Vision (in his words)

> "I want to document everything in one place, even the facts about me. I want to do things in the right direction and in the best order possible. I don't want to repeat myself. I want to achieve a lot in the shortest time possible and be more effective and organized and to get everything out of my mind and to have a very clear detailed plan for everything. I want to be able to connect the dots so each point can help the other points. I want to get the help of AI as much as possible inside and outside the app. I want to build the most possible productivity system using AI tools and automations."

---

## What the system needs to do

### 1. Capture everything
- Ideas (business, personal, creative)
- Problems to solve (personal, family, financial)
- Goals (short-term, long-term)
- Facts about himself (personality, strengths, patterns, values, constraints)
- People and relationships
- Reference information

### 2. Connect the dots
- Goals should link to other goals — completing one accelerates another
- Ideas should connect to projects
- Daily actions should trace back to long-term outcomes
- Every node in the system should know what it depends on and what it enables

### 3. Prioritize intelligently
- Given everything in the system, AI should be able to say: "Do this next, because it unblocks these 3 other things"
- Order by leverage — what one action creates the most downstream progress?
- Surface what is blocked, what is ready to execute, what is overdue

### 4. Plan clearly
- Every goal has a breakdown: why → what → how → when
- Nothing lives only in his head
- Plans are detailed enough that he could hand them to someone else

### 5. Execute consistently
- Daily routine anchors the day
- Schedule shows where time goes
- Check-ins and reviews close the loop

### 6. Use AI as a core layer (not an add-on)
- AI reads the full context (his profile, his goals, his blocks)
- AI helps prioritize, write plans, generate ideas, review progress
- Automations reduce manual work wherever possible
- Goal: Mohamed thinks → AI structures and organizes → System executes

---

## Key domain areas (all in scope)

| Area | What it covers |
|------|---------------|
| **Goals / Nodes** | Everything he wants — hierarchical: Vision → Goal → Project → Task |
| **Self / Profile** | Facts about Mohamed: personality, values, strengths, family situation, constraints |
| **Finance** | Income tracking, expense tracking, target: €1000/mo independent |
| **Business Ideas** | Pipeline of ideas, evaluation, connection to goals |
| **Daily Routine** | Fixed structure for the day |
| **Day Schedule** | Time-blocked calendar with available slot detection |
| **Health** | Physical and mental health tracking |
| **People / Contacts** | Family, collaborators, relationships |
| **Journal** | Reflection, thinking, processing |
| **Analytics** | Is the system actually working? Are things improving? |

---

## Financial north star

**Target:** €1000/mo passive or semi-passive income = financial independence
**Trigger:** This number must be reached before the family moves to Kyrgyzstan.
**Current:** €0 independent income. €700/mo from K Line Europe (employment, not independent).

Everything in the system should be traceable to this or to the quality of life that surrounds it.

---

## AI integration principles

1. **AI knows him** — there is a profile/context layer that AI always reads before responding
2. **AI suggests, he decides** — AI surfaces the best next action, he confirms
3. **AI writes plans** — given a goal, AI generates a breakdown he can edit
4. **AI connects** — given a new idea, AI shows what existing goals it relates to
5. **Automate the boring** — anything repetitive should eventually be automated

---

## Current deployment

| Service | URL |
|---------|-----|
| Frontend | https://personal-os-frontend.onrender.com |
| Backend API | https://personal-os-api-xk0z.onrender.com |
| Database | Neon PostgreSQL (free tier) |
| Repo | github.com/MohamedRBadawy/Personal-OS |

Both services auto-deploy from `master` branch via `render.yaml` Blueprint.

Local dev:
- Backend: `cd backend && python manage.py runserver`
- Frontend: `cd frontend && npm run dev`

---

## Tech stack

- **Backend:** Django 5.1 + Django REST Framework + PostgreSQL
- **Frontend:** React + TypeScript + Vite + React Query + React Router
- **AI:** Anthropic Claude API (configurable: deterministic / anthropic / gemini)
- **Deployment:** Render.com (free tier — backend Python web service + frontend static site)

---

## What has been built (as of April 2026)

**Core System**
- Goals/Nodes hierarchy (Vision → Goal → Project → Task) with list, tree, and kanban views
- Node dependencies: "blocked by" + "enables/unlocks" visible in side panel
- Strategic Prioritization tab — leverage scores rank all active nodes
- AI Next Action — auto-fetched on Home page load; reads profile + goals + routine context
- Quick Capture FAB (💡) on every page — Ctrl+Shift+I shortcut; idea → goal conversion flow

**Daily Operations**
- Daily Routine with current block indicator (● NOW), auto-scroll, auto-expand, streak dots
- Day Schedule with timeline, routine blocks overlay, available slot detection, day/week views
- Journal with auto-save, yesterday's focus callout, past entries
- Health module (mood, habits, spiritual sub-pages all routed)
- Weekly Review guided modal (4-step flow: wins → challenges → focus → generate)

**Finance & Business**
- Finance Workspace: income/expense tracking, income events log, €1,000/mo progress bar
- Pipeline: opportunities, status board, client tracking
- Marketing Hub: channels, campaigns, action log with follow-up tracker
- Contacts with follow-up due dates

**Intelligence Layer**
- About Me / Profile: 20+ fields (personality, physical, financial), ProfileSections, singleton model
- Profile context injected into AI Next Action recommendations
- Analytics Overview with streak summary (routine streak, prayer rate, exercise streak)
- Telegram bot: /brief, /next, /capture, /status — fully functional webhook

**Connectivity**
- Node dependency count badge on goal rows (↗N)
- Ideas → Goals conversion (validate + link)
- GoalsLifePlanPage (life map, family goals) and IdeasThinkingPage both routed and in nav
- All nav items routed and functional (16+ pages)

---

## What is NOT built yet

1. **Scheduled Telegram automations** — management commands exist (`send_morning_brief`, `send_eod_summary`) but aren't scheduled; need Render cron jobs at 05:20 and 20:30 Cairo time
2. **Gmail integration in Contacts** — Gmail MCP is connected but not surfaced in the UI; could show recent email threads per contact
3. **Google Calendar → Day Schedule** — GCal MCP connected but not used; today's meetings could overlay the schedule timeline
4. **n8n automation layer** — recurring task creation, reminders, auto-categorization; not started

---

## Rules for future sessions

- Never ask Mohamed to re-explain the vision — it's here
- Always think in terms of: does this feature help him capture, connect, prioritize, or execute?
- Prefer building things that connect existing features over adding isolated new ones
- AI integration should be a first-class citizen, not an afterthought
- Keep the UI clean — he has a lot of information but shouldn't feel overwhelmed

---

---

# Mohamed's Personal Profile

> Compiled April 2026. All facts sourced directly from Mohamed. Do not ask him to repeat any of this.

---

## 1. Identity

- **Full name:** Mohamed Badawy
- **Born:** June 1988, age 37
- **Location:** Cairo, Egypt (UTC+2)
- **Nationality:** Egyptian
- **Education:** BCom Accounting, Cairo University — not relevant to current work; moved away from it completely after graduating
- **Personality:** INTP — accurate, not casual self-description
- **Religion:** Muslim — central to daily life and identity, not casual

---

## 2. Family

- **Wife:** INFP. Supportive and fully aligned on Kyrgyzstan relocation goal. Needs structure support in her environment, not imposed structure.
- **5 children:**
  - Roaa — 10 years (daughter)
  - Hamza — 8 years (son)
  - Fares — 5 years (son)
  - Abdullah — almost 2 years (son)
  - Omaier — 3 months (son, youngest)
- Evening Quran memorization with children is a regular family practice.

---

## 3. Physical Profile

- Weight: 60 kg | Height: 175 cm
- Diet: Low carb (already in place)
- Exercise: No regular routine yet
- Wearable: None

---

## 4. Faith and Spiritual Practice

Islam structures his entire day. Prayer times are non-negotiable fixed points — everything else is scheduled around them.

- Prays all 5 daily prayers, goal: mosque + first takbeer every time
- Reads 1 juz of Quran daily
- Performs morning and evening adhkar consistently
- Goal: establish qiyam al-layl (voluntary night prayer)

---

## 5. Designed Daily Schedule

| Time  | Block                         | Type          |
|-------|-------------------------------|---------------|
| 05:00 | Fajr prayer (mosque)          | Spiritual      |
| 05:20 | Quran + adhkar                | Spiritual      |
| 06:00 | Exercise                      | Health         |
| 07:00 | Cold shower + prep            | Health         |
| 07:30 | Breakfast (low carb)          | Personal       |
| 08:00 | Deep work — K Line Europe     | Work           |
| 09:30 | Dhuhr prayer (mosque)         | Spiritual      |
| 09:45 | Deep work — service business  | Work           |
| 11:15 | Email / communications        | Work           |
| 12:00 | Lunch + rest                  | Personal       |
| 13:00 | Asr prayer (mosque)           | Spiritual      |
| 13:15 | Outreach / marketing          | Work           |
| 14:00 | Learning block                | Learning       |
| 15:00 | Admin / Life OS review        | Work           |
| 15:30 | Maghrib prayer (mosque)       | Spiritual      |
| 17:00 | Family time (2 hours)         | Family         |
| 19:00 | Isha prayer + adhkar          | Spiritual      |
| 19:30 | Quran memorization with kids  | Family/Spiritual|
| 20:30 | Reading                       | Personal       |
| 22:00 | Sleep                         | Health         |

---

## 6. Current Living Situation

- Lives in Cairo in an area he dislikes — cannot comfortably walk outside or take children out
- 9 months of noise disruption from upstairs neighbors — affecting sleep, work, and children
- Identified zero-cost partial fix: offer neighbors an unused carpet to reduce impact noise
- Positive association with Marsa Matrouh (quiet, clean, outdoor access)
- Court rent arrears: 2,000 EGP (active or past legal dispute)

---

## 7. Financial Situation

| Item | Amount |
|------|--------|
| Monthly income (K Line Europe) | €700 (~42,000 EGP at 60 EGP/€) |
| Monthly independent income | €0 |
| Monthly expenses | ~25,500 EGP |
| Monthly surplus | ~16,500 EGP |
| Financial buffer | None |

**Total debt: 33,150 EGP**

| Creditor | Amount |
|----------|--------|
| Tante Amora (family) | 1,150 EGP |
| Court rent arrears | 2,000 EGP |
| Laptop for Abdulrahman | 10,000 EGP |
| Staircase repair | 13,000 EGP |
| Other | 7,000 EGP |

**Projected debt-free: July 2026** (if full surplus applied to repayment)

No financial buffer. Cannot afford an income gap. Entire stability rests on one employer.

---

## 8. Professional History

**Expack Shipping (2018–2022)**
Founded a last-mile delivery company in Egypt. Failed — leaving significant financial damage still being recovered. Root cause: no redundancy, no systems — not lack of skill or market. Pattern: instinct over plan, building without learning first.

**Sandton Taxi Cabs — Freelance (early 2025)**
First independent client via Freelancer.com. Johannesburg, SA. Delivered remotely. First proof that operational skills have market value outside employment.

**K Line Europe — Operational Systems Lead (2023–present)**
Clear aligner manufacturer, Düsseldorf. Fully remote from Cairo.

| Achievement | Date | Detail |
|------------|------|--------|
| Reporting time: 128 hours → minutes | Oct 2025 | Built automated reporting system |
| External defect rate: 1.68% → 0.99% | Aug 2025 | Operational quality improvement |
| On-time performance above 50% contract threshold | Ongoing | Prevented contract breach |

---

## 9. Skills and Capabilities

**Operational diagnosis** — examines broken processes and diagnoses at multiple layers simultaneously: symptom → operational cause → structural cause → behavioral cause.

**Technical building** — builds web apps, automated systems, operational tools from scratch. Django + React. Built K Line reporting system. Building Personal Life OS.

**Systems thinking** — naturally organises into hierarchies, dependencies, and structures. Designed his own goal system and daily schedule architecture.

**Knowledge breadth** — wide accumulated knowledge across logistics, operations, technology, business, personal development. Connects ideas across domains fluidly.

**Known weakness:** Commits to solutions before fully stress-testing alternatives. Diagnoses deep, moves to execution fast — sometimes too fast. Has named this explicitly and wants external pushback on it.

---

## 10. How He Thinks and Operates

- Problem-first, structure-second thinker. Starts from the problem, not the framework.
- Works by instinct and implicit knowledge — much of what he knows is not yet articulated as methodology. Making it explicit is an active goal.
- Attentive to small details that produce large differences.
- Holds high complexity in his head simultaneously — cost is fragmentation and mental overload without an external system.
- Does not accept partial or cosmetic implementations. Names problems specifically and pushes back.
- **Historical pattern (named and acknowledged):** instinct over plan, skip planning, build without learning first, hope for good outcomes rather than prevent bad ones. Produced Expack failure. Consciously replacing this with structured, deliberate approach.

---

## 11. Tools and Technology

| Tool | Purpose |
|------|---------|
| Claude | Deep thinking, writing, stress-testing decisions |
| Manus | Building web applications |
| Cursor | Code editing |
| n8n | Automation |
| Perplexity | Research |
| Telegram | Primary communication channel; planned bot interface |
| Zoho | Connected via MCP |
| Notion, Asana, Linear, HubSpot, Airtable, Monday.com, Google Calendar, Gmail, Figma, Canva, Miro | Connected via MCP |
| Upwork / Freelancer.com | Freelance pipeline |
| Django + React | App development stack |

---

## 12. Current Business Activity

**Operations Clarity Audit (Primary Focus)**
Operational systems consulting for small businesses. Methodology-first, industry-agnostic, logistics/shipping as entry point.
- Pricing: €150 first two clients → €300+
- Offer document: written and ready
- Next action: send outreach to warm contact #1
- LinkedIn: needs rewriting from employee to service provider framing (500+ connections)
- Portfolio: Clarity Dash portfolio site with case studies

**Equity partnerships in progress (~20% each):**
- Friend in perfumes business — operational systems + equity
- Friend in laptops business — same model

**Personal Life OS Application**
Both a personal tool and a demonstration of his technical and systems capabilities.

---

## 13. End Goals

**Primary life goal:** Move family to Kyrgyzstan.
- Muslim-majority country with Islamic culture and community cohesion
- Lower cost of living than Egypt
- Natural environment, healthier environment for raising children
- **Trigger condition:** €1,000/mo of independent (non-employment) income reached first

**Business goal:** Service business → stable independent income first, then product business for compounding income. Speed before scale.

**Personal goal:** Replace instinct-over-plan with a structured, deliberate operating system for life — every domain managed clearly, priorities visible, daily actions connected to long-term goals.

---

## 14. What Mohamed Is Recovering From

Mohamed spent most of his adult life operating on instinct, hope, and trial-and-error — without structured planning, without learning before building, without preventive action. He names this clearly and without defensiveness.

Consequences: failed business (Expack, 2018–2022), significant financial damage still being repaid in 2026, 33,150 EGP debt across five creditors, no financial buffer, single income source, five children including a 3-month-old.

He is not in crisis. He has stable income, a clear goal, a structured schedule, a defined service offering, and a system he is building to manage all of it. But the recovery is real and ongoing.

<!-- SPECKIT START -->
## Active Feature Plan

**Current feature**: Business Development Depth (`003-biz-dev-depth`)  
**Plan**: [specs/003-biz-dev-depth/plan.md](specs/003-biz-dev-depth/plan.md)  
**Spec**: [specs/003-biz-dev-depth/spec.md](specs/003-biz-dev-depth/spec.md)
<!-- SPECKIT END -->
