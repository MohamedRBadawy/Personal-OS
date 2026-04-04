export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Profile = {
  id: string
  full_name: string
  location: string
  timezone: string
  background: string
  cognitive_style: string
  family_context: string
  life_focus: string
}

export type AppSettings = {
  id: string
  name: string
  independent_income_target_eur: string
  employment_income_source_name: string
  timezone: string
  eur_to_usd_rate: string
  eur_to_egp_rate: string
}

export type MorningBriefing = {
  briefing_text: string
  top_priorities: string[]
  observations: string[]
  encouragement: string
}

export type GoalNodeType = 'goal' | 'project' | 'task' | 'sub_task' | 'idea' | 'burden'
export type GoalNodeStatus = 'active' | 'available' | 'blocked' | 'done'

export type GoalNode = {
  id: string
  code: string
  title: string
  type: GoalNodeType
  category: string | null
  status: GoalNodeStatus
  parent: string | null
  deps: string[]
  notes: string
  completed_at: string | null
  progress_pct: number
}

export type GoalTreeNode = GoalNode & {
  children: GoalTreeNode[]
}

export type GoalContext = {
  node: GoalNode
  ancestors: GoalNode[]
  dependents: GoalNode[]
  progress_pct: number
}

export type GoalNodeUpdatePayload = Partial<Pick<GoalNode, 'status' | 'notes' | 'parent'>> & {
  title?: string
  deps?: string[]
}

export type GoalNodeCreatePayload = {
  title: string
  type: GoalNodeType
  category?: string | null
  status?: GoalNodeStatus
  parent?: string | null
  notes?: string
  code?: string
}

export type GoalMapNode = {
  id: string
  code: string
  title: string
  type: GoalNodeType
  category: string | null
  status: GoalNodeStatus
  parent: string | null
  progress_pct: number
  child_count: number
  blocked_by: string[]
}

export type GoalMapEdge = {
  id: string
  source: string
  target: string
  kind: 'hierarchy' | 'dependency'
}

export type GoalMapPayload = {
  nodes: GoalMapNode[]
  edges: GoalMapEdge[]
  summary: {
    goal_count: number
    project_count: number
    task_count: number
    blocked_count: number
  }
}

export type FinanceEntryType = 'income' | 'expense'
export type CurrencyCode = 'EUR' | 'USD' | 'EGP'

export type FinanceEntry = {
  id: string
  type: FinanceEntryType
  source: string
  amount: string
  amount_eur: number
  currency: CurrencyCode
  is_independent: boolean
  is_recurring: boolean
  date: string
  notes: string
}

export type FinanceEntryPayload = {
  type: FinanceEntryType
  source: string
  amount: string
  currency: CurrencyCode
  is_independent: boolean
  is_recurring: boolean
  date: string
  notes: string
}

export type FinanceSummary = {
  month: string
  total_income_eur: number
  total_expense_eur: number
  independent_income_eur: number
  net_eur: number
  kyrgyzstan_progress_pct: number
  months_to_target: number | null
  target_eur: string
  eur_to_usd_rate: string
  eur_to_egp_rate: string
}

export type HealthLog = {
  id: string
  date: string
  sleep_hours: string
  sleep_quality: number
  energy_level: number
  exercise_done: boolean
  exercise_type: string
  exercise_duration_mins: number | null
  weight_kg: string | null
  nutrition_notes: string
}

export type HealthLogPayload = {
  date: string
  sleep_hours: string
  sleep_quality: number
  energy_level: number
  exercise_done: boolean
  exercise_type: string
  exercise_duration_mins: number | null
  weight_kg: string | null
  nutrition_notes: string
}

export type MoodLog = {
  id: string
  date: string
  mood_score: number
  notes: string
}

export type MoodLogPayload = {
  date: string
  mood_score: number
  notes: string
}

export type SpiritualLog = {
  id: string
  date: string
  fajr: boolean
  dhuhr: boolean
  asr: boolean
  maghrib: boolean
  isha: boolean
  quran_pages: number
  dhikr_done: boolean
  notes: string
  prayers_count: number
}

export type SpiritualLogPayload = {
  date: string
  fajr: boolean
  dhuhr: boolean
  asr: boolean
  maghrib: boolean
  isha: boolean
  quran_pages: number
  dhikr_done: boolean
  notes: string
}

