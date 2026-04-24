# Tasks: UI/UX Redesign — Thinking Partner Interface

**Input**: Design documents from `/specs/002-ui-ux-redesign/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story. US1 (tokens + dark/light) → US2 (progressive disclosure) → US3 (home surface) → US4 (interaction patterns).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US1–US4]**: Maps to user story in spec.md

---

## Phase 1: Setup

**Purpose**: Branch and font infrastructure before any CSS work.

- [ ] T001 Create git branch `002-ui-ux-redesign` from current working branch
- [ ] T002 Add Google Fonts import for Inter (variable) + JetBrains Mono (variable) to `frontend/index.html` — add `<link rel="preconnect">` + `<link rel="stylesheet">` in `<head>` before existing CSS

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design token system + FOSC prevention — MUST complete before any user story can begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Create `frontend/src/styles/tokens.css` — define complete token system: primitive color vars (~20 raw hex values prefixed `--_`), semantic color tokens (`--color-bg-base`, `--color-bg-raised`, `--color-bg-overlay`, `--color-bg-subtle`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-inverse`, `--color-accent`, `--color-accent-subtle`, `--color-accent-hover`, `--color-border`, `--color-border-strong`, `--color-success`, `--color-warning`, `--color-error`, `--color-focus`) in dark-default `:root` block + `[data-theme="light"]` override block; spacing (`--space-1` through `--space-16`); typography (`--font-sans`, `--font-mono`, `--text-xs` through `--text-2xl`, `--font-normal/medium/semibold`, `--line-tight/normal/relaxed`); border radius (`--radius-sm/md/lg/full`); shadows (`--shadow-raised/elevated/overlay` with dark/light overrides). See `contracts/token-contract.md` for all exact values. Add bilingual `[AR]`/`[EN]` header comment.
- [ ] T004 [P] Create `frontend/src/styles/theme.css` — define component-level tokens that reference semantic layer: `--button-primary-bg: var(--color-accent)`, `--card-bg: var(--color-bg-raised)`, `--card-border: var(--color-border)`, `--input-bg: var(--color-bg-subtle)`, `--input-border: var(--color-border)`, `--nav-bg: var(--color-bg-raised)`, `--nav-active-bg: var(--color-accent-subtle)`, `--nav-active-color: var(--color-accent)`. Add bilingual header.
- [ ] T005 [P] Create `frontend/src/lib/theme.ts` — export `getStoredTheme(): 'dark'|'light'|'system'`, `setTheme(t: 'dark'|'light'|'system'): void` (writes localStorage + updates `data-theme` on `document.documentElement`), `getEffectiveTheme(): 'dark'|'light'` (resolves 'system' via `prefers-color-scheme`). Add bilingual header.
- [ ] T006 [P] Add FOSC-prevention inline script to `public/index.html` `<head>` — place before any CSS `<link>` tags: `<script>(function(){var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);})()</script>`
- [ ] T007 Import `tokens.css` then `theme.css` at the very top of `frontend/src/styles/global.css` (or wherever CSS is first loaded) so all other stylesheets can reference the tokens
- [ ] T008 [P] Add `theme_preference = models.CharField(max_length=10, default='system')` to `UserProfile` in `backend/profile/models.py`; add `theme_preference` field to `UserProfileSerializer` in `backend/profile/serializers.py` (include in `fields` list). Add bilingual header comments to both files.
- [ ] T009 Generate migration: run `python manage.py makemigrations profile --name add_theme_preference` from `backend/` directory; verify migration file `backend/profile/migrations/0003_add_theme_preference.py` is correct and run `python manage.py migrate`

**Checkpoint**: Foundation ready — `tokens.css` + `theme.css` exist, FOSC prevention active, backend model updated. All user stories can now begin.

---

## Phase 3: User Story 1 — Visual Design System (Priority: P1) 🎯 MVP

**Goal**: Coherent visual language across the entire app; dark/light mode switches cleanly; all surfaces use token system.

