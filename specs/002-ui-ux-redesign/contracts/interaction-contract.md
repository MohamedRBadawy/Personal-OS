# UI Contract: Interaction Patterns

**Feature**: specs/002-ui-ux-redesign
**Date**: 2026-04-21

---

## Purpose

This contract defines the three interaction patterns that ALL interactive elements in the app must follow. Every element maps to exactly one pattern. Patterns are never mixed for the same element type.

---

## Pattern 1: Expand-In-Place

**When to use**: Simple status changes, inline logging, quick metadata edits, section reveal

**Trigger**: Single click/tap on the row or section header

**Animation**: Height/opacity transition, max 200ms ease-out; no layout shift outside the expanded area

**Context**: Parent list/view fully visible and interactive throughout

**Reversible**: Yes — same click/tap collapses; state persists to localStorage

**Implementation**: `CollapsibleSection` component with `storageKey` prop

**Qualifying content types**:
- Section headers on any page (home, health, finance)
- Habit log entries
- Routine block details
- Quick capture chips / idea cards
- Inline task detail

**Must NOT use expand-in-place for**:
- Content requiring a form with 3+ fields → use side panel
- Content benefiting from side-by-side reference → use side panel
- Deep work (journaling, planning, writing) → use focused view
- Any entity with rich associated data (contacts, goals with sub-goals) → use side panel

---

## Pattern 2: Side Panel

**When to use**: Viewing and editing a single entity with full context while keeping list visible

**Trigger**: Click/tap on entity name or dedicated expand affordance (→ icon)

**Animation**: Slide in from right, 250ms ease-out cubic-bezier; base layer dims slightly (overlay: 20% opacity)

**Context**: Parent list remains visible to the left (~55–60% of viewport width on desktop)

**Reversible**: Yes — Escape key, backdrop click, or ✕ button; browser history NOT changed

**URL pattern**: `?panel=<type>&id=<id>` via React Router `useSearchParams`; panel closes if params removed

**Width**: 400–480px fixed on desktop; full-screen on widths < 768px

**Implementation**: Generic `SidePanel` component (extends `NodeSidePanel` pattern); discriminated union on `type` prop

**Qualifying content types**:
- Goal detail + sub-goals + dependencies
- Contact detail + follow-up history + notes
- Pipeline opportunity + status + next actions
- Finance account / income source detail

**Must NOT use side panel for**:
- Simple toggles (use expand-in-place)
- Actions requiring full focus / multi-step flow (use focused view)
- Content with no entity identity (anonymous list items)

---

## Pattern 3: Focused View

**When to use**: Deep work requiring full attention — writing, planning, detailed review

**Trigger**: Explicit dedicated action button (not row click); e.g., "Open editor", "Plan", "Review"

**Animation**: Page-level transition; sidebar collapses or minimizes; breadcrumb back control appears

**Context**: Surrounding navigation minimized; only relevant context visible; no distraction

**Reversible**: Yes — browser Back, Escape, or breadcrumb; parent scroll position restored via sessionStorage

**Implementation**: React Router route change; scroll restoration via `useScrollRestoration` or sessionStorage

**Qualifying content types**:
- Journal entry editor (full writing surface)
- Goal planning breakdown editor
- Weekly review (4-step modal flow)
- Any multi-step form requiring sequential decision-making

**Must NOT use focused view for**:
- Simple data display (use side panel)
- Quick logging or status changes (use expand-in-place)
- Browsing/listing (stays in main view)

---

## Selection Guide

| Question | If Yes → Pattern |
|----------|-----------------|
| Is this a simple toggle, status change, or section reveal? | Expand-in-place |
| Does the user need to compare with the list while working? | Side panel |
| Is this a single entity with associated data (goals, contacts)? | Side panel |
| Does this require full attention / multiple sequential steps? | Focused view |
| Is this a writing or planning task? | Focused view |

---

## Keyboard Behavior Contract

| Pattern | Key | Action |
|---------|-----|--------|
| Expand-in-place | Enter / Space | Toggle on focused row header |
| Expand-in-place | Escape | Collapse if expanded |
| Side panel | Escape | Close panel, return focus to triggering element |
| Side panel | Tab | Trap focus inside panel while open |
| Focused view | Escape | Return to parent (if no unsaved changes) |
| Focused view | Ctrl+S | Save without leaving |

---

## Consistency Enforcement

Any code review that introduces a new interactive element MUST identify its pattern in the PR description. If the element doesn't fit the three patterns above cleanly, the pattern contract should be updated before implementation, not worked around.
