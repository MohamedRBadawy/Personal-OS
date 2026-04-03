# Current State Baseline

Last verified: 2026-04-03

## Snapshot

The repository already contains a working backend-plus-frontend vertical slice:

- Backend: Django 5.1 + DRF with apps for `core`, `goals`, `finance`, `health`, `schedule`, `pipeline`, and `analytics`.
- Frontend: Vite + React 19 + TypeScript + React Router + TanStack Query.
- Local persistence: SQLite fallback is active by default; production-oriented PostgreSQL config is supported through env vars.
- User model: single-user, no auth, seeded around Mohamed's baseline profile and goals.
- AI boundary: deterministic provider only; no live Anthropic calls.

## Verified local validation

The following commands were run successfully in the current workspace:

- `python manage.py check`
- `python manage.py test`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run lint`

Current test counts:

- Backend: 27 tests
- Frontend: 18 tests

## Local run flow

1. From `backend`, run `python manage.py migrate`.
2. From `backend`, run `python manage.py seed_initial_data`.
3. From `backend`, run `python manage.py runserver`.
4. From `frontend`, use `VITE_API_BASE_URL=http://127.0.0.1:8000/api`.
5. From `frontend`, run `npm.cmd run dev`.

## Domain status matrix

| Domain | Status | Current repo truth | Biggest missing piece |
| --- | --- | --- | --- |
| Core platform (`Profile`, `AppSettings`, dashboard, check-in, seed data) | Implemented | Seeded single-user workflow, dashboard aggregate, daily check-in fan-out, fixed-rate settings, profile data, migrations, and tests are in place. | Production hardening, env validation, and deployment/runbook work are still missing. |
| Goals & life plan | Partial | Dependency-aware nodes, cycle protection, direct-child progress, context/tree read models, and read-only goals UI are implemented. | No editing workflow in the frontend and only light schedule-to-goal handoff is surfaced so far. |
| Finance | Partial | Entry CRUD, monthly summary, fixed-rate EUR normalization, Kyrgyzstan trigger sync, and finance UI are implemented. | No release-grade export/reporting flow and no dedicated recurring-income operations layer. |
| Health & body | Partial | Daily health logs, summary metrics, exercise streak, dashboard signals, and health UI are implemented. | UI only covers health logs; deeper daily operating loop across mood and spiritual signals is missing. |
| Habits | Partial | Habit and habit-log models exist, completion rate feeds health and overwhelm summaries. | No dedicated frontend and limited streak/pattern surfacing. |
| Mood & mental state | Partial | Mood logs exist and influence overwhelm plus weekly review preview. | No direct UI or daily capture flow outside generic API usage. |
| Prayer & spiritual | Partial | Spiritual logs exist and feed summary metrics and weekly review inputs. | No frontend capture or acknowledgement surfaces. |
| Daily schedule | Partial | Templates, blocks, and logs now have CRUD APIs, a `today` read model, seeded baseline blocks, weekly-review skip inputs, and a dedicated frontend screen. | No schedule editing UI and no deeper task-sizing or rescheduling logic yet. |
| Client pipeline & opportunity tracker | Partial | Opportunity/client/marketing models, fit scoring stubs, win/loss side effects, and summary counts exist. | No pipeline UI and no structured review workflow for opportunities. |
| Marketing | Partial | Marketing actions exist, due follow-up counts feed pipeline summary. | No frontend and no dedicated daily follow-up surfacing beyond dashboard signals. |
| Analytics & weekly review | Partial | Overwhelm summary, reduced mode, weekly review preview, AI suggestion discipline, and simple CRUD modules exist. | No dedicated analytics/review UI and no scheduled persisted weekly review generation. |
| Relationships | Partial | Backend CRUD exists. | No frontend surface or reminder workflow. |
| Family goals | Partial | Backend CRUD exists. | No frontend surface or link into the main dashboard flow. |
| Learning | Partial | Backend CRUD exists. | No frontend surface and no connection into weekly workflow. |
| Decision log | Partial | Backend CRUD exists and lost opportunities create a debrief entry. | No review UI or structured reflection flow. |
| Achievements | Partial | Backend CRUD exists and won opportunities create achievements. | No frontend surface for motivation or weekly review acknowledgement. |
| Ideas & thinking / inbox | Partial | Backend CRUD exists and check-ins can create inbox ideas. | No dedicated inbox triage UI or conversion flow into goals/projects. |

Supporting capabilities outside the PRD domain list:

| Capability | Status | Current repo truth | Biggest missing piece |
| --- | --- | --- | --- |
| Production ops, backup, export, Telegram | Planned | Env placeholders exist, but no backup/export commands, notification service, or deployment automation are committed. | Implement jobs, retention, restore drill, Telegram cooldown handling, and release runbook. |
| Live Anthropic integration | Deferred | Deterministic AI provider keeps contracts stable. | Replace stubs only after core workflows and ops are stable. |
| Auth and multi-user | Deferred | App is intentionally single-user with open local APIs. | Add identity and access control only after single-user workflow is production-safe. |

## Current screen inventory

- `Home / Today`
  - Uses `GET /api/core/dashboard/` and `POST /api/checkin/`
  - Shows briefing, top priorities, key signals, finance progress, overwhelm state, and weekly review preview
- `Goals`
  - Uses goal tree and node-context read models
  - Read-only in the current slice
