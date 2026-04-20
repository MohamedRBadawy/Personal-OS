<!-- SYNC IMPACT REPORT
Version change: 2.0.0 → 2.0.1
Modified principles:
  - Principle VII: Removed "Authentication layer REQUIRED" — small trusted-group deployment
    does not need formal auth. User identification is lightweight (username, no password).
  - Principle X: Arabic-English Bilingual Interface marked DEFERRED — not urgent;
    will be activated as a named feature when confirmed by owner.
Tech Stack changes:
  - "Authentication layer REQUIRED" → REMOVED; replaced with lightweight user identification note
  - "react-i18next REQUIRED" → DEFERRED; removed from required stack until Arabic is confirmed
  - Deployment note added: Render free tier cold-start (~50s) is the known pain point; Django itself is correct choice
Removed sections: None
Templates requiring updates: None (patch-level, no structural change)
Follow-up TODOs:
  - Existing singleton Profile model needs multi-user migration when user count grows
  - Arabic/i18n: activate Principle X via /speckit-constitution when owner confirms
-->

# Personal OS Constitution

## Core Principles

### I. One Trusted Place for Everything (NON-NEGOTIABLE)

Every domain of a user's life MUST have a home in this system. No domain is excluded because it feels "too personal" or "too complex." Finance, family, faith, health, business, learning, relationships, automations — all of it lives here.

Before any feature is built, the question MUST be asked: which life domain does this serve? If a domain exists in human life generally but not in the app, that is a gap to close — not a scope decision. Data that lives only in the user's head is a failure of the system.

**MUST NOT:** Build depth in existing modules while leaving entire life domains (family goals, learning, automations) without any home in the system.

---

### II. Navigation Designed From a Principle, Not Accumulated (NON-NEGOTIABLE)

The navigation MUST be governed by a single clear principle, designed top-down. Features are placed into the structure — the structure is never extended to accommodate a feature.

The governing navigation principle: every surface a user sees MUST answer one of three questions:
1. **What should I do right now?** (execution layer)
2. **How am I doing across all domains?** (awareness layer)
3. **What do I want and where am I going?** (direction layer)

Maximum 5–7 top-level destinations. Everything else is a tab or drill-down. No new top-level page may be added without identifying which existing surface it replaces or merges into.

**MUST NOT:** Create a new top-level page for a new feature. Identify the hub it belongs to.

---

### III. Interaction Redesigned, Not Patched

The interaction model MUST be designed holistically — how the user captures, navigates, inputs, and receives output. The form → submit → list pattern is not acceptable as the primary interaction model for a personal operating system.

The target interaction model:
- **Capture:** One gesture from anywhere in the app. The system routes and categorizes automatically. No required fields.
- **Review:** Surfaces come to the user. The app knows what time it is, what is urgent, and what is most relevant.
- **Action:** AI suggests the next action. The user approves, modifies, or dismisses. They do not create tasks from scratch for things the system can infer.
- **Conversation:** A persistent assistant with full context of all domains that can answer and act.

**MUST NOT:** Require the user to navigate to a specific page and fill a form to log routine information.

---

### IV. AI Does Work, Not Just Display

The AI layer MUST be an infrastructure of agents that work in the background and surface results — not a passive interface the user must initiate. Every domain SHOULD have at least one background signal that AI monitors.

Three agent types, all required in the completed system:
1. **Background agents** — run on triggers: process captures, track opportunities, monitor goal progress.
2. **Conversational assistant** — always available, full domain context per user, capable of taking action.
3. **Scheduled agents** — morning brief, EOD summary, weekly review — pushed to the user's connected channels at configured times.

The assistant MUST always know: the user's schedule, current priorities, recent logs across all domains, and active goals. This context is loaded from the user's profile — not hardcoded.

**MUST NOT:** Build AI features that require the user to ask a question before the AI does anything useful.

---

### V. Progress Must Always Be Visible

At any moment, a user MUST be able to answer: am I moving toward my north star?

The north star is **user-defined** — set during onboarding and editable at any time. It MUST appear on the home surface, not buried in a sub-page. Every domain tracks a signal. The weekly review is a system-enforced checkpoint, not optional.

