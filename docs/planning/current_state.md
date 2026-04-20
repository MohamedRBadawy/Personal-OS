# Personal OS — Current State

> Living document. Update this whenever a significant feature ships or a gap is confirmed.
> Last verified: 2026-04-19

---

## What Exists Today

### Backend (Django 5.1 + DRF)

| App | What it covers |
|-----|---------------|
| `core` | AI/chat views, report generation, profile context injection |
| `goals` | Node hierarchy (Vision → Goal → Project → Task), dependencies, priorities |
| `finance` | Income/expense tracking, categories, forex (EUR/USD/EGP), income events |
| `health` | Body composition, meals, workouts, mood logs, spiritual logs, habits, wearables, goal profiles, health direction |
| `schedule` | Daily routine blocks, day schedule events |
| `journal` | Journal entries with auto-save |
| `analytics` | Weekly reviews, achievements, AI suggestions, ideas, decisions, learning logs, family goals, relationships, retrospectives |
| `contacts` | Contacts with follow-up tracking |
| `pipeline` | Opportunities, status board, marketing hub |
| `profile` | About Me / self profile (20+ fields: personality, physical, financial, constraints) |

### Frontend (React + TypeScript + Vite)

**35+ pages currently exist.** Major ones:

| Page | Status |
|------|--------|
| `HomePage` | Command Center — redesigned with sticky sidebar, briefing strip, priority stack, schedule, inline logging |
| `GoalsPage` | Node list/tree/kanban with filters, dependency counts |
| `GoalsLifePlanPage` | Life map and family goals |
| `FinancePage` / `FinanceWorkspacePage` | Full finance with charts, forex, filters, edit/delete |
| `HealthPage` / `HealthHubPage` / `HealthBodyPage` | Health hub with tabs |
| `HabitsPage` | Habit board |
| `MoodPage` | Mood logging |
| `SpiritualPage` | Prayer and spiritual logging |
| `MealsPage` | Meal tracking |
| `RoutinePage` | Daily routine with block editing, analytics, week matrix, AI briefing |
| `SchedulePage` / `DaySchedulePage` / `ScheduleHubPage` | Day schedule with timeline and routine overlay |
| `JournalPage` | Journal with auto-save |
| `ContactsPage` | Contacts with follow-up dates |
| `PipelinePage` | Opportunities and pipeline |
| `MarketingPage` | Marketing hub with campaigns and action log |
| `ProfilePage` / `ProfileHubPage` | About Me profile |
| `IdeasThinkingPage` | Ideas and thinking |
| `LearningPage` | Learning log |
| `AnalyticsPage` / `AnalyticsHubPage` | Analytics overview |
| `AchievementsTimelinePage` | Timeline and achievements |
| `WorkCareerPage` | Work and career hub |
| `BusinessHubPage` | Business hub |

### Key Infrastructure

- **Telegram bot** — `/brief`, `/next`, `/capture`, `/status` commands functional via webhook; morning/EOD management commands exist but are not scheduled
- **AI layer** — Anthropic Claude API connected; deterministic provider available; profile context injected into AI Next Action
- **Quick Capture** — FAB (💡) on every page, Ctrl+Shift+I shortcut, idea → goal conversion
- **Deployment** — Render.com (frontend static + backend Python web service), Neon PostgreSQL, auto-deploy from master

---

## What Was Built Since the April 3 Docs

The following were added or significantly expanded after the planning docs were written:

**Command Center redesign**
- Full rebuild with sticky sidebar, collapsible sections, section grouping (Overview / Execute / Life / Review)
- Inline logging components: InlineHabitRow, InlineHealthLog, InlineMoodLog, InlinePrayerLog
- BriefingStrip, TodayProgressStrip, CommandPriorityCard, CommandScheduleCard, CommandStatusCard

**Health module expansion**
- HealthDirectionDashboard, HealthGoalSettingsCard, HealthImpactCard, HealthSignalsPanel
- LatestWorkoutVisualizationCard
- `goal_profile` model: health goals with targets and domain

**Routine deep features**
- ActualDayPanel, BlockEditPanel, BlockNotesHistory, MealBlockLinker
- RoutineAnalyticsView, WeekMatrixView, WeeklyGrid
- AIMorningBriefing component

**Goals enhancements**
- TimerSection, DecomposeSection, ConnectionsSection, AttachmentsSection
- AddNodeModal, TodayFocusPanel

**Profile / About Me**
- New `profile` Django app
- 20+ fields covering personality, physical, financial situation, constraints
- Injected into AI context

**Finance rewrite**
- Multi-currency forex support (EUR / USD / EGP)
- Category field, 4 new API endpoints
- Filter support, edit/delete, charts

---

## Honest Assessment

### What is working
- The data models are solid and cover most domains
- Command Center has the right intent — single daily surface
- Quick Capture exists and is accessible
- Finance tracking is functional and detailed
- Health sub-modules are comprehensive in scope
- Profile context is injected into AI recommendations

### What is not working
- **The core problem is not solved.** Mohamed still cannot clear his mind, see his priorities clearly, or feel confident about what to do next — despite all the features built.
- **35+ pages is too many.** Navigation has accumulated without a governing principle. It is hard to know where things live.
- **AI is too passive.** It answers when asked but does not proactively do work, push relevant information, or run in the background.
- **No agent layer.** Everything requires manual input. There are no background processes, no scheduled pushes, no automations running toward goals.
- **Missing domains.** Business development, learning, family/Kyrgyzstan, and automations have no proper home or are thin stubs.
- **Daily use is inconsistent.** Features exist but are not pulling Mohamed into the app every day by default.
- **Interaction model is form-based.** Logging anything requires navigating to a page and filling fields — not natural for daily use.
