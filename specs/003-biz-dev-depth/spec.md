# Feature Specification: Business Development Depth

**Feature Branch**: `003-biz-dev-depth`  
**Created**: 2026-04-23  
**Status**: Draft  
**Input**: User description: "Business Development depth"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Outreach Sequence Tracking (Priority: P1)

Mohamed is pursuing warm contacts and cold prospects for his Operations Clarity Audit service. He needs to log each outreach step — initial message sent, reply received, meeting booked, proposal sent, deal closed or lost — so nothing falls through the cracks and he can see exactly where each opportunity stands in the funnel.

**Why this priority**: This is the most immediate action in the system (next action: send outreach to warm contact #1). Without sequence tracking, Mohamed cannot see what is stalled, what needs follow-up, or how many active conversations exist.

**Independent Test**: Can be fully tested by creating an opportunity, logging a sequence of outreach steps, and verifying the funnel view reflects each stage transition.

**Acceptance Scenarios**:

1. **Given** an existing opportunity, **When** Mohamed logs an outreach step (type: first message, reply, meeting, proposal, closed, lost), **Then** the step appears in the opportunity's timeline with date and optional notes.
2. **Given** an opportunity that has had no activity in 3+ days, **When** Mohamed views the pipeline, **Then** the opportunity is visually flagged as overdue for follow-up.
3. **Given** a set of opportunities across all stages, **When** Mohamed views the Build hub, **Then** he sees a funnel summary: count per stage and which are overdue.
4. **Given** an opportunity at the "replied" stage, **When** Mohamed wants to move it forward, **Then** he can log the next step inline without leaving the pipeline view.

---

### User Story 2 — Pipeline Value → €1,000/mo North Star (Priority: P2)

Mohamed needs to see at a glance how his current pipeline converts to monthly income — not just what has been earned (€0), but what is projected to close and when, so he can judge whether he is on track for the Kyrgyzstan trigger condition.

**Why this priority**: The entire system exists to reach €1,000/mo independent income. Without pipeline-to-north-star linkage, the progress bar is a vanity metric disconnected from business activity.

**Independent Test**: Can be fully tested by attaching a deal value and expected close date to an opportunity and confirming the north star section reflects the projected income contribution.

**Acceptance Scenarios**:

1. **Given** an opportunity with a confirmed monthly value (e.g., €300/mo), **When** it is marked "closed", **Then** the monthly income figure on the north star bar increments by €300.
2. **Given** opportunities in "proposal" and "meeting" stages with attached values, **When** Mohamed views the Home or Goals hub north star section, **Then** he sees: confirmed income + weighted pipeline contribution toward €1,000.
3. **Given** no closed deals, **When** Mohamed views the north star bar, **Then** it shows €0 confirmed but also shows projected pipeline total so the gap is visible.
4. **Given** a deal value entered as a one-time payment rather than recurring, **When** Mohamed marks it closed, **Then** the system records it separately from monthly recurring income without distorting the €1,000/mo metric.

---

### User Story 3 — Equity Partnership Tracking (Priority: P3)

Mohamed has two equity partnerships in progress (perfumes business, laptops business — ~20% stake each). These are distinct from client work: no immediate income, but future upside. He needs a place to track their status, his equity percentage, agreed terms, and next actions.

**Why this priority**: These partnerships are in active negotiation. Without tracking, the terms, commitments, and next actions exist only in Mohamed's head — violating the core system principle.

**Independent Test**: Can be fully tested by creating an equity partnership record and confirming status, equity %, and next action are all visible and editable.

**Acceptance Scenarios**:

1. **Given** no existing partnerships, **When** Mohamed adds a new equity partnership with partner name, business type, equity %, and status, **Then** the record appears in the Build hub partnerships section.
2. **Given** an equity partnership, **When** Mohamed logs a next action and marks it complete, **Then** the action is recorded in the partnership's history and he can add a new next action.
3. **Given** multiple partnerships, **When** Mohamed views the partnerships list, **Then** he sees: partner name, business, equity %, status (negotiating / active / on hold / exited), and the outstanding next action per partnership.

---

### User Story 4 — AI-Drafted Outreach Messages (Priority: P4)

Given a prospect's context (name, business type, pain points, relationship), Mohamed wants a draft first-message for review — reducing the friction of starting outreach from a blank page.

**Why this priority**: The offer document is ready and Mohamed knows who to contact, but blank-page friction delays action. This removes that blocker.

**Independent Test**: Can be fully tested by selecting an opportunity and triggering draft generation, then reviewing the output.

**Acceptance Scenarios**:

1. **Given** an opportunity with prospect name, business context, and stage "not contacted", **When** Mohamed requests a draft message, **Then** the system generates a short, personalised outreach message referencing the prospect's likely operational pain and Mohamed's service.
2. **Given** a generated draft, **When** Mohamed edits and copies it, **Then** it is saved as the logged outreach step for that opportunity with type "first message".
3. **Given** a prospect at "replied" stage with prior message history, **When** Mohamed requests a draft follow-up, **Then** the draft acknowledges the prior exchange and advances toward a meeting.

---

### Edge Cases

- What happens when a deal value is entered in EGP rather than EUR? The north star is denominated in EUR — values in other currencies must be converted or flagged.
- What happens when an equity partnership has no defined income yet (pre-revenue business)? The system should allow €0 projected income without breaking the north star calculation.
- What happens when Mohamed closes a deal but the income is one-time, not recurring? It should not inflate the monthly recurring income metric permanently.
- What happens when two outreach steps are logged on the same day? Both should appear in sequence; the pipeline stage reflects the latest step.

## Requirements *(mandatory)*

### Functional Requirements

**Outreach sequences:**
- **FR-001**: System MUST allow a sequence of dated steps to be logged against each opportunity, with step types: first message, reply received, meeting booked, proposal sent, closed (won), lost.
- **FR-002**: System MUST flag any opportunity where the most recent logged step is older than 3 days and the opportunity status is not won, lost, or rejected.
- **FR-003**: System MUST display a funnel summary: count of opportunities at each stage, with overdue count highlighted.
- **FR-004**: Users MUST be able to log a new outreach step inline from the pipeline view without navigating away.

**Pipeline → North Star:**
- **FR-005**: System MUST allow a monthly value (EUR) and optional close date to be attached to each opportunity.
- **FR-006**: System MUST distinguish between confirmed recurring income (closed deals) and projected pipeline value (active deals).
- **FR-007**: The north star progress display MUST show both confirmed monthly income and weighted pipeline projection toward the €1,000/mo target.
- **FR-008**: System MUST exclude one-time payments from the recurring monthly income metric while still recording them.

**Equity partnerships:**
- **FR-009**: System MUST support equity partnership records with: partner name, business name/type, equity percentage, status, agreed terms (free text), and next action.
- **FR-010**: Partnership status MUST support: Negotiating, Active, On Hold, Exited.
- **FR-011**: Users MUST be able to log completed actions and add new next actions per partnership.

**AI-drafted outreach:**
- **FR-012**: System MUST allow a user to request a draft outreach message for an opportunity, using the prospect's name, business context, stage, and any prior step notes as context.
- **FR-013**: Generated drafts MUST be editable before saving.
- **FR-014**: Saving a draft MUST automatically create an outreach step log entry for that opportunity.

### Key Entities

- **Opportunity**: Existing entity — extended with `monthly_value_eur`, `is_recurring`, `expected_close_date` fields.
- **OutreachStep**: New — linked to an Opportunity; fields: `step_type` (enum), `date`, `notes`, `draft_message` (optional).
- **EquityPartnership**: New — fields: `partner_name`, `business_name`, `business_type`, `equity_pct`, `status`, `terms_notes`, `created_at`.
- **PartnershipAction**: New — linked to EquityPartnership; fields: `description`, `completed_at` (nullable), `is_current_next_action`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mohamed can log an outreach step for any opportunity in under 30 seconds without leaving the pipeline view.
- **SC-002**: The north star bar shows a meaningful progress figure (confirmed + projected) within 1 second of the Build hub loading.
- **SC-003**: All active opportunities with no recent step are surfaced in a single view — zero opportunities fall through the cracks unnoticed.
- **SC-004**: An AI outreach draft is generated and displayed in under 10 seconds.
- **SC-005**: Mohamed can see the status and next action of all equity partnerships in a single list without expanding any item.
- **SC-006**: The system correctly separates recurring vs. one-time income so the €1,000/mo metric is never distorted by one-off payments.

## Assumptions

- The existing PipelinePage and its opportunity model are extended — not replaced. New fields and the OutreachStep sub-entity attach to existing opportunities.
- EUR is the canonical currency for north star calculations. EGP or other currencies entered by mistake are flagged to the user for manual conversion.
- Equity partnerships do not contribute to the €1,000/mo metric until they generate actual recurring distributions — they are tracked separately.
- AI outreach drafts are generated using the existing Claude API integration already in the backend; no new AI provider is required.
- The feature is for single-user use (Mohamed only) — no sharing, permissions, or multi-user access needed.
- "Weighted pipeline projection" uses a simple stage-based weight (e.g., proposal = 60%, meeting = 30%, first contact = 10%) applied to the opportunity's monthly value. Weights are fixed defaults, not user-configurable in v1.
