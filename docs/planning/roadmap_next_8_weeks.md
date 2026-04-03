# Roadmap: Next 8 Weeks

This roadmap assumes the current repo is the accepted baseline and focuses on closing the gap between a working local demo and a durable single-user product.

## Guiding rules

- Keep current dashboard, check-in, goals, finance, and health contracts stable.
- Finish the daily operating loop before widening into every long-tail module.
- Treat PostgreSQL, backup, export, and release safety as required product work, not polish.
- Keep deterministic AI in place until the operating system around it is stable.

## Phase summary

| Phase | Window | Outcome | Backlog refs |
| --- | --- | --- | --- |
| Phase 1 | Weeks 1-2 | Production hardening and baseline cleanup | `OPS-01`, `BE-01`, `BE-02`, `FE-01` |
| Phase 2 | Weeks 3-4 | Schedule and daily operating loop | `BE-03`, `BE-04`, `FE-02` |
| Phase 3 | Weeks 5-6 | Remaining domain completion and AI signal surfaces | `BE-05`, `BE-06`, `FE-03`, `FE-04`, `AI-01`, `AI-02` |
| Phase 4 | Weeks 7-8 | Export, backup, Telegram, release readiness, and stabilization | `BE-07`, `FE-05`, `AI-03`, `OPS-02`, `OPS-03` |

## Phase 1: Production hardening and baseline cleanup

- Objective:
  Make the current repo reproducible, verifiable, and release-safe without changing the existing product shape.
- Dependencies:
  None beyond the current committed baseline.
- Planned interface changes:
  None. Preserve current runtime API contracts.
- Risks:
  Hidden SQLite/PostgreSQL drift, seed data assumptions, and undocumented env behavior.
- Exit criteria:
  - PostgreSQL is documented as the release baseline and exercised successfully at least once in the repo workflow.
  - `.env.example`, backend settings, and frontend env usage are aligned.
  - Seed data is idempotent and documented as the canonical local/demo bootstrap.
  - The standard validation suite stays green: `check`, backend tests, frontend tests, build, and lint.

## Phase 2: Schedule and daily operating loop

- Objective:
  Make the app usable as an actual day-to-day operating system instead of a dashboard plus isolated pages.
- Dependencies:
  Phase 1 must finish first so schedule logic is built on stable env and data assumptions.
- Planned interface changes:
  - Add `GET /api/schedule/today/` as the only new required runtime interface in this phase.
  - Use existing schedule log CRUD and goal node update endpoints for mutations wherever possible.
- `GET /api/schedule/today/` should return:
  - active template metadata
  - ordered blocks for the day
  - existing log state for each block
  - suggested goal task or marketing follow-up for adjustable slots
  - energy-aware rationale for why a task was or was not suggested
- Risks:
  Scope creep into a full calendar system, and overfitting schedule logic before enough usage data exists.
- Exit criteria:
  - The frontend has a schedule screen or Today subview that shows today's blocks and suggested work.
  - Adjustable slots respect low-energy signals and fixed-block constraints.
  - Completing or skipping a block updates schedule logs and can feed goals or review logic using existing mutation surfaces.
  - Manual smoke flow confirms the dashboard, check-in, goals, finance, health, and schedule loop work together in one session.

## Phase 3: Remaining domain completion and AI signal surfaces

- Objective:
  Fill the largest product gaps after schedule: pipeline actionability, review visibility, and daily capture across mood, habits, and spiritual signals.
- Dependencies:
  Phase 2 should be complete so the daily loop has one clear home.
- Planned interface changes:
  - Add `POST /api/analytics/reviews/generate/` to persist the current weekly review snapshot from the existing preview logic.
  - Prefer existing CRUD and summary endpoints for mood, habits, spiritual, pipeline, marketing, and ideas unless UI orchestration clearly requires another read model.
- Risks:
  Too many new pages at once, or broad CRUD UI work that does not improve the daily operating loop.
- Exit criteria:
  - Pipeline and marketing have a dedicated UI surface with active leads, follow-ups, and win/loss visibility.
  - Health workflows cover mood, habits, and spiritual capture without relying on raw API calls.
  - AI suggestion records can be marked acted-on or ignored from the UI, keeping discipline rules observable.
  - Weekly review can be previewed and persisted without manual data copying.

## Phase 4: Export, backup, Telegram, release readiness, and stabilization

- Objective:
  Close the production-use gap with safe data movement, notifications, and an explicit release runbook.
- Dependencies:
  Phases 1-3 should be complete so operational automation targets the actual product workflow.
- Planned interface changes:
  - Add `python manage.py export_personal_os --output <path>` as the canonical JSON export interface.
  - Add `python manage.py run_backup` as the canonical backup entrypoint.
  - Do not add a public export HTTP endpoint in this horizon because the app still has no auth.
- Risks:
  Shipping operational features without restore drills, or exposing sensitive workflows before auth or network protection is in place.
- Exit criteria:
  - JSON export covers the full logic-spec structure for the implemented tables.
  - Backup job supports compression, retention, and failure reporting.
  - Telegram notifications respect cooldown rules for the logic-spec events that are in scope.
  - Release-readiness checklist, smoke flow, and rollback steps are documented and tested once end to end.

## Out-of-horizon items

These items should stay out of the 6-8 week critical path unless a later decision explicitly re-prioritizes them:

- Multi-user support and authentication overhaul
- Live Anthropic integration
- Heavy analytics visualizations beyond the current review and dashboard needs
- Mobile-first redesign
