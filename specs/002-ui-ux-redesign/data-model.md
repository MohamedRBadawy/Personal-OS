# Data Model: UI/UX Redesign — Thinking Partner Interface

**Feature**: specs/002-ui-ux-redesign/spec.md
**Date**: 2026-04-21

---

## Overview

This feature is frontend-dominant. The entities below are primarily conceptual — they map to CSS files, TypeScript types, and component contracts rather than new database tables. The one database entity is `ThemePreference`, added as a single field on the existing `UserProfile` model.

---

## DesignToken

A named visual value that all components reference by name rather than raw value. Implemented as CSS custom properties in `tokens.css` and `theme.css`.

| Property | Type | Notes |
|----------|------|-------|
| name | string | CSS custom property (e.g., `--color-accent`, `--space-4`) |
| tier | `'primitive' \| 'semantic' \| 'component'` | Layer in the three-tier system |
| value | string | Raw value (primitive) or `var(--other-token)` reference (semantic/component) |
| domain | `'color' \| 'spacing' \| 'typography' \| 'radius' \| 'shadow'` | Token category |
| dark_override | string? | Value in dark mode (semantic tokens only; primitives never change) |
| light_override | string? | Value in light mode (semantic tokens only) |

**Tier rules**:
- Primitive tokens: raw values only, no references
- Semantic tokens: MUST reference primitives; have dark/light overrides
- Component tokens: MUST reference semantic tokens, not primitives

**State transitions**: Tokens have no runtime state. Theme switching changes which CSS rule block applies (`[data-theme="dark"]` vs `[data-theme="light"]`), not the token values themselves.

---

## InteractionPattern

The defined rule for how a category of content reveals its detail. Implemented as a TypeScript type contract and enforced via code review.

| Property | Type | Notes |
|----------|------|-------|
| type | `'expand-in-place' \| 'side-panel' \| 'focused-view'` | One of three defined patterns |
| trigger | `'click' \| 'tap'` | User gesture that activates the pattern |
| content_category | string | What type of content maps to this pattern |
| context_preserved | boolean | Whether surrounding UI remains visible and interactive |
| reversible | boolean | Whether user can return to previous state without navigation |
| persistence | `'none' \| 'localStorage' \| 'searchParams' \| 'route'` | How state is preserved |

**Pattern assignments**:

| Content Type | Pattern | Persistence |
|-------------|---------|------------|
| Habit log entries | expand-in-place | localStorage (via CollapsibleSection) |
| Routine block details | expand-in-place | localStorage |
| Section headers (any page) | expand-in-place | localStorage |
| Goal detail + sub-goals | side-panel | searchParams (`?panel=goal&id=`) |
| Contact detail | side-panel | searchParams |
| Pipeline opportunity | side-panel | searchParams |
| Journal entry editor | focused-view | route |
| Goal planning breakdown | focused-view | route |
| Weekly review | focused-view | route (modal overlay) |

---

## Surface

A visual layer in the depth system. Implemented as CSS token groups in `tokens.css`.

| Property | Type | Notes |
|----------|------|-------|
| name | `'base' \| 'raised' \| 'overlay'` | Surface tier |
| background_token | string | CSS token: `--color-bg-base`, `--color-bg-raised`, `--color-bg-overlay` |
| border_token | string | CSS token: `--color-border` or `--color-border-strong` |
| shadow_token | string? | CSS token: `--shadow-raised`, `--shadow-elevated`, `--shadow-overlay` |
| z_index | number | 0 (base) / 1 (raised) / 100 (overlay) |

**Surface hierarchy**:
- `base`: Full-width page background — lowest z-level, never has shadow
- `raised`: Cards, list rows, panels — sits above base; subtle shadow or border
- `overlay`: Side panels, modals, drawers — highest z-level; pronounced shadow; blocks base interaction

---

## ViewState

The combination of what is expanded, collapsed, or focused for a given user session. Implemented via `CollapsibleSection.storageKey` in localStorage.

| Property | Type | Notes |
|----------|------|-------|
| section_key | string | Matches `storageKey` prop on `CollapsibleSection` component |
| is_expanded | boolean | Current expansion state |
| user_id | string | User identifier for multi-user isolation |

**localStorage key pattern**: `section__{user_id}__{section_key}`

**State transitions**:
- Collapsed → Expanded: user clicks section header
- Expanded → Collapsed: user clicks section header again
- Page unload: state written to localStorage automatically by CollapsibleSection
- Page load: state read from localStorage; component renders in saved state

**Default states** (first visit or cleared storage):
- Home page sections: follow time-of-day rules (FR-004)
- All other pages: primary section expanded; secondary sections collapsed

---

## ThemePreference *(Database entity)*

The only new database field introduced by this feature. Added to the existing `UserProfile` model.

| Field | Django type | Default | Validation |
|-------|------------|---------|-----------|
| theme_preference | `CharField(max_length=10)` | `'system'` | One of: `'light'`, `'dark'`, `'system'` |

**Persistence strategy**:
- **Primary**: `localStorage['theme']` — read before first paint; prevents FOSC; no API call
- **Secondary**: `UserProfile.theme_preference` — synced on user change; used to restore preference on new devices

**Read path** (page load):
1. Blocking script reads `localStorage['theme']`
2. Sets `data-theme` attribute before first paint
3. On app mount, `ThemeToggle` reads current value from DOM and syncs state

**Write path** (user toggles theme):
1. `ThemeToggle` updates `data-theme` on `<html>` immediately
2. Writes to `localStorage['theme']`
3. Fires async `PATCH /api/profile/me/` to sync `theme_preference` (fire-and-forget)

**Migration**: `backend/profile/migrations/0003_add_theme_preference.py`
