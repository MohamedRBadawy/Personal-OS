# Release Readiness

This document defines what has to be true before the current Personal OS can move from a seeded local workflow to a durable protected deployment.

## Current release posture

What is already in good shape:

- Backend migrations are checked in.
- Seed data exists for Mohamed's baseline workflow.
- The frontend vertical slice is working for `Home`, `Goals`, `Finance`, and `Health`.
- Local validation is green for backend checks/tests and frontend tests/build/lint.

What is still missing for a safe release:

- No committed CI pipeline
- No committed deployment automation or hosting manifests
- No verified PostgreSQL deployment workflow in-repo
- No backup or restore path
- No JSON export command
- No Telegram notification service
- No auth layer, which means the app must stay protected by network or deployment controls

## Deployment assumptions

- Deployment model:
  One Django backend and one static frontend artifact, deployed behind a protected single-user entrypoint.
- Database:
  PostgreSQL is required for release. SQLite is local-only convenience.
- User model:
  Single-user for Mohamed only during this horizon.
- Security posture:
  Because there is no auth, the release target must be private, IP-restricted, VPN-protected, or otherwise shielded from public access.
- AI:
  Deterministic AI remains acceptable for release. Anthropic integration is optional and deferred unless explicitly re-prioritized.

## Environment contract

| Variable | Current state | Release gate | Notes |
| --- | --- | --- | --- |
| `SECRET_KEY` | Implemented | Required | Must be unique and not use the development default. |
| `DEBUG` | Implemented | Required | Must be `False` in release. |
| `ALLOWED_HOSTS` | Implemented | Required | Must match the deployed backend hosts. |
| `TIME_ZONE` | Implemented | Required | Default is `Africa/Cairo`; keep explicit in release. |
| `DATABASE_URL` or `DB_*` | Implemented | Required | Release should prefer `DATABASE_URL` for PostgreSQL. |
| `CORS_ALLOWED_ORIGINS` | Implemented | Required | Must match the frontend deployment origin. |
| `CURRENCY_EUR_USD_RATE` | Present in env examples | Required | Should be aligned with `AppSettings` seed/default values. |
| `CURRENCY_EUR_EGP_RATE` | Present in env examples | Required | Should be aligned with `AppSettings` seed/default values. |
| `ANTHROPIC_API_KEY` | Placeholder only | Optional in this horizon | Keep optional while deterministic AI is the default. |
| `TELEGRAM_BOT_TOKEN` | Placeholder only | Required for Phase 4 completion | Needed for release-grade notifications. |
| `TELEGRAM_CHAT_ID` | Placeholder only | Required for Phase 4 completion | Same as above. |
| `BACKUP_STORAGE_KEY` | Placeholder only | Required for Phase 4 completion | Needed for off-host backup upload. |
| `BACKUP_STORAGE_SECRET` | Placeholder only | Required for Phase 4 completion | Same as above. |
| `BACKUP_BUCKET_NAME` | Placeholder only | Required for Phase 4 completion | Backup destination. |
| `VITE_API_BASE_URL` | Implemented in frontend env example | Required | Must point to the deployed backend `/api` base. |

## Release gates

### Data and persistence

- PostgreSQL migrations run cleanly in the target environment.
- Seed policy is explicit:
  demo or staging environments may seed Mohamed's baseline data; production should use a deliberate first-run policy.
- JSON export command exists and matches documented structure.
- Backup flow supports compression, off-host storage, and retention.
- Restore drill has been executed once successfully.

### Application behavior

- Dashboard loads from seeded or live data without admin intervention.
- Check-in creates the expected downstream records.
- Goal dependency logic and the Kyrgyzstan trigger are stable after create, update, and delete operations.
- Schedule daily loop is usable if Phase 2 is declared in-scope for release.
- Pipeline and weekly review surfaces are usable if Phase 3 is declared in-scope for release.

### Operations and safety

- Release env vars are documented and available in the target runtime.
- Telegram notifications exist for critical operational and product-state events in scope.
- No public internet exposure exists without compensating controls.
- Rollback path is written and tested once.

## Telegram notifications to ship

These are the Phase 4 notification targets drawn from the logic spec:

| Event | Message intent | Cooldown expectation |
| --- | --- | --- |
| Independent income reaches target | Celebrate Kyrgyzstan trigger | Once only |
| Overwhelm score enters reduced mode | Warn about burnout risk | 3 days |
| Pipeline has no active leads | Prompt lead generation | 7 days |
| Weekly review is ready | Notify review availability | Weekly |
| Backup completed | Confirm operational success | Daily |
| Backup failed | Alert immediately | Immediate |

Follow-up notifications may be added later, but the list above is the minimum useful operational set.

## Seeded demo to production gap list

- Replace implicit local SQLite comfort with verified PostgreSQL release behavior.
- Decide how first-run data is created outside the seeded demo path.
- Add backup, export, and restore confidence before storing trusted personal data.
- Add Telegram for critical operational signals and product-state changes.
- Add a release runbook because there is no CI/CD or deployment scaffold yet.
- Keep the deployment private or add auth before any broader exposure.
- Finish the schedule and weekly operating loop if the release target is meant to be used daily rather than only as a reporting dashboard.

## Smoke-test flow

### Automated

- Backend:
  - `python manage.py check`
  - `python manage.py test`
- Frontend:
  - `npm.cmd test`
  - `npm.cmd run build`
  - `npm.cmd run lint`

### Manual seeded flow

1. Run migrations.
2. Seed initial data.
3. Launch backend and frontend.
4. Open `Home / Today` and confirm dashboard data loads.
5. Submit a low-energy check-in and confirm:
   - latest check-in date updates
   - health summary reflects low energy or low sleep
   - briefing and key signals refresh
6. Open `Goals` and confirm tree plus node context load.
7. Open `Finance`, add an entry, and confirm summary plus recent entries update.
8. Open `Health`, add today's log if missing, and confirm trends update.

When schedule, pipeline, and weekly review phases are complete, extend this smoke flow to cover those paths too.

## Rollback checklist

1. Stop traffic to the current release target.
2. Revert the frontend artifact to the previous known-good build.
3. Revert the backend application artifact to the previous known-good release.
4. If the release included a destructive or incompatible migration:
   - restore the latest valid backup
   - verify restore success before reopening traffic
5. Re-run the automated checks that are valid in the release environment.
6. Re-run the manual smoke flow on the rolled-back version.
7. Post a short incident note capturing trigger, impact, fix, and next prevention step.
