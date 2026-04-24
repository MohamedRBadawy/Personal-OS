# Feature Specification: UI/UX Redesign — Thinking Partner Interface

**Feature Branch**: `002-ui-ux-redesign`
**Created**: 2026-04-21
**Status**: Draft

## Overview

The Personal OS currently suffers from three compounding problems: too much information visible at once, no sense of personal identity in the visual design, and no guidance on what to do next. Users feel overwhelmed before they've done anything.

This redesign transforms the experience into a **thinking partner** — an interface that reflects the user's mind back clearly, shows only what is relevant to the current moment, and quietly surfaces the next right action. It is not a feature addition; it is a complete visual and interaction rethink of every surface in the app.

---

## User Scenarios & Testing

### User Story 1 — Visual Design System (Priority: P1)

The app has a coherent visual language that feels intelligent, structured, and personal. Opening it for the first time — or after switching modes — feels intentional. Colors, spacing, and type work together. Nothing looks generic.

**Why this priority**: Every other story depends on this foundation. Without a defined visual language, individual improvements will feel inconsistent. This is the base layer everything else inherits.

**Independent Test**: Open the app in both dark and light mode. Every page uses the same spacing scale, color tokens, and type hierarchy. No surface looks out of place. A user unfamiliar with the app can tell it was designed with intention.

**Acceptance Scenarios**:

1. **Given** the user opens the app in dark mode, **When** they navigate across any page, **Then** all surfaces use the same background depth system (base / raised / overlay) with no inconsistent colors.
2. **Given** the user switches to light mode, **When** they navigate, **Then** all colors adapt correctly — no dark-mode artifacts, no broken contrast, no unreadable text.
3. **Given** any page in the app, **When** a user looks at it, **Then** the visual hierarchy is immediately clear: primary action, secondary content, and supporting detail are visually distinct without reading the words.

---

### User Story 2 — Progressive Disclosure Layout (Priority: P2)

Each view shows only what is relevant to the current context. The user is never asked to scroll past irrelevant sections to find what they need. Detail is revealed on demand — by expanding, drilling down, or opening a side panel — not by default.

**Why this priority**: This directly solves the most painful problem: feeling overwhelmed before doing anything. A focused view changes the entire experience of opening the app.

**Independent Test**: Open any major page. Count the number of visible sections without interaction. Every visible section should be directly relevant to the page's primary purpose. Nothing that requires a secondary action to use is shown by default in an expanded state.

**Acceptance Scenarios**:

1. **Given** the user opens the home page, **When** they view it without interaction, **Then** they see only the most relevant content for the current time of day — not every possible section expanded simultaneously.
2. **Given** a page with multiple sections, **When** the user wants more detail on one item, **Then** they can expand it inline, open a side panel, or drill into a focused view — without losing their place in the parent view.
3. **Given** the user is on a focused drill-down view, **When** they finish, **Then** they return to exactly where they were in the parent view, with no lost context.
4. **Given** any expanded section, **When** the user collapses it, **Then** the system remembers this preference for the next visit.

---

### User Story 3 — Guided Home Surface (Priority: P3)

The home surface actively tells the user what to do next. It does not present everything and leave the user to figure it out. It surfaces the single most important thing based on the current time of day, active priorities, and recent context — and everything else is subordinate to that.

**Why this priority**: The current home page presents 10+ sections simultaneously. The redesigned home should be opinionated: it knows what matters right now and leads with it.

**Independent Test**: Open the home page at three different times of day (morning, afternoon, evening). The primary content visible without scrolling is different each time and directly reflects what is most useful at that moment.

**Acceptance Scenarios**:

1. **Given** the user opens the app in the morning, **When** they view the home surface, **Then** the primary visible content is the day's priorities and routine context — not finance or analytics.
2. **Given** there is a clear "next action" available, **When** the user views the home surface, **Then** it is the most visually prominent element — not buried below status cards or North Star progress.
3. **Given** the user has completed their morning check-in, **When** they view the home surface, **Then** the check-in nudge is no longer shown — the surface updates to reflect current state.

---

### User Story 4 — Contextual Interaction Patterns (Priority: P4)

Every interaction in the app follows a consistent set of patterns. Simple things expand in place. List items that need more context open a side panel. Deep work opens a focused full-page view. The pattern is predictable — users learn it once and it works everywhere.

**Why this priority**: Inconsistent interactions (some things open modals, some navigate, some expand) create cognitive load. A consistent pattern removes decision-making from navigation.

**Independent Test**: Interact with 10 different elements across the app. Predict before clicking whether something will expand, open a panel, or navigate. Prediction accuracy should be above 80% after 5 minutes of use.

