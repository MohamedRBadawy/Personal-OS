# Telegram Bot — Personal OS

The bot lets you interact with Personal OS from your phone via Telegram — no browser needed.
It is the mobile interface for quick capture, status checks, and next-action guidance.

---

## How it works

Telegram sends every message you type to a webhook URL on the backend.
The backend checks that the message comes from your chat (security), then dispatches it to the right handler and replies via `send_message()`.

```
You (Telegram) → POST /api/core/telegram/webhook/ → handle_webhook() → reply
```

---

## Environment variables required

| Variable | Where to set it | What it holds |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Render → Personal OS API → Environment | The bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Render → Personal OS API → Environment | Your personal chat ID (get it by messaging @userinfobot) |

Security: messages from any chat ID that doesn't match `TELEGRAM_CHAT_ID` are silently ignored.

---

## Webhook registration (one-time setup)

Run this once after deploy — only needs to be done again if the API URL changes:

```bash
curl "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook?url=https://personal-os-api-xk0z.onrender.com/api/core/telegram/webhook/"
```

To verify the webhook is registered:

```bash
curl "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

---

## Commands

| Command | What it does |
|---|---|
| `/brief` | Morning brief — today's routine plan + top 3 priority nodes + due follow-ups |
| `/next` | Single most important action to take right now (leverage-scored + AI reasoning) |
| `/capture <text>` | Save a raw idea instantly. Example: `/capture Build a pricing page for Clarity Audit` |
| `/status` | Today's routine completion % + active/available/blocked node counts |
| `/help` | Lists all commands |

---

## Source files

| File | Role |
|---|---|
| `backend/core/telegram_bot.py` | All command handlers (`handle_webhook`, `_handle_brief`, `_handle_next`, `_handle_capture`, `_handle_status`, `_handle_help`) |
| `backend/core/views.py` | `TelegramWebhookView` — receives the POST from Telegram, calls `handle_webhook()` |
| `backend/core/urls.py` | Registers `telegram/webhook/` route |
| `backend/core/telegram.py` | `send_message()` utility — sends text back to your chat via the Bot API |

---

## Leverage scoring (used by `/next` and `/brief`)

Both `/next` and the priorities section of `/brief` rank nodes using:

```
score = (dependents_count × 3) + ((5 - priority_value) × 2) + active_bonus - effort_weight
```

- `dependents_count` — how many other nodes depend on this one (unlock potential)
- `priority_value` — lower number = higher priority (1 = critical)
- `active_bonus` — +2 if already in progress, +1 otherwise
- `effort_weight` — 1 (quick) to 4 (week-long), penalises heavy tasks

The top-scoring node is what `/next` recommends. `/brief` shows the top 3.

---

## Adding new commands

1. Add a handler function `_handle_<command>()` in `telegram_bot.py`
2. Add the `elif text.startswith("/command"):` branch in `handle_webhook()`
3. Update `_handle_help()` to list it
4. No view or URL changes needed
