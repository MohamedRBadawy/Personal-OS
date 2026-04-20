# Data Model: Navigation & Interaction Redesign

**Phase 1 output** | Branch: `001-navigation-redesign` | Date: 2026-04-20

---

## Overview

This feature is primarily a frontend restructuring. No new Django models are required. The changes are:

1. **Frontend routing** restructured into 7 hub layout routes
2. **Capture API** extended with an optional `domain` field
3. **Profile API** extended to expose the user's configured north star name and target (replacing hardcoded values)
4. **Home surface** driven by frontend time-of-day state — no backend involvement

---

## Entities

### Hub (frontend only — no backend model)

Represents a top-level navigation destination.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | slug: `now`, `goals`, `build`, `life`, `learn`, `intelligence`, `profile` |
| `label` | string | Display name: "Now", "Goals", "Build", "Life", "Learn", "Intelligence", "Profile" |
| `layer` | enum | `execution` \| `awareness` \| `direction` |
| `icon` | string | Icon identifier |
| `defaultRoute` | string | The route that renders when the hub is selected |
| `subRoutes` | string[] | All routes nested under this hub |

This is a static config — not stored in the database.

---

### Capture (extends existing `Idea` model)

The existing `Idea` model in the `analytics` Django app stores captures. It needs one new optional field.

**Existing fields (kept):**
- `title` (string) — the capture text
- `context` (string, optional)
- `status` (string) — `raw`, `reviewed`, etc.
- `linked_goal` (FK, optional)

**New field:**

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `domain_hint` | string | optional, max 32 chars | Suggested domain: `now`, `goals`, `build`, `life`, `learn`, `intelligence`, `profile`, or null |

**State transitions:**

```
submitted (domain_hint=null) → auto-suggested (domain_hint=<keyword match>) → user-confirmed → routed
                                                                              → user-overridden → routed
```

---

### NorthStar (read from existing Profile model)

The home surface currently reads hardcoded values (`€1,000/mo`, `Kyrgyzstan`). These must come from the user's profile instead.

**Required profile fields (already exist or need adding):**

| Field | Type | Notes |
|-------|------|-------|
| `north_star_label` | string | e.g. "Move to Kyrgyzstan", "Launch my business", "Retire early" |
| `north_star_target_amount` | decimal | Numeric target (e.g. 1000) |
| `north_star_currency` | string | e.g. `EUR`, `USD`, `EGP` |
| `north_star_unit` | string | e.g. `per month`, `total`, `per year` |

If these fields do not exist on the Profile model, they must be added. If they exist under different names, the frontend must be updated to read the correct field names from the API.

---

### HomeState (frontend only — no backend model)

Drives which sections are visible on the home surface based on time of day.

| State | Time range | Primary sections shown |
|-------|-----------|------------------------|
| `morning` | 05:00–11:59 | Next Action, Priorities, Routine, Check-in nudge, North Star |
| `afternoon` | 12:00–17:59 | Priorities, Schedule, Pipeline, North Star, AI Suggestions |
| `evening` | 18:00–04:59 | Last Wins, Journal nudge, Finance Snapshot, Goals Overview |

All sections remain accessible in all states — the state only determines the default order and which sections are expanded vs. collapsed.

---

### CaptureKeywordMap (frontend only — static config)

Used by the auto-domain-suggestion logic in the capture component.

| Keyword group | Maps to domain |
|---------------|----------------|
| goal, vision, project, task, milestone | `goals` |
| business, client, outreach, proposal, deal, pipeline, revenue | `build` |
| health, exercise, meal, sleep, prayer, mood, habit, weight | `life` |
| learn, read, study, course, book, skill, research | `learn` |
| money, expense, income, budget, debt, saving | `life` (finance sub-section) |
| contact, person, follow-up, meeting, call | `profile` |
| (no match) | `null` — shown as "Uncategorized, review later" |

---

## Migrations Required

| Change | Type | Risk |
|--------|------|------|
| Add `domain_hint` to `Idea` model | Django migration | Low — nullable field, no data impact |
| Add north star fields to `Profile` model (if missing) | Django migration | Low — nullable fields with defaults |

Both migrations are additive (nullable new fields) — no data loss risk.

---

## No Changes Required To

- Goals model
- Finance model
- Schedule / Routine models
- Health models
- Journal model
- Contact model
