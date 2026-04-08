# Life OS — Build Roadmap & Status

> Last updated: 2026-04-07
> Legend: ✅ Done · 🔧 Partial / needs polish · ❌ Not started · 🔒 Blocked on prerequisite

---

## Architecture summary

Three layers, built in order:

| Layer | Name | Principle |
|-------|------|-----------|
| 1 | Personal OS core | Make the daily surface frictionless |
| 2 | Knowledge base | Store everything about yourself with structure |
| 3 | Integrations | Connect to external tools once layers 1–2 have real data |

---

## Layer 1 — Personal OS Core

### 1A · Command Center (`/`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Today's date displayed prominently | ✅ | Full date, en-GB format |
| 2 | Unlock bar (independent income vs €1,000 target) | ✅ | Progress track, motivational sub-copy |
| 3 | Stat cards: Active, Available, Blocked, Done, Surplus EGP, Nodes total | ✅ | All clickable → `/goals?status=X` |
| 4 | "Available" card replacing stale "Debt EGP" card | ✅ | Live from `node_counts.available` |
| 5 | Daily Routine progress row (N/20 done, % bar, → /routine) | ✅ | Live from `routine_today` in dashboard API |
| 6 | Top priority tasks list (P1/P2 tasks) | ✅ | Shows effort, target date, status chip |
| 7 | Status popover on task rows (change status inline) | ✅ | 5-status popover, updates live |
| 8 | OVERDUE badge on past-due tasks | ✅ | Red pill when target_date < today |
| 9 | Add task modal (type=task, status=available, category dropdown) | ✅ | 8 categories, pre-filled type/status |
| 10 | Blocked goals section | ✅ | Shows blocker name inline |
| 11 | Road to Kyrgyzstan milestone chain | ✅ | Static milestones, NEXT badge on current |
| 12 | Urgency flag: goal due soon with no P1 tasks → surfaces on CC | ❌ | Needs backend logic + CC panel |
| 13 | "→" link from task row to full node in Goals | ✅ | Link navigates to `/goals?node=<id>`, SidePanel auto-opens |

---

### 1B · Goals (`/goals`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Full tree view (parent → child, expandable) | ✅ | Recursive NodeRow with expand/collapse |
| 2 | Status filter chips with live counts | ✅ | active/available/blocked/done/deferred |
| 3 | URL param pre-filtering (`?status=X`) | ✅ | Read on mount via `useSearchParams` |
| 4 | Search + status/category/type dropdowns | ✅ | All combined, realtime filter |
| 5 | Side panel: edit all fields (title, status, category, effort, dates, parent, deps, notes, tags) | ✅ | createPortal to escape backdrop-filter |
| 6 | Side panel: progress slider, disabled when node has children | ✅ | Shows "auto from children" label |
| 7 | Add node modal (type, category, status, priority, parent, notes) | ✅ | createPortal |
| 8 | Notes tooltip on hover (title, max 120 chars) | ✅ | Native browser title attribute |
| 9 | Progress rollup from done children (auto %) | ✅ | Shows `N% ↻` with bar, even at 0% |
| 10 | Quick-done button (✓ on hover, task/subtask only) | ✅ | Single click → status=done, no panel |
| 11 | Priority sort within each tree level | ✅ | P1 → P2 → P3 → P4 → unset |
| 12 | Blocked-by title visible inline on row | ✅ | "⚠ by: [blocker name]" |
| 13 | Delete node with child confirmation | 🔧 | Inline confirm in side panel footer (no count of children shown) |
| 14 | Goal "why" field (separate from notes) | ✅ | `why` TextField on Node; shown for goal/project in SidePanel |
| 15 | Goal weekly review flow (What moved? Blocked? Next action?) | ❌ | `GoalReview` model, timestamped entries, "Review" button per node |
| 16 | Subtask checklist inside task (lightweight, JSON field) | ✅ | `checklist` JSONField on Node; checkbox list in SidePanel, saved with node |
| 17 | Time estimate vs actual (log actual duration on complete) | ❌ | `actual_duration` field on Node, set when status→done |
| 18 | Reorder nodes (drag-to-sort within parent) | ❌ | Needs `order` int field on Node + drag UI |
| 19 | Bulk operations (multi-select, change status/delete) | ❌ | UI complexity, lower priority |

