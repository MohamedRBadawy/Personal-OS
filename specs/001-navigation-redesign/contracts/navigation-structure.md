# Contract: Navigation Structure

**Feature**: Navigation & Interaction Redesign
**Date**: 2026-04-20

---

## Hub Definition

This contract defines the canonical structure of the 7 navigation hubs. It is the source of truth for the frontend router config and the sidebar component.

```
Hub ID       | Label          | Layer      | Default Route  | Sub-routes
-------------|----------------|------------|----------------|------------------------------------------
now          | Now            | execution  | /              | /, /focus, /daily, /schedule
goals        | Goals          | direction  | /goals         | /goals
build        | Build          | execution  | /business      | /business
life         | Life           | awareness  | /health        | /health, /finance, /journal
learn        | Learn          | direction  | /learn         | /learn
intelligence | Intelligence   | awareness  | /analytics     | /analytics, /data-bridge
profile      | Profile        | direction  | /profile       | /profile, /contacts
```

---

## Layer Visual Contract

Each layer MUST be visually distinguishable in the sidebar. The implementation MAY use color, icon style, or grouping — but the three layers MUST be perceptible at a glance.

| Layer | Semantic meaning | Example visual treatment |
|-------|-----------------|--------------------------|
| `execution` | Do — action-oriented | Solid/bold icon |
| `awareness` | See — status-oriented | Outlined icon |
| `direction` | Plan — goal-oriented | Directional icon (arrow or compass) |

---

## Active State Contract

- Exactly one hub is "active" at any time
- The active hub is determined by the current URL — if the URL matches any sub-route of a hub, that hub is active
- The active hub MUST be visually distinct from inactive hubs
- If the URL does not match any hub's sub-routes, no hub is active (e.g., 404 state)

---

## Legacy Redirect Contract

All legacy redirects MUST continue to function. The navigation redesign does not remove any existing URLs — it only changes how they are presented in the sidebar.

```
/about       → /profile
/life-plan   → /profile
/pipeline    → /business
/marketing   → /business
/routine     → /schedule
/habits      → /health
/mood        → /health
/spiritual   → /health
/learning    → /learn
/ideas       → /learn
```

---

## Hub Layout Contract

Each hub route renders using a shared layout:
- **Sidebar** (persistent, same on all pages)
- **Hub content area** (changes per hub)
- **Capture trigger** (FAB + keyboard shortcut — present on all pages)

The hub content area MAY render sub-navigation tabs if the hub has multiple sub-routes (e.g., Life hub has health/finance/journal tabs).

---

## Capture Trigger Contract

The capture trigger MUST be available on every page, regardless of which hub is active.

| Trigger | Requirement |
|---------|-------------|
| FAB (💡 button) | Visible at all times, fixed position, does not obscure primary content |
| `Ctrl+Shift+I` | Works on every page, regardless of focus state |
| Escape | Closes the capture modal if open |

The capture modal MUST render above all other content (z-index / portal).
