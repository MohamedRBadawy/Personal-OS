import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import * as api from './lib/api'
import type {
  AnalyticsOverviewPayload,
  CommandCenterPayload,
  DashboardPayload,
  GoalMapPayload,
  GoalTreeNode,
  HealthTodayPayload,
  PaginatedResponse,
  PipelineWorkspacePayload,
  TimelineWeekPayload,
  TodaySchedulePayload,
} from './lib/types'
import { renderRoute } from './test/test-utils'

vi.mock('./lib/api', () => ({
  getCommandCenter: vi.fn(),
  getDashboard: vi.fn(),
  submitCheckIn: vi.fn(),
  sendChatMessage: vi.fn(),
  getGoalTree: vi.fn(),
  getGoalMap: vi.fn(),
  getGoalContext: vi.fn(),
  updateGoalNode: vi.fn(),
  getFinanceSummary: vi.fn(),
  listFinanceEntries: vi.fn(),
  createFinanceEntry: vi.fn(),
  getHealthSummary: vi.fn(),
  getHealthToday: vi.fn(),
  listHealthLogs: vi.fn(),
  listMoodLogs: vi.fn(),
  createHealthLog: vi.fn(),
  updateHealthLog: vi.fn(),
  createMoodLog: vi.fn(),
  updateMoodLog: vi.fn(),
  createSpiritualLog: vi.fn(),
  updateSpiritualLog: vi.fn(),
  createHabitLog: vi.fn(),
  updateHabitLog: vi.fn(),
  getTodaySchedule: vi.fn(),
  updateScheduleBlock: vi.fn(),
  createScheduleLog: vi.fn(),
  updateScheduleLog: vi.fn(),
  getTimeline: vi.fn(),
  getAnalyticsOverview: vi.fn(),
  getWeeklyReviewPreview: vi.fn(),
  listWeeklyReviews: vi.fn(),
  generateWeeklyReview: vi.fn(),
  updateWeeklyReview: vi.fn(),
  listSuggestions: vi.fn(),
  actSuggestion: vi.fn(),
  dismissSuggestion: vi.fn(),
  getPipelineWorkspace: vi.fn(),
  createOpportunity: vi.fn(),
  updateOpportunity: vi.fn(),
  listMarketingActions: vi.fn(),
  createMarketingAction: vi.fn(),
  updateMarketingAction: vi.fn(),
  deleteMarketingAction: vi.fn(),
  listIdeas: vi.fn(),
  createIdea: vi.fn(),
  updateIdea: vi.fn(),
  deleteIdea: vi.fn(),
  listDecisions: vi.fn(),
  createDecision: vi.fn(),
  updateDecision: vi.fn(),
  deleteDecision: vi.fn(),
  listAchievements: vi.fn(),
  createAchievement: vi.fn(),
  updateAchievement: vi.fn(),
  deleteAchievement: vi.fn(),
  listFamilyGoals: vi.fn(),
  createFamilyGoal: vi.fn(),
  updateFamilyGoal: vi.fn(),
  deleteFamilyGoal: vi.fn(),
  listRelationships: vi.fn(),
  createRelationship: vi.fn(),
  updateRelationship: vi.fn(),
  deleteRelationship: vi.fn(),
  listLearnings: vi.fn(),
  createLearning: vi.fn(),
  updateLearning: vi.fn(),
  deleteLearning: vi.fn(),
}))