---

### 1C · Routine (`/routine`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | 20-block daily schedule display | ✅ | Now fetched from DB via `RoutineBlock` model |
| 2 | Log status per block (done/partial/late/skipped) | ✅ | Expand row → status buttons |
| 3 | Actual time input (pre-filled with current time) | ✅ | `new Date().toTimeString().slice(0,5)` |
| 4 | Notes per block | ✅ | Textarea in expanded panel |
| 5 | Today's completion % + N/20 counter | ✅ | Live, re-computed from logs |
| 6 | Streak counter (🔥 N days) | ✅ | `/api/schedule/routine-streak/` endpoint |
| 7 | Done/partial blocks visually de-emphasised | ✅ | Strikethrough + opacity 0.45 confirmed |
| 8 | Yesterday's missed blocks indicator | ✅ | Orange left border + "↩ missed" badge |
| 9 | "↩ missed" time-of-day guard (Africa/Cairo timezone) | ✅ | `toLocaleTimeString('en-GB', {timeZone:'Africa/Cairo'})` |
| 10 | Weekly 7-day completion grid (Mon–Sun bars) | ✅ | `useQueries` parallel fetch, colour-coded |
| 11 | "Close the day" button (marks unlogged → skipped, after 21:00) | ✅ | Appears when `hours >= 21 && doneCount < total` |
| 12 | **Editable routine blocks (most important missing feature)** | ✅ | `RoutineBlock` model + API + ⚙ edit mode with drag-reorder, add/delete |
| 13 | Link routine blocks to goals | ✅ | Node picker in editor; 🎯 badge on block row when linked |
| 14 | Block-level time tracking (which goal got how many minutes) | 🔒 | Needs analytics aggregation |
| 15 | "Goals served" badge on goal tree (🕐 routine linked) | 🔒 | Needs aggregation query |
| 16 | Journal prompt on "close the day" | ❌ | One-line entry → daily log |

**Routine editing spec (item 12):**
- `RoutineBlock` Django model: `time`, `label`, `type`, `duration_minutes`, `is_fixed`, `order`, `active`, `linked_node` (nullable FK to Node)
- CRUD API: `GET/POST /api/schedule/blocks/`, `PATCH/DELETE /api/schedule/blocks/{id}/`
- Settings panel at `/routine` (gear icon → edit mode): draggable list, inline edit time/label, add/remove
- Routine page fetches blocks from DB instead of hardcoded SCHEDULE array

---

### 1D · Finance (`/finance`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Kyrgyzstan trigger bar (independent income progress) | ✅ | Purple theme, motivational copy |
| 2 | 4 stat cards (income EGP, expenses, surplus, independent income) | ✅ | formatK() for clean display |
| 3 | Monthly summary edit form | ✅ | income_eur, independent, expenses, sources, notes |
| 4 | Direct EGP income field | ✅ | `income_egp_direct` model field |
| 5 | Editable EGP/EUR exchange rate | ✅ | `exchange_rate` model field (default 60), used in all EGP calcs |
| 6 | Decimal formatting (€700 not €700.00) | ✅ | `fmtEur()` helper using `Math.round(Number(n))` |
| 7 | Debt management (add/edit/remove debts) | ✅ | JSON field, inline edit form |
| 8 | Debt payoff plan (snowball, monthly surplus) | ✅ | Sorted ascending, cumulative payoff timeline |
| 9 | "Debt-free by" row in payoff plan | ✅ | 🎉 Debt-free by [month year] in tfoot |
| 10 | Income history log (date, source, amount milestones) | ❌ | `IncomeEvent` model: date, source, amount_eur, notes |
| 11 | Savings target (emergency fund goal + progress) | ❌ | `savings_target_egp` field on FinanceSummary |
| 12 | Debt reorder in edit form | ❌ | Drag-to-sort within DebtEditForm |

