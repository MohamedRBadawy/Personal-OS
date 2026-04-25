import type { PipelineSummary } from './pipeline'
import type { Achievement } from './learning'
import type { GoalNodeType } from './goals'
import type { WeeklyReviewPreview } from './base'

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

export type TimelineOverviewPayload = {
  date: string
  timeline: TimelineWeekPayload
  weekly_review: {
    status: {
      week_start: string
      week_end: string
      review_exists: boolean
      current_review_id: string | null
      latest_review_id: string | null
    }
    preview: WeeklyReviewPreview
  }
  pattern_analysis: string
  achievements: Achievement[]
  retrospectives: Array<{
    id: string
    title: string
    source_type: string
    status: string
    summary: string
    what_worked: string
    what_didnt: string
    next_time: string
    closed_at: string
  }>
  archived_goals: Array<{
    id: string
    title: string
    type: GoalNodeType
    category: string | null
    completed_at: string | null
    notes: string
  }>
}

export type ReviewCommitmentAction = 'stop' | 'change' | 'start'

export type ReviewCommitment = {
  id: string
  review: string
  action_type: ReviewCommitmentAction
  description: string
  node_update: string | null
  node_update_title: string | null
  checked_in_review: string | null
  was_kept: boolean | null
  created_at: string
}

export type ReviewCommitmentPayload = {
  action_type: ReviewCommitmentAction
  description: string
  node_update?: string | null
}
