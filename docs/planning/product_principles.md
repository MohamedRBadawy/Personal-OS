# Personal OS — Product Principles

> These are the non-negotiable rules for how this app is built and how it behaves. When facing a design or implementation decision, check it against these first. Principles that conflict with a decision mean the decision is wrong, not the principle.

---

## Principle 1 — One trusted place for everything

Every domain of Mohamed's life has a home in this system. No domain is left out because it feels "too personal" or "too complex." Finance, family, faith, health, business, learning, relationships, automations — all of it lives here.

**What this means in practice:**
- Before building a new feature, ask: which life domain does this serve?
- If a domain exists in Mohamed's life but not in the app, that is a gap to close — not a scope decision.
- Data that lives only in Mohamed's head is a failure of the system.

**Anti-pattern:** Building more depth in existing modules while leaving entire life domains (family goals, learning, automations) with no home.

---

## Principle 2 — Navigation redesigned from a clear principle, not accumulated

The navigation of this app must be redesigned from scratch. 35+ pages accumulated without a governing principle is not a structure — it is sprawl. The new navigation must be designed top-down: start with the principle, derive the structure, then place every feature.

**The navigation principle:** Every surface Mohamed sees must answer one of three questions:
1. **What should I do right now?** (execution layer)
2. **How am I doing across all domains?** (awareness layer)
3. **What do I want and where am I going?** (direction layer)

**What this means in practice:**
- Maximum 5–7 top-level destinations. Everything else is a tab or drill-down.
- No page exists unless it has a clear home in one of the three layers above.
- When adding a new feature, identify which existing hub it belongs to — do not create a new top-level page.

**Anti-pattern:** Adding a new page for every new feature because it feels cleaner in the moment.

---

## Principle 3 — Interaction redesigned, not patched

The way Mohamed interacts with the app — how he captures, how he navigates, how he gives input, how he receives output — must be redesigned holistically. The current model (form → submit → list) is built for data entry, not for an operating system.

**The target interaction model:**
- **Capture:** One gesture (voice, text, FAB) anywhere in the app — the system routes and categorizes automatically.
- **Review:** Surfaces come to Mohamed — he does not go looking for them. The app knows what time it is, what day it is, and what is most relevant.
- **Action:** AI suggests the next action. Mohamed approves, modifies, or dismisses. He does not create tasks from scratch for things the system can infer.
- **Conversation:** A persistent assistant that has full context of all domains and can answer, act, remind, and draft.

**Anti-pattern:** Requiring Mohamed to navigate to a specific page and fill a form to log any piece of information.

---

## Principle 4 — AI does work, not just display

The AI layer in this app is not a chatbot wrapper. It is an infrastructure of agents that work in the background and surface results — not a thing Mohamed has to go talk to.

**Three agent types, all required:**
1. **Background agents** — run continuously or on triggers: track opportunities, monitor goals, process captures, send outreach, categorize information.
2. **Conversational assistant** — always available, full context of all domains, can take action (not just answer).
3. **Scheduled agents** — morning brief, end-of-day summary, weekly review, reminders — pushed to Mohamed on Telegram at defined times.

**What this means in practice:**
- Every domain should have at least one background signal that the AI monitors.
- The assistant always knows: today's schedule, current priorities, pending actions, recent logs across all domains.
- Automations reduce the amount Mohamed has to manually input.

**Anti-pattern:** Building AI features that require Mohamed to go ask a question before the AI does anything.

---

## Principle 5 — Progress must always be visible

At any moment, Mohamed must be able to answer: am I moving toward the north star? The system must make progress legible — not just store data but show direction.

**What this means in practice:**
- The €1,000/mo goal and the Kyrgyzstan milestone must be visible on the home surface, not buried in a finance page.
- Every domain tracks a signal: health (consistency), business (pipeline value), finance (independent income), goals (completion rate), faith (prayer rate).
- Weekly review is not optional — it is a system-enforced checkpoint that closes the loop.

**Anti-pattern:** A system where you can use the app for a week and not know if you made progress.

---

## Principle 6 — Build and use simultaneously

No feature is built without immediately entering the daily routine. There is no "finish the app first" phase. Every release is a usable release.

**What this means in practice:**
- Before building a feature, define: how will this be used on the day it ships?
- If a feature cannot be used daily from day one, it is not ready to build yet — the spec is incomplete.
- Mohamed's daily experience of the app is the primary quality signal. If he is not using a feature daily, it has failed regardless of technical quality.

**Anti-pattern:** Building features that sit unused because the interaction model is not ready or the domain is not connected to the daily routine.

---

## Principle 7 — Multi-user with deep personalisation, no formal auth

The app supports multiple users — each with their own goals, profile, and data — but without formal authentication. It is built for a small trusted group, not the public. Lightweight user identification (select your name, no password) is the access model.

Personalisation is not a feature — it is the foundation. Every user's AI experience is shaped by their own profile: their goals, their schedule, their domains, their north star.

**What this means in practice:**
- No user-specific constants in application code. Names, targets, cities, schedules — all are profile fields, not hardcoded values.
- The AI always reads the current user's profile before responding.
- Onboarding captures enough context to make the first session genuinely useful.
- No screen or AI response assumes a specific culture, religion, language, or goal.

**Anti-pattern:** Hardcoding any goal, value, or identity detail that belongs to a specific user into the application logic.