**Independent Test**: Open app in dark mode → navigate all 7 hub pages → verify no inconsistent surfaces. Switch to light → verify no dark-mode artifacts. Inspect any element's CSS → trace all color values to `var(--color-*)` tokens. See quickstart.md Scenarios 1–4.

- [ ] T010 [US1] Update `frontend/src/styles/global.css` — replace ALL hardcoded hex/rgb color values and raw pixel spacing values with token references (`var(--color-*)`, `var(--space-*)`, `var(--font-*)`, etc.); ensure `body` uses `font-family: var(--font-sans)`, `background: var(--color-bg-base)`, `color: var(--color-text-primary)`. Add bilingual header.
- [ ] T011 [P] [US1] Update `frontend/src/styles/hubs.css` — replace all hardcoded visual values with token references; `.hub-tab-bar` border uses `var(--color-border)`, active tabs use `var(--color-accent)` and `var(--color-accent-subtle)`, text uses `var(--color-text-*)` tokens. Add bilingual header.
- [ ] T012 [P] [US1] Update `frontend/src/styles/health.css` — replace all hardcoded color, spacing, and font values with token references. Add bilingual header.
- [ ] T013 [P] [US1] Find and update any remaining domain CSS files in `frontend/src/styles/` (finance.css, pipeline.css, goals.css, schedule.css, or similar) — replace hardcoded visual values with token references. Add bilingual headers.
- [ ] T014 [US1] Create `frontend/src/components/ThemeToggle.tsx` — button component that reads current theme from `document.documentElement.getAttribute('data-theme')`, toggles between 'dark' and 'light' on click using `setTheme()` from `theme.ts`, fires async `PATCH /api/profile/me/` to sync `theme_preference` (fire-and-forget, no loading state). Show sun/moon icon based on current theme. Add bilingual header.
- [ ] T015 [US1] Add `<ThemeToggle />` to the app sidebar or top navigation in `frontend/src/App.tsx` (or wherever AppShell/sidebar is defined) — position at bottom of sidebar or top-right of header
- [ ] T016 [US1] Verify visual consistency: open app in both themes, navigate to every major page — fix any surface that still uses hardcoded colors (not using token system). Check DevTools computed styles for any `--color-*` that resolves to wrong value in light mode.

**Checkpoint**: App has a complete token system. Dark + light mode both work. ThemeToggle in nav. Zero raw color values in component CSS.

---

## Phase 4: User Story 2 — Progressive Disclosure Layout (Priority: P2)

**Goal**: Every page shows ≤3 sections expanded by default; section states persist in localStorage; SidePanel exists for entity detail.

**Independent Test**: Open any major page → count expanded sections (target ≤3) → collapse one → refresh → verify collapsed state persists. Open Goals page → click a goal → verify side panel slides in without navigation. See quickstart.md Scenarios 5–6 and 8.

