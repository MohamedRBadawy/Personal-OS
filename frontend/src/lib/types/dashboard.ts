import type { Profile, AppSettings, MorningBriefing, WeeklyReviewPreview } from './base'
import type { GoalNode, GoalNodeType, GoalNodeStatus, GoalNodeManualPriority, NodeStatus, DashboardTask } from './goals'
import type { FinanceSummary, FinanceEntry, CheckInFinanceDelta } from './finance'
import type { HealthSummary, HealthTodayPayload, OverwhelmSummary } from './health'
import type { PipelineSummary, PipelineWorkspacePayload, PipelineWorkspaceMarketingAction, PipelineWorkspaceOpportunity } from './pipeline'
import type { TodaySchedulePayload, ScheduleSnapshot } from './schedule'

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

export type CommandCenterPriorityItem = {
  id: string
  code: string | null
  title: string
  type: GoalNodeType
  category: string | null
  status: GoalNodeStatus
  parent: string | null
  parent_title: string | null
  notes: string
  deps: string[]
  blocked_by_titles: string[]
  ancestor_titles: string[]
  progress_pct: number
  due_date: string | null
  manual_priority: GoalNodeManualPriority
  dependency_unblock_count: number
  recommended_tool: string
  tool_reasoning: string
  is_overdue: boolean
  due_in_days: number | null
}

export type CommandCenterStatusCard = {
  id: string
  label: string
  value: number
  total: number
  status: 'clear' | 'attention' | 'warning'
  detail: string
  route: string
}

export type CommandCenterRecentProgressItem = {
  id: string
  kind: 'completion' | 'win'
  domain: string
  title: string
  detail: string
  date: string
}

export type CommandCenterReentry = {
  active: boolean
  days_away: number
  message: string
  what_changed: string[]
  matters_now: string[]
  can_wait: string[]
}

export type CommandCenterSuggestionItem = {
  id: string
  topic: string
  module: string
  suggestion_text: string
  shown_at: string
}

export type CommandCenterPayload = {
  date: string
  profile: Profile | null
  settings: AppSettings | null
  briefing: MorningBriefing
  key_signals: string[]
  overwhelm: OverwhelmSummary
  reentry: CommandCenterReentry
  priorities: CommandCenterPriorityItem[]
  top_priorities: CommandCenterPriorityItem[]
  schedule: TodaySchedulePayload
  health_today: HealthTodayPayload
  finance: {
    summary: FinanceSummary
    recent_entries: FinanceEntry[]
  }
  pipeline: PipelineWorkspacePayload
  weekly_review: {
    status: {
      week_start: string
      week_end: string
      review_exists: boolean
      current_review_id: string | null
      latest_review_id: string | null
    }
    preview: WeeklyReviewPreview
    pending_suggestions_count: number
    pending_suggestions: CommandCenterSuggestionItem[]
  }
  status_cards: CommandCenterStatusCard[]
  recent_progress: CommandCenterRecentProgressItem[]
  latest_checkin: {
    id: string
    date: string
    inbox_text: string
    blockers_text: string
  } | null
}

export type DashboardMilestone = {
  label: string
  done: boolean
  next: boolean
}

export type DashboardHealthPulse = {
  avg_sleep_7d: number | null
  avg_mood_7d: number | null
  exercise_streak: number
  full_prayer_streak: number
  prayer_completion_rate_7d: number | null
  health_logged_today: boolean
  mood_logged_today: boolean
  spiritual_logged_today: boolean
  alerts: Array<'low_sleep' | 'low_mood' | 'prayer_gap'>
}

export type DashboardJournalStatus = {
  journaled_today: boolean
  tomorrow_focus: string
}

export type DashboardContactsDue = {
  count: number
  top: Array<{ id: number; name: string; relation: string }>
}

export type DashboardFinanceDetail = {
  savings_current_egp: number
  savings_target_egp: number
  savings_pct: number | null
  total_debt_egp: number
  monthly_budget_egp: number | null
}

export type DashboardV2 = {
  independent_monthly: number
  target_independent: number
  income_eur: number
  income_egp: number
  monthly_expenses_egp: number
  surplus_egp: number
  node_counts: {
    active: number
    available: number
    blocked: number
    done: number
    deferred: number
    total: number
  }
  top_tasks: DashboardTask[]
  blocked_goals: Array<{ id: string; title: string; blocked_by: string[] }>
  milestones: DashboardMilestone[]
  routine_today: { done: number; total: number; pct: number }
  health_pulse: DashboardHealthPulse
  journal_status: DashboardJournalStatus
  contacts_due: DashboardContactsDue
  finance_detail: DashboardFinanceDetail
}

export type WorkOverviewPayload = {
  date: string
  summary: {
    active_task_count: number
    blocked_task_count: number
    deadline_count: number
    proposal_draft_count: number
    due_follow_ups_count: number
    active_opportunity_count: number
  }
  task_board: CommandCenterPriorityItem[]
  deadlines: CommandCenterPriorityItem[]
  pipeline: PipelineWorkspacePayload
  marketing_actions: PipelineWorkspaceMarketingAction[]
  proposal_drafts: PipelineWorkspaceOpportunity[]
}
