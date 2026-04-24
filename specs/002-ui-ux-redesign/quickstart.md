# Quickstart: UI/UX Redesign — Integration Scenarios

**Feature**: specs/002-ui-ux-redesign
**Date**: 2026-04-21

---

## Overview

These are the acceptance scenarios from the spec translated into step-by-step testable flows. Use them to verify implementation before marking tasks complete. Each scenario maps to specific functional requirements and success criteria from the spec.

---

## Scenario 1: FOSC-Free Dark/Light Mode Switch

**Covers**: FR-002, SC-003

**Setup**: App running locally, fresh browser with no cached theme

1. Open `index.html` source — verify blocking script exists in `<head>` before any CSS or JS
2. Load app in an incognito window → verify correct theme applied with zero flash (dark if OS is dark)
3. Click `ThemeToggle` → verify `data-theme` attribute on `<html>` changes within 500ms
4. Verify no individual elements change color via JavaScript — only `data-theme` changes
5. Refresh page → verify theme persists (localStorage read by blocking script)
6. Open in new tab → verify same theme as previous tab

**Pass criteria**: Zero flash of unstyled content; switch completes in < 1 second; persists across refresh.

---

## Scenario 2: Token Compliance Audit

**Covers**: FR-001

**Setup**: Any page in the app, browser DevTools open

1. Click any element with a background color → inspect Computed Styles
2. Trace the background-color value — it MUST resolve through a CSS `var()` chain, not a raw hex/rgb
3. Repeat for: text color, border color, font-family, padding
4. Toggle theme (`data-theme` change) → verify all values update without JS re-rendering components
5. Search codebase for raw hex values in `.css` files (excluding `tokens.css`) → expect zero matches

**Pass criteria**: All visual values in component CSS reference tokens; zero raw hex/rgb in component files.

---

## Scenario 3: Dark Mode Navigation Check

**Covers**: FR-001 (Acceptance Scenario 1 from spec)

1. Open app in dark mode (`data-theme="dark"`)
2. Navigate to: Home, Goals, Health, Finance, Build, Life, Profile
3. On each page, verify: no white/light backgrounds; no dark-text-on-dark-background contrast failures; no surfaces that look "out of place" (inconsistent darkness level)

**Pass criteria**: All surfaces use the depth system (base/raised/overlay) consistently across all pages.

---

## Scenario 4: Light Mode Adaptation

**Covers**: FR-002 (Acceptance Scenario 2 from spec)

1. Switch to light mode (`data-theme="light"`)
2. Navigate across all major pages
3. Verify: no dark-mode artifacts (dark backgrounds, light text on light); no broken contrast; all text readable

**Pass criteria**: Light mode has no dark-mode artifacts; all text passes contrast requirements.

---

## Scenario 5: Progressive Disclosure — Section Count

**Covers**: FR-003, SC-002

**Setup**: Open any major page (Goals, Health, Finance, Home)

1. Count visible sections with content expanded by default (not collapsed headers)
2. Verify count ≤ 3 for primary content area
3. Click a collapsed section → verify it expands inline, no navigation
4. Collapse the section → refresh page → verify collapse state is remembered

**Pass criteria**: ≤ 3 sections expanded by default; localStorage state persists across refresh.

---

## Scenario 6: Home Surface Time-of-Day Adaptation

**Covers**: FR-004, SC-005

**Setup**: Modify system clock or mock `new Date()` in browser console

1. Set time to 06:00 (morning) → verify primary content = day priorities + routine context
2. Set time to 14:00 (afternoon) → hard-refresh → verify primary content shifts to work/execution
3. Set time to 21:00 (evening) → hard-refresh → verify primary content shifts to reflection/planning

**Pass criteria**: Primary visible content above the fold differs meaningfully across all three time bands.

---

## Scenario 7: Interaction Pattern — Expand-In-Place

**Covers**: FR-005, FR-006

**Setup**: Any page with CollapsibleSection components (Health, Home, Finance)

1. Click a section header → verify it expands inline (no navigation, no URL change)
2. Verify content above and below the expanded section remains visible and interactive
3. Click header again → verify smooth collapse
4. Verify no page scroll jump during expand/collapse

**Pass criteria**: Expansion is in-place; surrounding content stable; no navigation occurs.

---

## Scenario 8: Interaction Pattern — Side Panel

**Covers**: FR-005, FR-007

**Setup**: Goals page with at least one goal

1. Click a goal row → verify side panel slides in from the right (≤ 250ms)
2. Verify goal list remains visible and scrollable to the left
3. Verify panel is ~400–480px wide on a desktop viewport
4. Press Escape → verify panel closes; list scroll position unchanged
5. Click the same goal again → verify panel re-opens
6. Check URL → verify `?panel=goal&id=` searchParam is present while open, removed on close

**Pass criteria**: Panel doesn't navigate; list stays visible; Escape works; URL state correct.

---

## Scenario 9: Interaction Pattern — Focused View

**Covers**: FR-005, FR-008

**Setup**: Journal page

1. Click "Write entry" (focused view trigger) → verify navigation to editor route
2. Verify sidebar collapses or minimizes; primary content is the editor
3. Verify a "Back" / breadcrumb control is visible
4. Press Escape (or click Back) → verify return to journal list at same scroll position
5. Verify no data loss on back navigation if entry was auto-saved

**Pass criteria**: Full focus; navigation minimized; back works; scroll position restored.

---

## Scenario 10: Home Surface — North Star Visibility

**Covers**: SC-001

**Setup**: Fresh user with no prior interaction; north star configured in profile

1. Open home page
2. Without reading any text — using only visual weight and position — identify the "most important action"
3. Measure time to identify it (target: ≤ 10 seconds)
4. Verify it is the most visually prominent element above the fold

**Pass criteria**: Primary action identifiable within 10 seconds; it is the most prominent element.

---

## Scenario 11: Empty State Handling

**Covers**: Edge case from spec — no active priorities

**Setup**: User account with no active priority tasks

1. Open home page → verify priorities section shows a useful empty state (not blank space)
2. Verify empty state includes a clear next action ("Add your first priority →" or similar)
3. Verify the empty state does not look broken or abandoned

**Pass criteria**: No blank space; always guides the user to a next action.

---

## Scenario 12: Collapsed State Memory

**Covers**: FR-009

1. Open any page with ≥ 3 CollapsibleSection components
2. Collapse 2 sections, expand 1
3. Navigate away to a different hub
4. Return to the original page → verify exact same expanded/collapsed state
5. Refresh the browser → verify state still matches

**Pass criteria**: Collapsed/expanded state persists across navigation and page refresh.
