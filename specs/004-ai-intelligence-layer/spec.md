# Feature Specification: AI Intelligence Layer

**Feature Branch**: `004-ai-intelligence-layer`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: Transform Personal OS from a module-centric system into a question-centric operating system with a proactive AI companion, Telegram conversational interface, structured thinking mode, real decision system, trade-off visibility, and self-correcting weekly review.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Speak to the App from Telegram (Priority: P1)

Mohamed is away from his desk — at the mosque, with his children, or commuting. He wants to log something, ask what to do next, or capture an idea without opening the web app. He sends a free-form message to the Telegram bot and the AI responds with context-aware answers and takes actions inside the app on his behalf.

**Why this priority**: Telegram is always open. The web app requires deliberate navigation. Any capability that works in Telegram has immediate daily use from day one.

**Independent Test**: Can be fully tested by sending "log my mood as 4" to the Telegram bot and verifying a mood record is created, without opening the web app at all.

**Acceptance Scenarios**:

1. **Given** Mohamed sends "capture idea: sell operations templates on Gumroad" to the bot, **When** the AI processes the message, **Then** an idea record is created in the app and the bot replies "Done — idea captured."
2. **Given** Mohamed sends "log fajr and dhuhr done", **When** the AI processes it, **Then** spiritual log is updated for today and the bot confirms.
3. **Given** Mohamed sends "what should I do right now?", **When** the AI processes it, **Then** the bot replies with his top priority and a brief reason — same logic as the web app's Next Action.
4. **Given** Mohamed sends "I'm thinking about launching a newsletter", **When** the AI receives it, **Then** it enters thinking companion mode and asks one clarifying question (not a list of questions).
5. **Given** Mohamed sends 15 messages in a conversation, **When** the context window fills, **Then** older messages drop automatically and the conversation remains coherent.
6. **Given** Mohamed sends `/status`, **When** the bot processes it, **Then** the existing command still works exactly as before — conversational mode does not break commands.

---

### User Story 2 — AI Sends to Mohamed Proactively (Priority: P2)

Mohamed wakes up and has already received a morning brief on Telegram before he opens any app. At 20:30 he receives an end-of-day summary. He doesn't need to ask — the system comes to him.

**Why this priority**: The existing morning brief and EOD summary commands are already written and work correctly. They are simply not scheduled. This is the highest-leverage change per unit of effort in the entire plan.

**Independent Test**: Can be fully tested by verifying Telegram receives a morning brief message at 05:20 Cairo time without Mohamed sending any command.

**Acceptance Scenarios**:

1. **Given** it is 05:20 Cairo time, **When** the scheduled job runs, **Then** Mohamed receives a morning brief on Telegram containing today's routine plan and top 3 priorities.
2. **Given** it is 20:30 Cairo time, **When** the scheduled job runs, **Then** Mohamed receives an EOD summary on Telegram covering today's completions and tomorrow's focus.
3. **Given** the backend is asleep (Render cold start), **When** the cron job triggers, **Then** the backend wakes and the message is delivered within 90 seconds of the scheduled time.

---

### User Story 3 — Think Out Loud with AI Guidance (Priority: P3)

Mohamed has a raw thought — "I'm thinking about starting a YouTube channel about operations." He doesn't know if it's a good idea, what it connects to, or what priority to give it. He wants to think it through with the AI, which asks the right questions and at the end tells him: this is worth pursuing as a Goal / worth capturing as an Idea / not worth the time right now. Then it captures the decision in the app.

**Why this priority**: The root weakness of the system is that ideas pile up without evaluation. Thinking Mode gives raw thoughts a structured exit path rather than a graveyard.

**Independent Test**: Can be fully tested by triggering Thinking Mode with a raw idea and verifying the AI completes all 5 stages and creates a record in the app.

**Acceptance Scenarios**:

