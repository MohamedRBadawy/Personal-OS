# Workstreams and Backlog

This backlog is intentionally builder-facing. Each item is ready to be turned into a ticket without reopening the PRD.

## Backend workstream

### BE-01: PostgreSQL parity and environment audit

- Goal:
  Make PostgreSQL the tested production baseline while preserving SQLite as local fallback only.
- Why:
  Current validation is local-first; release risk is highest at the database and env layer.
- Dependency:
  None.
- Owner:
  Backend.
- Definition of done:
  - Backend docs and env examples clearly define PostgreSQL as the production target.
  - Migrations run cleanly on PostgreSQL.
  - Seed flow works on PostgreSQL without manual data fixes.
  - Any SQLite-specific assumptions in tests or services are removed or documented.

### BE-02: Baseline regression and smoke hardening

- Goal:
  Expand tests and smoke coverage around the current vertical slice before widening scope.
- Why:
  Schedule, weekly review, and pipeline work will build on the current dashboard and check-in contracts.
- Dependency:
  `BE-01`.
- Owner:
  Backend.
- Definition of done:
  - Cross-domain tests cover dashboard, check-in, goal status recalculation, finance trigger sync, and pipeline side effects.
  - A documented smoke sequence exists for local validation.
  - Seeded baseline data stays idempotent and predictable across repeated runs.

### BE-03: Schedule today read model

- Goal:
  Add the first schedule-specific read model for daily use.
- Why:
  Current schedule APIs are CRUD-only and cannot power a real operating loop.
- Dependency:
  `BE-02`.
- Owner:
  Backend.
- Definition of done:
  - `GET /api/schedule/today/` returns the active template, ordered blocks, today's logs, and slot suggestions.
  - Suggestions account for fixed blocks, adjustable blocks, low-energy signals, and due marketing follow-ups.
  - Tests cover low-energy fallback, empty task pools, and active-template selection.

### BE-04: Schedule log side effects

- Goal:
  Connect schedule outcomes back to goals and weekly review inputs.
- Why:
  The schedule is only useful if block outcomes change the rest of the system.
- Dependency:
  `BE-03`.
- Owner:
  Backend.
- Definition of done:
  - Logging a task block as done can update the linked goal task using the existing goal mutation surface.
  - Repeated skips are visible to weekly review assembly.
  - Schedule logs remain the system of record for what actually happened that day.

### BE-05: Health pack expansion

- Goal:
  Round out the daily health surface with mood, habits, and spiritual capture plus better summaries.
- Why:
  Overwhelm and briefing logic already depend on these domains, but the current UI does not let the user keep them current.
- Dependency:
  `BE-02`.
- Owner:
  Backend.
- Definition of done:
  - Existing summary services expose the fields needed for mood, habit, and spiritual UI surfaces.
  - Validation rules for one-entry-per-day flows are explicit and tested.
  - Habit and spiritual trends needed by briefing and weekly review are easy for the frontend to consume.

### BE-06: Pipeline and review orchestration

- Goal:
  Make pipeline, marketing, and weekly review behavior usable from the app instead of only through generic CRUD.
- Why:
  Income progress depends on active pipeline behavior, not only finance entry logging.
- Dependency:
  `BE-02`.
- Owner:
  Backend.
- Definition of done:
  - Pipeline list and summary flows support active leads, stale applications, and due follow-ups cleanly.
  - `POST /api/analytics/reviews/generate/` persists the current review snapshot from assembled weekly context.
  - Suggestion acted-on and ignored flows are stored in a way that keeps discipline rules enforceable.

### BE-07: Export command

- Goal:
  Add a safe, non-HTTP export path for full personal data snapshots.
- Why:
  The logic spec requires a JSON export, and an unauthenticated HTTP export would be risky in the current app.
- Dependency:
  `BE-01`, `BE-02`.
- Owner:
  Backend.
- Definition of done:
  - `python manage.py export_personal_os --output <path>` writes a complete export matching the documented structure.
  - Export includes all currently implemented domain tables and metadata versioning.
  - Restore assumptions and limitations are documented next to the command.

## Frontend workstream

### FE-01: Vertical-slice hardening

- Goal:
  Make the current frontend slice resilient enough to serve as the base for the next phases.
- Why:
  The current UI works, but schedule and pipeline additions will be easier if shared loading, empty, and error patterns are stable.
- Dependency:
  None.
- Owner:
  Frontend.
- Definition of done:
  - Shared shell, form, and query patterns are documented through code and reused consistently.
  - Dashboard, goals, finance, and health states handle empty, loading, and failure flows cleanly.
  - Frontend env usage is explicit and aligned with the release-readiness doc.

### FE-02: Schedule workspace

- Goal:
  Add the first schedule UI and make the Today flow actionable.
- Why:
  The app should tell Mohamed what the day looks like and let him record what actually happened.
- Dependency:
  `BE-03`, `BE-04`.
