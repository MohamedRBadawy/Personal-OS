# Feature Specification: Navigation & Interaction Redesign

**Feature Branch**: `001-navigation-redesign`
**Created**: 2026-04-20
**Status**: Draft
**Input**: Phase 1 from roadmap.md — collapse 35+ pages into 5–7 hubs, rebuild navigation shell, redesign capture model

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Find anything in under 10 seconds (Priority: P1)

A user opens the app and can reach any domain — goals, health, finance, business, learning — without hunting through menus or remembering which of 35+ pages holds what they need. Navigation is built around three questions: *What should I do right now? How am I doing? What do I want?* — and the structure answers those questions visually.

**Why this priority**: Navigation is the root cause of every other friction in the app. If the user cannot find where things live, every other feature becomes less usable. This is the foundation everything else is built on.

**Independent Test**: Can be fully tested by launching the app and attempting to navigate to any feature from any starting point. Delivers value immediately — users can use the app without a map.

**Acceptance Scenarios**:

1. **Given** a user is on any page, **When** they look at the navigation, **Then** they see exactly 5–7 top-level hubs with clear, descriptive labels and can reach their destination in one click
2. **Given** a user wants to log a health entry, **When** they look at the navigation, **Then** they find it inside the Life hub — not as a separate top-level page
3. **Given** a user navigates to a hub, **When** they arrive, **Then** sub-sections within that hub are visible as tabs or drill-downs — not as additional top-level items
4. **Given** there are 35+ existing pages, **When** navigation redesign is complete, **Then** every page has a home inside one of the hubs — nothing is unreachable and nothing is top-level that should not be

---

### User Story 2 — Home surface shows what matters right now (Priority: P2)

A user opens the app and sees a home surface that reflects the current moment: the time of day, what is active, what is overdue, and what the most important next action is — without the user having to configure or navigate to find it.

**Why this priority**: The home surface is seen every time the user opens the app. If it does not surface relevant information proactively, users must hunt for it — which defeats the purpose of a personal operating system.

**Independent Test**: Open the app at different times of day (morning, afternoon, evening) and verify the home surface shows different, contextually relevant content each time.

**Acceptance Scenarios**:

1. **Given** a user opens the app in the morning, **When** the home surface loads, **Then** it shows today's priorities, the current or upcoming schedule block, and the most important active goal
2. **Given** a user opens the app in the evening, **When** the home surface loads, **Then** it reflects an end-of-day focus (review, journal, close out) rather than the morning's execution focus
3. **Given** a user has active habits or tasks due today, **When** they view the home surface, **Then** those items are visible without navigating to a separate page
4. **Given** a user has no tasks or habits configured, **When** the home surface loads, **Then** it still shows meaningful content (schedule, north star progress) — not a blank or empty state

---

### User Story 3 — Capture anything in one gesture, from anywhere (Priority: P3)

A user can capture any thought, idea, task, habit log, or note from any screen in the app using a single consistent action. The system routes the capture to the correct domain automatically — the user does not need to navigate first or fill required fields.

**Why this priority**: Capture is the entry point for all information in the system. If capture requires navigation, required fields, or context-switching, users stop capturing — and the system becomes incomplete.

**Independent Test**: From the Goals page, Finance page, and home page — perform a capture without navigating away. Verify the capture is routed correctly and appears in the right domain.

**Acceptance Scenarios**:

1. **Given** a user is on any page, **When** they trigger the capture action (button or keyboard shortcut), **Then** the capture interface opens immediately without leaving the current page
2. **Given** a user types a thought without specifying a category, **When** they submit the capture, **Then** the system auto-routes it to a suggested domain — the user can confirm or override
3. **Given** a user opens the capture interface, **When** it appears, **Then** there are no required fields — the user can submit with just a single line of text
4. **Given** a user captures something, **When** it is submitted, **Then** they can continue using the app immediately — the capture does not block or interrupt the current flow

---

### Edge Cases

