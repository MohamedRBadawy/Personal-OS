# Implementation Plan: Navigation & Interaction Redesign

**Branch**: `001-navigation-redesign` | **Date**: 2026-04-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-navigation-redesign/spec.md`

---

## Summary

Collapse the current 5-group collapsible sidebar into a flat 7-hub navigation shell governed by the three-layer principle (Execution / Awareness / Direction). Redesign the Quick Capture to accept zero required fields and auto-suggest a domain. Rebuild the home surface to be time-of-day aware and driven by user-configured data (not hardcoded constants). Split the 1020-line HomePage.tsx into focused sub-components to comply with the 300-line file size limit.

---

## Technical Context

**Language/Version**: Python 3.11 (backend) | TypeScript 5.9 + React 19 (frontend)
**Primary Dependencies**: Django 5.1 + DRF (backend) | React Router v7 + TanStack Query v5 (frontend)
**Storage**: PostgreSQL (Neon) — two additive migrations required (nullable fields only)
**Testing**: pytest (backend) | Vitest + React Testing Library (frontend)
**Target Platform**: Desktop web browser — Render.com static frontend + Python web service backend
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: Hub navigation transition under 200ms; capture modal opens in under 100ms; home surface initial load under 2 seconds
**Constraints**: Render free tier (cold start ~50s first request after idle — not addressable in this feature); no new npm packages without justification; each component file must stay under 300 lines (Principle IX)
**Scale/Scope**: Small trusted group (~2–10 users); 13 active routes reorganised into 7 hubs

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. One Trusted Place | ✅ PASS | All 13 existing routes are preserved and reachable within hubs |
| II. Navigation from Principle | ✅ PASS | This feature implements Principle II directly |
| III. Interaction Redesigned | ✅ PASS | Capture redesign (no required fields, auto-routing) addresses this |
| IV. AI Does Work | ✅ PASS (partial) | Home surface surfaces AI next action; full agent layer is Phase 2 |
| V. Progress Visible | ✅ PASS | North star moved to home surface; must be user-configurable (not hardcoded) |
| VI. Build and Use Simultaneously | ✅ PASS | Navigation is usable on day 1; spec includes quickstart verification |
| VII. Multi-User Personalization | ⚠️ PRE-EXISTING VIOLATION — MUST FIX | HomePage hardcodes "Kyrgyzstan" and "€1,000/mo". Plan addresses this: north star reads from Profile API |
| VIII. Bilingual Docs (inline) | ✅ PASS | Implementation gate — all new files get `[AR]/[EN]` header comments |
| IX. File Size Discipline | ⚠️ PRE-EXISTING VIOLATION — MUST FIX | HomePage.tsx is 1020 lines. Plan addresses this: split into 6 sub-components (see research.md Decision 6) |
| X. Arabic Interface | ✅ DEFERRED | No gates active until Principle X is activated |

**Gate result: PASS with 2 pre-existing violations that this plan resolves.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-navigation-redesign/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── capture-api.md
│   └── navigation-structure.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
backend/
├── analytics/
│   ├── models.py          ← add domain_hint field to Idea model
│   ├── views.py           ← update create endpoint; add suggest-domain endpoint
│   └── urls.py            ← add suggest-domain route
├── profile/
│   ├── models.py          ← add north_star_* fields if missing
│   ├── serializers/       ← add NorthStarSerializer
│   └── views/             ← add north_star endpoint
└── health/migrations/
    ├── XXXX_add_domain_hint_to_idea.py
    └── XXXX_add_north_star_fields_to_profile.py

frontend/src/
├── components/
│   ├── AppShell.tsx           ← rebuild sidebar: 5 groups → 7 flat hubs
│   ├── QuickCaptureModal.tsx  ← remove required field; add domain suggestion
│   └── home/                  ← NEW directory for home sub-components
│       ├── HomeNowSection.tsx
│       ├── HomePrioritiesSection.tsx
│       ├── HomeNorthStarSection.tsx
│       ├── HomeStatusSection.tsx
│       └── HomeAISection.tsx
├── pages/
│   └── HomePage.tsx           ← refactor to orchestrator only (<300 lines)
├── lib/
│   └── api.ts                 ← add suggestDomain(), getNorthStar() calls
└── AppRoutes.tsx              ← add hub layout routes (React Router layout pattern)
```

**Structure Decision**: Web application (Option 2). Backend follows existing Django app structure. Frontend follows existing pages/components split. New `frontend/src/components/home/` directory created for HomePage sub-components to enforce file size limits.

---

## Complexity Tracking

| Principle | Pre-existing violation | Resolution in this plan |
|-----------|----------------------|------------------------|
| Principle IX (file size) | HomePage.tsx at 1020 lines | Split into 6 files under 300 lines each |
| Principle VII (multi-user) | Hardcoded "Kyrgyzstan" / "€1,000/mo" in UI | Read from Profile API north star fields |
