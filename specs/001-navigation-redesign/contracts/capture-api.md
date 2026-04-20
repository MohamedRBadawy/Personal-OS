# Contract: Capture API

**Feature**: Navigation & Interaction Redesign
**Date**: 2026-04-20

---

## Endpoint: Submit Capture

**`POST /api/ideas/`** *(existing endpoint, extended)*

Submits a new capture. All fields except `title` are optional — the system accepts a single word.

### Request

```json
{
  "title": "string (optional — empty string is accepted)",
  "context": "string (optional)",
  "domain_hint": "string (optional) — one of: now, goals, build, life, learn, intelligence, profile"
}
```

If `title` is empty or omitted, the backend MUST still accept the capture and store it with `title: ""`.

If `domain_hint` is omitted, the backend stores `domain_hint: null`.

### Response (201 Created)

```json
{
  "id": 42,
  "title": "string",
  "context": "string or null",
  "domain_hint": "string or null",
  "suggested_domain": "string or null",
  "status": "raw",
  "created_at": "2026-04-20T07:00:00Z"
}
```

`suggested_domain` is computed by the backend using keyword matching on `title`. It is returned in the response so the frontend can show it to the user for confirmation. It does NOT automatically route the capture — it is a suggestion only.

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Malformed JSON |
| 500 | Server error |

Note: An empty title is **not** a 400 error. The capture is stored as-is.

---

## Endpoint: Get Capture Suggestion

**`GET /api/ideas/suggest-domain/?title=<text>`** *(new endpoint)*

Returns a domain suggestion for a given title string. Used by the capture interface for live suggestions as the user types (debounced — called after 300ms idle).

### Request

Query param: `title` (string)

### Response (200 OK)

```json
{
  "suggested_domain": "goals",
  "confidence": "high",
  "matched_keywords": ["project", "goal"]
}
```

`confidence` is one of: `high` (2+ keyword matches), `low` (1 keyword match), `none` (0 matches).

When `confidence` is `none`, `suggested_domain` is `null`.

---

## Endpoint: Get North Star

**`GET /api/profile/north-star/`** *(new endpoint — reads from Profile model)*

Returns the authenticated user's north star configuration. Used by the home surface to display the goal label and progress.

### Response (200 OK)

```json
{
  "label": "Move to Kyrgyzstan",
  "target_amount": 1000.00,
  "currency": "EUR",
  "unit": "per month",
  "current_amount": 0.00,
  "progress_percent": 0
}
```

`current_amount` is computed from the finance data (sum of independent income entries for the current month).

If the user has not configured a north star, all fields except `progress_percent` are `null` and a `configured: false` flag is returned — the home surface shows a "Set your north star" prompt.