export type Habit = {
  id: string
  name: string
  target: 'daily' | '3x_week' | 'weekly' | 'custom'
  custom_days: number | null
  goal: string | null
}

export type HabitLog = {
  id: string
  habit: string
  date: string
  done: boolean
  note: string
}

export type HabitLogPayload = {
  habit: string
  date: string
  done: boolean
  note: string
}

export type HabitBoardItem = {
  habit: Habit
  today_log: HabitLog | null
  completion_rate_7d: number | null
  completion_rate_30d: number | null
  current_streak: number
}

export type HealthSummary = {
  date: string
  avg_sleep_7d: number | null
  avg_energy_7d: number | null
  avg_sleep_30d: number | null
  avg_mood_7d: number | null
  avg_mood_30d: number | null
  avg_quran_7d: number | null
  exercise_streak: number
  full_prayer_streak: number
  habit_completion_rate_7d: number | null
  habit_completion_rate_30d: number | null
  prayer_completion_rate_7d: number | null
  dhikr_completion_rate_7d: number | null
  spiritual_consistency_7d: number | null
  low_energy_today: boolean
  low_sleep_today: boolean
  low_mood_today: boolean
  low_mood_streak: number
  prayer_gap_streak: number
  health_logged_today: boolean
  mood_logged_today: boolean
  spiritual_logged_today: boolean
  active_habits_count: number
  habits_completed_today: number
}

export type HealthTodayPayload = {
  date: string
  summary: HealthSummary
  health_log: HealthLog | null
  mood_log: MoodLog | null
  spiritual_log: SpiritualLog | null
  habit_board: HabitBoardItem[]
}

export type OverwhelmSummary = {
  date: string
  overwhelm_score: number
  reduced_mode: boolean
  max_priorities: number
  burnout_risk: boolean
  signals: string[]
}

export type WeeklyReviewPreview = {
  week_start: string
  week_end: string
  snippet?: string
  report: string
  context?: Record<string, unknown>
}

export type PipelineSummary = {
  new_or_reviewing_count: number
  applied_count: number
  won_count: number
  lost_count: number
  empty_pipeline: boolean
  days_since_last_application: number | null
  due_follow_ups_count: number
}

export type DashboardTodaySnapshot = {
  active_project_count: number
  blocked_goal_count: number
  available_task_count: number
  sleep_hours_today: number | null
  energy_level_today: number | null
  mood_score_today: number | null
  completed_habits_today: number
  total_habits: number
  prayers_count_today: number
  marketing_actions_this_month: number
  active_leads_count: number
}

export type ScheduleSnapshotBlock = {
  id: string
  time: string
  label: string
  type: string
  status: string
  suggestion_label: string | null
  suggestion_kind: string | null
}

export type ScheduleSnapshot = {
  date: string
  reduced_mode: boolean
  low_energy_today: boolean
  due_follow_ups_count: number
  pending_count: number
  blocks: ScheduleSnapshotBlock[]
}

export type DashboardPayload = {
  date: string
  profile: Profile | null
  settings: AppSettings | null
  briefing: MorningBriefing
  key_signals: string[]
  finance_summary: FinanceSummary
  health_summary: HealthSummary
  overwhelm: OverwhelmSummary
  top_priorities: GoalNode[]
  pipeline_summary: PipelineSummary
  today_snapshot: DashboardTodaySnapshot
  schedule_snapshot: ScheduleSnapshot
  review_status: {
    week_start: string
    week_end: string
    review_exists: boolean
    current_review_id: string | null
    latest_review_id: string | null
  }
  suggestions_summary: {
    pending_count: number
    by_module: Record<string, number>
  }
  weekly_review_preview: WeeklyReviewPreview
  latest_checkin: {
    id: string
    date: string
    inbox_text: string
    blockers_text: string
  } | null
}

export type CheckInFinanceDelta = {
  type: FinanceEntryType
  source: string
  amount: string
  currency: CurrencyCode
  is_independent: boolean
}

