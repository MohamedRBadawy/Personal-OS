# Personal OS Planning Pack

This planning pack turns the current repository, the logic spec, and the PRD into a builder-facing execution handoff for the next 6-8 weeks. It is meant to answer three questions quickly:

1. What exists now?
2. What gets built next and in what order?
3. What blocks release or production use?

## How to use this pack

1. Start with [Current State Baseline](./current_state_baseline.md) to understand the committed baseline.
2. Use [Roadmap: Next 8 Weeks](./roadmap_next_8_weeks.md) to sequence the work.
3. Pull implementation tickets from [Workstreams and Backlog](./workstreams_and_backlog.md).
4. Treat [Release Readiness](./release_readiness.md) as the shipping gate.

Related existing docs:

- [Frontend Vertical Slice](../frontend_vertical_slice.md)
- [Phase 1 Hardening Guide](../phase1_hardening.md)

## Source of truth order

1. Current repo state: the authority on what is already implemented and validated.
2. `logic_spec.md`: the authority on business rules, cross-module triggers, and operational logic.
3. `personal_os_prd.md`: the authority on target product scope and intended outcomes.

When these sources disagree, use repo truth for present-state claims and use the logic spec plus PRD to plan the missing work.

## Pack contents

- [Current State Baseline](./current_state_baseline.md): implemented truth, domain status matrix, screen inventory, and canonical interface inventory.
- [Roadmap: Next 8 Weeks](./roadmap_next_8_weeks.md): 4 execution phases with dependencies, risks, and exit criteria.
- [Workstreams and Backlog](./workstreams_and_backlog.md): ticket-ready work grouped by backend, frontend, AI/integrations, and ops.
- [Release Readiness](./release_readiness.md): deployment assumptions, env contract, release gates, smoke flow, and rollback steps.

## Glossary

- Read model: a backend response shaped for UI consumption, usually aggregating multiple domains.
- Deterministic AI: the current rule-based provider that keeps contracts stable before live Anthropic integration.
- Seeded demo: the current single-user local flow based on `seed_initial_data` for Mohamed's baseline context.
- Reduced mode: dashboard behavior that limits visible priorities when overwhelm score is 3 or higher.
- Kyrgyzstan trigger: the finance-driven rule that marks goal `g2` done at `EUR 1000` independent income and unblocks goal `g1`.
- CRUD-only module: a domain that currently has storage and generic API surfaces, but not a dedicated composite UI or automation layer.

## Status legend

- Implemented: shipping in the repo now and exercised by the current UI, tests, or both.
- Partial: model/API/service exists, but important product behavior, UI, or automation is still missing.
- Planned: intentionally scheduled inside this 6-8 week horizon.
- Deferred: explicitly outside this planning horizon.

## Reusable templates

### Milestone template

- Objective:
- Dependencies:
- Exit criteria:
- Risks:

### Backlog item template

- Goal:
- Why:
- Dependency:
- Owner:
- Definition of done:

### Integration template

- Trigger:
- Side effects:
- Env vars:
- Tests:
- Operational risks:

## Planning defaults

- Single-user app for Mohamed remains the baseline.
- Existing dashboard, check-in, goals, finance, and health contracts stay stable unless the roadmap explicitly calls out a new interface.
- PostgreSQL is the production database target; SQLite remains a local fallback only.
- Live Anthropic integration is not part of this pack's default implementation horizon.