- What happens when a user is offline and triggers a capture?
- How does the system route a capture that could belong to multiple domains (e.g., "Call Ahmed about the business proposal" — contacts? pipeline? tasks?)?
- What happens when a user resizes the window while the capture interface is open?
- How does the home surface behave on the first use, before any data exists?
- What happens if a hub has no data yet — does it show an empty state or is it hidden?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST have exactly 5–7 top-level navigation destinations (hubs). No more. No exceptions until a navigation redesign is explicitly re-specced.
- **FR-002**: Every existing page MUST be reachable within one of the 7 hubs as a tab, sub-page, or drill-down.
- **FR-003**: Each hub MUST visually communicate which of the three layers it belongs to: Execution (do), Awareness (see), or Direction (plan).
- **FR-004**: The home surface MUST change its content based on the time of day — at minimum, morning (05:00–12:00), afternoon (12:00–17:00), and evening (17:00–23:00) states.
- **FR-005**: The home surface MUST surface the user's most important active goal and its next action without requiring navigation.
- **FR-006**: A capture action MUST be available from every screen in the app — accessible by both a visible UI element and a keyboard shortcut.
- **FR-007**: The capture interface MUST require zero mandatory fields — a single line of text is sufficient to submit.
- **FR-008**: The capture system MUST auto-suggest a domain for every submitted capture. The user MAY override the suggestion.
- **FR-009**: The navigation shell (sidebar or top bar) MUST be consistent across all pages — the user always knows where they are and how to get back.
- **FR-010**: The north star progress (user-defined goal target vs. current value) MUST be visible on the home surface — not buried in a sub-page.

### Hub Structure (to be validated in planning)

| Hub | Layer | Purpose |
|-----|-------|---------|
| **Now** | Execution | Today's schedule, priorities, inline logging, active tasks |
| **Goals** | Direction | Goal hierarchy, life plan, north star milestone |
| **Build** | Execution | Business development, pipeline, outreach, proposals |
| **Life** | Awareness | Health, routine, finance, family, journal |
| **Learn** | Direction | Learning roadmap, resources, what to study next |
| **Intelligence** | Awareness | Agent status, analytics, patterns, weekly review |
| **Profile** | Direction | About Me, self-knowledge, contacts |

### Key Entities *(include if feature involves data)*

- **Hub**: A top-level navigation destination. Has a name, a layer (Execution / Awareness / Direction), and contains one or more sub-sections.
- **Sub-section**: A page or tab that lives inside a hub. Has a name and a parent hub. Cannot exist as a standalone top-level destination.
- **Capture**: A raw piece of input submitted by the user. Has text content, a timestamp, a suggested domain, and a confirmation state (routed / pending / overridden).
- **Home Surface State**: A configuration of what the home page shows, determined by time of day. Has a time range and a set of visible components.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can navigate from the home surface to any feature in the app in 2 clicks or fewer — verified by testing all existing features
- **SC-002**: The number of top-level navigation destinations is reduced from 35+ to 5–7
- **SC-003**: A user can complete a capture (from trigger to submission) in under 15 seconds without leaving the current page
- **SC-004**: The home surface displays contextually different content in at least 3 time-of-day states (morning / afternoon / evening)
- **SC-005**: Zero captures require more than one mandatory field to submit
- **SC-006**: After navigation redesign, 100% of existing features are reachable — no page is lost or inaccessible
- **SC-007**: The north star progress metric is visible on the home surface without any navigation

---

## Assumptions

- The 7-hub structure proposed in the roadmap is the working target. It will be validated during planning and may be adjusted (±1 hub) without requiring a spec amendment.
- Existing page content is preserved during migration — the redesign changes where things live in the navigation, not what they show.
- Keyboard shortcut for capture continues to be Ctrl+Shift+I (current shortcut). This can change during planning without requiring a spec amendment.
- "Time of day" for the home surface is determined by the user's local clock — no timezone configuration is required for this phase.
- Voice input for capture (mentioned in roadmap) is out of scope for this spec. It is a separate enhancement to the capture model.
- Mobile layout is out of scope. The navigation redesign targets the desktop web app. Telegram remains the mobile interface.
- The north star metric on the home surface reads from whatever the user has defined as their primary goal target. If no target is set, a prompt to define one is shown instead.
