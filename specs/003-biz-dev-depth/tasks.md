# Tasks: Business Development Depth

**Input**: Design documents from `specs/003-biz-dev-depth/`  
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/pipeline-api.md ✅ · quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story. Each story independently deliverable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)

---

## Phase 1: Setup

**Purpose**: Split the existing `pipeline/models.py` into a `models/` subpackage before any new models are added. Constitution IX requires the split before adding new logic.

- [x] T001 Create `backend/pipeline/models/` subpackage — move Opportunity, ServiceOffering, Client into `backend/pipeline/models/opportunity.py`; create `backend/pipeline/models/__init__.py` re-exporting all models; delete original `backend/pipeline/models.py`
- [x] T002 Verify no schema migration is generated after split (`python manage.py makemigrations --check`) and fix any broken import paths in `backend/pipeline/views.py`, `backend/pipeline/serializers.py`, `backend/pipeline/admin.py`, and any other files importing from `backend/pipeline/models`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: All new Django models + migrations. Must be complete before any UI phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Add `monthly_value_eur` (DecimalField 6,2 default 0), `is_recurring` (BooleanField default True), `expected_close_date` (DateField null blank) to `Opportunity` in `backend/pipeline/models/opportunity.py`; generate migration `backend/pipeline/migrations/XXXX_opportunity_deal_fields.py`
- [x] T004 [P] Create `OutreachStep` model in `backend/pipeline/models/outreach.py` with fields: `opportunity` (FK→Opportunity CASCADE), `user` (FK→User CASCADE), `step_type` (CharField choices: first_message/reply_received/meeting_booked/proposal_sent/won/lost), `date` (DateField default today), `notes` (TextField blank), `draft_message` (TextField blank), `created_at` (auto); add `[AR]/[EN]` bilingual header; generate migration `backend/pipeline/migrations/XXXX_add_outreach_step.py`
- [x] T005 [P] Create `EquityPartnership` and `PartnershipAction` models in `backend/pipeline/models/equity.py` — EquityPartnership fields: `user` (FK→User CASCADE), `partner_name`, `business_name`, `business_type`, `equity_pct` (DecimalField 5,2), `status` (choices: negotiating/active/on_hold/exited), `terms_notes`, `created_at`, `updated_at`; PartnershipAction fields: `partnership` (FK→EquityPartnership CASCADE), `user` (FK→User CASCADE), `description`, `completed_at` (DateTimeField null blank), `is_current_next_action` (BooleanField default False), `created_at`; add `[AR]/[EN]` bilingual header; generate migration `backend/pipeline/migrations/XXXX_add_equity_partnership.py`
- [x] T006 Update `backend/pipeline/models/__init__.py` to re-export `OutreachStep`, `EquityPartnership`, `PartnershipAction`; register all three in `backend/pipeline/admin.py`
- [x] T007 Add `OutreachStep`, `EquityPartnership`, `PartnershipAction` TypeScript types to `frontend/src/lib/types/pipeline.ts` (or create it if it doesn't exist); ensure they are re-exported from `frontend/src/lib/types/index.ts`

**Checkpoint**: Run `python manage.py migrate` — all migrations apply cleanly. All models visible in Django admin.

---

## Phase 3: User Story 1 — Outreach Sequence Tracking (Priority: P1) 🎯 MVP

**Goal**: Log every outreach step per opportunity, detect overdue opportunities automatically, surface overdue count in the pipeline funnel summary.

**Independent Test**: Create an opportunity → log a "First message" step → verify timeline appears. Log a step dated 4+ days ago → verify overdue flag appears. Check funnel metric grid shows overdue count.

### Implementation for User Story 1

- [x] T008 [US1] Create `OutreachStepSerializer` in `backend/pipeline/serializers.py` (or split file if over limit) with fields: id, step_type, date, notes, draft_message, created_at; add `[AR]/[EN]` comment block
- [x] T009 [US1] Add `is_overdue` (SerializerMethodField: latest step date < today−3 and status not in won/lost/rejected) and `latest_step_date` (SerializerMethodField) to the existing `OpportunitySerializer`; add `outreach_steps` as a nested read-only field using `OutreachStepSerializer(many=True)`
- [x] T010 [US1] Create `OutreachStepListCreateView` in `backend/pipeline/views.py` — GET returns steps for one opportunity ordered by `-date`; POST creates a new step, sets `user` from `request.user`; add `[AR]/[EN]` comment
- [x] T011 [US1] Register URL `pipeline/opportunities/<int:pk>/steps/` → `OutreachStepListCreateView` in `backend/pipeline/urls.py`
- [x] T012 [P] [US1] Add `listOutreachSteps(opportunityId)` and `createOutreachStep(opportunityId, payload)` API functions to `frontend/src/lib/api.ts`
- [x] T013 [P] [US1] Build `frontend/src/components/OutreachTimeline.tsx` — compact list of steps, each row shows: step type icon (emoji), date, notes (truncated); click-to-expand notes; `[AR]/[EN]` bilingual header
- [x] T014 [US1] Build `frontend/src/components/OutreachStepForm.tsx` — inline form: step type `<select>`, date `<input type="date">`, notes `<textarea>`, Save button; on submit calls `createOutreachStep` and invalidates query; `[AR]/[EN]` bilingual header
- [x] T015 [US1] Integrate `OutreachTimeline` and `OutreachStepForm` into `PipelinePage.tsx` opportunity expand area (expand-in-place on card click); query key `['outreach-steps', opportunityId]`
- [x] T016 [US1] Add overdue visual indicator to pipeline kanban opportunity cards in `PipelinePage.tsx` — amber dot or "Follow up" chip when `opportunity.is_overdue === true`
- [x] T017 [US1] Update pipeline funnel summary metric grid in `PipelinePage.tsx` to include an "Overdue" count chip sourced from `opportunities.filter(o => o.is_overdue).length`

**Checkpoint**: US1 fully functional — step timeline visible per opportunity, overdue flagging works, funnel metric updates.

---

## Phase 4: User Story 2 — Pipeline → North Star (Priority: P2)

**Goal**: Won recurring deals contribute to confirmed monthly income. Active deals contribute a weighted projection. The home surface north star bar shows both.

**Independent Test**: Set `monthly_value_eur=300` on a won opportunity with `is_recurring=True` → north star bar increments by €300 confirmed. Set `monthly_value_eur=500` on a proposal_sent opportunity → north star shows €300 weighted projection (60% × €500).

### Implementation for User Story 2

- [x] T018 [US2] Add `monthly_value_eur`, `is_recurring`, and `expected_close_date` fields to the opportunity create/edit form or inline edit in `PipelinePage.tsx`; display monthly value on each kanban card (e.g., "€300/mo" badge); display close date as a secondary line when set
- [x] T019 [US2] Add stage weight constants to `backend/pipeline/serializers.py`: `STAGE_WEIGHTS = {won:1.0, proposal_sent:0.6, interview:0.3, applied:0.1, reviewing:0.05, new:0.05, lost:0.0, rejected:0.0}`; add `weighted_pipeline_eur` and `confirmed_monthly_eur` as `SerializerMethodField` on `PipelineWorkspaceSerializer`; add `pipeline_north_star` nested object `{confirmed_eur, weighted_pipeline_eur, target_eur, confirmed_pct, pipeline_pct}`
- [x] T020 [US2] Extend `NorthStarSerializer` in `backend/profile/serializers.py` to fetch pipeline aggregates from `Opportunity` queryset — add `weighted_pipeline_eur` and `pipeline_progress_percent` to the serialized output
- [x] T021 [P] [US2] Update `frontend/src/components/home/HomeNorthStarSection.tsx` — add a second progress bar segment (lighter tint, `pipeline_progress_percent`) behind or stacked with the confirmed segment; add caption: "€X confirmed · €Y pipeline"
- [x] T022 [P] [US2] Update frontend types for NorthStarData in `frontend/src/lib/types/` to include `weighted_pipeline_eur` and `pipeline_progress_percent` fields

**Checkpoint**: US2 functional — pipeline values flow to north star bar on home page; confirmed vs. projected clearly distinguished.

---

## Phase 5: User Story 3 — Equity Partnership Tracking (Priority: P3)

**Goal**: Mohamed can create, track, and action equity partnerships with per-partnership next-action tracking.

**Independent Test**: Create an equity partnership → verify it appears in Partnerships tab. Add a next action → verify it shows under the partnership. Mark action complete → verify completed_at is set and a new next action can be added.

### Implementation for User Story 3

- [x] T023 [US3] Create `EquityPartnershipSerializer` (with nested `current_next_action`) and `PartnershipActionSerializer` in `backend/pipeline/serializers.py`; add `[AR]/[EN]` comment
- [x] T024 [US3] Create `EquityPartnershipListCreateView` and `EquityPartnershipDetailView` in `backend/pipeline/views.py` — GET list, POST create, PATCH update; filter by `request.user`
- [x] T025 [US3] Create `PartnershipActionListCreateView` (nested under partnership) and `PartnershipActionDetailView` (PATCH to mark complete) in `backend/pipeline/views.py`; when an action is marked complete, clear `is_current_next_action` on it
- [x] T026 [US3] Register URLs: `pipeline/partnerships/` + `pipeline/partnerships/<int:pk>/` + `pipeline/partnerships/<int:pk>/actions/` + `pipeline/partnerships/<int:pk>/actions/<int:action_pk>/` in `backend/pipeline/urls.py`
- [x] T027 [P] [US3] Add `listPartnerships()`, `createPartnership(payload)`, `updatePartnership(id, payload)`, `createPartnershipAction(partnershipId, payload)`, `completePartnershipAction(partnershipId, actionId)` to `frontend/src/lib/api.ts`
- [x] T028 [US3] Build `frontend/src/components/EquityPartnershipsPanel.tsx` — list view with: partner name, business, equity % badge, status pill (negotiating/active/on_hold/exited), current next action row with "Mark done" button + "Add next action" inline form; `[AR]/[EN]` bilingual header
- [x] T029 [US3] Add inline create form to `EquityPartnershipsPanel.tsx` — fields: partner name, business name, business type, equity %, status; saves via `createPartnership`
- [x] T030 [US3] Add "Partnerships" tab to `frontend/src/pages/BusinessHubPage.tsx` (or the equivalent Build hub page) rendering `<EquityPartnershipsPanel />`

**Checkpoint**: US3 functional — Partnerships tab visible in Build hub, partnerships created and actioned, next actions tracked.

---

## Phase 6: User Story 4 — AI Draft → Outreach Step (Priority: P4)

**Goal**: Saving an AI-generated draft message automatically creates a logged OutreachStep — no separate logging needed.

**Independent Test**: Open an opportunity → click "Draft message" → AI draft appears → click "Save as step" → OutreachStep with type `first_message` and the draft text is created → appears in the OutreachTimeline.

### Implementation for User Story 4

- [x] T031 [US4] Add `from-draft` POST endpoint at `pipeline/opportunities/<int:pk>/steps/from-draft/` in `backend/pipeline/views.py` — calls existing `draftOpportunityMessage` logic, then creates an `OutreachStep` with `step_type=first_message` and `draft_message` set; returns `{step, draft_message}`
- [x] T032 [US4] Register `from-draft` URL in `backend/pipeline/urls.py`; add `saveDraftAsStep(opportunityId, payload)` API function to `frontend/src/lib/api.ts`
- [x] T033 [US4] Add "Save as step" button to the AI draft panel in `frontend/src/pages/PipelinePage.tsx` — on click calls `saveDraftAsStep`, then invalidates `['outreach-steps', opportunityId]` query so the timeline refreshes automatically

**Checkpoint**: US4 functional — AI draft panel has "Save as step" button; saved draft appears in the outreach timeline.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T034 [P] Verify all new and modified files have `[AR]/[EN]` bilingual header comments and inline section comments: `backend/pipeline/models/outreach.py`, `backend/pipeline/models/equity.py`, `frontend/src/components/OutreachTimeline.tsx`, `frontend/src/components/OutreachStepForm.tsx`, `frontend/src/components/EquityPartnershipsPanel.tsx`, `frontend/src/components/home/HomeNorthStarSection.tsx`
- [x] T035 [P] Check line counts on all modified files against Constitution IX limits (Python ≤400, TSX ≤300, CSS ≤300); split any file approaching limit before adding more logic
- [ ] T036 Run quickstart.md acceptance scenarios manually (5 scenarios); confirm each passes; mark each scenario complete in `specs/003-biz-dev-depth/quickstart.md`
- [x] T037 Update `docs/planning/roadmap.md` — mark Business Development depth items complete under Phase 3

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3–6 (User Stories)**: All depend on Phase 2 completion; can proceed in priority order or in parallel
- **Phase 7 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on other stories.
- **US2 (P2)**: Starts after Phase 2. Depends on Opportunity deal fields (T003, already in Phase 2).
- **US3 (P3)**: Starts after Phase 2. Fully independent of US1 and US2.
- **US4 (P4)**: Depends on US1 (needs OutreachStep model + endpoint). Starts after Phase 3.

### Parallel Opportunities Per Story

```
Phase 2: T004 [P] OutreachStep model  ‖  T005 [P] EquityPartnership models  (run together)

Phase 3 (US1):
  T012 [P] API functions  ‖  T013 [P] OutreachTimeline component  (run together)
  then: T014 OutreachStepForm → T015 Wire into PipelinePage → T016 Overdue indicator → T017 Metric grid

Phase 4 (US2):
  T021 [P] HomeNorthStarSection  ‖  T022 [P] Type updates  (run together after T019, T020)

Phase 5 (US3):
  T027 [P] API functions  (run with T028 Build panel)

Phase 7:
  T034 [P] Bilingual comments  ‖  T035 [P] Line counts  (run together)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 1: Split models
2. Phase 2: Backend models + migrations (only T003, T004, T006, T007 strictly needed for US1)
3. Phase 3: US1 outreach timeline + overdue flagging
4. **STOP and VALIDATE** via quickstart.md scenario 1 + 2
5. Ship — immediately usable for warm contact outreach tracking

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation
2. Phase 3 → US1: Outreach timeline (MVP)
3. Phase 4 → US2: North star pipeline projection
4. Phase 5 → US3: Equity partnerships
5. Phase 6 → US4: AI draft → step auto-save
6. Phase 7 → Polish + validation

---

## Notes

- [P] = different files, no blocking dependency — safe to run concurrently
- Each US phase is independently testable and deployable
- Constitution gates: bilingual comments (T034) and file size (T035) are enforcement checkpoints, not optional
- No test tasks generated — not requested in spec
- Total tasks: **37** across 7 phases