---

### 1E · Health (`/health`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | 5 metric cards (sleep, mood, habit %, prayer %, exercise streak) | ✅ | Displays data when present |
| 2 | "Today's logging state" panel (body/mood/spiritual logged: Yes/No) | ✅ | Shows current state |
| 3 | Actual logging forms (sleep hours, mood score, prayer status) | ✅ | HealthLogForm, MoodLogForm, SpiritualLog all exist in HealthPage |
| 4 | Prayer completion sourced from routine logs (5 specific blocks) | ❌ | Backend: cross-reference RoutineLog with prayer block_times |
| 5 | Exercise streak sourced from routine log (Exercise block) | ❌ | Same pattern as prayer |

---

### 1F · Analytics (`/analytics`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Overview tab — 7-day routine chart (real data) | ✅ | Bar chart, colour-coded (green ≥80%, amber ≥50%) |
| 2 | Overview tab — Goals breakdown by status | ✅ | Table with status dots + mini bar per status |
| 3 | Overview tab — Finance snapshot (income, debt, surplus, debt-free date) | ✅ | Live from finance API |
| 4 | Overview tab — 4 MetricCards (income, net, sleep, prayer) | ✅ | Real data, will improve as health logs fill in |
| 5 | History tab — chronological activity feed | ✅ | Renders when data present |
| 6 | Patterns tab — deterministic pattern note + AI deep analysis | ✅ | AI analysis button works |
| 7 | Review tab — weekly review generation + suggestions | ✅ | Generate → persist → personal notes |

---

## Layer 2 — Knowledge Base

> Build after Layer 1 is used daily without friction.

### 2A · Personal Profile (`/profile`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Identity section (name, age, location, family, languages) | ❌ | `UserProfile` singleton model |
| 2 | Religious practice (prayers, Quran, fasting) | ❌ | Part of profile |
| 3 | Personal values list (editable) | ❌ | JSON array field |
| 4 | Health baseline (height, weight, diet, exercise, targets) | ❌ | Separate from Health page logs |
| 5 | Work & financial identity (employment, skills, businesses) | ❌ | Links to Finance data |
| 6 | AI context export (structured JSON snapshot of profile) | ❌ | Used as system prompt for AI features |

---

### 2B · Attachments & Links (on nodes)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | URL attachment on any node (paste link + label) | ✅ | `Attachment` model, `type=url`, shown as 🔗 in SidePanel |
| 2 | File upload on any node (PDF, image, doc) | 🔧 | Model has `file` field; no upload UI yet |
| 3 | Text snippet on any node (paste + title) | ✅ | `type=snippet`, textarea in add form |
| 4 | Attachments section in Goals side panel | ✅ | List + add form below Notes in SidePanel |
| 5 | Attachment count badge on node row | ❌ | Small "📎 2" chip if attachments exist |