- `Schedule`
  - Uses the active-template daily read model and schedule log CRUD
  - Supports block outcome logging and linked-goal completion handoff
- `Finance`
  - Uses finance summary plus recent ledger entries
  - Supports quick create for income/expense entries
- `Health`
  - Uses health summary plus recent health logs
  - Supports quick create for today's health log when missing

Missing frontend surfaces:

- Pipeline and marketing
- Mood, habits, spiritual
- Weekly review and analytics workspace
- CRUD-only domains such as relationships, learning, ideas, and achievements

## Canonical interface inventory

This is the canonical interface inventory for currently implemented surfaces. Other planning docs should reference this section instead of redefining present-state contracts.

### Core and dashboard

| Interface | Type | Current consumer | Notes |
| --- | --- | --- | --- |
| `GET /api/core/dashboard/` | Read model | `Home / Today` | Returns profile, settings, briefing, key signals, finance summary, health summary, overwhelm, top priorities, pipeline summary, weekly review preview, and latest check-in. |
| `POST /api/checkin/` | Write orchestration | `Home / Today` | Fans out to health, optional mood, finance deltas, inbox idea capture, blocker capture, and stored briefing text. |
| `GET/POST /api/core/profiles/` | CRUD | Backend/admin-level use | Seeded singleton today; not surfaced in the frontend. |
| `GET/POST /api/core/settings/` | CRUD | Backend/admin-level use | Holds fixed currency rates, income target, and seeded goal codes. |

### Goals

| Interface | Type | Current consumer | Notes |
| --- | --- | --- | --- |
| `GET/POST /api/goals/nodes/` | CRUD | Backend and future editor UI | Core node surface for goals, projects, tasks, burdens, and ideas-as-nodes. |
| `GET /api/goals/nodes/tree/` | Read model | `Goals` page | Returns the nested hierarchy from root nodes downward. |
| `GET /api/goals/nodes/{id}/context/` | Read model | `Goals` page | Returns selected node, ancestors, dependents, and direct-child progress. |

### Finance

| Interface | Type | Current consumer | Notes |
| --- | --- | --- | --- |
| `GET/POST /api/finance/entries/` | CRUD | `Finance` page and check-in service | Stores income and expense entries in original currency. |
| `GET /api/finance/entries/summary/` | Read model | `Finance` page | Returns current-month totals, independent income, net, progress, and months to target. |

### Health

| Interface | Type | Current consumer | Notes |
| --- | --- | --- | --- |
| `GET /api/health/summary/` | Read model | `Health` page | Aggregates health, mood, spiritual, and habits-derived summary signals. |
| `GET/POST /api/health/logs/` | CRUD | `Health` page and check-in service | Daily body/energy log. |
| `GET/POST /api/health/habits/` and `GET/POST /api/health/habit-logs/` | CRUD | Backend-only today | No frontend yet. |
| `GET/POST /api/health/moods/` | CRUD | Check-in service and future UI | No direct frontend screen yet. |
| `GET/POST /api/health/spiritual/` | CRUD | Future UI | No direct frontend screen yet. |

### Pipeline, analytics, and schedule

| Interface | Type | Current consumer | Notes |
| --- | --- | --- | --- |
| `GET/POST /api/pipeline/opportunities/` | CRUD | Backend and future UI | Includes deterministic fit scoring and lifecycle side effects. |
| `GET /api/pipeline/opportunities/summary/` | Read model | Backend dashboard service | Not called directly by the frontend yet. |
| `GET/POST /api/pipeline/clients/` and `GET/POST /api/pipeline/marketing/` | CRUD | Backend and future UI | Used by opportunity side effects and future follow-up views. |
| `GET /api/analytics/overwhelm/` | Read model | Available for frontend, currently folded into dashboard | Source of reduced-mode decisioning. |
| `GET /api/analytics/reviews/preview/` | Read model | Available for frontend, currently folded into dashboard | Deterministic weekly review preview. |
| `GET/POST /api/analytics/suggestions/` | CRUD + validation discipline | Backend and future UI | Enforces no duplicate suggestion in the same week and suppression after ignored suggestions. |
| `GET/POST /api/analytics/reviews/` | CRUD | Future UI | Stores weekly review records; auto-generation is not scheduled yet. |
| `GET/POST /api/analytics/relationships/`, `family-goals/`, `learnings/`, `decisions/`, `achievements/`, `ideas/` | CRUD | Backend and future UI | CRUD-only modules at present. |
| `GET /api/schedule/today/` | Read model | `Schedule` page | Returns the active template, ordered blocks, current log state, suggestions, and daily summary counts. |
| `GET/POST /api/schedule/templates/`, `blocks/`, `logs/` | CRUD | Backend and current/future UI | `logs/` now powers the schedule page's outcome recording. |

## Current constraints and release blockers

- No committed CI, deployment pipeline, container, or hosting manifests exist yet.
- SQLite fallback is convenient for local use, but production parity on PostgreSQL is not yet verified inside the repo.
- The app has no auth layer, so a public deployment would currently need network-level protection or explicit auth work.
- Backup, export, and Telegram logic from the logic spec are still unimplemented.
- The daily operating loop is stronger now that schedule is surfaced, but pipeline, review, and broader health capture are still not exposed as full workflows.
