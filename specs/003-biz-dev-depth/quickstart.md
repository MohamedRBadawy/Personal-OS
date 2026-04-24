# Quickstart: Business Development Depth

**Feature**: 003-biz-dev-depth  
**Date**: 2026-04-23

This feature is usable on day one after deployment. Here's how to verify everything works and start using it immediately.

---

## Acceptance Scenarios (Manual Test)

### 1. Log an outreach step

1. Open the app → Build hub → Pipeline
2. Open any opportunity card
3. Click "Log step" → select "First message" → enter date + optional notes → Save
4. ✅ Step appears in the timeline below the opportunity header
5. ✅ The funnel summary shows the opportunity's "last contact" date updated

### 2. Confirm overdue flagging

1. Log a step dated more than 3 days ago on an active opportunity
2. ✅ The opportunity row shows a visual overdue indicator (e.g., amber dot or "Follow up" badge)
3. ✅ The funnel summary shows an overdue count

### 3. Set deal value → see north star update

1. Open any won opportunity → Edit → set `Monthly value: €300`, `Recurring: Yes` → Save
2. ✅ Home page north star bar shows €300 confirmed (blue)
3. Open any "Proposal sent" opportunity → set `Monthly value: €500`
4. ✅ Home page north star bar shows €300 + €300 weighted (lighter tint, 60% of €500)

### 4. Save AI draft as a step

1. Open an opportunity → click "Draft message"
2. ✅ AI-generated message appears
3. Click "Save as step" → ✅ an OutreachStep with type "first_message" is created automatically

### 5. Equity partnership

1. Build hub → Partnerships tab → Add Partnership
2. Enter: partner name, business, equity %, status = Negotiating
3. ✅ Partnership appears in list with status and equity %
4. Add a next action: "Send signed MOU" → Save
5. ✅ Next action shows under the partnership row
6. Mark action complete → ✅ action gains a completion date; "Add next action" prompt appears

---

## Day-One Usage Guide

**For Mohamed's two existing equity partnerships:**

1. Add "Al-Noor Perfumes" — partner: Ahmed — 20% — status: Negotiating
2. Add the laptops business — partner: [name] — 20% — status: Negotiating
3. For each, add the outstanding next action
4. These are now tracked — no longer only in Mohamed's head

**For the warm outreach contact #1:**

1. Find their opportunity in the pipeline (or create one)
2. Click "Draft message" → review → "Save as step"
3. After sending: log "First message" step with today's date
4. 3 days from now: the system flags it for follow-up automatically

**For the north star bar:**

1. On the Operations Clarity Audit opportunity: set monthly value to €150 (first client pricing)
2. On any prospect in proposal stage: set their expected value
3. ✅ The north star bar immediately shows the gap between €0 confirmed and the potential pipeline

---

## Rollback

All new models add columns to existing tables and create new tables. No existing data is modified. Rollback: run `python manage.py migrate pipeline 0XXX` to the migration before the first new migration.