**Model spec:**
```python
class Attachment(BaseModel):
    node = models.ForeignKey(Node, null=True, blank=True, on_delete=models.CASCADE)
    page_context = models.CharField(max_length=64, blank=True)  # for global library items
    type = models.CharField(choices=['url','file','snippet'])
    title = models.CharField(max_length=255)
    url = models.URLField(blank=True)
    file = models.FileField(upload_to='attachments/', blank=True)
    content = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

### 2C · Library (`/library`)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Document/file upload with title, category, description, tags | ❌ | Uses `Attachment` model with `page_context='library'` |
| 2 | URL bookmarks (title, description, tags) | ❌ | Same model |
| 3 | Full-text search across all library items | ❌ | Filter by tag/category/keyword |
| 4 | Categories: Business, Finance, Health, Family, Legal, Learning, Ideas | ❌ | |
| 5 | Sidebar nav link to `/library` | ❌ | |

---

### 2D · Journal / Daily Log

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | One-entry-per-day textarea at `/journal` | ❌ | `DailyLog` model: `date` (unique), `content`, `mood_score` |
| 2 | "Close the day" prompt (optional journal entry) | ❌ | Hook into existing "Close day" button in Routine |
| 3 | Journal history (past 30 days, reverse chrono) | ❌ | |

---

### 2E · Contacts & Relationships

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Contact list at `/contacts` (name, relationship type, last interaction, notes) | ❌ | `Contact` model |
| 2 | Link contacts to nodes (e.g. "warm contact #1" → outreach task) | ❌ | M2M relationship |
| 3 | Last-interaction date + follow-up reminder | ❌ | Surfaces on Command Center when overdue |

---

### 2F · Learning Tracker

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Learning items list (book/course/video/article, want/in-progress/done) | ❌ | `LearningItem` model |
| 2 | Link to goal | ❌ | FK to Node |
| 3 | Link to Routine "Learning block" (log what was worked on) | ❌ | On block log save → prompt for learning item |
| 4 | Ideas fast-capture (global keyboard shortcut or top-of-goals input) | ❌ | Quick add for `type=idea` nodes |

---

## Layer 3 — Integrations

> Build after Layer 2 has real data. Each integration has a clear data-in / data-out contract.

### 3A · Zoho CRM

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Pull open deals + contacts into Life OS | ❌ | MCP already connected (`ZohoCRM_searchRecords`) |
| 2 | Outreach task done → create CRM activity | ❌ | Webhook / MCP trigger |
| 3 | Deal closes → income event logged in Finance | ❌ | |

### 3B · Calendar (Google Calendar)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Sync routine blocks to calendar | 🔒 | Needs editable routine blocks first |
| 2 | Pull meeting events into routine as flex blocks | ❌ | |
| 3 | Goal deadlines → calendar events | ❌ | |

### 3C · Health Apps (Apple Health / Google Fit)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Pull daily steps, sleep, heart rate | ❌ | Needs platform-specific bridge |
| 2 | Auto-log sleep duration → Health page | ❌ | |
| 3 | Exercise block auto-completed from fitness tracker | ❌ | |

### 3D · AI Chat Panel

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Chat panel (real sidebar, not floating button) | 🔧 | Floating AI button exists, needs context upgrade |
| 2 | Context: profile + current goals + today's routine + finance status | 🔒 | Needs Profile (2A) first |
| 3 | Conversation logged + linked to relevant goal/project | ❌ | |
| 4 | Capabilities: draft outreach, review week, suggest afternoon focus | ❌ | |

---

## Build sequence

### This week (complete Layer 1)
1. **Routine editing** — `RoutineBlock` model + settings panel (biggest daily-use gap)
2. **Link routine blocks to goals** — `linked_node` FK, goal badge, time-on-task seed
3. **Attachments on nodes** — `Attachment` model + URLs/files in side panel

### Next (close Layer 1 gaps)
4. **Personal Profile page** (`/profile`)
5. **Global library** (`/library`)
6. **Goal "why" field + weekly review flow**
7. **Subtask checklist inside tasks**

### After that (Layer 2)
8. Journal / daily log
9. Contacts & relationships
10. Learning tracker + ideas fast-capture

### Then (Layer 3)
11. Zoho CRM integration (outreach → CRM activity)
12. Calendar sync
13. AI chat panel with full profile context
14. Health app integrations

---

## Discipline note

> Don't build Layer 2 until Layer 1 is something you use every single day without friction.
> Don't build Layer 3 until Layer 2 is full of real data.
> The app is currently at the **end of Layer 1**.
> Routine editing + node attachments completes it.
