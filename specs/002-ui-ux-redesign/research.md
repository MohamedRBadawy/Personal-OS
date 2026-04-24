# Research: UI/UX Redesign — Thinking Partner Interface

**Feature**: specs/002-ui-ux-redesign/spec.md
**Date**: 2026-04-21

---

## Decision 1: Typography

**Decision**: Inter for body/UI text; JetBrains Mono for numeric/data display

**Rationale**: Inter is the leading open-source humanist sans-serif optimized for screen legibility at small sizes. It has excellent OpenType features — tabular numbers via `font-feature-settings: "tnum"` are critical for consistent column alignment in finance and analytics views. JetBrains Mono is purpose-built for developer-style data readability and is already a known quantity in the target user's context. Both are free, self-hostable via Google Fonts CDN, and have variable font versions to reduce HTTP requests.

**Alternatives considered**:
- **Geist (Vercel)**: Strong dark-mode presence but narrower character set; less tested outside Vercel ecosystem
- **Plus Jakarta Sans**: Excellent personality, but slightly lower screen legibility at 12–13px compared to Inter
- **IBM Plex Sans**: Solid but feels "corporate" rather than intelligent/personal
- **System font stack**: Zero load cost, but no visual personality and inconsistent cross-OS rendering

**Implementation note**: Load via Google Fonts `@import` or self-host in `public/fonts/`. Use `font-display: swap` to prevent invisible text during load. Variable font format preferred to reduce weight.

---

## Decision 2: Design Token Architecture

**Decision**: Three-tier CSS custom property system: Primitive → Semantic → Component tokens

**Rationale**: Primitive tokens define raw values (`--color-blue-600: #2563eb`). Semantic tokens apply meaning (`--color-accent: var(--color-blue-600)`). Component tokens apply context (`--button-primary-bg: var(--color-accent)`). This architecture means dark/light mode is implemented by redefining only semantic tokens — primitives stay constant, and component tokens inherit the change automatically. ~60–80 tokens total is maintainable without a build step and requires no third-party dependency.

**Alternatives considered**:
- **Single-tier (all semantic)**: Cleaner for small systems but makes it hard to audit what raw values exist or swap the palette
- **Four tiers (adding state tokens: `--button-primary-hover-bg`)**: Overkill at this scale; hover states handled inline in component CSS
- **CSS-in-JS or Tailwind config**: Violates constitution assumption that no third-party design system is introduced; adds build complexity and a learning curve

**Token count estimate**:
- Primitive colors: ~20 (grays ×8, brand, status ×4, accent ×3)
- Semantic colors: ~15 (background layers ×3, text hierarchy ×3, borders ×2, accent ×2, status ×3, focus)
- Spacing: 8 tokens (4px base unit: 4/8/12/16/24/32/48/64)
- Typography: 10 tokens (6 size steps, 3 weights, 2 line-height)
- Border radius: 4 tokens (sm/md/lg/full)
- Shadow/depth: 3 tokens (raised/elevated/overlay)
- Component tokens: ~20 (buttons, inputs, cards, nav)

---

## Decision 3: Dark/Light Mode Switching

**Decision**: `data-theme="dark"|"light"` attribute on `<html>`, with a blocking inline script in `<head>` that reads localStorage and sets the attribute before first paint

**Rationale**: `prefers-color-scheme` media query alone cannot support manual user override. The blocking script (≤500 bytes, inline) runs synchronously before the browser paints anything, completely eliminating FOSC. State is persisted in `localStorage` keyed per user ID for multi-user support. The backend (`UserProfile.theme_preference`) is a secondary sync target — used to restore preference on a new device, not as the primary read path.

**Alternatives considered**:
- **`prefers-color-scheme` only**: Cannot support manual override; no persistence of user choice
- **`class="dark"` on `<body>`**: Same technical outcome but `data-theme` on `<html>` is semantically clearer and doesn't interfere with className-based component logic
- **Backend-only persistence**: Introduces async delay and a FOSC risk on page load; localStorage must be the primary source of truth
- **CSS filter trick**: Not a real theme switch; breaks image rendering and SVG colors

**FOSC prevention script** (inline in `<head>`, ~200 bytes):
```javascript
(function(){
  var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.setAttribute('data-theme',t);
})();
```

---

## Decision 4: Progressive Disclosure Implementation

**Decision**: Extend the existing `CollapsibleSection` component as the primary collapse/expand primitive; add a generic `SidePanel` portal component extending the `NodeSidePanel` pattern; use existing React Router routes for focused views

**Rationale**: `CollapsibleSection` already uses `localStorage` persistence via its `storageKey` prop — this exactly satisfies FR-009 with no new work. The existing `NodeSidePanel` in `GoalsPage` is already portal-based and searchParams-driven (`?node=<id>`). Extending it to a generic `SidePanel` via a discriminated union (`type: 'node'|'goal'|'contact'|'opportunity'`) is the path of least resistance. No new architectural pattern needed — the foundations already exist.

**Alternatives considered**:
- **Dialog/modal for entity detail**: Violates FR-007 requirement that list context remains visible behind the panel
- **Parallel Routes (Next.js style)**: Overkill for this SPA; the searchParams approach is simpler and already works
- **Third-party drawer/sheet library**: Unnecessary dependency; existing pattern is sufficient and consistent

---

## Decision 5: Home Surface Time Awareness

**Decision**: `getHomeState()` utility (already built in `frontend/src/components/home/homeState.ts`) returns `'morning'|'afternoon'|'evening'` based on client-side `new Date().getHours()`. Home page conditionally renders primary sections based on this state.

**Rationale**: No backend logic needed. Time zone is the user's local browser time, which is the correct behavior. State is computed fresh on each render. This satisfies FR-004 and SC-005 without any API call overhead or timezone configuration.

**Time bands**:
- Morning: 05:00–11:59 → day priorities + routine context
- Afternoon: 12:00–17:59 → work/execution focus
- Evening: 18:00–04:59 → reflection/planning + family

**Alternatives considered**:
- **Backend-driven time state**: Adds latency; unnecessary for display logic
- **Hardcoded Cairo timezone**: Violates Principle VII (no hardcoded user-specific constants); browser time is correct

---

## Resolved Clarifications

All [NEEDS CLARIFICATION] items from the spec checklist were resolved during research:

| Item | Resolution |
|------|-----------|
| Typography selection | Inter (body/UI) + JetBrains Mono (data/numbers) — see Decision 1 |
| Token implementation approach | Three-tier CSS custom properties — see Decision 2 |
| Mode switching mechanism | `data-theme` + blocking script — see Decision 3 |
| Progressive disclosure implementation | Extend existing CollapsibleSection + NodeSidePanel — see Decision 4 |
| Home time awareness | Existing `getHomeState()` utility — see Decision 5 |