Each user defines their own domain signals during setup. Examples the system SHOULD offer as defaults:
- Finance: current income vs. user-defined target
- Business: pipeline value and active opportunities
- Health: habit consistency rate, prayer or wellness metrics
- Goals: completion velocity, stalled goals

**MUST NOT:** Hardcode any specific goal, target amount, or life destination in the product logic. All targets are user data, not application constants.

---

### VI. Build and Use Simultaneously

No feature is built without immediately entering daily use. Before building a feature, the question MUST be answered: how will this be used on the day it ships?

If a feature cannot be used daily from day one, it is not ready to build — the spec is incomplete. The user's daily experience is the primary quality signal. A feature that is not used daily has failed regardless of technical quality.

**MUST NOT:** Build features that are "not ready to use yet" or that require other features to be complete before they are useful.

---

### VII. Multi-User Personal OS with Deep Personalization (NON-NEGOTIABLE)

This app MUST support multiple independent users, each with a fully isolated profile, data, and experience. There is no hardcoded assumption about who the user is.

Every aspect of the system that personalizes the experience — AI context, north star, daily schedule, domain configuration, language — MUST be driven by user profile data set during onboarding and editable at any time.

The system MUST treat personalization as infrastructure:
- Each user owns their own data (isolated at the database row level by user FK)
- The AI reads the authenticated user's profile before every response
- Onboarding captures enough context to make the first session genuinely useful
- No screen, label, or AI response assumes a specific culture, religion, language, or goal

The app SHOULD feel as if it was built specifically for whoever is using it — because their profile shapes every interaction.

**MUST NOT:** Store any user-specific constant (a name, a target amount, a city, a prayer schedule) in application code. These are profile fields.

---

### VIII. Inline Documentation in Both Languages (NON-NEGOTIABLE)

Every file, module, service, and logical code block MUST carry inline comments that explain:
1. What this piece does (its single responsibility)
2. How it connects to other files, models, or services in the system

Comments MUST be written in both Arabic and English using the `[AR]` / `[EN]` tag pattern:

```python
# [AR] يحسب أولوية المهام بناءً على الأهداف المرتبطة والتبعيات
# [EN] Calculates task priority based on linked goals and dependency graph
```

```typescript
// [AR] صفحة عرض الأهداف — تتصل بـ GoalService وتعرض الشجرة الهرمية
// [EN] Goals display page — connects to GoalService and renders the hierarchy tree
```

Every file MUST open with a block comment stating its purpose and its primary connections. This makes the codebase readable by any developer — Arabic-speaking or otherwise — without needing to trace the full dependency graph manually.

**MUST NOT:** Commit any new file or module without the bilingual header block and inline section comments.

---

### IX. File Size Discipline

No source file MUST exceed the following line limits:

| File type | Hard limit |
|-----------|-----------|
| Python (models, serializers, views, services) | 400 lines |
| TypeScript / React components | 300 lines |
| CSS files per domain | 300 lines |
| Any configuration or utility file | 200 lines |

When a file approaches its limit, it MUST be split into focused sub-modules before new code is added. Each file MUST have a single clear responsibility. Splitting is not optional — it is the gate for adding more logic.

Naming convention for split modules follows the domain folder pattern already in use:
```
backend/health/models/          ← split by entity
backend/health/views/           ← split by resource
frontend/src/components/health/ ← split by feature area
```

**MUST NOT:** Add more logic to a file that has reached its line limit. Refactor first, then add.

---

### X. Arabic-English Bilingual Interface *(DEFERRED — not active)*

> **Status:** This principle is defined but not yet active. It will be activated via `/speckit-constitution` when the owner confirms Arabic UI work should begin. Until then, no i18n infrastructure is required and no workflow gates from this principle apply.

When activated, the full requirements are:

The application UI MUST be fully available in both Arabic and English. Every UI string, label, button, heading, error message, and AI response MUST exist in both languages. Arabic MUST use RTL layout — not just translated text in an LTR frame. The user selects their preferred language during onboarding; it MUST be changeable at any time from settings.

**Technical requirements (on activation):**
- All UI strings managed through react-i18next — no hardcoded strings in JSX
- Translation keys follow `domain.component.element` (e.g., `goals.card.title`)
- RTL implemented via CSS logical properties (`margin-inline-start`, not `margin-left`)
- `dir` attribute switches dynamically on the root element
- Planning docs get `_ar.md` siblings (full translation, not summary)

