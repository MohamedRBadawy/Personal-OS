import type { GoalNodeType, GoalNodeStatus } from './goals'

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

export type ScheduleBlockPayload = {
  template: string
  time: string
  label: string
  type: string
  is_fixed: boolean
  duration_mins: number
  is_adjustable: boolean
  sort_order: number
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

export type RoutineLogEntry = {
  id: number
  date: string
  block_time: string
  status: 'done' | 'partial' | 'late' | 'skipped'
  actual_time: string | null
  note: string
  updated_at: string
}

export type RoutineBlock = {
  id: number
  time: string            // "05:00:00" raw from API
  time_str: string        // "05:00" from SerializerMethodField
  label: string
  type: 'spiritual' | 'health' | 'work' | 'personal' | 'family'
  importance: 'must' | 'should' | 'nice'
  duration_minutes: number
  is_fixed: boolean
  order: number
  active: boolean
  linked_node: string | null
  linked_node_title: string | null
  linked_node_progress: number | null
  // Detail fields (always present, default '')
  description: string
  days_of_week: string      // "" = all days; "135" = Mon/Wed/Fri
  // Spiritual
  location: string          // "" | "mosque" | "home" | "online"
  target: string            // free text e.g. "1 juz Quran"
  // Health
  exercise_type: string     // "" | "cardio" | "strength" | "yoga" | "hiit" | "swimming" | "cycling"
  intensity: string         // "" | "low" | "medium" | "high"
  // Work
  focus_area: string        // "" | "deep_work" | "email" | "calls" | "admin" | "outreach"
  deliverable: string       // free text
}

export type BlockStreakStatus = 'done' | 'partial' | 'late' | 'skipped' | null

export type BlockStreakEntry = {
  block_id: number
  label: string
  type: string
  time_str: string
  streak: number
  last_7: BlockStreakStatus[]
}

export type BlockStreaksPayload = {
  overall_streak: number
  blocks: BlockStreakEntry[]
}

export type RoutineMetrics = {
  days: number
  prayer_rate: number          // % of spiritual block slots done/partial
  prayer_streak: number        // consecutive full-prayer days before today
  prayer_blocks_per_day: number
  exercise_rate: number        // % of health block slots done/partial
  exercise_streak: number      // consecutive days with ≥1 health block done
  exercise_blocks_per_day: number
}

export type RoutineDailyEntry = {
  date: string
  total: number
  done: number
  partial: number
  late: number
  skipped: number
  pct: number
}

export type RoutineTypeStats = {
  rate: number
  done: number
  partial: number
  late: number
  skipped: number
  total: number
}

export type RoutineBlockStat = {
  block_id: number
  label: string
  type: string
  time_str: string
  done: number
  partial: number
  late: number
  skipped: number
  total_days: number
  rate: number
  avg_drift_minutes: number | null
}

export type RoutineAnalyticsData = {
  days: number
  daily: RoutineDailyEntry[]
  by_type: Record<string, RoutineTypeStats>
  block_stats: RoutineBlockStat[]
  by_weekday: Record<string, Record<string, number>>  // type -> weekday(1-7) -> rate%
}

// ── Scheduled Entries ─────────────────────────────────────────────────────────

export type ScheduledEntry = {
  id: number
  date: string          // "2026-04-08"
  time: string          // "09:00:00"
  duration_minutes: number
  node: string | null   // UUID
  node_title: string | null
  label: string
  done: boolean
  created_at: string
}

export type ScheduledEntryPayload = {
  date: string
  time: string
  duration_minutes: number
  node?: string | null
  label?: string
  done?: boolean
}
