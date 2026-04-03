# Frontend Vertical Slice

## Local run

1. Start the Django backend from `F:\Personal OS\backend`.
2. Seed baseline data with `python manage.py seed_initial_data`.
3. Start the frontend from `F:\Personal OS\frontend`.
4. Use `VITE_API_BASE_URL=http://127.0.0.1:8000/api` for local development.

## Included screens

- `Home / Today` for dashboard, briefing, priorities, and the daily check-in form
- `Schedule` for the active daily template, adjustable-slot suggestions, and block outcome logging
- `Goals` for the read-only dependency tree and node context panel
- `Finance` for monthly summary, recent entries, and quick entry creation
- `Health` for summary metrics, trend sparks, and quick daily health logging

## Validation flow

- Run `python manage.py check`
- Run `python manage.py test`
- Run `npm.cmd test`
- Run `npm.cmd run build`
- Run `npm.cmd run lint`
