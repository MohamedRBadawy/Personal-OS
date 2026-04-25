# Quickstart: AI Intelligence Layer

**Feature**: `004-ai-intelligence-layer`  
**Purpose**: How to use and verify every capability on the day it ships.

---

## Phase 0 — Proactive Telegram (ships first, 15 minutes)

**Setup**: Add two cron jobs in the Render dashboard for `personal-os-api-xk0z`:

| Job name | Command | Schedule (UTC) | Cairo time |
|----------|---------|----------------|-----------|
| Morning Brief | `python manage.py send_morning_brief` | `20 3 * * *` | 05:20 |
| EOD Summary | `python manage.py send_eod_summary` | `30 18 * * *` | 20:30 |

**Verify**: Wait until 05:20 Cairo time. Telegram receives a morning brief automatically. No command sent.

**Fallback test** (don't wait): In Render shell, run `python manage.py send_morning_brief` manually — confirm Telegram receives the message.

---

## Phase 5 — Telegram Conversational Mode (ships second)

**How to use**: Open Telegram and message `@PersonalOSBadawy_bot` with any natural text (no `/` prefix).

**Test these immediately after deploy**:

```
You send:          "log my mood as 4 today"
Bot replies:       "Done — mood logged as 4/5 for today."

You send:          "capture idea: create an operations manual template to sell"
Bot replies:       "Done — idea captured: create an operations manual template to sell."

You send:          "what should I work on right now?"
Bot replies:       [top priority with reason — same as /next but conversational]

You send:          "I'm thinking about starting a YouTube channel about operations"
Bot replies:       "Interesting. What's the real goal underneath this — visibility, income, or building authority?"

You send:          "/status"
Bot replies:       [existing status response — unchanged]
```

**Verify conversation memory**: Send 3 messages back and forth. The AI refers to earlier messages in the session correctly.

---

## Phase 1 — Synthesis Surface (ships third)

**How to use**: Open the app home page. The four question panels are visible immediately — no scrolling required.

**Verify each panel**:

| Panel | What to check |
|-------|--------------|
| Q1 — What matters most? | Shows your top leverage-scored node with its title and priority |
| Q2 — What am I ready to act on? | Shows only nodes with status `available` — no blocked or done nodes |
| Q3 — What is blocking me? | Shows blocked nodes with the blocking node's title named, not just "blocked" |
| Q4 — How am I actually doing? | Shows 7-day averages, not today's values. Mood 7d avg, sleep 7d avg, habit rate 7d. |

**Thinking Mode**: Click "Think this through with AI" on the Ideas page, or press Ctrl+Shift+T. Type a raw thought. The AI asks exactly one question. Respond. Continue until it proposes a conclusion (Goal / Idea / Discard). Confirm — a record is created.

---

## Phase 2 — Decision System

**How to use**: Navigate to any Decisions page. Create a new decision.

**Verify**:
1. "Trade-off: what you're NOT doing" field is present and saves correctly
2. Set `outcome_date` to yesterday's date — save the decision
3. Return to the decisions list — a "Pending review" badge appears on the card
4. Call `GET /api/analytics/decisions/due/` — the decision appears in the response

---

## Phase 3 — Trade-off Gate

**How to use**: Have 3+ active goals. Try to set a 4th goal to Active.

**Verify**:
1. Trade-off prompt modal appears listing your current active goals
2. Select one to defer → both goals update correctly, modal closes
3. Click "Proceed anyway" → only the new goal is set to active, no deferral

**Verify expanded AI tools** in the ChatPanel:
```
You type:    "log my journal entry: I felt focused and productive today"
AI responds: [confirms journal entry created]

You type:    "mark my 06:00 exercise block as done"
AI responds: [confirms routine log created for the exercise block]
```

---

## Phase 4 — Self-Correcting Weekly Review

**How to use**: Open Analytics → Weekly Review → Start a new review.

**Verify**:
1. Complete steps 1–4 (existing: Wins, Challenges, Focus, Generate)
2. Step 5 "Commitments" appears — add one STOP and one START item
3. Complete the review
4. The following day: open the home page — Q4 panel shows prior commitments
5. Click "Yes" on one commitment → it disappears from the panel

---

## Daily Use After All Phases Ship

**Morning**:
1. 05:20 — Telegram receives morning brief automatically
2. Open app — Q1 tells you exactly what matters most today
3. Q2 shows what's ready to act on right now

**During the day**:
- From Telegram: log habits, capture ideas, ask for next action — without opening the app
- From app: use Ctrl+Shift+T to think through a new idea before committing to it

**Evening**:
- 20:30 — Telegram receives EOD summary automatically

**Weekly**:
- Complete the weekly review including commitments
- The following week, accountability check appears automatically on the home page
