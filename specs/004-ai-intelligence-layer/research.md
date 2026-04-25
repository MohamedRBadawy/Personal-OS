# Research: AI Intelligence Layer

**Phase**: 0 — Research & Unknowns Resolution  
**Feature**: `004-ai-intelligence-layer`  
**Date**: 2026-04-25

---

## Decision 1: Telegram Conversational Mode Architecture

**Decision**: Route non-command Telegram messages through the existing `run_chat()` function in `core/chat_service.py`, using a new `TelegramConversation` model for rolling history.

**Rationale**: `run_chat(messages, context)` already handles tool dispatch, agentic loops, and AI provider selection. Re-using it avoids duplicating the tool execution and error-handling logic. The function signature accepts a `context` dict — adding `{"mode": "telegram"}` is sufficient to activate Telegram-specific prompt behaviour.

**Alternatives considered**:
- Separate Telegram AI service: rejected — duplicates tool execution and agentic loop logic
- Stateless (no history): rejected — context-free responses would be poor quality for thinking mode
- Redis for session storage: rejected — adds infrastructure cost; a database table is simpler and already available

---

## Decision 2: TelegramConversation — No User FK

**Decision**: `TelegramConversation` uses `chat_id` as the user identifier, with no FK to a Django User model.

**Rationale**: The existing Telegram security model validates `chat_id` against `TELEGRAM_CHAT_ID` env var. The system is currently single-user; the `chat_id` is already the isolation key. Adding a User FK requires authentication middleware that does not exist.

**Constitution compliance note**: Constitution Principle VII requires user FK on models holding user-owned data. This is a **controlled deviation**: `chat_id` is documented as the isolation key. When multi-user support is activated, `TelegramConversation` must gain a user FK in the migration. A TODO comment is added to the model to enforce this.

**Alternatives considered**:
- User FK with Profile: rejected — no authentication layer exists; Profile is a singleton; adding FK would require auth middleware first
- Single global history (no isolation): rejected — if chat_id security ever widens, cross-user data leakage would occur

---

## Decision 3: core/services.py Split Required (Constitution IX)

**Decision**: `core/services.py` is at 754 lines — 88% above the 400-line Python limit from Constitution Principle IX. **This file MUST be split before any new code is added to it.** This is a pre-condition for Phase 4 (adding `prior_commitments_due` to `CommandCenterService`).

**Split structure**:
```
backend/core/services/
├── __init__.py          # re-exports all public names (backward compatibility)
├── checkin.py           # CheckInService (~140 lines)
├── priority.py          # PriorityService (~100 lines)
├── dashboard.py         # DashboardService (~160 lines)
└── command_center.py    # CommandCenterService (~350 lines)
```

**Rationale**: The four services in the file are logically independent. `CommandCenterService` calls `PriorityService` — keep imports explicit rather than circular.

**Impact**: All existing imports of `from core.services import X` continue to work via `__init__.py` re-exports.

---

## Decision 4: Thinking Mode — Prompt Engineering Approach

**Decision**: Thinking Mode is a backend prompt mode (`"thinking_companion"`) added to `chat_service.py`'s system prompt builder. It is not a separate endpoint.

**Rationale**: The existing mode system (`task_thinking`, `command_center_capture`) already handles this pattern. Adding a new mode string is one if-branch. No new infrastructure needed.

**5-stage flow enforced by prompt**:
1. Receive raw thought, ask: "What's the real goal underneath this?"
2. Ask: "What would this cost you in time, money, or attention?"
3. Ask: "Which of your existing goals does this connect to or compete with?"
4. Evaluate: does this serve the Kyrgyzstan target or a current active goal?
5. Propose conclusion: Goal / Idea to explore / Discard — with priority and reason

**Constraint**: One question per message enforced by prompt instruction. AI must not ask a list.

---

## Decision 5: Trade-off Gate — Advisory Not Blocking

**Decision**: The trade-off prompt appears when `active_count >= max_safe_active` but does not prevent saving. "Proceed anyway" is always available.

**Rationale**: Blocking users from setting a goal active creates friction that may cause them to abandon the system. The goal is visibility, not enforcement. The system advises — Mohamed decides.

**Max safe active threshold**: Derived from `OverwhelmService.summary().max_priorities` — not hardcoded. Currently returns 3 for reduced mode, 5 for normal mode.

---

## Decision 6: ReviewCommitment — Linked to WeeklyReview, Not Profile

**Decision**: `ReviewCommitment` is linked to `WeeklyReview` via FK. It does not have a separate user FK.

**Rationale**: `WeeklyReview` is already scoped per user (via session/singleton model). The commitment inherits that scoping. Same controlled deviation as Decision 2 — note for future multi-user migration.

---

## Decision 7: Proactive Scheduling — Render Cron Jobs

**Decision**: Use Render native cron jobs (dashboard configuration) rather than modifying `render.yaml`.

**Rationale**: Cron jobs in Render can be added without a redeployment. `render.yaml` changes trigger a full redeploy. This is Phase 0 — fastest possible activation with zero code changes.

**Cron expressions** (UTC — Render runs in UTC):
- Morning brief: `20 3 * * *` = 05:20 Cairo (UTC+2)
- EOD summary: `30 17 * * *` = 19:30 UTC = 21:30 Cairo (+2) → **correction needed**: Cairo is UTC+2, so 20:30 Cairo = 18:30 UTC = `30 18 * * *`

**Corrected cron expressions**:
- Morning brief: `20 3 * * *` (05:20 Cairo = 03:20 UTC)
- EOD summary: `30 18 * * *` (20:30 Cairo = 18:30 UTC)

---

## Decision 8: New AI Tools — Added to chat_tools.py

**Decision**: New tools (`log_journal_entry`, `complete_routine_block`, `update_goal_progress`, `update_contact_followup`) are added to `core/chat_tools.py` alongside existing tools.

**Rationale**: `chat_tools.py` is the compatibility shim that assembles `TOOL_SCHEMAS`. All 16 existing tools follow the same pattern: schema dict + executor function. New tools follow the same pattern.

**Tools to add** (Phase 3):
- `log_journal_entry` — creates a JournalEntry for today
- `complete_routine_block` — creates a RoutineLog record for a named block
- `update_goal_progress` — sets `progress_pct` on a Node by title search
- `update_contact_followup` — updates `next_followup` date on a Contact by name search

---

## Unresolved Issues (none)

All `NEEDS CLARIFICATION` items from spec were resolved via context or reasonable defaults. No blockers for Phase 1.
