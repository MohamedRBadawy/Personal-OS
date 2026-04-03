# Phase 1 Hardening Guide

This guide is the implementation-facing companion to the planning docs. It explains how runtime config is owned, how to validate the current baseline, and how to verify PostgreSQL parity without changing the shipped product shape.

## Config ownership

- Django runtime config is owned by `backend/config/settings.py`.
- App business constants are owned at runtime by the persisted `AppSettings` row.
- Env values such as `CURRENCY_EUR_USD_RATE`, `CURRENCY_EUR_EGP_RATE`, and `INDEPENDENT_INCOME_TARGET_EUR` are bootstrap defaults only.
- Bootstrap defaults are used only when no `AppSettings` row exists yet.
- Once `AppSettings` exists, persisted values win over env defaults.

## Validation commands

Use the repo-level scripts from the project root:

- `powershell -ExecutionPolicy Bypass -File .\scripts\validate_baseline.ps1`
- `powershell -ExecutionPolicy Bypass -File .\scripts\validate_postgres.ps1`

The baseline script runs:

- `python manage.py check`
- `python manage.py test`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run lint`

The PostgreSQL script runs:

- `python manage.py migrate`
- `python manage.py seed_initial_data`
- `python manage.py check`
- `python manage.py test`

## PostgreSQL parity workflow

1. Install backend and frontend dependencies.
2. Set `DATABASE_URL` to a PostgreSQL connection string.
3. Run `scripts\validate_postgres.ps1`.
4. Confirm migrations, seed data, and backend tests all pass on PostgreSQL.

Notes:

- This slice verifies parity and repeatability only.
- It does not add hosting, containers, CI, or deployment automation.

## Seeded demo bootstrap

For the current single-user local workflow:

1. Configure backend env values as needed.
2. Set `VITE_API_BASE_URL` for the frontend.
3. From `backend`, run `python manage.py migrate`.
4. From `backend`, run `python manage.py seed_initial_data`.
5. Start the backend server.
6. Start the frontend dev server.

The seed command is intended to be idempotent for the baseline Mohamed dataset.