1. **Given** Mohamed clicks "Think this through with AI" on the Ideas page, **When** he types "I'm thinking about starting a YouTube channel", **Then** the AI asks exactly one clarifying question — not a list.
2. **Given** the AI has asked its clarifying questions, **When** enough context is gathered, **Then** the AI proposes a conclusion: goal / idea to explore / discard, with a priority level and reason.
3. **Given** the AI proposes "capture as Goal at Medium priority", **When** Mohamed confirms, **Then** a goal node is created with the AI's suggested title and linked to an existing goal where relevant.
4. **Given** Mohamed abandons the conversation mid-flow, **When** he returns later, **Then** the thinking session is not saved as a goal or idea — no partial captures.
5. **Given** Mohamed triggers Thinking Mode from Telegram by sending a reflective message, **When** the AI detects it, **Then** it enters the same thinking flow adapted for short Telegram messages.

---

### User Story 4 — Home Page Answers Four Questions, Not Domains (Priority: P4)

Mohamed opens the app. Instead of seeing domain-status cards (Finance, Health, Goals, Schedule), he sees four named questions answered directly: What matters most right now? What am I ready to act on? What is blocking me? How am I actually doing (as a trend, not a snapshot)?

**Why this priority**: The backend already produces all the data needed. This is a reorganisation of existing information, not new data collection. It changes daily experience without requiring new logging behavior.

**Independent Test**: Can be fully tested by opening the home page and verifying each of the four panels shows the correct data from the existing system — no new API calls required.

**Acceptance Scenarios**:

1. **Given** Mohamed opens the home page, **When** it loads, **Then** four labeled question panels are visible without scrolling.
2. **Given** the system detects overwhelm (too many active goals, low energy), **When** the Q1 panel renders, **Then** it shows "Reduced mode: one focus only" and highlights only the single top priority.
3. **Given** three goals are blocked by dependencies, **When** the Q3 panel renders, **Then** each blocked goal shows what is blocking it by name — not just "blocked."
4. **Given** Mohamed's mood average over 7 days is below 3, **When** the Q4 panel renders, **Then** a trend indicator shows this is declining — not just today's mood.
5. **Given** the home page previously showed domain status cards, **When** the redesign ships, **Then** those cards are still accessible inside the Q4 panel as a secondary expand — not deleted.

---

### User Story 5 — Real Decision System with Trade-off Visibility (Priority: P5)

Mohamed decides to pursue a new client opportunity. The system asks: what are you explicitly giving up by doing this? He names it. Three months later, the system reminds him the decision is due for review: was it right? He marks it as right, wrong, or too early to tell.

When Mohamed tries to set a fifth goal to Active, the system shows him his four current active goals and asks which one he'd deprioritize to make room — rather than silently accumulating goals without limit.

**Why this priority**: Without trade-off visibility, prioritization is sorting, not choosing. These two mechanics (decision trade-offs + activation gate) are the core of the decision system.

**Independent Test**: Can be fully tested by creating a decision with an outcome date of yesterday and verifying a "pending review" badge appears on the decision card.

**Acceptance Scenarios**:

1. **Given** Mohamed creates a decision, **When** he fills the "Trade-off: what you're NOT doing" field, **Then** the field is saved and displayed on the decision card alongside the decision itself.
2. **Given** a decision's outcome date has passed and no outcome is recorded, **When** Mohamed opens the decisions page, **Then** the card shows a "Pending review" badge.
3. **Given** Mohamed has 3 active goals (the safe maximum for his current overwhelm score), **When** he tries to set a 4th goal to Active, **Then** a prompt appears showing his 3 current active goals and asking which to defer.
4. **Given** the trade-off prompt appears, **When** Mohamed clicks "Proceed anyway", **Then** the goal is set to Active without deferring anything — the prompt informs, it does not block.
5. **Given** Mohamed made a decision that killed a goal, **When** that goal is later set to Active, **Then** the Q3 panel shows a tension: "You decided X which deprioritized Y, but Y is now active."

---

### User Story 6 — Weekly Review Creates Commitments, Not Just Reflection (Priority: P6)

Mohamed completes his weekly review. After the existing wins/challenges/focus/generate steps, there is a fifth step: "What am I changing?" He adds two items: STOP spending time on low-value outreach, START writing one LinkedIn post per week. The following week, his review opens with: "Last week you committed to two changes — did you keep them?"

**Why this priority**: The weekly review currently produces awareness without behavior change. The commitments step closes the loop.