**Acceptance Scenarios**:

1. **Given** a list item with simple metadata (e.g., a habit log, a routine block), **When** the user taps/clicks it, **Then** it expands inline to reveal actions and detail — no navigation occurs.
2. **Given** a goal, contact, or business opportunity, **When** the user taps/clicks it, **Then** a side panel slides in from the right showing full detail — the list behind it remains visible.
3. **Given** any action that requires focused attention (writing a journal entry, planning a goal), **When** the user initiates it, **Then** it opens a full focused view that removes surrounding navigation and distractions.
4. **Given** any side panel or drill-down view, **When** the user presses Escape or the back control, **Then** they return to the previous state without page reload or lost scroll position.

---

### Edge Cases

- What happens when the user has no active priorities — does the home surface show a useful empty state or just blank space?
- How does progressive disclosure behave on a small screen (mobile width) where side panels may not fit?
- When switching between dark and light mode mid-session, do open panels and expanded states persist or reset?
- What happens to components that currently rely on inline color styles that don't respect the design token system?

---

## Requirements

### Functional Requirements

- **FR-001**: The app MUST have a defined set of design tokens — color, spacing, typography scale, border radius, shadow depth — that all components inherit from. No component may use hardcoded visual values.
- **FR-002**: The app MUST support dark and light modes that switch without page reload and persist across sessions.
- **FR-003**: Every page MUST follow the progressive disclosure principle: only content directly relevant to the page's primary purpose is visible by default.
- **FR-004**: The home surface MUST adapt its primary visible content based on time of day: morning (05:00–11:59), afternoon (12:00–17:59), evening (18:00–04:59).
- **FR-005**: Every interactive element MUST follow one of three defined interaction patterns: expand-in-place, side panel, or full focused view. The pattern is determined by the complexity and depth of the content.
- **FR-006**: Expand-in-place interactions MUST be used for simple status changes, inline logging, and quick metadata edits.
- **FR-007**: Side panel interactions MUST be used for viewing and editing a single entity (goal, contact, opportunity) while keeping the list context visible.
- **FR-008**: Full focused view MUST be used for deep work actions: writing, planning, reviewing.
- **FR-009**: The app MUST remember collapsed/expanded states per section per user session and restore them on return.
- **FR-010**: All text in the app MUST meet a minimum contrast ratio that ensures readability in both dark and light modes across all surfaces.
- **FR-011**: The visual hierarchy on every page MUST communicate primary action, secondary content, and supporting detail without requiring the user to read all text first.
- **FR-012**: The home surface MUST surface a single "most important next action" as the primary visual element when one is available.

### Key Entities

- **Design Token**: A named, reusable visual value (color, spacing unit, type size) that components reference by name rather than raw value. Enables consistent theming and mode switching.
- **Interaction Pattern**: A defined rule for how a given category of content reveals detail — expand-in-place, side panel, or focused view. Every element in the app maps to exactly one pattern.
- **Surface**: A visual layer in the depth system — base (page background), raised (cards, panels), overlay (modals, drawers). Each has a defined background and border treatment per mode.
- **View State**: The combination of what is expanded, collapsed, or focused for a given user session. Persisted and restored on return.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A new user can identify the most important action on the home surface within 10 seconds of opening the app — without reading instructions.
- **SC-002**: The number of visible sections on any page without user interaction is 3 or fewer for the primary content area.
- **SC-003**: Switching between dark and light mode takes under 1 second with no flash of unstyled content.
- **SC-004**: After 5 minutes of use, a user can correctly predict the interaction pattern (expand / side panel / focused view) for a new element they haven't interacted with before, at least 80% of the time.
- **SC-005**: The home surface shows materially different primary content when opened at morning vs evening — verified by opening at two different times.
- **SC-006**: Zero pages in the app require scrolling past irrelevant content to reach the page's primary function.
- **SC-007**: All text across the app passes readability requirements in both dark and light modes.

---

## Assumptions

- The redesign applies to the web app (desktop-first). Mobile layout improvements are in scope but not the primary target.
- Voice input is explicitly out of scope for this redesign.
- The Arabic/RTL interface is explicitly out of scope for this redesign (deferred per constitution).
- Existing backend APIs and data models are not changing as part of this redesign — this is a front-end and design system effort.
- The current 7-hub navigation structure (from Phase 1) is kept — this redesign works within that structure, not replacing it.
- Typography selection is part of the planning phase — a specific typeface will be chosen during technical design, not in this spec.
- The design system will be implemented as CSS custom properties (tokens) that all components consume — no third-party design system library will be introduced.
