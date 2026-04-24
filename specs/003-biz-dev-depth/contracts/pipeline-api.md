# API Contract: Business Development Depth

**Feature**: 003-biz-dev-depth  
**Date**: 2026-04-23  
**Base**: Extends existing `/api/pipeline/` endpoints

---

## Extended Endpoints

### GET /api/pipeline/workspace/

Returns `PipelineWorkspacePayload`. **New fields added to response:**

```json
{
  "opportunities": [
    {
      "id": 1,
      "name": "...",
      "status": "proposal_sent",
      "monthly_value_eur": "300.00",
      "is_recurring": true,
      "expected_close_date": "2026-05-15",
      "latest_step_date": "2026-04-20",
      "is_overdue": true,
      "outreach_steps": []
    }
  ],
  "weighted_pipeline_eur": "210.00",
  "confirmed_monthly_eur": "0.00",
  "pipeline_north_star": {
    "confirmed_eur": "0.00",
    "weighted_pipeline_eur": "210.00",
    "target_eur": "1000.00",
    "confirmed_pct": 0,
    "pipeline_pct": 21
  }
}
```

---

## New Endpoints — Outreach Steps

### GET /api/pipeline/opportunities/{id}/steps/

Returns the full step timeline for one opportunity.

**Response:**
```json
[
  {
    "id": 1,
    "step_type": "first_message",
    "date": "2026-04-15",
    "notes": "Sent via LinkedIn",
    "draft_message": "Hi Ahmed, ...",
    "created_at": "2026-04-15T09:00:00Z"
  }
]
```

### POST /api/pipeline/opportunities/{id}/steps/

Log a new outreach step.

**Request body:**
```json
{
  "step_type": "reply_received",
  "date": "2026-04-22",
  "notes": "Positive reply, interested in discovery call",
  "draft_message": ""
}
```

**Response:** Created step object (201).

### POST /api/pipeline/opportunities/{id}/steps/from-draft/

Save an AI draft as a logged outreach step. Convenience endpoint that combines draft generation with step creation.

**Request body:**
```json
{
  "channel": "linkedin",
  "notes": ""
}
```

**Response:** `{ "step": {...}, "draft_message": "..." }`

---

## New Endpoints — Equity Partnerships

### GET /api/pipeline/partnerships/

Returns all equity partnerships for the authenticated user.

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "partner_name": "Ahmed",
      "business_name": "Al-Noor Perfumes",
      "business_type": "Perfumes retail",
      "equity_pct": "20.00",
      "status": "negotiating",
      "terms_notes": "20% stake for operations setup + 6 months advisory",
      "current_next_action": {
        "id": 3,
        "description": "Send signed MOU draft",
        "completed_at": null
      },
      "created_at": "2026-04-10T00:00:00Z"
    }
  ]
}
```

### POST /api/pipeline/partnerships/

Create a new equity partnership.

**Request body:**
```json
{
  "partner_name": "Ahmed",
  "business_name": "Al-Noor Perfumes",
  "business_type": "Perfumes retail",
  "equity_pct": 20.0,
  "status": "negotiating",
  "terms_notes": ""
}
```

### PATCH /api/pipeline/partnerships/{id}/

Update any field on the partnership.

### POST /api/pipeline/partnerships/{id}/actions/

Add an action (complete current or set new next action).

**Request body:**
```json
{
  "description": "Send signed MOU draft",
  "is_current_next_action": true
}
```

### PATCH /api/pipeline/partnerships/{id}/actions/{action_id}/

Mark an action complete.

**Request body:**
```json
{
  "completed_at": "2026-04-23T10:00:00Z"
}
```

---

## North Star Integration

The home surface north star bar reads from `GET /api/profile/north-star/`. This endpoint is extended to include pipeline projection:

```json
{
  "label": "Monthly independent income",
  "target_amount": "1000.00",
  "currency": "EUR",
  "current_amount": "0.00",
  "weighted_pipeline_eur": "210.00",
  "progress_percent": 0,
  "pipeline_progress_percent": 21,
  "configured": true
}
```