**MUST NOT (on activation):** Add any UI string as a hardcoded literal. All strings go through the i18n layer.

---

## Tech Stack & Constraints

**Backend:** Django 5.1 + Django REST Framework + PostgreSQL (Neon, production) / SQLite (local fallback only)

**Frontend:** React 19 + TypeScript + Vite + TanStack Query + React Router

**AI:** Anthropic Claude API (primary), Google Gemini (secondary). Deterministic provider available for offline/stable operation.

**Deployment:** Render.com — backend Python web service + frontend static site. Auto-deploy from `master` branch via `render.yaml`. Both services MUST remain deployable from master at all times.

**Mobile interface:** Telegram bot only. No native mobile app. Web app is desktop-first.

**Integrations available (not all active):** Telegram webhook, Google Calendar MCP, Gmail MCP, Zoho MCP, n8n (planned).

**Deployment note:** Render free tier spins down after 15 min of inactivity (~50s cold start on first request). This is acceptable for personal/small-group use. Django is the correct backend choice — the cold start is a Render limitation, not a framework one. Railway.app is an alternative free tier with better uptime behaviour if cold starts become painful.

**Constraints:**
- Small trusted-group system — no formal authentication required; lightweight user identification (username selector, no password) is sufficient
- Each user's data MUST be isolated at the database level: all models that hold user data MUST have a `user` FK when multi-user support is active
- Free-tier deployment (Render + Neon) — no paid infrastructure without explicit decision
- No new Python packages without justification — backend dependencies are stable
- All migrations MUST be committed and run cleanly on PostgreSQL

---

## Development Workflow

**Feature readiness gate:** Before implementation begins, a feature MUST have a spec that answers: what does this do, who uses it, and how is it used on day one?

**Navigation gate:** No new top-level page may be added until Phase 1 (navigation redesign) is complete and the new hub structure is in place.

**AI gate:** Every new domain module SHOULD include at least a stub for its AI signal — what does the AI monitor or surface for this domain?

**Daily use gate:** After shipping, if a feature is not in active daily use within one week, it is considered a failure and must be revisited.

**Documentation gate:** Every file created or modified MUST include the bilingual `[AR]`/`[EN]` header comment and inline section comments before the PR is considered complete (Principle VIII).

**File size gate:** No PR may add code to a file that already exceeds its line limit (Principle IX). The file MUST be split first.

**i18n gate:** *(inactive — activates with Principle X)* When Arabic is confirmed, no PR may add hardcoded UI strings; all strings go through the i18n layer with both `en.json` and `ar.json` entries.

**RTL gate:** *(inactive — activates with Principle X)* When Arabic is confirmed, every new layout component must be verified in both LTR and RTL modes before merge.

**Bilingual planning docs:** *(inactive — activates with Principle X)* When Arabic is confirmed, every spec/plan/tasks doc gets an `_ar.md` sibling.

**User isolation gate:** Every new Django model that stores user-owned data MUST include a `user = ForeignKey(User, ...)` field. No user data stored in global/singleton models.

**Commit discipline:**
- `master` is always deployable
- No force-pushes to master
- Migrations committed alongside model changes
- Frontend build MUST pass before merge

---

## Governance

This constitution is the highest authority for product decisions in this project. It supersedes ad-hoc decisions, accumulated patterns, and convenience shortcuts.

**Amendment procedure:**
1. Identify the principle that needs changing and why
2. Run `/speckit-constitution` with the proposed change as input
3. Constitution version increments: MAJOR (principle removed or fundamentally redefined), MINOR (new principle or material expansion), PATCH (clarification or wording)
4. All dependent templates are updated in the same session

**Compliance:** Every spec, plan, and task list generated through spec-kit is automatically checked against this constitution. Constitution violations are flagged as CRITICAL and block implementation until resolved or explicitly overridden with documented justification.

**Authority:** When a design decision conflicts with a principle in this constitution, the principle is correct and the decision must change — not the other way around.

---

**Version**: 2.0.1 | **Ratified**: 2026-04-20 | **Last Amended**: 2026-04-20
