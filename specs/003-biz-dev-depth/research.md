# Research: Business Development Depth

**Feature**: 003-biz-dev-depth  
**Phase**: 0 — Research  
**Date**: 2026-04-23

---

## Existing Pipeline Model

**Decision**: Extend the existing `Opportunity` model rather than replace it.  
**Rationale**: The model already has `last_outreach_at`, `outreach_count`, `next_followup_date`, `prospect_context`, and `ai_draft`. It lacks deal value, close date, and a proper step timeline.  
**Alternatives considered**: A separate `Deal` model parallel to `Opportunity` — rejected because it duplicates identity; opportunities already track the full lifecycle.

**Existing status enum**: `new | reviewing | applied | interview | proposal_sent | won | lost | rejected`  
**Conclusion**: The kanban status is sufficient for board view. `OutreachStep` provides the granular timeline within each status bucket.

---

## Outreach Step Design

**Decision**: New `OutreachStep` model linked to `Opportunity` via FK.  
**Rationale**: The existing model tracks the *current* outreach count and date — it does not preserve a history. A timeline of steps (first message → reply → meeting → proposal → outcome) is not representable as a single scalar.  
**Step types chosen**: `first_message`, `reply_received`, `meeting_booked`, `proposal_sent`, `won`, `lost` — maps to the 6 key moments in a B2B service sale.  
**Overdue logic**: An opportunity is flagged overdue when `OutreachStep.most_recent.date < today - 3 days` AND opportunity status is not `won`/`lost`/`rejected`. Three days is a sensible default for B2B outreach follow-ups; it matches typical reply-window expectations.

---

## Pipeline → North Star Connection

**Decision**: Add `monthly_value_eur` (decimal) and `is_recurring` (bool) to `Opportunity`. Derive a `weighted_pipeline_eur` aggregate in the pipeline workspace serializer.  
**Rationale**: The north star bar currently reads `UserProfile.monthly_independent_income` (confirmed income only). Pipeline projection requires deal-value fields that don't exist yet.  
**Stage weights** (fixed defaults in v1, not user-configurable):

| Stage | Weight |
|---|---|
| won | 100% (moves to confirmed income) |
| proposal_sent | 60% |
| interview | 30% |
| applied | 10% |
| reviewing / new | 5% |
| lost / rejected | 0% |

**Currency**: EUR only in v1. EGP amounts from `FinanceSummary` are excluded from the EUR north star bar. If an opportunity value is entered as 0 or blank, it contributes 0 to the projection (no distortion).  
**One-time vs. recurring**: `is_recurring=True` → contributes to monthly recurring income metric on close. `is_recurring=False` → logged as an income event but does not increment the monthly recurring total.  
**North star bar update**: The bar will show two stacked values: confirmed (blue) + weighted pipeline (lighter tint). Both sourced from a new `pipeline_north_star` endpoint.

---

## Equity Partnership Model

**Decision**: New `EquityPartnership` and `PartnershipAction` models in the `pipeline` Django app (not a new app).  
**Rationale**: Equity partnerships are a sub-category of business development — they belong in `pipeline` alongside outreach and opportunities. Creating a new app for two models is unnecessary complexity.  
**Status enum chosen**: `negotiating | active | on_hold | exited` — covers the full lifecycle of a passive equity stake without overcomplicating.  
**Income contribution**: Equity partnerships do NOT contribute to the `monthly_independent_income` metric until the user manually logs an actual income distribution via `FinanceEntry`. The partnership tracker is for status/terms/next-action only.

---

## AI Outreach Drafts

**Decision**: Reuse the existing `draftOpportunityMessage` API endpoint and `ai_draft` field. Add: when the user saves a draft, automatically create an `OutreachStep` with `step_type="first_message"` and `draft_message` set.  
**Rationale**: The AI draft panel already exists in `PipelinePage`. The missing link is persistence — currently a draft is generated and displayed but not logged as a step. Adding auto-step creation on save closes this gap with minimal new code.  
**Alternatives considered**: A separate AI endpoint for equity partnership outreach — deferred to future iteration; current need is service outreach only.

---

## File Size Constraints

**Decision**: Split `backend/pipeline/models.py` into a `models/` subpackage before adding new models.  
**Rationale**: Research from agent indicates the existing `pipeline/models.py` contains `Opportunity`, `ServiceOffering`, `MarketingAction`, and `Client` — likely 200–300 lines already. Adding `OutreachStep`, `EquityPartnership`, and `PartnershipAction` would exceed the 400-line limit (Constitution IX).  
**Split structure**:
```
backend/pipeline/models/
├── __init__.py          (re-exports all models)
├── opportunity.py       (Opportunity, ServiceOffering, Client)
├── outreach.py          (OutreachStep)
└── equity.py            (EquityPartnership, PartnershipAction)
```

**Frontend**: `PipelinePage.tsx` is already complex. The `EquityPartnershipsPanel` will be extracted to its own component file; `OutreachTimeline` likewise. Target: PipelinePage.tsx stays under 300 lines.

---

## Where Equity Partnerships Live in the UI

**Decision**: New "Partnerships" tab within the existing Business Hub (`/business` → `ScheduleHubPage` equivalent for Business).  
**Rationale**: Constitution II prohibits new top-level pages. The Build hub already has Pipeline, Marketing. A third tab "Partnerships" slots in without adding a new hub or top-level route.

---

## North Star Bar Location

**Decision**: Update the existing `HomeNorthStarSection` component to show pipeline projection alongside confirmed income. No new page.  
**Rationale**: The north star bar is already on the home surface. The pipeline projection is additive data for the same metric — not a new section. The Build hub finance overview can also show a detailed breakdown.