function paginated<T>(results: T[]): PaginatedResponse<T> {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

const baseDashboard: DashboardPayload = {
  date: '2026-04-03',
  profile: {
    id: 'profile-1',
    full_name: 'Mohamed Badawy',
    location: 'Cairo',
    timezone: 'Africa/Cairo',
    background: 'Operational systems builder',
    cognitive_style: 'Structural thinker',
    family_context: 'Married with children',
    life_focus: 'Income and relocation',
  },
  settings: {
    id: 'settings-1',
    name: 'Default Settings',
    independent_income_target_eur: '1000.00',
    employment_income_source_name: 'K Line Europe',
    timezone: 'Africa/Cairo',
    eur_to_usd_rate: '1.0800',
    eur_to_egp_rate: '33.5000',
  },
  briefing: {
    briefing_text: 'Start with the income goal and protect your energy.',
    top_priorities: ['Income goal'],
    observations: ['Energy is stable.'],
    encouragement: 'Stay honest with the data.',
  },
  key_signals: ['Income-generating work stays highest leverage.'],
  finance_summary: {
    month: '2026-04-01',
    total_income_eur: 700,
    total_expense_eur: 100,
    independent_income_eur: 250,
    net_eur: 600,
    kyrgyzstan_progress_pct: 25,
    months_to_target: 3,
    target_eur: '1000.00',
    eur_to_usd_rate: '1.0800',
    eur_to_egp_rate: '33.5000',
  },
  health_summary: {
    date: '2026-04-03',
    avg_sleep_7d: 7,
    avg_energy_7d: 3,
    avg_sleep_30d: 7.2,
    avg_mood_7d: 3,
    avg_mood_30d: 3.1,
    avg_quran_7d: 2,
    exercise_streak: 2,
    full_prayer_streak: 1,
    habit_completion_rate_7d: 60,
    habit_completion_rate_30d: 58,
    prayer_completion_rate_7d: 72,
    dhikr_completion_rate_7d: 43,
    spiritual_consistency_7d: 57,
    low_energy_today: false,
    low_sleep_today: false,
    low_mood_today: false,
    low_mood_streak: 0,
    prayer_gap_streak: 0,
    health_logged_today: false,
    mood_logged_today: false,
    spiritual_logged_today: false,
    active_habits_count: 2,
    habits_completed_today: 0,
  },
  overwhelm: {
    date: '2026-04-03',
    overwhelm_score: 1,
    reduced_mode: false,
    max_priorities: 3,
    burnout_risk: false,
    signals: [],
  },
  top_priorities: [
    {
      id: 'goal-1',
      code: 'g2',
      title: 'Reach EUR 1,000/month independent income',
      type: 'goal',
      category: 'Finance',
      status: 'active',
      parent: null,
      deps: [],
      notes: '',
      completed_at: null,
      progress_pct: 25,
    },
  ],
  pipeline_summary: {
    new_or_reviewing_count: 1,
    applied_count: 0,
    won_count: 0,
    lost_count: 0,
    empty_pipeline: false,
    days_since_last_application: 1,
    due_follow_ups_count: 1,
  },
  today_snapshot: {
    active_project_count: 2,
    blocked_goal_count: 1,
    available_task_count: 4,
    sleep_hours_today: 7,
    energy_level_today: 3,
    mood_score_today: 3,
    completed_habits_today: 1,
    total_habits: 3,
    prayers_count_today: 3,
    marketing_actions_this_month: 4,
    active_leads_count: 2,
  },
  schedule_snapshot: {
    date: '2026-04-03',
    reduced_mode: false,
    low_energy_today: false,
    due_follow_ups_count: 1,
    pending_count: 2,
    blocks: [
      {
        id: 'block-1',
        time: '09:00',
        label: 'Focused work slot',
        type: 'work',
        status: 'pending',
        suggestion_label: 'Reach EUR 1,000/month independent income',
        suggestion_kind: 'goal_node',
      },
      {
        id: 'block-2',
        time: '13:00',
        label: 'Marketing follow-up slot',
        type: 'marketing',
        status: 'pending',
        suggestion_label: 'Follow up with warm LinkedIn lead',
        suggestion_kind: 'marketing_follow_up',
      },
    ],
  },
  review_status: {
    week_start: '2026-03-30',
    week_end: '2026-04-05',
    review_exists: false,
    current_review_id: null,
    latest_review_id: null,
  },
  suggestions_summary: {
    pending_count: 2,
    by_module: {
      analytics: 1,
      pipeline: 1,
    },
  },
  weekly_review_preview: {
    week_start: '2026-03-30',
    week_end: '2026-04-05',
    snippet: 'Weekly Review - Independent income this month: EUR 250',
    report: 'Weekly Review',
  },
  latest_checkin: null,
}

const goalTree: GoalTreeNode[] = [
  {
    ...baseDashboard.top_priorities[0],
    children: [
      {
        id: 'project-1',
        code: 'p1',
        title: 'Build outbound pipeline',
        type: 'project',
        category: 'Work',
        status: 'available',
        parent: 'goal-1',
        deps: [],
        notes: '',
        completed_at: null,
        progress_pct: 50,
        children: [],
      },
    ],
  },
]

const goalMap: GoalMapPayload = {
  nodes: [
    {
      id: 'goal-1',
      code: 'g2',
      title: 'Reach EUR 1,000/month independent income',
      type: 'goal',
      category: 'Finance',
      status: 'active',
      parent: null,
      progress_pct: 25,
      child_count: 1,
      blocked_by: [],
    },
    {
      id: 'project-1',
      code: 'p1',
      title: 'Build outbound pipeline',
      type: 'project',
      category: 'Work',
      status: 'available',
      parent: 'goal-1',
      progress_pct: 50,
      child_count: 1,
      blocked_by: [],
    },
    {
      id: 'task-1',
      code: 't1',
      title: 'Send three outreach messages',
      type: 'task',
      category: 'Work',
      status: 'available',
      parent: 'project-1',
      progress_pct: 0,
      child_count: 0,
      blocked_by: ['goal-1'],
    },
  ],
  edges: [
    { id: 'edge-1', source: 'goal-1', target: 'project-1', kind: 'hierarchy' },
    { id: 'edge-2', source: 'project-1', target: 'task-1', kind: 'hierarchy' },
    { id: 'edge-3', source: 'goal-1', target: 'task-1', kind: 'dependency' },
  ],
  summary: {
    goal_count: 1,
    project_count: 1,
    task_count: 1,
    blocked_count: 0,
  },
}

const healthToday: HealthTodayPayload = {
  date: '2026-04-03',
  summary: baseDashboard.health_summary,
  health_log: null,
  mood_log: null,
  spiritual_log: null,
  habit_board: [
    {
      habit: {
        id: 'habit-1',
        name: 'Cold shower',
        target: 'daily',
        custom_days: null,
        goal: null,
      },
      today_log: null,
      completion_rate_7d: 43,
      completion_rate_30d: 48,
      current_streak: 0,
    },
    {
      habit: {
        id: 'habit-2',
        name: 'LinkedIn outreach',
        target: '3x_week',
        custom_days: null,
        goal: 'goal-1',
      },
      today_log: null,
      completion_rate_7d: 67,
      completion_rate_30d: 58,
      current_streak: 0,
    },
  ],
}

const todaySchedule: TodaySchedulePayload = {
  date: '2026-04-03',
  template: {
    id: 'template-1',
    name: 'Core Day',
    is_active: true,
  },
  low_energy_today: false,
  reduced_mode: false,
  notes: ['1 marketing follow-up item(s) are due.'],
  summary: {
    done_count: 0,
    late_count: 0,
    partial_count: 0,
    skipped_count: 0,
    pending_count: 2,
    due_follow_ups_count: 1,
  },
  blocks: [
    {
      id: 'block-1',
      label: 'Focused work slot',
      type: 'work',
      time: '09:00',
      is_fixed: false,
      is_adjustable: true,
      duration_mins: 90,
      sort_order: 30,
      log: null,
      suggestion_reason: 'This is the highest-priority available work item right now.',
      suggestion: {
        kind: 'goal_node',
        reason: 'This is the highest-priority available work item right now.',
        goal_node: {
          id: 'goal-1',
          title: 'Reach EUR 1,000/month independent income',
          type: 'goal',
          status: 'active',
          parent_title: null,
        },
        marketing_action: null,
      },
    },
    {
      id: 'block-2',
      label: 'Marketing follow-up slot',
      type: 'marketing',
      time: '13:00',
      is_fixed: false,
      is_adjustable: true,
      duration_mins: 45,
      sort_order: 40,
      log: null,
      suggestion_reason: 'A follow-up is due, so this slot is reserved for closing the loop.',
      suggestion: {
        kind: 'marketing_follow_up',
        reason: 'A follow-up is due, so this slot is reserved for closing the loop.',
        goal_node: null,
        marketing_action: {
          id: 'marketing-1',
          action: 'Follow up with warm LinkedIn lead',
          platform: 'LinkedIn',
          follow_up_date: '2026-04-03',
        },
      },
    },
  ],
}

const analyticsOverview: AnalyticsOverviewPayload = {
  date: '2026-04-03',
  health: {
    low_energy_today: false,
    low_mood_today: false,
    avg_sleep_7d: 7,
    avg_mood_7d: 3,
    habit_completion_rate_7d: 60,
    prayer_completion_rate_7d: 72,
  },
  finance: {
    independent_income_eur: 250,
    net_eur: 600,
    kyrgyzstan_progress_pct: 25,
  },
  pipeline: baseDashboard.pipeline_summary,
  counts: {
    health_logs: 3,
    mood_logs: 2,
    spiritual_logs: 2,
    habit_logs: 4,
    marketing_actions: 1,
    ideas: 1,
    decisions: 1,
    achievements: 1,
    relationships: 1,
    family_goals: 1,
    learning_items: 1,
    opportunities: 1,
  },
  history: [
    {
      id: 'history-1',
      domain: 'Finance',
      title: '+250 EUR - Freelance Client',
      detail: 'Upwork lead converted to cash',
      date: '2026-04-03',
    },
  ],
  pattern_analysis: 'Momentum is strongest when health logging stays steady and outreach is active.',
}

const weeklyReviewPreview = {
  week_start: '2026-03-30',
  week_end: '2026-04-05',
  report: 'Weekly Review\n- Independent income this month: EUR 250\n- Honest assessment: momentum is returning.',
  context: {
    goals: {
      done_count: 1,
    },
  },
}

const weeklyReviews = [
  {
    id: 'review-1',
    week_start: '2026-03-30',
    week_end: '2026-04-05',
    ai_report: 'Weekly Review\n- Independent income this month: EUR 250',
    personal_notes: 'Keep the next week narrower.',
    created_at: '2026-04-03T08:00:00Z',
  },
]

const suggestions = [
  {
    id: 'suggestion-1',
    topic: 'weekly_review',
    module: 'analytics',
    suggestion_text: 'Generate the weekly review before the week rolls over.',
    shown_at: '2026-04-03T08:00:00Z',
    acted_on: false,
    dismissed_at: null,
  },
  {
    id: 'suggestion-2',
    topic: 'pipeline_follow_up',
    module: 'pipeline',
    suggestion_text: 'Close one follow-up loop today.',
    shown_at: '2026-04-03T09:00:00Z',
    acted_on: false,
    dismissed_at: null,
  },
]

const timelineWeek: TimelineWeekPayload = {
  today: '2026-04-03',
  week_start: '2026-03-30',
  week_end: '2026-04-05',
  days: [
    {
      date: '2026-03-30',
      is_today: false,
      is_future: false,
      score: 58,
      indicators: {
        health: true,
        mood: true,
        spiritual: false,
        habits: false,
        finance: false,
        marketing: false,
        achievements: false,
        decisions: false,
      },
      detail_rows: [{ domain: 'Mood', label: 'Mood', value: '3/5 - Steady' }],
      ai_note: 'Debrief: mood stayed steady, but the day needed stronger work capture.',
    },
    {
      date: '2026-03-31',
      is_today: false,
      is_future: false,
      score: 64,
      indicators: {
        health: true,
        mood: false,
        spiritual: true,
        habits: true,
        finance: false,
        marketing: true,
        achievements: false,
        decisions: false,
      },
      detail_rows: [{ domain: 'Habits', label: 'Habits', value: 'Cold shower' }],
      ai_note: 'Debrief: anchors were decent, and marketing got a little traction.',
    },
    {
      date: '2026-04-01',
      is_today: false,
      is_future: false,
      score: 75,
      indicators: {
        health: true,
        mood: true,
        spiritual: true,
        habits: true,
        finance: true,
        marketing: false,
        achievements: false,
        decisions: false,
      },
      detail_rows: [{ domain: 'Finance', label: 'Money', value: '+700 EUR' }],
      ai_note: 'Debrief: money moved, and that kept the bigger goal credible.',
    },
    {
      date: '2026-04-02',
      is_today: false,
      is_future: false,
      score: 68,
      indicators: {
        health: true,
        mood: false,
        spiritual: false,
        habits: true,
        finance: false,
        marketing: false,
        achievements: false,
        decisions: true,
      },
      detail_rows: [{ domain: 'Decision', label: 'Decisions', value: 'Keep focus on income' }],
      ai_note: 'Debrief: the day stayed useful because decisions stayed aligned.',
    },
    {
      date: '2026-04-03',
      is_today: true,
      is_future: false,
      score: 70,
      indicators: {
        health: true,
        mood: true,
        spiritual: true,
        habits: true,
        finance: true,
        marketing: true,
        achievements: false,
        decisions: false,
      },
      detail_rows: [{ domain: 'Health', label: 'Body', value: 'Sleep 7h - Energy 3/5' }],
      ai_note: 'Debrief: keep the day narrow and finish the current outreach block.',
    },
    {
      date: '2026-04-04',
      is_today: false,
      is_future: true,
      score: 0,
      indicators: {
        health: false,
        mood: false,
        spiritual: false,
        habits: false,
        finance: false,
        marketing: false,
        achievements: false,
        decisions: false,
      },
      detail_rows: [],
      ai_note: 'Prepare: protect the morning and keep one outreach block visible.',
    },
    {
      date: '2026-04-05',
      is_today: false,
      is_future: true,
      score: 0,
      indicators: {
        health: false,
        mood: false,
        spiritual: false,
        habits: false,
        finance: false,
        marketing: false,
        achievements: false,
        decisions: false,
      },
      detail_rows: [],
      ai_note: 'Prepare: leave room for weekly review and recovery.',
    },
  ],
}

const pipelineWorkspace: PipelineWorkspacePayload = {
  date: '2026-04-03',
  summary: baseDashboard.pipeline_summary,
  active_opportunities: [
    {
      id: 'opp-1',
      name: 'Warm Upwork lead',
      platform: 'Upwork',
      description: 'Migration and dashboard work',
      status: 'reviewing',
      budget: '450.00',
      fit_score: 82,
      fit_reasoning: 'Strong fit with current backend and frontend work.',
      proposal_draft: 'Draft proposal',
      date_found: '2026-04-02',
      date_applied: null,
      date_closed: null,
      outcome_notes: '',
    },
  ],
  recent_outcomes: [],
  due_follow_ups: [
    {
      id: 'marketing-1',
      action: 'Follow up with warm LinkedIn lead',
      platform: 'LinkedIn',
      follow_up_date: '2026-04-03',
      follow_up_done: false,
      date: '2026-04-01',
      result: 'Awaiting reply',
    },
  ],
  recent_clients: [],
}

const commandCenterPayload: CommandCenterPayload = {
  date: '2026-04-03',
  profile: baseDashboard.profile,
  settings: baseDashboard.settings,
  briefing: baseDashboard.briefing,
  key_signals: baseDashboard.key_signals,
  overwhelm: baseDashboard.overwhelm,
  reentry: {
    active: false,
    days_away: 0,
    message: '',
    what_changed: [],
    matters_now: [],
    can_wait: [],
  },
  priorities: [
    {
      id: 'goal-1',
      code: 'g2',
      title: 'Reach EUR 1,000/month independent income',
      type: 'goal',
      category: 'Finance',
      status: 'active',
      parent: null,
      parent_title: null,
      notes: '',
      deps: [],
      blocked_by_titles: [],
      ancestor_titles: [],
      progress_pct: 25,
      due_date: null,
      manual_priority: null,
      dependency_unblock_count: 1,
      recommended_tool: 'Claude',
      tool_reasoning: 'This work benefits from thinking, structuring, or drafting before execution.',
      is_overdue: false,
      due_in_days: null,
    },
  ],
  top_priorities: [
    {
      id: 'goal-1',
      code: 'g2',
      title: 'Reach EUR 1,000/month independent income',
      type: 'goal',
      category: 'Finance',
      status: 'active',
      parent: null,
      parent_title: null,
      notes: '',
      deps: [],
      blocked_by_titles: [],
      ancestor_titles: [],
      progress_pct: 25,
      due_date: null,
      manual_priority: null,
      dependency_unblock_count: 1,
      recommended_tool: 'Claude',
      tool_reasoning: 'This work benefits from thinking, structuring, or drafting before execution.',
      is_overdue: false,
      due_in_days: null,
    },
  ],
  schedule: todaySchedule,
  health_today: healthToday,
  finance: {
    summary: baseDashboard.finance_summary,
    recent_entries: [
      {
        id: 'entry-1',
        type: 'income',
        source: 'K Line Europe',
        amount: '700.00',
        amount_eur: 700,
        currency: 'EUR',
        is_independent: false,
        is_recurring: true,
        date: '2026-04-01',
        notes: '',
      },
    ],
  },
  pipeline: pipelineWorkspace,
  weekly_review: {
    status: baseDashboard.review_status,
    preview: {
      week_start: '2026-03-30',
      week_end: '2026-04-05',
      snippet: 'Weekly Review - Independent income this month: EUR 250',
      report: 'Weekly Review',
    },
    pending_suggestions_count: 2,
    pending_suggestions: [
      {
        id: 'suggestion-1',
        topic: 'weekly_review',
        module: 'analytics',
        suggestion_text: 'Generate the weekly review before the week rolls over.',
        shown_at: '2026-04-03T08:00:00Z',
      },
      {
        id: 'suggestion-2',
        topic: 'pipeline_follow_up',
        module: 'pipeline',
        suggestion_text: 'Close one follow-up loop today.',
        shown_at: '2026-04-03T09:00:00Z',
      },
    ],
  },
  status_cards: [
    { id: 'goals', label: 'Goals and tasks', value: 1, total: 3, status: 'clear', detail: '0 blocked - 2 ready now', route: '/goals' },
    { id: 'schedule', label: "Today's schedule", value: 0, total: 2, status: 'attention', detail: '2 pending - 0 skipped', route: '/schedule' },
    { id: 'finance', label: 'Independent income', value: 250, total: 1000, status: 'attention', detail: 'Net this month: 600 EUR', route: '/finance' },
  ],
  recent_progress: [
    {
      id: 'progress-1',
      kind: 'win',
      domain: 'Work',
      title: 'Backend foundation shipped',
      detail: 'Migrations and read models are live.',
      date: '2026-04-01',
    },
  ],
  latest_checkin: null,
}

const marketingActions = [
  {
    id: 'marketing-1',
    action: 'Publish case study snippet',
    platform: 'LinkedIn',
    goal: null,
    result: '2 inbound replies',
    follow_up_date: '2026-04-04',
    follow_up_done: false,
    date: '2026-04-03',
    created_at: '2026-04-03T08:00:00Z',
  },
]

const ideas = [
  {
    id: 'idea-1',
    title: 'Telegram notifications',
    context: 'Useful for daily reminders later.',
    status: 'raw' as const,
    linked_goal: null,
    created_at: '2026-04-03T08:00:00Z',
  },
]

const decisions = [
  {
    id: 'decision-1',
    decision: 'Ship backend-first',
    reasoning: 'Stabilize contracts before polish.',
    alternatives_considered: 'Prototype-first',
    outcome: '',
    date: '2026-04-02',
    created_at: '2026-04-02T08:00:00Z',
  },
]

const achievements = [
  {
    id: 'achievement-1',
    title: 'Backend foundation shipped',
    domain: 'Work',
    date: '2026-04-01',
    notes: 'Migrations and read models are live.',
    created_at: '2026-04-01T08:00:00Z',
  },
]

const familyGoals = [
  {
    id: 'family-1',
    title: 'Plan family relocation docs',
    who_involved: 'Mohamed and spouse',
    target_date: '2026-05-01',
    notes: 'Collect passport and school papers.',
    status: 'active' as const,
    created_at: '2026-04-01T08:00:00Z',
  },
]

const relationships = [
  {
    id: 'relationship-1',
    name: 'Ahmed Mentor',
    relationship_type: 'mentor',
    last_contact: '2026-04-01',
    follow_up_notes: 'Share current client pipeline progress.',
    created_at: '2026-04-01T08:00:00Z',
  },
]

const learnings = [
  {
    id: 'learning-1',
    topic: 'Django service design',
    source: 'Internal implementation',
    status: 'in_progress' as const,
    key_insights: 'Keep orchestration in services.',
    linked_goal: null,
    created_at: '2026-04-01T08:00:00Z',
  },
]

beforeEach(() => {
  vi.mocked(api.getCommandCenter).mockResolvedValue(commandCenterPayload)
  vi.mocked(api.getDashboard).mockResolvedValue(baseDashboard)
  vi.mocked(api.submitCheckIn).mockResolvedValue({
    checkin_id: 'checkin-1',
    health_log_id: 'health-1',
    mood_log_id: 'mood-1',
    finance_entry_ids: [],
    idea_id: 'idea-1',
    blocker_id: 'blocker-1',
    briefing: {
      briefing_text: 'Keep today light and finish the highest leverage task.',
      top_priorities: ['Income goal'],
      observations: ['Energy is low today.'],
      encouragement: 'Reduce scope before adding more load.',
    },
    finance_summary: baseDashboard.finance_summary,
    health_summary: {
      ...baseDashboard.health_summary,
      low_energy_today: true,
    },
  })
  vi.mocked(api.sendChatMessage).mockResolvedValue({
    reply: 'Captured that and updated the system.',
    actions: [],
    affected_modules: ['goals'],
  })
  vi.mocked(api.getGoalTree).mockResolvedValue(goalTree)
  vi.mocked(api.getGoalMap).mockResolvedValue(goalMap)
  vi.mocked(api.getGoalContext).mockResolvedValue({
    node: goalTree[0],
    ancestors: [],
    dependents: [],
    progress_pct: 25,
  })
  vi.mocked(api.updateGoalNode).mockResolvedValue(goalTree[0])
  vi.mocked(api.getFinanceSummary).mockResolvedValue(baseDashboard.finance_summary)
  vi.mocked(api.listFinanceEntries).mockResolvedValue(
    paginated([
      {
        id: 'entry-1',
        type: 'income',
        source: 'K Line Europe',
        amount: '700.00',
        amount_eur: 700,
        currency: 'EUR',
        is_independent: false,
        is_recurring: true,
        date: '2026-04-01',
        notes: '',
      },
    ]),
  )
  vi.mocked(api.createFinanceEntry).mockResolvedValue({
    id: 'entry-2',
    type: 'income',
    source: 'Freelance Client',
    amount: '250.00',
    amount_eur: 250,
    currency: 'EUR',
    is_independent: true,
    is_recurring: false,
    date: '2026-04-03',
    notes: '',
  })
  vi.mocked(api.getHealthSummary).mockResolvedValue(baseDashboard.health_summary)
  vi.mocked(api.getHealthToday).mockResolvedValue(healthToday)
  vi.mocked(api.listHealthLogs).mockResolvedValue(
    paginated([
      {
        id: 'health-1',
        date: '2026-04-02',
        sleep_hours: '7.5',
        sleep_quality: 4,
        energy_level: 3,
        exercise_done: true,
        exercise_type: 'Walk',
        exercise_duration_mins: 30,
        weight_kg: null,
        nutrition_notes: '',
      },
    ]),
  )
  vi.mocked(api.listMoodLogs).mockResolvedValue(
    paginated([
      {
        id: 'mood-0',
        date: '2026-04-01',
        mood_score: 3,
        notes: 'Steady',
      },
    ]),
  )
  vi.mocked(api.createHealthLog).mockResolvedValue({
    id: 'health-2',
    date: '2026-04-03',
    sleep_hours: '6.5',
    sleep_quality: 3,
    energy_level: 3,
    exercise_done: false,
    exercise_type: '',
    exercise_duration_mins: null,
    weight_kg: null,
    nutrition_notes: '',
  })
  vi.mocked(api.updateHealthLog).mockResolvedValue({
    id: 'health-2',
    date: '2026-04-03',
    sleep_hours: '6.5',
    sleep_quality: 3,
    energy_level: 3,
    exercise_done: false,
    exercise_type: '',
    exercise_duration_mins: null,
    weight_kg: null,
    nutrition_notes: '',
  })
  vi.mocked(api.createMoodLog).mockResolvedValue({
    id: 'mood-1',
    date: '2026-04-03',
    mood_score: 2,
    notes: 'Low focus',
  })
  vi.mocked(api.updateMoodLog).mockResolvedValue({
    id: 'mood-1',
    date: '2026-04-03',
    mood_score: 4,
    notes: 'Recovered',
  })
  vi.mocked(api.createSpiritualLog).mockResolvedValue({
    id: 'spiritual-1',
    date: '2026-04-03',
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
    quran_pages: 3,
    dhikr_done: true,
    notes: '',
    prayers_count: 5,
  })
  vi.mocked(api.updateSpiritualLog).mockResolvedValue({
    id: 'spiritual-1',
    date: '2026-04-03',
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
    quran_pages: 5,
    dhikr_done: true,
    notes: 'Good anchor',
    prayers_count: 5,
  })
  vi.mocked(api.createHabitLog).mockResolvedValue({
    id: 'habit-log-1',
    habit: 'habit-1',
    date: '2026-04-03',
    done: true,
    note: '',
  })
  vi.mocked(api.updateHabitLog).mockResolvedValue({
    id: 'habit-log-1',
    habit: 'habit-1',
    date: '2026-04-03',
    done: false,
    note: '',
  })
  vi.mocked(api.getTodaySchedule).mockResolvedValue(todaySchedule)
  vi.mocked(api.updateScheduleBlock).mockResolvedValue({
    id: 'block-1',
    label: 'Focused work slot',
    type: 'work',
    time: '09:00',
    is_fixed: false,
    is_adjustable: true,
    duration_mins: 90,
    sort_order: 30,
  })
  vi.mocked(api.createScheduleLog).mockResolvedValue({
    id: 'schedule-log-1',
    date: '2026-04-03',
    status: 'done',
    actual_time: null,
    note: '',
    task_node: {
      id: 'goal-1',
      title: 'Reach EUR 1,000/month independent income',
      type: 'goal',
      status: 'active',
      parent_title: null,
    },
  })
  vi.mocked(api.updateScheduleLog).mockResolvedValue({
    id: 'schedule-log-1',
    date: '2026-04-03',
    status: 'done',
    actual_time: null,
    note: '',
    task_node: {
      id: 'goal-1',
      title: 'Reach EUR 1,000/month independent income',
      type: 'goal',
      status: 'active',
      parent_title: null,
    },
  })
  vi.mocked(api.getTimeline).mockResolvedValue(timelineWeek)
  vi.mocked(api.getAnalyticsOverview).mockResolvedValue(analyticsOverview)
  vi.mocked(api.getWeeklyReviewPreview).mockResolvedValue(weeklyReviewPreview)
  vi.mocked(api.listWeeklyReviews).mockResolvedValue(paginated(weeklyReviews))
  vi.mocked(api.generateWeeklyReview).mockResolvedValue({
    review: weeklyReviews[0],
    preview: weeklyReviewPreview,
  })
  vi.mocked(api.updateWeeklyReview).mockResolvedValue(weeklyReviews[0])
  vi.mocked(api.listSuggestions).mockResolvedValue(paginated(suggestions))
  vi.mocked(api.actSuggestion).mockResolvedValue({
    ...suggestions[0],
    acted_on: true,
    dismissed_at: null,
  })
  vi.mocked(api.dismissSuggestion).mockResolvedValue({
    ...suggestions[1],
    acted_on: false,
    dismissed_at: '2026-04-03T10:00:00Z',
  })
  vi.mocked(api.getPipelineWorkspace).mockResolvedValue(pipelineWorkspace)
  vi.mocked(api.createOpportunity).mockResolvedValue({
    id: 'opp-2',
    name: 'New direct lead',
    platform: 'Direct',
    description: 'API work',
    budget: '300.00',
    status: 'new',
    fit_score: 70,
    fit_reasoning: 'Solid fit',
    date_found: '2026-04-03',
    date_applied: null,
    date_closed: null,
    proposal_draft: '',
    outcome_notes: '',
    created_at: '2026-04-03T08:00:00Z',
    updated_at: '2026-04-03T08:00:00Z',
  })
  vi.mocked(api.updateOpportunity).mockResolvedValue({
    id: 'opp-1',
    name: 'Warm Upwork lead',
    platform: 'Upwork',
    description: 'Migration and dashboard work',
    budget: '450.00',
    status: 'applied',
    fit_score: 82,
    fit_reasoning: 'Strong fit with current backend and frontend work.',
    date_found: '2026-04-02',
    date_applied: '2026-04-03',
    date_closed: null,
    proposal_draft: 'Draft proposal',
    outcome_notes: '',
    created_at: '2026-04-02T08:00:00Z',
    updated_at: '2026-04-03T08:00:00Z',
  })
  vi.mocked(api.listMarketingActions).mockResolvedValue(paginated(marketingActions))
  vi.mocked(api.createMarketingAction).mockResolvedValue(marketingActions[0])
  vi.mocked(api.updateMarketingAction).mockResolvedValue(marketingActions[0])
  vi.mocked(api.deleteMarketingAction).mockResolvedValue(null)
  vi.mocked(api.listIdeas).mockResolvedValue(paginated(ideas))
  vi.mocked(api.createIdea).mockResolvedValue(ideas[0])
  vi.mocked(api.updateIdea).mockResolvedValue(ideas[0])
  vi.mocked(api.deleteIdea).mockResolvedValue(null)
  vi.mocked(api.listDecisions).mockResolvedValue(paginated(decisions))
  vi.mocked(api.createDecision).mockResolvedValue(decisions[0])
  vi.mocked(api.updateDecision).mockResolvedValue(decisions[0])
  vi.mocked(api.deleteDecision).mockResolvedValue(null)
  vi.mocked(api.listAchievements).mockResolvedValue(paginated(achievements))
  vi.mocked(api.createAchievement).mockResolvedValue(achievements[0])
  vi.mocked(api.updateAchievement).mockResolvedValue(achievements[0])
  vi.mocked(api.deleteAchievement).mockResolvedValue(null)
  vi.mocked(api.listFamilyGoals).mockResolvedValue(paginated(familyGoals))
  vi.mocked(api.createFamilyGoal).mockResolvedValue(familyGoals[0])
  vi.mocked(api.updateFamilyGoal).mockResolvedValue(familyGoals[0])
  vi.mocked(api.deleteFamilyGoal).mockResolvedValue(null)
  vi.mocked(api.listRelationships).mockResolvedValue(paginated(relationships))
  vi.mocked(api.createRelationship).mockResolvedValue(relationships[0])
  vi.mocked(api.updateRelationship).mockResolvedValue(relationships[0])
  vi.mocked(api.deleteRelationship).mockResolvedValue(null)
  vi.mocked(api.listLearnings).mockResolvedValue(paginated(learnings))
  vi.mocked(api.createLearning).mockResolvedValue(learnings[0])
  vi.mocked(api.updateLearning).mockResolvedValue(learnings[0])
  vi.mocked(api.deleteLearning).mockResolvedValue(null)
})

describe('route smoke tests', () => {
  test.each([
    ['/', /priority stack/i],
    ['/timeline', /week rhythm and daily debriefs/i],
    ['/analytics', /overview, history, patterns, and review/i],
    ['/goals', /dependency-aware map/i],
    ['/family', /shared family goals deserve a dedicated place in the system/i],
    ['/relationships', /keep people and follow-up context visible inside the main product/i],
    ['/schedule', /daily operating loop/i],
    ['/finance', /money movement and independence progress/i],
    ['/pipeline', /opportunities, follow-ups, and outcomes/i],
    ['/marketing', /marketing actions and follow-ups/i],
    ['/learning', /track books, courses, and skill-building/i],
    ['/health', /energy, sleep, and body trends/i],
    ['/ideas', /idea inbox and development/i],
    ['/decisions', /decision log/i],
    ['/achievements', /wins should stay visible/i],
  ])('renders %s', async (route, heading) => {
    renderRoute(route)
    expect(await screen.findByText(heading)).toBeInTheDocument()
  })
})

describe('core expanded flows', () => {
  test('prefills the command center capture box from a quick action', async () => {
    renderRoute('/')
    expect(await screen.findByText(/start with the income goal/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^task$/i }))

    expect(screen.getByLabelText(/capture input/i)).toHaveValue('Create a task: ')
  })

  test('switches goals page to map view', async () => {
    renderRoute('/goals')
    await userEvent.click(await screen.findByRole('button', { name: /^map$/i }))

    expect(await screen.findByText(/see goal-project-task relationships/i)).toBeInTheDocument()
    await waitFor(() => expect(api.getGoalMap).toHaveBeenCalled())
  })

  test('selects a future timeline day and shows its prepare note', async () => {
    renderRoute('/timeline')
    await userEvent.click(await screen.findByRole('button', { name: /4 apr 2026/i }))

    expect(await screen.findByText(/protect the morning and keep one outreach block visible/i)).toBeInTheDocument()
  })

  test('switches analytics to patterns tab', async () => {
    renderRoute('/analytics')
    await userEvent.click(await screen.findByRole('button', { name: /patterns/i }))

    expect(await screen.findByText(/momentum is strongest when health logging stays steady/i)).toBeInTheDocument()
  })

  test('shows the weekly loop card on the home page', async () => {
    renderRoute('/')

    expect(await screen.findByText(/this week review/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pending suggestions/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open analytics/i })).toBeInTheDocument()
  })
})

