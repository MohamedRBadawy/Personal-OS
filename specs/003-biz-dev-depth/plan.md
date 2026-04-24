# Implementation Plan: Business Development Depth

**Branch**: `003-biz-dev-depth` | **Date**: 2026-04-23 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/003-biz-dev-depth/spec.md`

## Summary

Add three missing layers to the existing Build hub pipeline:
1. **Outreach sequence timeline** — log every step (message → reply → meeting → proposal → outcome) per opportunity, with automatic overdue detection
2. **Pipeline → North Star connection** — deal value fields on opportunities feed a weighted pipeline projection into the €1,000/mo progress bar on the home surface
3. **Equity partnership tracker** — new model and UI for Mohamed's two equity stakes (and future ones), tracked separately from the income metric

The existing AI draft feature is extended: saving a generated draft automatically creates an outreach step, closing the gap between draft and logged action.

## Technical Context

**Language/Version**: Python 3.11 (Django 5.1 backend) + TypeScript / React 19 (Vite frontend)  
**Primary Dependencies**: Django REST Framework, TanStack Query, React Router — all existing  
**Storage**: PostgreSQL (Neon, production); SQLite (local)  
**Testing**: Django test runner (backend); no automated frontend tests in current setup  
**Target Platform**: Render.com web service (backend) + Render static site (frontend)  
**Project Type**: Web application (personal OS)  
**Performance Goals**: Pipeline workspace loads in under 2 seconds including north star projection  
**Constraints**: Free-tier deployment; no new Python packages; all migrations run clean on PostgreSQL  
**Scale/Scope**: Single active user (Mohamed) initially; multi-user isolation required (Constitution VII)

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I — One Trusted Place | Equity partnerships now have a home in the system | ✅ PASS |
| II — Navigation from Principle | Partnerships added as tab in Build hub — no new top-level page | ✅ PASS |
| III — Interaction Redesigned | Outreach steps logged inline from pipeline view (FR-004); no separate form page | ✅ PASS |
| IV — AI Does Work | Draft → step auto-creation; overdue detection surfaces to user without asking | ✅ PASS |
| V — Progress Visible | North star bar gains pipeline projection — more visible, not buried | ✅ PASS |
| VI — Build and Use Simultaneously | Day-one usage: log warm contact outreach, enter existing equity partnerships | ✅ PASS |
| VII — Multi-User Isolation | All new models include `user` FK; no singleton data | ✅ PASS |
| VIII — Bilingual Comments | All new files require `[AR]`/`[EN]` header + section comments | ✅ GATE |
| IX — File Size Discipline | `pipeline/models.py` split before adding new models | ✅ GATE |

## Project Structure

### Documentation (this feature)

```text
specs/003-biz-dev-depth/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── pipeline-api.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (from /speckit-tasks)
```

### Source Code

```text
backend/
└── pipeline/
    ├── models/                      ← NEW: split from models.py
    │   ├── __init__.py
    │   ├── opportunity.py           ← moved: Opportunity + ServiceOffering + Client
    │   ├── outreach.py              ← NEW: OutreachStep
    │   └── equity.py                ← NEW: EquityPartnership + PartnershipAction
    ├── migrations/
    │   ├── 0XXX_pipeline_models_split.py        (no schema change)
    │   ├── 0XXX_opportunity_deal_fields.py
    │   ├── 0XXX_add_outreach_step.py
    │   └── 0XXX_add_equity_partnership.py
    ├── serializers/                 ← EXTEND: add OutreachStep, EquityPartnership
    ├── views/                       ← EXTEND: add step + partnership endpoints
    └── urls.py                      ← EXTEND: register new routes

backend/
└── profile/
    └── serializers.py               ← EXTEND: NorthStarSerializer adds pipeline fields

frontend/src/
├── pages/
│   └── PipelinePage.tsx             ← EXTEND: inline step logging, partnerships tab
├── components/
│   ├── OutreachTimeline.tsx          ← NEW: step-by-step timeline per opportunity
│   ├── OutreachStepForm.tsx          ← NEW: inline step log form
│   └── EquityPartnershipsPanel.tsx   ← NEW: partnerships list + action tracking
└── components/home/
    └── HomeNorthStarSection.tsx      ← EXTEND: add pipeline projection bar
```

**Structure Decision**: Web application (Option 2). No new apps or packages — all changes extend existing `pipeline` app and existing frontend components.

## Phases

### Phase A — Backend Foundation (no UI)

1. Split `backend/pipeline/models.py` into `models/` subpackage — migration with no schema change
2. Add deal value fields to `Opportunity` — migration
3. Create `OutreachStep` model + migration
4. Create `EquityPartnership` + `PartnershipAction` models + migration
5. Extend `PipelineWorkspaceSerializer` — add `weighted_pipeline_eur`, `confirmed_monthly_eur`, `pipeline_north_star`, `is_overdue` and `latest_step_date` per opportunity
6. Extend `NorthStarSerializer` — add `weighted_pipeline_eur` and `pipeline_progress_percent`
7. Add views + URL routes for outreach step CRUD and equity partnership CRUD
8. Verify all migrations run cleanly locally

### Phase B — Pipeline UI (outreach steps)

1. Build `OutreachTimeline` component — compact step list, expandable, shows step type icon + date + notes
2. Build `OutreachStepForm` — inline form: step type selector, date picker, notes textarea, save button
3. Wire `OutreachTimeline` + `OutreachStepForm` into opportunity card/drawer expand area in `PipelinePage`
4. Add overdue visual indicator (amber dot) to opportunity rows in kanban
5. Update funnel summary metric grid — add overdue count chip
6. Connect "Save as step" to the existing AI draft panel

### Phase C — North Star UI

1. Extend `HomeNorthStarSection` — second progress segment (lighter tint) showing `pipeline_progress_percent`
2. Add tooltip or caption: "€X confirmed · €Y pipeline projection"
3. Update pipeline workspace to show `monthly_value_eur` field on each opportunity card (editable inline or via modal)

### Phase D — Equity Partnerships UI

1. Build `EquityPartnershipsPanel` — list with: partner name, business, equity %, status badge, current next action
2. Add create/edit form (inline or modal) for new partnerships
3. Add action logging: "Mark done" button + "Add next action" field
4. Wire panel into Build hub as a new tab "Partnerships"

## Complexity Tracking

No constitution violations. No complexity exceptions required.
