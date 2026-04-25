# API Contracts: AI Intelligence Layer

**Feature**: `004-ai-intelligence-layer`  
**Date**: 2026-04-25

---

## New Endpoints

### GET /api/goals/nodes/active-context/

Returns the current active goal context used to drive the trade-off prompt.

**Response**:
```json
{
  "active_goal_count": 3,
  "active_goals": [
    {
      "id": "uuid",
      "title": "string",
      "category": "string",
      "dependency_unblock_count": 2,
      "progress_pct": 40
    }
  ],
  "overwhelm_score": 2,
  "max_safe_active": 3,
  "recommendation": "You have 3 active goals. Activating a 4th would exceed the safe limit."
}
```

**Used by**: `TradeoffPromptModal.tsx` before confirming a goal status change to `active`.  
**Auth**: Session (same as all other endpoints).  
**Caching**: No — must reflect real-time state.

---

### GET /api/analytics/decisions/due/

Returns decisions where `outcome_date <= today` and `outcome_result == ''` (pending review).

**Response**:
```json
[
  {
    "id": "uuid",
    "decision": "string",
    "trade_off_cost": "string",
    "outcome_date": "2026-04-01",
    "outcome_result": "",
    "enabled_node_title": "string | null",
    "killed_node_title": "string | null",
    "date": "2026-03-15"
  }
]
```

**Used by**: `DecisionsPage` badge rendering.

---

### GET /api/analytics/reviews/{id}/commitments/

Lists all commitments for a given weekly review.

**Response**:
```json
[
  {
    "id": "uuid",
    "action_type": "stop | change | start",
    "description": "string",
    "node_update": "uuid | null",
    "node_update_title": "string | null",
    "was_kept": null,
    "created_at": "iso-datetime"
  }
]
```

---

### POST /api/analytics/reviews/{id}/commitments/

Creates one or more commitments for a weekly review. Accepts a list.

**Request**:
```json
[
  { "action_type": "stop", "description": "Stop spending time on cold outreach" },
  { "action_type": "start", "description": "Write one LinkedIn post per week", "node_update": "uuid" }
]
```

**Response**: `201 Created` — list of created commitment objects (same shape as GET).

---

### PATCH /api/analytics/reviews/commitments/{id}/

Marks a commitment as kept or not kept.

**Request**:
```json
{ "was_kept": true }
```

**Response**: `200 OK` — updated commitment object.

---

### GET /api/analytics/reviews/prior-commitments/

Returns unfulfilled commitments from the previous weekly review (for home page Q4 panel).

**Response**:
```json
[
  {
    "id": "uuid",
    "action_type": "stop",
    "description": "string",
    "from_week": "2026-04-14"
  }
]
```

**Used by**: `CommandCenterService.payload()` (backend calls this internally — not a direct frontend call).  
The result appears in `cc.prior_commitments_due` on the `CommandCenterPayload` type.

---

## Modified Endpoints

### PATCH /api/goals/nodes/{id}/ (augmented response)

When `status` changes to `active`, the response includes an additional key:

```json
{
  "id": "uuid",
  "title": "...",
  "status": "active",
  "trade_off_context": {
    "active_count_before": 3,
    "active_count_after": 4,
    "exceeded_safe_limit": true
  }
}
```

`trade_off_context` is only present when `status` transitions to `active`. Absent for all other updates.

---

## Telegram Webhook Contract (Extended)

**Existing behaviour** (unchanged):
- Messages starting with `/brief`, `/next`, `/capture`, `/status`, `/help` → existing handlers

**New behaviour**:
- All other messages → `_handle_conversation(chat_id, text)`
- Response is always sent via `send_message(chat_id, reply)`
- Response format: plain text, max ~200 characters for simple confirmations, max ~3 sentences for explanations
- If AI executes a tool: confirmation appended: `"\n\n✓ [action taken]"`

**Error behaviour**: Any exception in `_handle_conversation` is caught and logged. Telegram always receives 200 OK (existing contract, unchanged).

---

## Frontend Type Extensions

### CommandCenterPayload (extended)
```typescript
// Added to existing type in frontend/src/lib/types/dashboard.ts
prior_commitments_due: PriorCommitmentItem[]

interface PriorCommitmentItem {
  id: string
  action_type: 'stop' | 'change' | 'start'
  description: string
  from_week: string  // ISO date
}
```

### DecisionLog (extended)
```typescript
// Added to existing type in frontend/src/lib/types/learning.ts
trade_off_cost: string
outcome_date: string | null
outcome_result: 'right' | 'wrong' | 'too_early' | ''
enabled_node: string | null
enabled_node_title: string | null
killed_node: string | null
killed_node_title: string | null
```

### New types
```typescript
// frontend/src/lib/types/goals.ts
interface ActiveGoalContext {
  active_goal_count: number
  active_goals: ActiveGoalSummary[]
  overwhelm_score: number
  max_safe_active: number
  recommendation: string
}

interface ActiveGoalSummary {
  id: string
  title: string
  category: string
  dependency_unblock_count: number
  progress_pct: number
}

// frontend/src/lib/types/analytics.ts
interface ReviewCommitment {
  id: string
  action_type: 'stop' | 'change' | 'start'
  description: string
  node_update: string | null
  node_update_title: string | null
  was_kept: boolean | null
  created_at: string
}
```