export type CheckInPayload = {
  sleep_hours: string
  sleep_quality: number
  energy_level: number
  exercise_done: boolean
  exercise_type: string
  exercise_duration_mins: number | null
  mood_score: number
  finance_deltas: CheckInFinanceDelta[]
  inbox_text: string
  blockers_text: string
}

export type CheckInResponse = {
  checkin_id: string
  health_log_id: string
  mood_log_id: string | null
  finance_entry_ids: string[]
  idea_id: string | null
  blocker_id: string | null
  briefing: MorningBriefing
  finance_summary: FinanceSummary
  health_summary: HealthSummary
}

export type ScheduleSuggestionGoalNode = {
  id: string
  title: string
  type: GoalNodeType
  status: GoalNodeStatus
  parent_title: string | null
}

export type ScheduleSuggestionMarketingAction = {
  id: string
  action: string
  platform: string
  follow_up_date: string | null
}

export type ScheduleBlockLog = {
  id: string
  date: string
  status: 'done' | 'late' | 'partial' | 'skipped'
  actual_time: string | null
  note: string
  task_node: ScheduleSuggestionGoalNode | null
}

export type TodayScheduleBlock = {
  id: string
  label: string
  type: string
  time: string
  is_fixed: boolean
  is_adjustable: boolean
  duration_mins: number
  sort_order: number
  log: ScheduleBlockLog | null
  suggestion_reason: string
  suggestion: {
    kind: 'goal_node' | 'marketing_follow_up'
    reason: string
    goal_node: ScheduleSuggestionGoalNode | null
    marketing_action: ScheduleSuggestionMarketingAction | null
  } | null
}

export type TodaySchedulePayload = {
  date: string
  template: {
    id: string
    name: string
    is_active: boolean
  } | null
  low_energy_today: boolean
  reduced_mode: boolean
  notes: string[]
  summary: {
    done_count: number
    late_count: number
    partial_count: number
    skipped_count: number
    pending_count: number
    due_follow_ups_count: number
  }
  blocks: TodayScheduleBlock[]
}

export type ScheduleLogPayload = {
  date: string
  block: string
  status: 'done' | 'late' | 'partial' | 'skipped'
  task_node: string | null
  note: string
}

export type Opportunity = {
  id: string
  name: string
  platform: string
  description: string
  budget: string | null
  status: 'new' | 'reviewing' | 'applied' | 'won' | 'lost' | 'rejected'
  fit_score: number | null
  fit_reasoning: string
  date_found: string
  date_applied: string | null
  date_closed: string | null
  proposal_draft: string
  outcome_notes: string
  created_at: string
  updated_at: string
}

export type OpportunityPayload = {
  name: string
  platform: string
  description: string
  budget: string | null
  status: Opportunity['status']
  fit_score?: number | null
  fit_reasoning?: string
  date_found: string
  date_applied?: string | null
  date_closed?: string | null
  proposal_draft?: string
  outcome_notes?: string
}

export type Client = {
  id: string
  name: string
  source_platform: string
  opportunity: string | null
  notes: string
  created_at: string
  updated_at: string
}

export type MarketingAction = {
  id: string
  action: string
  platform: string
  goal: string | null
  result: string
  follow_up_date: string | null
  follow_up_done: boolean
  date: string
  created_at: string
}

export type MarketingActionPayload = {
  action: string
  platform: string
  goal: string | null
  result: string
  follow_up_date: string | null
  follow_up_done: boolean
  date: string
}

export type PipelineWorkspaceOpportunity = {
  id: string
  name: string
  platform: string
  description?: string
  status: Opportunity['status']
  budget: string | null
  fit_score: number | null
  fit_reasoning?: string
  proposal_draft?: string
  date_found: string
  date_applied: string | null
  date_closed?: string | null
  outcome_notes: string
}

export type PipelineWorkspaceMarketingAction = {
  id: string
  action: string
  platform: string
  follow_up_date: string | null
  follow_up_done: boolean
  date: string
  result: string
}

export type PipelineWorkspaceClient = {
  id: string
  name: string
  source_platform: string
  created_at?: string
  notes: string
}

export type PipelineWorkspacePayload = {
  date: string
  summary: PipelineSummary
  active_opportunities: PipelineWorkspaceOpportunity[]
  recent_outcomes: PipelineWorkspaceOpportunity[]
  due_follow_ups: PipelineWorkspaceMarketingAction[]
  recent_clients: PipelineWorkspaceClient[]
}

