# Data Model: Business Development Depth

**Feature**: 003-biz-dev-depth  
**Date**: 2026-04-23

---

## Existing Models — Extended

### Opportunity (extended)

Existing model in `backend/pipeline/models/opportunity.py` (after split).

**New fields added:**

| Field | Type | Default | Notes |
|---|---|---|---|
| `monthly_value_eur` | DecimalField(6,2) | 0.00 | Expected monthly value if recurring, or total if one-time |
| `is_recurring` | BooleanField | True | True = contributes to monthly income metric on close |
| `expected_close_date` | DateField | null | Optional target close date |

**Unchanged:** all existing fields (`name`, `status`, `platform`, `last_outreach_at`, `outreach_count`, `next_followup_date`, `prospect_context`, `ai_draft`, etc.)

---

## New Models

### OutreachStep

Location: `backend/pipeline/models/outreach.py`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | AutoField | PK | |
| `opportunity` | ForeignKey(Opportunity) | on_delete=CASCADE | |
| `user` | ForeignKey(User) | on_delete=CASCADE | Constitution VII: user isolation |
| `step_type` | CharField(20) | choices | See enum below |
| `date` | DateField | default=today | When this step occurred |
| `notes` | TextField | blank=True | Free text context |
| `draft_message` | TextField | blank=True | Captured from AI draft if applicable |
| `created_at` | DateTimeField | auto_now_add | |

**step_type enum:**
```
first_message   — initial outreach sent
reply_received  — prospect replied (positive or neutral)
meeting_booked  — discovery or follow-up call scheduled
proposal_sent   — formal proposal/offer sent
won             — deal confirmed, closed won
lost            — opportunity closed lost
```

**Overdue rule (computed, not stored)**: an opportunity is overdue when its most recent `OutreachStep.date` is more than 3 days ago AND `opportunity.status` not in `(won, lost, rejected)`.

**Ordering:** `Meta.ordering = ['-date', '-created_at']`

---

### EquityPartnership

Location: `backend/pipeline/models/equity.py`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | AutoField | PK | |
| `user` | ForeignKey(User) | on_delete=CASCADE | Constitution VII |
| `partner_name` | CharField(200) | | Person Mohamed has the agreement with |
| `business_name` | CharField(200) | | The business |
| `business_type` | CharField(200) | blank=True | e.g. "Perfumes retail" |
| `equity_pct` | DecimalField(5,2) | | Equity percentage (e.g. 20.00) |
| `status` | CharField(20) | choices | See enum below |
| `terms_notes` | TextField | blank=True | Agreed terms in plain text |
| `created_at` | DateTimeField | auto_now_add | |
| `updated_at` | DateTimeField | auto_now | |

**status enum:** `negotiating | active | on_hold | exited`

---

### PartnershipAction

Location: `backend/pipeline/models/equity.py`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | AutoField | PK | |
| `partnership` | ForeignKey(EquityPartnership) | on_delete=CASCADE | |
| `user` | ForeignKey(User) | on_delete=CASCADE | Constitution VII |
| `description` | CharField(500) | | What needs to happen |
| `completed_at` | DateTimeField | null, blank | Null = pending |
| `is_current_next_action` | BooleanField | default=False | Only one per partnership should be True |
| `created_at` | DateTimeField | auto_now_add | |

**Business rule**: when a `PartnershipAction` is completed (`completed_at` set), the system clears `is_current_next_action` and allows a new one to be set.

---

## Relationships Diagram

```
User ──< Opportunity ──< OutreachStep
              │
              └── monthly_value_eur, is_recurring, expected_close_date (new fields)

User ──< EquityPartnership ──< PartnershipAction
```

---

## Migrations

1. `0XXX_pipeline_models_split.py` — Split models.py into models/ subpackage (no schema change)
2. `0XXX_opportunity_deal_fields.py` — Add `monthly_value_eur`, `is_recurring`, `expected_close_date` to Opportunity
3. `0XXX_add_outreach_step.py` — Create OutreachStep table
4. `0XXX_add_equity_partnership.py` — Create EquityPartnership + PartnershipAction tables

---

## Computed Values (not stored)

| Value | Source | Used by |
|---|---|---|
| `weighted_pipeline_eur` | SUM(opportunity.monthly_value_eur × stage_weight) for active opps | North star bar, pipeline workspace |
| `confirmed_monthly_eur` | SUM(opportunity.monthly_value_eur) WHERE status=won AND is_recurring=True | North star bar |
| `is_overdue` | max(outreach_step.date) < today-3 AND status not in (won,lost,rejected) | Pipeline funnel view |
| `current_next_action` | PartnershipAction WHERE is_current_next_action=True | Partnerships list |
