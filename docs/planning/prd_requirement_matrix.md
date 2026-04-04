# PRD Requirement Matrix

This matrix tracks the current PRD-complete rebuild status after the 7-view IA and command-center redesign pass.

## Implemented in app

| PRD area | Status | Notes |
| --- | --- | --- |
| 7 primary views | Implemented | `Command Center`, `Goals & Life Plan`, `Work & Career`, `Finance`, `Health & Body`, `Achievements & Timeline`, and `Ideas & Thinking` are the main IA. |
| Legacy route compatibility | Implemented | Older top-level routes redirect into grouped views and tabs. |
| Command center daily workspace | Implemented | Morning briefing, unified capture, priority stack, schedule, logging, finance, pipeline pressure, progress, review, and re-entry are on `/`. |
| Semi-autonomous smart capture | Implemented | Obvious single actions auto-apply; multi-step and structural work returns review state first. |
| Goal deadlines and manual priority | Implemented | `Node` now supports `due_date` and `manual_priority` for actionable work. |
| Deterministic tool recommendations | Implemented | Work items expose `recommended_tool` and `tool_reasoning`. |
| Goal intelligence attachments | Implemented | Attachment profiles and deterministic support-layer suggestions are available for goal-like nodes. |
| Work overview | Implemented | Task board, deadlines, pipeline, marketing, proposal drafts, and AI task thinking are grouped in one workspace. |
| Finance overview | Implemented | Ledger, monthly summary, target tracking, income sources, and named reports are available. |
| Health overview | Implemented | Body, mood, habits, spiritual logging, and capacity signals are grouped together. |
| Timeline and review overview | Implemented | Weekly review, patterns, achievements, archived goals, and retrospectives are grouped together. |
| Ideas and thinking overview | Implemented | Ideas, decisions, learning, and structured thinking are grouped together. |
| Project retrospectives | Implemented | Closed projects and opportunities can create stored retrospectives. |
| Named reports | Implemented | Financial, progress, and personal review reports are exposed under `/api/reports/*`. |

## Implemented on backend API

| Endpoint | Status | Notes |
| --- | --- | --- |
| `/api/core/command-center/` | Implemented | Canonical home read model. |
| `/api/work/overview/` | Implemented | Grouped work and career read model. |
| `/api/finance/overview/` | Implemented | Grouped finance read model. |
| `/api/health/overview/` | Implemented | Grouped health read model. |
| `/api/timeline/overview/` | Implemented | Grouped achievements and timeline read model. |
| `/api/ideas/overview/` | Implemented | Grouped ideas and thinking read model. |
| `/api/reports/financial/` | Implemented | Named financial report. |
| `/api/reports/progress/` | Implemented | Named progress report. |
| `/api/reports/personal-review/` | Implemented | Named personal review report. |

## Deferred to integration phase

| PRD area | Status | Notes |
| --- | --- | --- |
| Telegram integration | Deferred | Planned for external integrations phase. |
| Gmail integration | Deferred | Planned for external integrations phase. |
| Calendar sync | Deferred | Planned for external integrations phase. |
| Webhook-based inbound automation | Deferred | Planned for external integrations phase. |
| Production feature-flagged integration adapters | Deferred | Planned for external integrations phase. |

## Notes

- The current app now matches the PRD's UX-first grouping and semi-autonomous interaction model.
- External integrations are intentionally tracked as the next phase rather than hidden as partially implemented.
