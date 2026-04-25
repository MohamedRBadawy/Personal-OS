# Tasks: AI Intelligence Layer

**Input**: Design documents from `specs/004-ai-intelligence-layer/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api-contracts.md ✅ | quickstart.md ✅  
**Tests**: Not requested — no test tasks generated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US6 map to spec.md priorities P1–P6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment is ready before writing any code.

- [X] T001 Confirm `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set as environment variables in the Render dashboard for `personal-os-api-xk0z` (no file changes — environment verification only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Constitution IX requires splitting `core/services.py` (754 lines, limit 400) before any code is added to it. This split is a pre-condition for US6. All other user stories can begin after T001.

**⚠️ CRITICAL**: T006 and T007 block US6 (Phase 8). US1–US5 can begin after Phase 1.

- [X] T002 Create `backend/core/services/` package: make directory, create `backend/core/services/__init__.py` that re-exports `CheckInService`, `PriorityService`, `DashboardService`, `CommandCenterService` (all existing callers continue to work)
- [X] T003 [P] Move `CheckInService` from `backend/core/services.py` to `backend/core/services/checkin.py` with bilingual `[AR]`/`[EN]` file header
- [X] T004 [P] Move `PriorityService` from `backend/core/services.py` to `backend/core/services/priority.py` with bilingual header
- [X] T005 [P] Move `DashboardService` from `backend/core/services.py` to `backend/core/services/dashboard.py` with bilingual header
- [X] T006 Move `CommandCenterService` from `backend/core/services.py` to `backend/core/services/command_center.py` with bilingual header (depends on T004 — imports `PriorityService`)
- [X] T007 Delete `backend/core/services.py` and run `python manage.py check` to verify all imports resolve cleanly through `backend/core/services/__init__.py`

**Checkpoint**: `python manage.py check` passes, app runs normally, all existing views work.

---

## Phase 3: User Story 1 — Telegram Conversational Mode (Priority: P1) 🎯 MVP

**Goal**: Any free-form message sent to `@PersonalOSBadawy_bot` gets an AI response and can trigger app actions — without opening the web app.

**Independent Test**: Send "log my mood as 4 today" to the Telegram bot. A mood record is created and the bot replies "Done — mood logged as 4/5 for today." Verify in the app.

- [X] T008 [US1] Add `TelegramConversation` model to `backend/core/models.py`: fields `chat_id` (CharField(50), db_index), `role` (CharField(10), choices user/assistant), `content` (TextField), `created_at` (auto_now_add); add class methods `get_recent(chat_id, limit=10)` and `append(chat_id, user_text, assistant_reply)`; add bilingual `[AR]`/`[EN]` inline comments
- [X] T009 [US1] Create migration `backend/core/migrations/NNNN_add_telegramconversation.py` for the new model
- [X] T010 [US1] Add `"telegram"` mode branch to `_build_system_prompt()` in `backend/core/chat_service.py`: appends instructions for short plain-text responses (max 3 sentences), no markdown tables, action confirmation format `"Done — [what was done]."`
- [X] T011 [US1] Create `_format_actions(actions: list) -> str` helper in `backend/core/telegram_bot.py` that converts a list of tool results into a human-readable confirmation string (e.g. `"mood logged, idea captured"`)
- [X] T012 [US1] Create `_handle_conversation(chat_id: str, text: str)` function in `backend/core/telegram_bot.py`: loads `TelegramConversation.get_recent(chat_id, 10)`, appends user message, calls `run_chat(messages, context={"mode": "telegram"})`, saves exchange via `TelegramConversation.append()`, sends formatted reply via `send_message()`
- [X] T013 [US1] Modify `handle_webhook()` in `backend/core/telegram_bot.py`: add `else` branch after the existing command checks (`/brief`, `/next`, `/capture`, `/status`) to route all other text to `_handle_conversation(chat_id, text)` instead of `_handle_help()`
- [X] T014 [US1] Add bilingual `[AR]`/`[EN]` comments to all new/modified functions in `backend/core/telegram_bot.py`

**Checkpoint**: Send any non-command text to the bot → AI responds in plain text. Send "log mood 4" → mood logged. Send "/status" → existing command still works.

---

## Phase 4: User Story 2 — Proactive AI (Priority: P2)

**Goal**: Morning brief and EOD summary arrive on Telegram automatically — no command needed.

**Independent Test**: At 05:20 Cairo time, Telegram receives a morning brief without any user action.

- [ ] T015 [US2] Add Render cron job in the Render dashboard (`personal-os-api-xk0z` → Cron Jobs): command `python manage.py send_morning_brief`, schedule `20 3 * * *` (UTC), name "Morning Brief"
- [ ] T016 [US2] Add Render cron job: command `python manage.py send_eod_summary`, schedule `30 18 * * *` (UTC), name "EOD Summary"
- [ ] T017 [US2] Verify via Render shell: run `python manage.py send_morning_brief` manually and confirm Telegram receives the message within 90 seconds

**Checkpoint**: Manual trigger works. Automated trigger fires at next scheduled time.

---

## Phase 5: User Story 3 — Thinking Mode (Priority: P3)

**Goal**: Mohamed can dump a raw thought and the AI guides it through 5 structured stages to a conclusion (Goal / Idea / Discard), then captures the result.

**Independent Test**: Click "Think this through with AI" on the Ideas page → type a raw thought → AI asks one question → respond → AI proposes a conclusion → confirm → a goal or idea record is created.

- [X] T018 [US3] Add `"thinking_companion"` mode branch to `_build_system_prompt()` in `backend/core/chat_service.py`: implements 5-stage flow (receive thought → clarify real goal → evaluate cost → connect to existing goals → propose conclusion with priority); enforces one question per message; concludes with Goal/Idea/Discard proposal; uses `create_node` or `capture_idea` tool on confirmation
- [X] T019 [US3] Add "Think this through with AI" button to `frontend/src/pages/IdeasThinkingPage.tsx` that opens the ChatPanel with `context: { mode: 'thinking_companion' }` and placeholder text "Dump your raw thought here — I'll help you figure out what it is and what to do with it."
- [X] T020 [US3] Register `Ctrl+Shift+T` global keyboard shortcut in `frontend/src/app/AppShell.tsx` (or the existing keyboard shortcut registry if present) that opens the ChatPanel in `thinking_companion` mode from any page

**Checkpoint**: Ctrl+Shift+T opens ChatPanel in thinking mode from any page. AI asks exactly one question per exchange. At stage 5 it proposes a conclusion. Confirming creates a record.

---

## Phase 6: User Story 4 — Synthesis Surface (Priority: P4)

**Goal**: Home page answers four named questions directly — What matters most? What am I ready to act on? What is blocking me? How am I doing (trend)?

**Independent Test**: Open home page — four labeled question panels are visible without scrolling. Q2 shows only `available` goals (not blocked or done). Q3 names the blocking item, not just "blocked". Q4 shows 7-day trend averages.

- [X] T021 [P] [US4] Add `questionPanelOpen: Record<'q1' | 'q2' | 'q3' | 'q4', boolean>` state to `frontend/src/components/home/homeState.ts`, defaulting all panels to open
- [X] T022 [US4] Create `frontend/src/components/home/IntelligenceSurface.tsx`: Q1 panel using `cc.priorities[0]` and reusing `TopPriorityCard` from `HomePrioritiesSection.tsx`; add overwhelm banner when `cc.overwhelm.reduced_mode === true`
- [X] T023 [US4] Add Q2 panel to `IntelligenceSurface.tsx`: filter `cc.priorities` for `status === 'available'`, render top 3 as `ReadyRow` sub-component showing title, effort, and `recommended_tool`
- [X] T024 [US4] Add Q3 panel to `IntelligenceSurface.tsx`: filter `cc.priorities` for `status === 'blocked'`, render each as `BlockerRow` sub-component showing title and the full `blocked_by_titles` array as named blockers
- [X] T025 [US4] Add Q4 panel to `IntelligenceSurface.tsx`: 4 trend rows using `cc.health_today.summary` 7d averages + `cc.finance.summary.kyrgyzstan_progress_pct`; render `cc.key_signals` as signal list; wrap existing `StatusStrip` (7 domain tiles) in a secondary collapse inside Q4
- [X] T026 [US4] Modify `frontend/src/pages/HomePage.tsx`: replace `HomeAISection` in the primary slot with `IntelligenceSurface`; move `HomeNowSection` below with `defaultOpen={false}`; pass `cc` data prop to `IntelligenceSurface`

**Checkpoint**: Four panels visible on load. All data comes from existing `cc` payload — no new network requests. `HomeAISection` still renders on Analytics page unchanged.

---

## Phase 7: User Story 5 — Decision System + Trade-off Visibility (Priority: P5)

**Goal**: Decisions have trade-off cost and outcome dates. Past-due decisions show a pending review badge. Activating a goal beyond safe capacity triggers a trade-off prompt.

**Independent Test**: Create a decision with yesterday's outcome date → "Pending review" badge appears on the card. Have 3 active goals → try to activate a 4th → trade-off prompt modal appears listing current active goals.

### Backend — Decision System

- [X] T027 [P] [US5] Add 5 fields to `backend/analytics/models/decision_log.py`: `trade_off_cost` (TextField, blank), `outcome_date` (DateField, null/blank), `outcome_result` (CharField(10), blank, choices: right/wrong/too_early), `enabled_node` (FK goals.Node, null, SET_NULL, related_name='enabling_decisions'), `killed_node` (FK goals.Node, null, SET_NULL, related_name='killing_decisions')
- [X] T028 [US5] Create migration `backend/analytics/migrations/NNNN_decisionlog_tradeoff_fields.py` for the 5 new fields (AddField ×5; all nullable — no data migration needed)
- [X] T029 [P] [US5] Create `backend/analytics/services/decisions.py` with `DecisionService` class: `due_for_review(reference_date)` returns `DecisionLog.objects.filter(outcome_date__lte=reference_date, outcome_result='')`. Add bilingual header.
- [X] T030 [P] [US5] Extend `DecisionLogSerializer` (in `backend/analytics/serializers/`) to expose all 5 new fields plus read-only `enabled_node_title` and `killed_node_title` as `SerializerMethodField`
- [X] T031 [US5] Add `@action(detail=False, methods=['get'], url_path='due')` to `DecisionLogViewSet` in `backend/analytics/views/` that returns `DecisionService.due_for_review(today)`

### Backend — Trade-off Gate

- [X] T032 [P] [US5] Add `@action(detail=False, methods=['get'], url_path='active-context')` to `NodeViewSet` in `backend/goals/views.py`: queries `Node.objects.filter(type__in=[GOAL,PROJECT], status=ACTIVE)`, calls `OverwhelmService.summary()`, returns `active_goal_count`, `active_goals` list (id/title/category/dependency_unblock_count/progress_pct), `overwhelm_score`, `max_safe_active`, `recommendation` string
- [X] T033 [P] [US5] Modify `NodeViewSet.partial_update()` in `backend/goals/views.py`: detect when `status` field changes to `active`, append `trade_off_context` key to response dict with `active_count_before`, `active_count_after`, `exceeded_safe_limit`

### Frontend — Decision System

- [X] T034 [P] [US5] Extend `DecisionLog` type in `frontend/src/lib/types/learning.ts` with 7 new fields: `trade_off_cost`, `outcome_date`, `outcome_result`, `enabled_node`, `enabled_node_title`, `killed_node`, `killed_node_title`
- [X] T035 [P] [US5] Add `listDueDecisions()` function to `frontend/src/lib/api.ts` calling `GET /api/analytics/decisions/due/`
- [X] T036 [US5] Add 3 fields to `DecisionsPage` in `frontend/src/pages/SimpleWorkspacePages.tsx`: `trade_off_cost` (textarea, label "Trade-off: what you're NOT doing"), `outcome_date` (date input), `outcome_result` (select: right/wrong/too_early/not yet); add "Pending review" badge logic: show badge when `outcome_date <= today && outcome_result === ''`
- [X] T037 [US5] Create `frontend/src/components/home/DecisionInsightCard.tsx`: shown inside Q3 panel of `IntelligenceSurface` when any `DecisionLog` has a `killed_node` whose current status is `active`; renders tension message "You decided X which deprioritized Y, but Y is now active"; fetch decisions from `useQuery` using `listDueDecisions`

### Frontend — Trade-off Gate

- [X] T038 [P] [US5] Add `ActiveGoalContext` and `ActiveGoalSummary` interfaces to `frontend/src/lib/types/goals.ts` per contracts/api-contracts.md
- [X] T039 [P] [US5] Add `getActiveGoalContext()` function to `frontend/src/lib/api.ts` calling `GET /api/goals/nodes/active-context/`
- [X] T040 [US5] Create `frontend/src/components/goals/TradeoffPromptModal.tsx`: displays `active_goals` list from `ActiveGoalContext`, offers "Defer one" selection or "Proceed anyway"; on confirm calls `updateNode()` for target (set active) and optionally for deferred goal (set deferred); invalidates `['command-center']` and `['nodes']` queries
- [X] T041 [US5] Modify status change handler in `frontend/src/components/home/HomePrioritiesSection.tsx`: when user selects `active`, call `getActiveGoalContext()` first; if `active_count >= max_safe_active`, show `TradeoffPromptModal`; otherwise proceed directly with `updateNode()`
- [X] T042 [US5] Apply same intercept pattern to status `<select>` onChange in `frontend/src/components/command-center/CommandPriorityCard.tsx`

**Checkpoint**: Decision with past `outcome_date` shows badge. 3+ active goals → activating another shows modal. "Proceed anyway" fires single update. Deferred selection fires two updates.

---

## Phase 8: User Story 6 — Self-Correcting Weekly Review (Priority: P6)

**Goal**: Weekly review gains a Commitments step. Prior week's commitments appear on home page with Yes/No accountability buttons.

**Independent Test**: Complete weekly review with one STOP commitment → next day open home page → Q4 panel shows the commitment with "Did you keep this?" → click Yes → panel clears.

**Depends on**: Phase 2 complete (T007 — `core/services.py` split, required for T049)

### Backend

- [X] T043 [P] [US6] Create `backend/analytics/models/review_commitment.py` with `ReviewCommitment` model: FKs to `WeeklyReview` (CASCADE, related_name='commitments'), `goals.Node` (null, SET_NULL), second FK to `WeeklyReview` (null, SET_NULL, related_name='checked_commitments'); fields `action_type` (choices: stop/change/start), `description` (TextField), `was_kept` (BooleanField, null), `created_at` (auto_now_add). Add bilingual header.
- [X] T044 [P] [US6] Add `ReviewCommitment` to `backend/analytics/models/__init__.py` imports and `__all__`
- [X] T045 [US6] Create migration `backend/analytics/migrations/NNNN_add_reviewcommitment.py` (depends on T043, T044)
- [X] T046 [P] [US6] Add `get_prior_commitments(reference_date)` static method to `WeeklyReviewService` in `backend/analytics/services/reviews.py`: finds previous week's `WeeklyReview`, returns its `ReviewCommitment` objects where `was_kept` is None
- [X] T047 [P] [US6] Create `ReviewCommitmentSerializer` in `backend/analytics/serializers/` exposing all fields plus `node_update_title` as SerializerMethodField
- [X] T048 [US6] Add two `@action` methods to `WeeklyReviewViewSet` in `backend/analytics/views/`: `commitments_list` (`detail=True, methods=['get','post'], url_path='commitments'`) for listing and bulk-creating commitments; `check_prior_commitments` (`detail=False, methods=['get']`) calling `WeeklyReviewService.get_prior_commitments(today)`
- [X] T049 [US6] Add `prior_commitments_due` key to the return dict in `CommandCenterService.payload()` in `backend/core/services/command_center.py`: calls `WeeklyReviewService.get_prior_commitments(reference_date)`, serializes to `[{id, action_type, description, from_week}]`

### Frontend

- [X] T050 [P] [US6] Add `ReviewCommitment` interface to `frontend/src/lib/types/analytics.ts` per contracts/api-contracts.md
- [X] T051 [P] [US6] Add `PriorCommitmentItem` interface and `prior_commitments_due: PriorCommitmentItem[]` to `CommandCenterPayload` in `frontend/src/lib/types/dashboard.ts`
- [X] T052 [P] [US6] Add `listReviewCommitments(reviewId)`, `createReviewCommitments(reviewId, items)`, and `updateReviewCommitment(id, payload)` to `frontend/src/lib/api.ts`
- [X] T053 [US6] Add Step 5 "Commitments" to `frontend/src/components/WeeklyReviewModal.tsx`: append `'Commitments'` to the existing `STEPS` array; render three labeled sections (STOP / CHANGE / START) each with text inputs and an Add button; on review completion call `createReviewCommitments(reviewId, entries)`
- [X] T054 [US6] Create `frontend/src/components/home/CommitmentAccountabilityPanel.tsx`: renders when `cc.prior_commitments_due.length > 0`; shows each commitment with `action_type` badge, description, and "Yes" / "No" buttons; Yes/No click calls `updateReviewCommitment(id, { was_kept })` then invalidates `['command-center']`; integrate into Q4 panel of `IntelligenceSurface.tsx` above the StatusStrip collapse

**Checkpoint**: Complete review with commitments → commitments saved. Next day: Q4 shows accountability panel. Mark Yes → panel item disappears.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T055 [P] Add 4 new tools to `backend/core/chat_tools.py`: `log_journal_entry` (creates JournalEntry for today), `complete_routine_block` (creates RoutineLog for named block), `update_goal_progress` (sets `progress_pct` on Node by title search), `update_contact_followup` (sets `next_followup` date on Contact by name search) — each needs a schema dict entry and executor function
- [X] T056 [P] Audit bilingual `[AR]`/`[EN]` comments across all files created in this feature: `telegram_bot.py`, `models.py` additions, `review_commitment.py`, `decisions.py`, `IntelligenceSurface.tsx`, `TradeoffPromptModal.tsx`, `DecisionInsightCard.tsx`, `CommitmentAccountabilityPanel.tsx` — add any missing headers/inline comments
- [ ] T057 Run `quickstart.md` validation: execute each verification step in order, confirm all pass
- [ ] T058 Update `CLAUDE.md` `<!-- SPECKIT START -->` block to reference this plan as complete and link to the next feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks Phase 8 (US6 backend T049)**
- **Phase 3 (US1)**: Can start after Phase 1 — independent of Phase 2
- **Phase 4 (US2)**: Can start immediately — config only, no code dependency
- **Phase 5 (US3)**: Can start after Phase 1 — independent of Phase 2
- **Phase 6 (US4)**: Can start after Phase 1 — independent of Phase 2
- **Phase 7 (US5)**: Can start after Phase 1 — independent of Phase 2
- **Phase 8 (US6)**: Backend T049 depends on Phase 2 complete; frontend tasks (T050–T054) depend on Phase 6 (IntelligenceSurface must exist for T054)
- **Phase 9 (Polish)**: Depends on all desired phases complete

### User Story Dependencies

- **US1 (P1 — Telegram)**: No story dependencies
- **US2 (P2 — Proactive)**: No story dependencies — can do any time
- **US3 (P3 — Thinking Mode)**: No story dependencies
- **US4 (P4 — Synthesis Surface)**: No story dependencies
- **US5 (P5 — Decisions + Trade-off)**: No story dependencies
- **US6 (P6 — Review)**: T054 depends on US4 complete (needs `IntelligenceSurface`); T049 depends on Phase 2 complete

### Within Each Phase

- Models before migrations
- Migrations before seeding/endpoints that use new fields
- Backend endpoints before frontend API functions
- Frontend types before frontend components
- Core component before integration into parent page

---

## Parallel Execution Examples

### Phase 2 (Foundational) — Run T003, T004, T005 simultaneously
```
Task: Move CheckInService to backend/core/services/checkin.py
Task: Move PriorityService to backend/core/services/priority.py
Task: Move DashboardService to backend/core/services/dashboard.py
```
Then T006 (CommandCenterService), then T007 (delete original).

### Phase 7 (US5) — Run backend and frontend in parallel after T028
```
Task: T029 Create DecisionService
Task: T030 Extend DecisionLogSerializer
Task: T032 Add active-context endpoint to NodeViewSet
Task: T033 Augment PATCH response
Task: T034 Extend DecisionLog frontend type
Task: T035 Add listDueDecisions to api.ts
Task: T038 Add ActiveGoalContext types
Task: T039 Add getActiveGoalContext to api.ts
```

### Phase 8 (US6) — Run T043, T044, T046, T047 simultaneously
```
Task: Create ReviewCommitment model
Task: Add to __init__.py
Task: Add get_prior_commitments to WeeklyReviewService
Task: Create ReviewCommitmentSerializer
Task: Add frontend types (T050, T051, T052)
```

---

## Implementation Strategy

### MVP First (US1 Only — Telegram Conversational)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 3: US1 (T008–T014)
3. **STOP and VALIDATE**: Send free-form message to bot → AI responds with context, takes actions
4. Deploy — immediate daily use from day one

### Incremental Delivery

1. T001 → validate env ✓
2. Phase 2 (T002–T007) → services split ✓
3. US1 (T008–T014) → Telegram conversational ✓ → **deploy and use**
4. US2 (T015–T017) → proactive briefs ✓ → **deploy and use**
5. US3 (T018–T020) → thinking mode ✓ → **deploy and use**
6. US4 (T021–T026) → synthesis surface ✓ → **deploy and use**
7. US5 (T027–T042) → decisions + trade-off ✓ → **deploy and use**
8. US6 (T043–T054) → self-correcting review ✓ → **deploy and use**
9. Phase 9 (T055–T058) → polish ✓ → **complete**

---

## Notes

- [P] tasks = different files, no shared dependencies — safe to run in parallel
- [Story] label maps each task to its user story for traceability
- `queryClient.invalidateQueries({ queryKey: ['command-center'] })` must be called after every mutation that affects home page data
- All new backend files require bilingual `[AR]`/`[EN]` header per Constitution VIII
- All new/modified files respect line limits per Constitution IX (400 Python, 300 TypeScript) — if a file is at the limit during implementation, split first
- `core/services.py` split (T002–T007) must complete before T049; all other tasks can proceed independently