describe('workspaces', () => {
  test('creates a finance entry', async () => {
    renderRoute('/finance')
    await userEvent.type(await screen.findByLabelText(/source/i), 'Freelance Client')
    await userEvent.clear(screen.getByLabelText(/amount/i))
    await userEvent.type(screen.getByLabelText(/amount/i), '250')
    await userEvent.click(screen.getByRole('button', { name: /add finance entry/i }))

    await waitFor(() => expect(api.createFinanceEntry).toHaveBeenCalledTimes(1))
  })

  test('creates a schedule log when a block status is recorded', async () => {
    renderRoute('/schedule')

    await userEvent.click((await screen.findAllByRole('button', { name: /^done$/i }))[0])

    await waitFor(() => expect(api.createScheduleLog).toHaveBeenCalledTimes(1))
  })

  test('creates an opportunity from the pipeline workspace', async () => {
    renderRoute('/pipeline')
    await userEvent.type(await screen.findByLabelText(/opportunity name/i), 'New direct lead')
    await userEvent.type(screen.getByLabelText(/description/i), 'API work')
    await userEvent.click(screen.getByRole('button', { name: /add opportunity/i }))

    await waitFor(() => expect(api.createOpportunity).toHaveBeenCalledTimes(1))
  })

  test('marks a due follow-up done from the pipeline workspace', async () => {
    renderRoute('/pipeline')
    await userEvent.click(await screen.findByRole('button', { name: /mark follow-up done/i }))

    await waitFor(() => expect(api.updateMarketingAction).toHaveBeenCalledWith('marketing-1', { follow_up_done: true }))
  })

  test('creates a marketing action in the generic workspace', async () => {
    renderRoute('/marketing')
    await userEvent.type(await screen.findByLabelText(/^action$/i), 'Share a case study')
    await userEvent.click(screen.getByRole('button', { name: /add marketing action/i }))

    await waitFor(() => expect(api.createMarketingAction).toHaveBeenCalledTimes(1))
  })
})