- [ ] T017 [US2] Create `frontend/src/components/SidePanel.tsx` — generic side panel: props `isOpen: boolean`, `onClose: () => void`, `width?: number` (default 440), `children: ReactNode`; renders as portal (`document.body`) with slide-in-from-right CSS animation (250ms ease-out), backdrop (`rgba(0,0,0,0.2)`), closes on Escape keydown and backdrop click; uses `var(--color-bg-overlay)`, `var(--shadow-overlay)`, `var(--radius-lg)` tokens. Add bilingual header. Max 200 lines.
- [ ] T018 [US2] Audit `frontend/src/pages/HealthPage.tsx`, `frontend/src/pages/HealthBodyPage.tsx`, `frontend/src/pages/MoodPage.tsx`, `frontend/src/pages/HabitsPage.tsx`, `frontend/src/pages/SpiritualPage.tsx` — wrap each secondary/non-primary section with `<CollapsibleSection storageKey="health-{name}" defaultExpanded={false}>`. Keep only the single most-used section `defaultExpanded={true}`. Limit visible sections to ≤3 per page.
- [ ] T019 [P] [US2] Apply progressive disclosure to `frontend/src/pages/MealsPage.tsx` and any finance/pipeline pages — wrap secondary sections in `<CollapsibleSection>` with appropriate `storageKey` values and `defaultExpanded={false}`.
- [ ] T020 [P] [US2] Apply progressive disclosure to `frontend/src/pages/HealthPage.tsx` and `frontend/src/pages/HealthBodyPage.tsx` — ensure primary section (today's status) is visible by default; wrap all others in `<CollapsibleSection defaultExpanded={false}>` with descriptive storageKey.
- [ ] T021 [US2] Verify `frontend/src/pages/GoalsPage.tsx` entity clicks use side panel correctly — the existing NodeSidePanel should use the new generic SidePanel internally or match the same behavior contract (slide-in, Escape closes, list stays visible). Update if it uses a modal or full navigation instead.

**Checkpoint**: All major pages follow progressive disclosure. Section states persist. SidePanel component available. ≤3 sections visible by default on any page.

---

## Phase 5: User Story 3 — Guided Home Surface (Priority: P3)

**Goal**: Home surface shows different primary content per time of day; "most important next action" is the visually dominant element; empty state is helpful.

**Independent Test**: Open home at 06:00 → verify routine/priorities content is primary. Open at 14:00 → verify execution focus is primary. Open at 21:00 → verify reflection/planning is primary. See quickstart.md Scenarios 6, 10, 11.

- [ ] T022 [US3] Update `frontend/src/pages/HomePage.tsx` — use existing `getHomeState()` to render sections in different order per time band: morning → `<HomeNowSection>` first (routine + day priorities); afternoon → `<HomePrioritiesSection>` first (active work + priorities); evening → `<HomeAISection>` first (review + AI suggestions). The other sections follow but are collapsed by default.
- [ ] T023 [US3] Update `frontend/src/components/home/HomePrioritiesSection.tsx` — ensure the single "most important next action" (first uncompleted priority or AI next action) is rendered as the primary visual element: larger text (`var(--text-xl)`), accent color (`var(--color-accent)`), prominent card with `var(--shadow-elevated)`, positioned above all other priority items.
- [ ] T024 [US3] Update `frontend/src/components/home/HomeNowSection.tsx` — ensure morning layout shows current routine block (● NOW indicator) + today's top 3 priorities in a clean visual hierarchy; remove or collapse any sections not relevant to morning context.
- [ ] T025 [US3] Add empty state to `frontend/src/components/home/HomePrioritiesSection.tsx` — when `priorities` array is empty: render a card with message "No priorities set yet" and a link/button "Add your first priority →" pointing to `/goals`. Ensure empty state uses token colors and doesn't look broken.

**Checkpoint**: Home surface adapts to time of day. Next action visually prominent. No blank spaces when data is empty.

---

## Phase 6: User Story 4 — Contextual Interaction Patterns (Priority: P4)

**Goal**: Every interactive element follows one of the three defined patterns; users can predict behavior after 5 minutes of use.

**Independent Test**: Interact with 10 different elements across the app — predict the pattern before clicking. Verify prediction accuracy >80%. See quickstart.md Scenarios 7–9 and contracts/interaction-contract.md Selection Guide.

- [ ] T026 [US4] Audit `frontend/src/pages/HabitsPage.tsx` — ensure habit log row clicks use expand-in-place (not navigation or modal); wrap habit detail in `<CollapsibleSection>` or inline toggle. Each habit row should expand to show log actions inline.
- [ ] T027 [P] [US4] Audit `frontend/src/pages/MoodPage.tsx` — ensure mood history items expand in-place to show detail; not a navigation or modal. Each mood entry row expands to show full context inline.
- [ ] T028 [P] [US4] Audit `frontend/src/pages/SpiritualPage.tsx` — ensure spiritual tracker items use expand-in-place for inline logging. Each prayer or adhkar row expands to show log/edit controls inline.
- [ ] T029 [US4] Audit journal/writing surfaces — verify `frontend/src/pages/` journal-related page(s) open a focused view (full-page route, sidebar minimized, breadcrumb back control visible); not a modal or inline editor. Update to use focused view pattern if currently using another approach.
- [ ] T030 [US4] Cross-page consistency pass — open every hub page (Now, Goals, Build, Life, Learn, Intelligence, Profile); for each interactive element verify it matches the pattern contract from `contracts/interaction-contract.md`; fix any remaining pattern violations (wrong interaction type for content category).

**Checkpoint**: All interactive elements follow one of three defined patterns. Interaction behavior is predictable.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T031 [P] Verify bilingual `[AR]`/`[EN]` header comments exist in every file created or significantly modified in this feature: `tokens.css`, `theme.css`, `theme.ts`, `ThemeToggle.tsx`, `SidePanel.tsx`, `global.css`, `hubs.css`, `health.css`, domain CSS files, `backend/profile/models.py`, `backend/profile/serializers.py`. Add missing headers.
- [ ] T032 [P] Check file size compliance — verify no new file exceeds constitutional limits (CSS ≤300 lines, TSX components ≤300 lines). If `tokens.css` is approaching 300 lines, split into `frontend/src/styles/tokens/colors.css`, `tokens/spacing.css`, `tokens/typography.css` with barrel `tokens/index.css`.
- [ ] T033 Run all 12 acceptance scenarios from `specs/002-ui-ux-redesign/quickstart.md` — document pass/fail for each; fix any failures before marking this phase complete.
- [ ] T034 Update `docs/planning/roadmap.md` — mark Phase 2 (UI/UX Redesign) items as complete per the work done in this feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 (tokens.css must exist)
- **US2 (Phase 4)**: Depends on Phase 2 (tokens for SidePanel styling)
- **US3 (Phase 5)**: Depends on Phase 2 + Phase 3 (home uses tokens + progressive disclosure)
- **US4 (Phase 6)**: Depends on Phase 4 (SidePanel must exist for side-panel pattern)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundation only — independent
- **US2 (P2)**: Depends on Foundation only — can run in parallel with US1
- **US3 (P3)**: Depends on US1 (visual tokens) + benefits from US2 (progressive disclosure) — start after US1
- **US4 (P4)**: Depends on US2 (SidePanel) — start after US2

### Within Each Phase

- Sequential tasks (no [P]) must complete in order
- Tasks marked [P] can run in parallel with other [P] tasks in the same phase
- Always run Phase 2 to completion before any user story work

### Parallel Opportunities

- Phase 2: T004, T005, T006 are [P] — run in parallel after T003 creates tokens.css
- Phase 2: T008 (backend) is [P] — run at any time during Phase 2
- Phase 3: T011, T012, T013 are [P] — run in parallel after T010 updates global.css
- Phase 4: T019, T020 are [P] — run in parallel
- Phase 6: T027, T028 are [P] — run in parallel
- Phase 7: T031, T032 are [P] — run in parallel

---

## Parallel Examples

### Phase 2 Parallel Group (after T003)
```
T004: theme.css component tokens
T005: lib/theme.ts utilities
T006: index.html blocking script
T008: backend model + serializer
```

### Phase 3 Parallel Group (after T010)
```
T011: hubs.css token migration
T012: health.css token migration
T013: remaining domain CSS files
```

### Phase 6 Parallel Group
```
T027: MoodPage interaction audit
T028: SpiritualPage interaction audit
```

---

## Implementation Strategy

### MVP: User Story 1 Only (Visual Design System)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T009)
3. Complete Phase 3: US1 (T010–T016)
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–4 (token compliance, dark/light mode)
5. Deploy — app has coherent visual language immediately usable

### Incremental Delivery

1. Setup + Foundation → Token system live
2. US1 → Dark/light mode + visual consistency
3. US2 → Progressive disclosure + SidePanel
4. US3 → Time-aware home surface
5. US4 → Full interaction pattern consistency
6. Each phase is usable and improved without requiring the next phase

---

## Notes

- [P] tasks = different files, no shared dependency — safe to run in parallel
- Story label maps each task to its user story for traceability
- Constitution gates: every new/modified file needs bilingual `[AR]`/`[EN]` header (T031 verifies)
- File size gate: tokens.css split if it exceeds 250 lines (T032 verifies)
- No tests included — not requested in spec; acceptance is via quickstart.md scenarios (T033)
- Commit after each phase checkpoint; keep master deployable at all times