**Independent Test**: Can be fully tested by completing the weekly review with one commitment, then verifying it appears as an accountability question at the start of the following week's review.

**Acceptance Scenarios**:

1. **Given** Mohamed is on the Generate step of the weekly review, **When** he clicks Next, **Then** a Commitments step appears with three sections: STOP / CHANGE / START.
2. **Given** Mohamed adds two commitment items, **When** he completes the review, **Then** both commitments are saved and linked to this week's review record.
3. **Given** one week has passed since commitments were made, **When** Mohamed opens the home page, **Then** the Q4 panel shows the prior commitments with "Did you keep this?" Yes/No buttons.
4. **Given** Mohamed marks a commitment as kept, **When** he clicks Yes, **Then** the accountability item disappears from the Q4 panel.
5. **Given** Mohamed skips the commitments step, **When** he completes the review, **Then** no commitments are created and no accountability question appears the following week.

---

### Edge Cases

- What happens when Telegram sends a message while the backend is asleep? The message must not be lost — Telegram retries webhook delivery for up to 24 hours.
- What happens if the AI creates a goal from Thinking Mode with a title that already exists? The AI must detect near-duplicates and ask before creating.
- What happens if Mohamed sends 50 Telegram messages in one day? Conversation history is capped at 10 exchanges per session to prevent context overflow.
- What happens if the overwhelm score changes between when the trade-off prompt is fetched and when the user confirms? The save always proceeds — the prompt is advisory, not a lock.
- What happens if a weekly review commitment references a goal that is later deleted? The commitment record is retained but the goal link is nulled — the commitment text still shows.

---

## Requirements *(mandatory)*

### Functional Requirements

**Telegram Conversational Mode**

- **FR-001**: The system MUST accept free-form text messages from the authenticated Telegram chat and route them through the same AI service used by the web app chat panel.
- **FR-002**: The AI MUST be able to execute all existing web app tools (create goal, log health, capture idea, etc.) from a Telegram message.
- **FR-003**: The system MUST maintain a conversation history of the last 10 message exchanges per Telegram chat session.
- **FR-004**: Existing Telegram commands (`/brief`, `/next`, `/capture`, `/status`, `/help`) MUST continue to work unchanged.
- **FR-005**: AI responses in Telegram MUST be concise (maximum 3 sentences for explanations) and use plain text without markdown tables.
- **FR-006**: When the AI takes an action from Telegram, it MUST confirm the action in the reply: "Done — [what was done]."

**Proactive AI Scheduling**

- **FR-007**: The system MUST send a morning brief to Telegram automatically at 05:20 Cairo time (UTC+2) daily.
- **FR-008**: The system MUST send an end-of-day summary to Telegram automatically at 20:30 Cairo time daily.
- **FR-009**: Both scheduled messages MUST use the existing `send_morning_brief` and `send_eod_summary` management commands without modification.

**Thinking Mode**

- **FR-010**: The system MUST provide a dedicated Thinking Mode entry point on the Ideas page and via keyboard shortcut (Ctrl+Shift+T) from any page.
- **FR-011**: In Thinking Mode, the AI MUST follow a structured 5-stage flow: receive thought → clarify goal → evaluate cost → connect to existing goals → propose conclusion.
- **FR-012**: The AI MUST ask one question at a time — never a list of questions in a single message.
- **FR-013**: The AI MUST propose one of three conclusions: create as Goal, save as Idea to explore, or discard.
- **FR-014**: On confirmation, the AI MUST create the appropriate record (goal node or idea) using existing tools.
- **FR-015**: If the conversation is abandoned without reaching a conclusion, no record MUST be created.

**Synthesis Surface (Home Page)**

- **FR-016**: The home page MUST display four named question panels as the primary content: Q1 (matters most), Q2 (ready to act), Q3 (blocking), Q4 (how am I doing — trend).
- **FR-017**: Q2 MUST show only goals with status `available` (unblocked, not yet started) — not all goals.
- **FR-018**: Q3 MUST name the specific blockers for each blocked goal, not just show "blocked."
- **FR-019**: Q4 MUST show 7-day trend data (averages), not single-day snapshots.
- **FR-020**: The existing domain status cards MUST remain accessible within Q4 as a collapsible secondary section.
- **FR-021**: When the overwhelm system detects reduced mode, Q1 MUST display "Reduced mode: one focus only" and show only the single top priority.

