---
description: "Task list for Navigation & Interaction Redesign"
---

# Tasks: Navigation & Interaction Redesign

**Input**: Design documents from `specs/001-navigation-redesign/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = Hub Navigation | US2 = Context-Aware Home | US3 = Universal Capture
- All new files MUST include `[AR]/[EN]` bilingual header comment (Principle VIII)

---

## Phase 1: Setup

**Purpose**: Directory structure and shared infrastructure before any story work begins.

- [X] T001 Create `frontend/src/components/home/` directory with empty `index.ts` barrel export file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The navigation shell wraps ALL pages — it must be rebuilt before any user story can be tested end-to-end.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T00X Rebuild `frontend/src/components/AppShell.tsx` — replace 5-group collapsible sidebar with a flat 7-hub list: Now (`/`), Goals (`/goals`), Build (`/business`), Life (`/health`), Learn (`/learn`), Intelligence (`/analytics`), Profile (`/profile`). Keep mobile bottom nav and sidebar collapse button. Add `[AR]/[EN]` bilingual file header.
- [X] T00X Restructure `frontend/src/AppRoutes.tsx` — wrap each hub's sub-routes under a shared layout route using React Router v7 layout pattern so the active hub is determined by the current URL. Preserve all 10 legacy redirects unchanged (`/routine` → `/schedule`, `/habits` → `/health`, etc.). Add `[AR]/[EN]` bilingual file header.

**Checkpoint**: App loads, sidebar shows 7 hubs, clicking each hub navigates to its default route. Legacy redirects still work. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Hub Navigation (Priority: P1) 🎯 MVP

**Goal**: User can reach any feature in the app in 2 clicks from anywhere. 7 flat hubs replace all sidebar groups. Every existing page is reachable as a tab or drill-down inside its hub.

**Independent Test**: Navigate to every existing page from every hub. Verify active hub highlights correctly. Verify all legacy redirects still land on the right content.

### Implementation for User Story 1

- [X] T00X [P] [US1] Add layer visual differentiation to hub items in `frontend/src/components/AppShell.tsx` — execution hubs (Now, Build) get solid icons, awareness hubs (Life, Intelligence) get outlined icons, direction hubs (Goals, Learn, Profile) get directional icons. Exactly one hub is visually active at all times.
- [X] T00X [P] [US1] Add sub-navigation tabs inside the Life hub in `frontend/src/pages/HealthHubPage.tsx` (or a new `frontend/src/components/LifeHubLayout.tsx`) so health / finance / journal are accessible as tabs within the hub, not as separate sidebar entries.
- [X] T00X [P] [US1] Add sub-navigation tabs inside the Now hub in `frontend/src/pages/HomePage.tsx` so focus (`/focus`), daily check-in (`/daily`), and schedule (`/schedule`) are reachable as tabs within the Now hub.
- [X] T00X [US1] Add sub-navigation tabs inside the Profile hub in `frontend/src/components/ProfileHubLayout.tsx` (new file) so contacts (`/contacts`) and profile (`/profile`) are reachable as tabs — not separate sidebar entries. Add `[AR]/[EN]` bilingual file header.
- [X] T00X [US1] Add sub-navigation tabs inside the Intelligence hub in `frontend/src/pages/AnalyticsHubPage.tsx` so data-bridge (`/data-bridge`) is reachable as a tab within the Intelligence hub.
- [X] T00X [US1] Verify north star metric is visible on the home surface (`/`) without any navigation — confirm `HomeNorthStarSection` or equivalent renders on `HomePage.tsx` (can be a stub reading from profile until US2 is complete).

**Checkpoint**: User Story 1 fully functional. All 7 hubs navigable. Every page reachable in ≤2 clicks. Active hub always highlighted. Legacy redirects working.

---

## Phase 4: User Story 2 — Context-Aware Home (Priority: P2)

**Goal**: Home surface shows the right content for the time of day. North star progress reads from the user's profile — no hardcoded values. HomePage.tsx is split into focused sub-components, each under 300 lines (resolves Principle IX violation).

**Independent Test**: Open the app at different times of day and verify content changes. Confirm north star shows user-configured label and target. Confirm `HomePage.tsx` is under 300 lines.

### Backend — North Star API

- [X] T0XX [P] [US2] Add `north_star_label` (CharField, max 100, blank=True), `north_star_target_amount` (DecimalField, null=True), `north_star_currency` (CharField, max 10, default='EUR'), `north_star_unit` (CharField, max 50, default='per month') to Profile model in `backend/profile/models.py`. Add `[AR]/[EN]` inline section comment.
- [X] T0XX [US2] Generate and apply migration for north star fields: `backend/profile/migrations/XXXX_add_north_star_fields.py` (run `python manage.py makemigrations profile`)
- [X] T0XX [P] [US2] Add `NorthStarSerializer` to `backend/profile/serializers/__init__.py` (or new `backend/profile/serializers/north_star.py`). Returns `label`, `target_amount`, `currency`, `unit`, `current_amount` (computed from finance), `progress_percent`, `configured` (bool). Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [US2] Add `NorthStarView` to `backend/profile/views/__init__.py` (or new `backend/profile/views/north_star.py`) — `GET /api/profile/north-star/`. Computes `current_amount` from sum of independent income entries this month. Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [US2] Register `/api/profile/north-star/` route in `backend/profile/urls.py`.

### Frontend — Home Sub-components

- [X] T0XX [P] [US2] Create `frontend/src/components/home/HomeNowSection.tsx` — extracts routine quick-panel, current block indicator, schedule row, check-in nudge from `HomePage.tsx`. Under 300 lines. Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [P] [US2] Create `frontend/src/components/home/HomePrioritiesSection.tsx` — extracts priority stack, blocked goals, add task modal from `HomePage.tsx`. Under 300 lines. Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [P] [US2] Create `frontend/src/components/home/HomeNorthStarSection.tsx` — reads from `getNorthStar()` API. Displays user-configured `label`, progress bar using `progress_percent`, `current_amount` vs `target_amount`. If `configured: false`, shows "Set your north star" prompt linking to `/profile`. Removes ALL hardcoded "Kyrgyzstan" and "€1,000/mo" text. Under 300 lines. Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [P] [US2] Create `frontend/src/components/home/HomeStatusSection.tsx` — extracts status strip, finance snapshot, goals overview from `HomePage.tsx`. Under 300 lines. Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [P] [US2] Create `frontend/src/components/home/HomeAISection.tsx` — extracts next action card, AI suggestions, last wins from `HomePage.tsx`. Under 300 lines. Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [P] [US2] Add `getNorthStar()` API call to `frontend/src/lib/api.ts` — `GET /api/profile/north-star/`. Returns `NorthStarData` type.
- [X] T0XX [US2] Add `getHomeState()` helper to `frontend/src/components/home/index.ts` — returns `'morning' | 'afternoon' | 'evening'` based on `new Date().getHours()`. Morning: 5–11, Afternoon: 12–17, Evening: 18–4.
- [X] T0XX [US2] Refactor `frontend/src/pages/HomePage.tsx` to orchestrator — imports all 5 sub-components from `home/`, uses `getHomeState()` to set default section expansion order, stays under 300 lines. All inline sub-component definitions removed.

**Checkpoint**: User Stories 1 AND 2 functional. HomePage is under 300 lines. North star reads from profile API. Time-of-day state changes section order.

---

## Phase 5: User Story 3 — Universal Capture (Priority: P3)

**Goal**: User can submit a capture from anywhere with zero required fields. System suggests a domain automatically. User can override the suggestion.

**Independent Test**: Submit an empty capture — succeeds. Type "call Ahmed about proposal" — Build domain suggested. Override to Goals — override stored.

### Backend — Capture API

- [X] T0XX [P] [US3] Add `domain_hint` nullable CharField (max 32, null=True, blank=True) to Idea model in `backend/analytics/models.py`. Add `[AR]/[EN]` inline section comment.
- [X] T0XX [US3] Generate and apply migration for `domain_hint` field: `backend/analytics/migrations/XXXX_add_domain_hint_to_idea.py` (run `python manage.py makemigrations analytics`)
- [X] T0XX [P] [US3] Add `suggest_domain(title: str) -> dict` function to `backend/analytics/services.py` (new file if it doesn't exist) — implements keyword-to-domain matching from `contracts/capture-api.md`. Returns `{"suggested_domain": str|None, "confidence": "high"|"low"|"none", "matched_keywords": list}`. Add `[AR]/[EN]` bilingual file header.
- [X] T0XX [US3] Update idea create view in `backend/analytics/views.py` — make `title` not required (accept empty string), add `suggested_domain` to response using `suggest_domain()`, store `domain_hint` from request body. Add `[AR]/[EN]` inline section comment.
- [X] T0XX [US3] Add `GET /api/ideas/suggest-domain/` endpoint in `backend/analytics/views.py` and register in `backend/analytics/urls.py`. Reads `?title=` query param, returns suggestion JSON. Add `[AR]/[EN]` inline section comment.

### Frontend — Capture Modal

- [X] T0XX [P] [US3] Add `suggestDomain(title: string)` API call to `frontend/src/lib/api.ts` — `GET /api/ideas/suggest-domain/?title=<text>`. Returns `SuggestDomainResponse` type.
- [X] T0XX [US3] Update `frontend/src/components/QuickCaptureModal.tsx` — remove `title` required validation (empty submit allowed), add debounced (300ms) `suggestDomain()` call as user types, display suggested domain below title input with confidence indicator. Add `[AR]/[EN]` bilingual file header update.
- [X] T0XX [US3] Add domain override selector to `frontend/src/components/QuickCaptureModal.tsx` — dropdown or pill selector showing all 7 hub names. Pre-selected to `suggested_domain`. User can change it. Selected value sent as `domain_hint` on submit.

**Checkpoint**: All three user stories functional. Capture accepts empty title, shows domain suggestion, allows override.

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T0XX [P] Run quickstart.md verification checklist end-to-end — document any failures in `specs/001-navigation-redesign/quickstart.md`
- [X] T0XX [P] Verify all modified/created files are under their line limits (Principle IX): `AppShell.tsx` < 300, `AppRoutes.tsx` < 300, `HomePage.tsx` < 300, each `home/*.tsx` < 300, `analytics/views.py` < 400, `profile/views/*.py` < 400
- [X] T0XX Search for hardcoded "Kyrgyzstan" and "€1,000" strings in `frontend/src/` — confirm zero remaining occurrences (Principle VII)
- [X] T0XX Update `frontend/src/components/home/index.ts` with exports for all 5 sub-components

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — no dependency on US2 or US3
- **US2 (Phase 4)**: Depends on Foundational — no dependency on US1 or US3
- **US3 (Phase 5)**: Depends on Foundational — no dependency on US1 or US2
- **Polish (Phase N)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1**: Can start after Phase 2 — purely frontend, no API changes
- **US2**: Can start after Phase 2 — requires backend north star API + frontend split
- **US3**: Can start after Phase 2 — requires backend capture API update + frontend modal update
- All three user stories can proceed in parallel after Phase 2 completes

### Within Each User Story

- Backend migrations before serializers (T010 → T011 → T012)
- Serializers before views (T012 → T013)
- Views before URL registration (T013 → T014)
- Sub-components before orchestrator (T015–T019 → T022)
- API lib additions can run in parallel with backend (T020 parallel with T010–T014)

### Parallel Opportunities

```bash
# After Phase 2 completes, all three stories can start simultaneously:

# US1 (frontend only):
T004 [P] Layer visual differentiation in AppShell.tsx
T005 [P] Life hub sub-tabs
T006 [P] Now hub sub-tabs

# US2 (backend + frontend, parallel streams):
Backend stream: T010 → T011 → T012 → T013 → T014
Frontend stream: T015 [P], T016 [P], T017 [P], T018 [P], T019 [P], T020 [P] (all in parallel)
Then combine: T021 → T022

# US3 (backend + frontend, parallel streams):
Backend stream: T023 → T024 → T025 → T026 → T027
Frontend stream: T028 [P] (parallel with backend)
Then combine: T029 → T030
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003) — **CRITICAL BLOCKER**
3. Complete Phase 3: US1 (T004–T009)
4. **STOP and VALIDATE**: Open app, navigate all 7 hubs, verify every page reachable in ≤2 clicks
5. Ship — navigation redesign delivers immediate value without US2 or US3

### Incremental Delivery

1. Setup + Foundational → shell working
2. US1 → navigation complete → **MVP, ship**
3. US2 → home surface intelligent → ship
4. US3 → capture friction-free → ship

### Parallel Team Strategy

With two developers after Foundational phase:
- Developer A: US1 (frontend only, fast) + T031–T034 polish
- Developer B: US2 backend → US2 frontend → US3

---

## Notes

- `[P]` = different files, no blocking dependencies — safe to run in parallel
- All new files require `[AR]/[EN]` bilingual header (constitution Principle VIII)
- No file may exceed its line limit before adding code — split first (Principle IX)
- Hardcoded "Kyrgyzstan" / "€1,000" references must be removed in T017 (Principle VII)
- Tests not requested — omitted per task generation rules