- Owner:
  Frontend.
- Definition of done:
  - The frontend exposes today's schedule with ordered blocks, suggestions, and log status.
  - Logging a block outcome requires no raw API usage or admin pages.
  - Reduced-mode and low-energy states are visible in the schedule experience.

### FE-03: Health workflow expansion

- Goal:
  Extend the health area to include mood, habit, and spiritual capture.
- Why:
  These signals already matter to overwhelm and review logic, but the product does not surface them yet.
- Dependency:
  `BE-05`.
- Owner:
  Frontend.
- Definition of done:
  - Mood, habits, and spiritual signals are visible and editable from the app.
  - Daily capture works without duplicating summary logic in the client.
  - The health area still feels like one coherent surface instead of four unrelated forms.

### FE-04: Pipeline and review surfaces

- Goal:
  Add dedicated views for pipeline, marketing follow-ups, and weekly review.
- Why:
  The product cannot drive the income goal without a visible pipeline workflow.
- Dependency:
  `BE-06`.
- Owner:
  Frontend.
- Definition of done:
  - The user can inspect opportunities, follow-ups, and recent wins and losses from the app.
  - Weekly review preview and persistence are visible without using raw endpoints.
  - Suggestion acted-on and ignored states are understandable in the UI.

### FE-05: Seeded demo and release smoke polish

- Goal:
  Make the app reproducible for a seeded demo and predictable for release verification.
- Why:
  Final stabilization needs a repeatable manual validation path, not only automated tests.
- Dependency:
  `FE-02`, `FE-03`, `FE-04`, `OPS-03`.
- Owner:
  Frontend.
- Definition of done:
  - Manual seeded smoke flow is documented and repeatable.
  - Navigation and empty states cover all shipped screens.
  - The app remains desktop-first but behaves acceptably on narrower viewports.

## AI and integrations workstream

### AI-01: Suggestion discipline observability

- Goal:
  Surface acted-on and ignored suggestion behavior so the discipline rules can be trusted.
- Why:
  The backend enforces suppression rules, but the user currently cannot see or manage that state.
- Dependency:
  `BE-06`, `FE-04`.
- Owner:
  AI/Integrations.
- Definition of done:
  - Suggestion records show topic, module, shown date, and acted-on status.
  - Ignored suggestions can be differentiated from acted-on suggestions.
  - Tests prove duplicate-week suppression and topic suppression still work end to end.

### AI-02: Weekly review generation flow

- Goal:
  Turn review preview into a first-class weekly flow.
- Why:
  Weekly review is one of the highest-leverage cross-domain features in the product.
- Dependency:
  `BE-06`.
- Owner:
  AI/Integrations.
- Definition of done:
  - Weekly review can be generated, persisted, and revisited.
  - Review assembly clearly pulls from finance, health, goals, pipeline, and overwhelm inputs.
  - Deterministic generation remains the default; live model integration stays optional.

### AI-03: Telegram notification service

- Goal:
  Implement the notification triggers that matter for operations and critical product state changes.
- Why:
  The logic spec includes Telegram as the notification channel for the highest-signal events.
- Dependency:
  `OPS-01`, `OPS-02`.
- Owner:
  AI/Integrations.
- Definition of done:
  - Trigger handling exists for at least Kyrgyzstan target reached, overwhelm reduced mode, empty pipeline, weekly review ready, backup completed, and backup failed.
  - Cooldown rules are enforced and tested.
  - Notification failures do not break core product flows.

## Ops workstream

### OPS-01: Release environment contract

- Goal:
  Define the exact env, secrets, and deployment assumptions for a single-user production release.
- Why:
  The codebase has env placeholders but no committed operational contract.
- Dependency:
  None.
- Owner:
  Ops.
- Definition of done:
  - Required and optional env vars are documented with current consumers.
  - The release target assumes PostgreSQL and a protected single-user deployment.
  - CORS, host, and secret handling expectations are explicit.

### OPS-02: Backup and retention pipeline

- Goal:
  Implement the logic-spec backup flow with restore confidence.
- Why:
  A personal operating system without verified backups is not release-safe.
- Dependency:
  `BE-07`, `OPS-01`.
- Owner:
  Ops.
- Definition of done:
  - A backup command or job performs database dump, compression, upload, and retention cleanup.
  - Failure path is explicit and triggers Telegram notification once `AI-03` exists.
  - Restore drill is documented and run successfully at least once.

### OPS-03: Release runbook and rollback

- Goal:
  Write and verify the release procedure for the first protected production deployment.
- Why:
  There is currently no CI/CD or deployment automation in the repo.
- Dependency:
  `OPS-01`, `OPS-02`.
- Owner:
  Ops.
- Definition of done:
  - Release steps cover migrate, seed policy, static frontend build, env setup, smoke validation, and rollback.
  - Rollback steps cover both app artifact rollback and database restore decision points.
  - The runbook is tested once against the chosen hosting approach.
