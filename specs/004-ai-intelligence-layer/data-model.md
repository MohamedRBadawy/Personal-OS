# Data Model: AI Intelligence Layer

**Feature**: `004-ai-intelligence-layer`  
**Date**: 2026-04-25

---

## New Models

### TelegramConversation
**Location**: `backend/core/models.py`  
**Purpose**: Stores rolling message history per Telegram chat to maintain conversational context across multiple messages.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, auto | from BaseModel |
| `chat_id` | CharField(50) | db_index=True | Telegram chat identifier |
| `role` | CharField(10) | choices: user/assistant | Message sender |
| `content` | TextField | — | Message text |
| `created_at` | DateTimeField | auto_now_add | Used for ordering and pruning |

**Class methods** (not fields — implemented on the model):
- `get_recent(chat_id, limit=10)` → list of `{"role", "content"}` dicts, oldest first
- `append(chat_id, user_text, assistant_reply)` → creates two records atomically

**Retention**: Only the last 10 exchanges per chat_id are loaded. Records older than the window are not deleted automatically — implement cleanup as a management command if storage grows.

**Constitution note**: No user FK — controlled deviation. `chat_id` is the isolation key. Add `user FK` when multi-user Telegram is activated.  
**Migration**: `core/migrations/NNNN_telegramconversation.py`

---

### ReviewCommitment
**Location**: `backend/analytics/models/review_commitment.py`  
**Purpose**: Records structured commitments made during weekly review (stop/change/start). Checked at the following week's review for accountability.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, auto | from BaseModel |
| `review` | FK(WeeklyReview) | CASCADE, related_name='commitments' | The review this was created in |
| `action_type` | CharField(10) | choices: stop/change/start | Type of commitment |
| `description` | TextField | — | What the user committed to |
| `node_update` | FK(goals.Node) | null, blank, SET_NULL | Optional linked goal |
| `was_kept` | BooleanField | null=True, blank=True | None=pending, True=kept, False=not kept |
| `checked_at_review` | FK(WeeklyReview) | null, blank, SET_NULL, related_name='checked_commitments' | The review where this was evaluated |
| `created_at` | DateTimeField | auto_now_add | — |

**State transitions**:
```
created (was_kept=None) → kept (was_kept=True, checked_at_review set)
                        → not kept (was_kept=False, checked_at_review set)
```

**Constitution note**: No user FK — inherits scoping from WeeklyReview. Add user FK when multi-user activated.  
**Migration**: `analytics/migrations/NNNN_reviewcommitment.py`

---

## Modified Models

### DecisionLog (enhanced)
**Location**: `backend/analytics/models/decision_log.py`  
**Existing fields**: `decision`, `reasoning`, `alternatives_considered`, `outcome`, `date`, `created_at`

**New fields added**:

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `trade_off_cost` | TextField | blank=True | What the user is explicitly NOT doing |
| `outcome_date` | DateField | null=True, blank=True | When to check if decision was right |
| `outcome_result` | CharField(10) | blank=True, choices: right/wrong/too_early | Outcome recorded at review |
| `enabled_node` | FK(goals.Node) | null, blank, SET_NULL, related_name='enabling_decisions' | Goal this decision enables |
| `killed_node` | FK(goals.Node) | null, blank, SET_NULL, related_name='killing_decisions' | Goal this decision deprioritizes |

All new fields are nullable/blank — existing records are unaffected.

**New computed state**: A decision is "pending review" when `outcome_date <= today` AND `outcome_result == ''`.

**Migration**: `analytics/migrations/NNNN_decisionlog_phase2.py` (AddField ×5)

---

## No Changes To

These models are read but not modified by this feature:
- `Node` (goals) — referenced as FK target only
- `WeeklyReview` (analytics) — gains reverse relation `commitments` from ReviewCommitment
- `Profile` (core) — read for AI context injection
- `RoutineLog`, `HealthLog`, `MoodLog`, `SpiritualLog`, `HabitLog` — written via new tools

---

## Relationship Diagram

```
WeeklyReview ──< ReviewCommitment >── Node (optional)
                      │
                      └── checked_at_review: WeeklyReview

DecisionLog >──────────────── Node (enabled_node, killed_node)

TelegramConversation  (standalone, chat_id keyed)
```

---

## Migration Order

1. `core` app: add `TelegramConversation`
2. `analytics` app: add fields to `DecisionLog`
3. `analytics` app: add `ReviewCommitment`

No cross-app migration dependencies except `ReviewCommitment → goals.Node` (which already exists as a dependency in the codebase).

---

## core/services.py Split (Pre-condition)

Before Phase 4 adds code to `CommandCenterService`, `core/services.py` must be split. The split produces no new models — it is a code organisation change only.

**Target structure**:
```
backend/core/services/
├── __init__.py          # re-exports: CheckInService, PriorityService, DashboardService, CommandCenterService
├── checkin.py           # CheckInService
├── priority.py          # PriorityService
├── dashboard.py         # DashboardService
└── command_center.py    # CommandCenterService
```

All existing `from core.services import X` imports continue to resolve via `__init__.py`.