export type AnalyticsHistoryItem = {
  id: string
  domain: string
  title: string
  detail: string
  date: string
}

export type AnalyticsOverviewPayload = {
  date: string
  health: {
    low_energy_today: boolean
    low_mood_today: boolean
    avg_sleep_7d: number | null
    avg_mood_7d: number | null
    habit_completion_rate_7d: number | null
    prayer_completion_rate_7d: number | null
  }
  finance: {
    independent_income_eur: number
    net_eur: number
    kyrgyzstan_progress_pct: number
  }
  pipeline: PipelineSummary
  counts: {
    health_logs?: number
    mood_logs?: number
    spiritual_logs?: number
    habit_logs?: number
    ideas: number
    decisions: number
    achievements: number
    family_goals: number
    relationships: number
    learning_items?: number
    learnings?: number
    marketing_actions: number
    opportunities?: number
  }
  history: AnalyticsHistoryItem[]
  pattern_analysis: string
}

export type WeeklyReview = {
  id: string
  week_start: string
  week_end: string
  ai_report: string
  personal_notes: string
  created_at: string
}

export type WeeklyReviewUpdatePayload = {
  personal_notes: string
}

export type WeeklyReviewGenerateResponse = {
  review: WeeklyReview
  preview: WeeklyReviewPreview
}

export type AISuggestion = {
  id: string
  topic: string
  module: string
  suggestion_text: string
  shown_at: string
  acted_on: boolean
  dismissed_at: string | null
}

export type TimelineDay = {
  date: string
  is_today: boolean
  is_future: boolean
  score: number
  indicators: {
    health: boolean
    mood: boolean
    spiritual: boolean
    habits: boolean
    finance: boolean
    marketing: boolean
    achievements: boolean
    decisions: boolean
  }
  detail_rows: Array<{
    domain: string
    label: string
    value: string
  }>
  ai_note: string
}

export type TimelineWeekPayload = {
  today: string
  week_start: string
  week_end: string
  days: TimelineDay[]
}

export type Idea = {
  id: string
  title: string
  context: string
  status: 'raw' | 'exploring' | 'validated' | 'archived'
  linked_goal: string | null
  created_at: string
}

export type IdeaPayload = {
  title: string
  context: string
  status: Idea['status']
  linked_goal: string | null
}

export type DecisionLog = {
  id: string
  decision: string
  reasoning: string
  alternatives_considered: string
  outcome: string
  date: string
  created_at: string
}

export type DecisionLogPayload = {
  decision: string
  reasoning: string
  alternatives_considered: string
  outcome: string
  date: string
}

export type Achievement = {
  id: string
  title: string
  domain: string
  date: string
  notes: string
  created_at: string
}

export type AchievementPayload = {
  title: string
  domain: string
  date: string
  notes: string
}

export type FamilyGoal = {
  id: string
  title: string
  who_involved: string
  target_date: string | null
  notes: string
  status: 'active' | 'completed' | 'on_hold'
  created_at: string
}

export type FamilyGoalPayload = {
  title: string
  who_involved: string
  target_date: string | null
  notes: string
  status: FamilyGoal['status']
}

export type Relationship = {
  id: string
  name: string
  relationship_type: string
  last_contact: string | null
  follow_up_notes: string
  created_at: string
}

export type RelationshipPayload = {
  name: string
  relationship_type: string
  last_contact: string | null
  follow_up_notes: string
}

export type Learning = {
  id: string
  topic: string
  source: string
  status: 'not_started' | 'in_progress' | 'completed'
  key_insights: string
  linked_goal: string | null
  created_at: string
}

export type LearningPayload = {
  topic: string
  source: string
  status: Learning['status']
  key_insights: string
  linked_goal: string | null
}

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

/** A single executed tool action returned by the chat endpoint. */
export type ChatAction = {
  tool: string
  result: Record<string, unknown>
}

/** A single message in the chat thread (user or assistant). */
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  actions?: ChatAction[]
}

/** Response from POST /api/core/chat/ */
export type ChatResponse = {
  reply: string
  actions: ChatAction[]
}
