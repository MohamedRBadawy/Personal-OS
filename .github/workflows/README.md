# Scheduled maintenance workflow

This repository replaces paid Render cron jobs with the free GitHub Actions workflow in
`.github/workflows/scheduled-maintenance.yml`.

Repository secrets expected by that workflow:

- `DATABASE_URL`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `AI_PROVIDER`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

If a secret is not needed in your setup, GitHub can leave it unset. The corresponding
Django command should degrade gracefully where supported.