**Decision System**

- **FR-022**: Every decision record MUST support a "Trade-off: what you're NOT doing" field.
- **FR-023**: Every decision record MUST support an outcome date and outcome result (right / wrong / too early).
- **FR-024**: Decision records MUST be linkable to existing goals (the goal this decision enables and the goal it kills/deprioritizes).
- **FR-025**: The system MUST surface a "Pending review" badge on decisions whose outcome date has passed with no outcome recorded.
- **FR-026**: When a linked killed-goal is later set to active, the system MUST surface a tension signal in the Q3 panel.

**Trade-off Gate**

- **FR-027**: When a user sets a goal to Active and the active goal count meets or exceeds the safe maximum for their overwhelm score, the system MUST display a trade-off prompt.
- **FR-028**: The trade-off prompt MUST list current active goals and offer the option to defer one before activating the new goal.
- **FR-029**: The trade-off prompt MUST allow "Proceed anyway" — it is advisory, not a blocker.

**Self-Correcting Weekly Review**

- **FR-030**: The weekly review MUST include a fifth step "Commitments" after the existing Generate step.
- **FR-031**: The Commitments step MUST support three commitment types: STOP, CHANGE, START.
- **FR-032**: Commitments MUST be persisted and linked to the weekly review record.
- **FR-033**: Unfulfilled commitments from the prior week MUST appear in the Q4 panel of the home page with Yes/No accountability buttons.
- **FR-034**: Marking a commitment as kept or not kept MUST remove it from the Q4 panel.

### Key Entities

- **TelegramConversation**: A record of a single message exchange (role: user or assistant, content, timestamp) linked to a Telegram chat ID. Stores the rolling window of conversation history used to maintain context.
- **DecisionLog (enhanced)**: Extends existing record with trade-off cost text, outcome date, outcome result, and optional links to the goal it enables and the goal it kills.
- **ReviewCommitment**: A commitment made at the end of a weekly review — action type (stop/change/start), description, optional linked goal, whether it was kept, and which review checked it.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mohamed can log a health metric, capture an idea, or create a goal from Telegram in under 20 seconds without opening the web app.
- **SC-002**: Mohamed receives a morning brief on Telegram before 05:25 Cairo time on every day the service is running.
- **SC-003**: A raw thought entered into Thinking Mode reaches a conclusion (goal / idea / discard) within 5 AI exchanges.
- **SC-004**: The home page renders all four question panels and their data within the same load time as the current home page (no additional API calls).
- **SC-005**: Decision records with past outcome dates are surfaced with a pending review badge within 24 hours of the date passing.
- **SC-006**: The weekly review's Commitments step is completed by Mohamed in under 3 minutes.
- **SC-007**: Prior week commitments appear on the home page Q4 panel within one week of being created, with zero manual steps required.
- **SC-008**: All existing Telegram commands continue to work exactly as before — zero regressions.

---

## Assumptions

- The Telegram bot token and chat ID are already configured in the production environment (completed in the current session).
- The existing `send_morning_brief` and `send_eod_summary` management commands produce correct output — no changes to their logic are required.
- The `CommandCenterPayload` type already contains all data needed for the four question panels — no new API endpoint is required for Phase 1 (synthesis surface).
- Conversation history is per Telegram chat ID; multi-user Telegram support is out of scope for this feature.
- The trade-off prompt's "safe maximum" active goal count is derived from `OverwhelmService.summary().max_priorities` — not a hardcoded number.
- All new Django models include bilingual `[AR]`/`[EN]` header comments per Constitution Principle VIII.
- All new and modified files respect the line limits defined in Constitution Principle IX (400 lines for Python, 300 lines for TypeScript).
- The weekly review Commitments step is optional — users who skip it experience no change in existing review behavior.
- Render cron job scheduling is done in the Render dashboard — no changes to `render.yaml` are required for Phase 0.
- The `goals.Node` model is accessible as a FK target from both `analytics` and `core` apps — this dependency already exists in the codebase.