describe('health workspace interactions', () => {
  test('creates a body log and keeps the existing body flow working', async () => {
    vi.mocked(api.getHealthToday)
      .mockResolvedValueOnce(healthToday)
      .mockResolvedValueOnce({
        ...healthToday,
        summary: {
          ...healthToday.summary,
          health_logged_today: true,
        },
        health_log: {
          id: 'health-2',
          date: '2026-04-03',
          sleep_hours: '6.5',
          sleep_quality: 3,
          energy_level: 3,
          exercise_done: false,
          exercise_type: '',
          exercise_duration_mins: null,
          weight_kg: null,
          nutrition_notes: '',
        },
      })

    renderRoute('/health')
    await userEvent.click(await screen.findByRole('button', { name: /save health log/i }))

    await waitFor(() => expect(api.createHealthLog).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(/today is already logged/i)).toBeInTheDocument()
  })
})

describe('review workflow', () => {
  test('generates a weekly review from analytics', async () => {
    renderRoute('/analytics')
    await userEvent.click(await screen.findByRole('button', { name: /review/i }))
    await userEvent.click(await screen.findByRole('button', { name: /generate weekly review/i }))

    await waitFor(() => expect(api.generateWeeklyReview).toHaveBeenCalledTimes(1))
    expect(await screen.findByDisplayValue(/keep the next week narrower/i)).toBeInTheDocument()
  })

  test('saves review notes from analytics', async () => {
    renderRoute('/analytics')
    await userEvent.click(await screen.findByRole('button', { name: /review/i }))
    await userEvent.clear(await screen.findByLabelText(/personal notes/i))
    await userEvent.type(screen.getByLabelText(/personal notes/i), 'Protect the first two hours every day.')
    await userEvent.click(screen.getByRole('button', { name: /save review notes/i }))

    await waitFor(() =>
      expect(api.updateWeeklyReview).toHaveBeenCalledWith('review-1', {
        personal_notes: 'Protect the first two hours every day.',
      }),
    )
  })

  test('acts on and dismisses suggestions from analytics', async () => {
    renderRoute('/analytics')
    await userEvent.click(await screen.findByRole('button', { name: /review/i }))
    await userEvent.click((await screen.findAllByRole('button', { name: /acted on/i }))[0])
    await userEvent.click((await screen.findAllByRole('button', { name: /dismiss/i }))[1])

    await waitFor(() =>
      expect(api.actSuggestion).toHaveBeenCalledWith('suggestion-1', expect.anything()),
    )
    await waitFor(() =>
      expect(api.dismissSuggestion).toHaveBeenCalledWith('suggestion-2', expect.anything()),
    )
  })
})

describe('route error states', () => {
  test('shows an error state when timeline fails', async () => {
    vi.mocked(api.getTimeline).mockRejectedValueOnce(new Error('boom'))
    renderRoute('/timeline')
    expect(await screen.findByText(/could not load the timeline/i)).toBeInTheDocument()
  })

  test('shows an error state when pipeline fails', async () => {
    vi.mocked(api.getPipelineWorkspace).mockRejectedValueOnce(new Error('boom'))
    renderRoute('/pipeline')
    expect(await screen.findByText(/could not load the pipeline workspace/i)).toBeInTheDocument()
  })
})
