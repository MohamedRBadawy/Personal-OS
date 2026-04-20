# Research: Navigation & Interaction Redesign

**Phase 0 output** | Branch: `001-navigation-redesign` | Date: 2026-04-20

---

## Current State Inventory

### Routes (actual, not estimated)

The app has **13 active routes** plus 7 legacy redirects — not 35+ standalone pages. Previous navigation accumulated 5 collapsible sidebar groups with overlapping concepts (e.g., "Progress & Stats" and "Analytics" both pointing to profile).

| Route | Component | Current sidebar group |
|-------|-----------|----------------------|
| `/` | HomePage | Overview |
| `/focus` | FocusPage | — (no sidebar link) |
| `/daily` | DailyCheckInPage | Execute |
| `/goals` | GoalsPage | Execute |
| `/finance` | FinanceWorkspacePage | Life |
| `/journal` | JournalPage | Life |
| `/contacts` | ContactsPage | Life |
| `/profile` | ProfileHubPage | Overview + Review (duplicated) |
| `/business` | BusinessHubPage | Execute |
| `/schedule` | ScheduleHubPage | Execute |
| `/health` | HealthHubPage | Life |
| `/analytics` | AnalyticsHubPage | Review |
| `/learn` | LearnIdeasHubPage | Life |
| `/data-bridge` | DataBridgePage | Tools |

### Legacy redirects (transparent to users)

`/about` → `/profile`, `/life-plan` → `/profile`, `/pipeline` → `/business`, `/marketing` → `/business`, `/routine` → `/schedule`, `/habits` → `/health`, `/mood` → `/health`, `/spiritual` → `/health`, `/learning` → `/learn`, `/ideas` → `/learn`

### Navigation shell findings

- **AppShell.tsx** contains the sidebar with 5 collapsible groups
- Current groups (Overview / Execute / Life / Review / Tools) do not map to a clear principle — they accumulated organically
- Profile appears twice: once in Overview, once as "Progress & Stats" in Review
- Mobile has a bottom nav with 5 hardcoded items (Home, Goals, Routine, Finance, Health) — separate from the sidebar
- Sidebar can collapse to icon-only mode

### Quick Capture findings

- **Location**: `frontend/src/components/QuickCaptureModal.tsx`
- **Trigger**: FAB (💡) + `Ctrl+Shift+I`
- **Title field is required** — violates FR-007 (zero mandatory fields)
- Saves only to `ideas` API with `status: 'raw'` and `linked_goal: null` — no domain routing
- No auto-categorization — violates FR-008 (auto-suggest domain)
- Has optional context textarea — this is fine

### HomePage findings

- **`frontend/src/pages/HomePage.tsx` is 1020 lines** — violates Principle IX (300-line limit for React components)
- Contains 15+ major sections, most with their own sub-components defined inline
- Several sections reference hardcoded user-specific content (Kyrgyzstan readiness, north star as €1,000/mo) — violates Principle VII (multi-user)
- Already has time-sensitive elements (morning/evening check-in nudges) but no systematic time-of-day state

---

## Decision Log

### Decision 1: Hub count and structure

- **Decision**: 7 hubs, matching the roadmap proposal exactly
- **Rationale**: All 13 existing routes map cleanly into 7 hubs with no leftover. The three-layer principle (Execution / Awareness / Direction) accommodates all content types.
- **Alternatives considered**: 5 hubs (too broad — Life hub would hold too much), 6 hubs (would require merging Learn into Goals, losing a clear distinction)

**Final mapping:**

| Hub | Layer | Routes that move here |
|-----|-------|-----------------------|
| **Now** | Execution | `/` (home), `/focus`, `/daily`, `/schedule` |
| **Goals** | Direction | `/goals` |
| **Build** | Execution | `/business` |
| **Life** | Awareness | `/health`, `/finance`, `/journal` |
| **Learn** | Direction | `/learn` |
| **Intelligence** | Awareness | `/analytics`, `/data-bridge` |
| **Profile** | Direction | `/profile`, `/contacts` |

### Decision 2: Navigation shell architecture

- **Decision**: Flat 7-item sidebar (no collapsible groups). Active hub highlighted. Sub-pages within a hub render as tabs inside the hub, not as sidebar entries.
- **Rationale**: Collapsible groups require the user to know which group to open. A flat list of 7 items is scannable at a glance.
- **Alternatives considered**: Keep collapsible groups but reduce to 3 (Execution/Awareness/Direction) — rejected because labeling groups with abstract layer names is less scannable than labeling with concrete hub names (Now, Goals, Build, Life, Learn, Intelligence, Profile).

### Decision 3: Capture domain routing

- **Decision**: Capture submits with an optional `domain` hint. The backend auto-suggests a domain using keyword matching on the title. The user sees the suggested domain before confirming and can override.
- **Rationale**: This satisfies FR-007 (no required fields) and FR-008 (auto-suggest domain) without requiring an AI call on every capture — keyword matching is fast and deterministic.
- **Alternatives considered**: AI-based classification — rejected for this phase (adds latency, cost, and complexity; keyword matching covers the majority of cases). User manually selects domain — rejected (makes capture feel like a form again).

### Decision 4: Home surface time-of-day states

- **Decision**: Three states — Morning (05:00–11:59), Afternoon (12:00–17:59), Evening (18:00–04:59). State is determined by the browser's local time. Each state has a defined set of visible sections.
- **Rationale**: Three states cover the meaningful transitions in a day without over-engineering. Browser local time avoids a timezone API dependency.
- **Alternatives considered**: Two states (before/after noon) — too coarse; does not differentiate evening review from afternoon execution. Server-side time — unnecessary complexity for what is purely a display decision.

### Decision 5: Hardcoded user-specific content in HomePage

- **Decision**: The Kyrgyzstan readiness widget and the €1,000/mo north star label must be replaced by reading the user's configured north star target from the profile API. Display the user's configured goal name and target value — not hardcoded text.
- **Rationale**: Principle VII requires no hardcoded user-specific constants. This is a pre-existing violation that the navigation redesign must resolve since we are rewriting the home surface anyway.
- **Alternatives considered**: Leave hardcoded for now — rejected because we are rewriting the component anyway and the fix is minor.

### Decision 6: HomePage.tsx splitting

- **Decision**: Break HomePage.tsx (1020 lines) into a parent orchestrator + named sub-components, each under 300 lines.
- **Proposed split**:
  - `HomeNowSection.tsx` — routine, schedule, inline logging (~250 lines)
  - `HomePrioritiesSection.tsx` — priority stack, blocked goals (~200 lines)
  - `HomeNorthStarSection.tsx` — north star progress, readiness, milestones (~200 lines)
  - `HomeStatusSection.tsx` — status strip, finance snapshot, goals overview (~150 lines)
  - `HomeAISection.tsx` — next action card, AI suggestions (~150 lines)
  - `HomePage.tsx` — orchestrator, data fetching, time-of-day state, layout (~250 lines)
- **Rationale**: Principle IX hard limit. Splitting also makes each section independently testable.

---

## Open Questions (resolved)

All [NEEDS CLARIFICATION] items were resolved above. No open questions remain.
