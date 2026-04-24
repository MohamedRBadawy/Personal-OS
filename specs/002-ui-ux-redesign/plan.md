# Implementation Plan: UI/UX Redesign — Thinking Partner Interface

**Branch**: `002-ui-ux-redesign` | **Date**: 2026-04-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-ui-ux-redesign/spec.md`

## Summary

A complete visual and interaction rethink of the Personal OS frontend — establishing a three-tier CSS design token system, FOSC-free dark/light mode switching, progressive disclosure layouts, a time-aware home surface, and a consistent three-pattern interaction model (expand-in-place / side panel / focused view). Backend change is minimal: one theme preference field on UserProfile.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend) / Python 3.12 (backend)
**Primary Dependencies**: React 19, TanStack Query 5, React Router 6, Vite 5, Django REST Framework
**Storage**: PostgreSQL (Neon) — theme preference persistence only; all other view state in localStorage
**Testing**: Vitest + Testing Library (frontend), Django test runner (backend)
**Target Platform**: Web browser, desktop-first; responsive to mobile widths ≥768px
**Project Type**: Web application (React SPA + Django API)
**Performance Goals**: Theme switch < 1 second; no FOSC; page interactions < 100ms perceived
**Constraints**: No new npm packages without justification; no third-party design system library; CSS custom properties only; Render free-tier deployment must remain stable
**Scale/Scope**: ~16 pages / hub routes, ~60–80 CSS token definitions, ~10 component updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | One Trusted Place | ✅ PASS | Redesign improves existing domains; no new domains or gaps created |
| II | Navigation from Principle | ✅ PASS | Works within existing 7-hub structure; no new top-level pages |
| III | Interaction Redesigned Holistically | ✅ PASS | This feature IS the holistic interaction redesign (FR-005–FR-008) |
| IV | AI Does Work | ✅ PASS | Home surface redesign improves AI next-action visibility (FR-012); no regression |
| V | Progress Always Visible | ✅ PASS | North star remains on home surface; visual hierarchy improved |
| VI | Build and Use Simultaneously | ✅ PASS | Token system + home surface usable on day one; phased delivery works |
| VII | Multi-User Personalization | ✅ PASS | All tokens user-agnostic; theme pref stored per user in profile |
| VIII | Bilingual Comments | ⚠ GATE | Every new file MUST have `[AR]`/`[EN]` header block before PR |
| IX | File Size Discipline | ⚠ GATE | CSS files ≤300 lines; components ≤300 lines — split tokens.css by domain if needed |
| X | Arabic/RTL | ✅ N/A | Deferred — not active for this feature |

**Gate violations**: None blocking. Gates VIII and IX are procedural requirements on every file.

**Post-design re-check**: Token contract enforces no hardcoded values (Principle VII ✅). Three-pattern interaction model satisfies Principle III ✅. File size: `tokens.css` may approach 300 lines — split into `tokens/colors.css`, `tokens/spacing.css`, `tokens/typography.css` if needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-ux-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── token-contract.md
│   └── interaction-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/src/
├── styles/
│   ├── tokens.css              # NEW: primitive + semantic design token definitions
│   ├── theme.css               # NEW: component-level tokens + dark/light overrides
│   ├── global.css              # MODIFIED: import tokens; replace raw values with vars
│   ├── hubs.css                # MODIFIED: consume tokens
│   ├── health.css              # MODIFIED: consume tokens
│   └── [domain].css            # MODIFIED per domain: consume tokens
├── components/
│   ├── ThemeToggle.tsx         # NEW: dark/light switch button
│   ├── SidePanel.tsx           # NEW: generic side panel (extends NodeSidePanel pattern)
│   └── CollapsibleSection.tsx  # EXISTING: solid pattern; minor token update only
├── lib/
│   ├── theme.ts                # NEW: theme detection, FOSC prevention, localStorage utils
│   └── api.ts                  # MODIFIED: add theme preference sync endpoint call
└── pages/
    ├── HomePage.tsx            # MODIFIED: time-of-day primary content, progressive disclosure
    └── [all pages]             # MODIFIED: consume tokens, apply progressive disclosure

public/
└── index.html                  # MODIFIED: blocking theme script in <head> for FOSC prevention

backend/
└── profile/
    ├── models.py               # MODIFIED: add theme_preference field to UserProfile
    ├── serializers.py          # MODIFIED: expose theme_preference in UserProfileSerializer
    └── migrations/
        └── 0003_add_theme_preference.py  # NEW
```

**Structure Decision**: Frontend-heavy redesign. Backend change is a single profile field. All design system work lives under `frontend/src/styles/` with token files split by category if any approaches 300 lines.

## Complexity Tracking

No constitution violations requiring justification.
