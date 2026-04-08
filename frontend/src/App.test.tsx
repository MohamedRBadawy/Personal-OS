import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as api from './lib/api'
import { renderRoute } from './test/test-utils'

vi.mock('./lib/api', () => ({
  getCommandCenter: vi.fn(),
  getDashboard: vi.fn(),
  submitCheckIn: vi.fn(),
  sendChatMessage: vi.fn(),
  getGoalTree: vi.fn(),
  getGoalMap: vi.fn(),
  getGoalContext: vi.fn(),
  createGoalNode: vi.fn(),
  updateGoalNode: vi.fn(),
  deleteGoalNode: vi.fn(),
  listGoalAttachmentProfiles: vi.fn(),
  createGoalAttachmentProfile: vi.fn(),
  updateGoalAttachmentProfile: vi.fn(),
  getFinanceSummary: vi.fn(),
  getFinanceOverview: vi.fn(),
  listFinanceEntries: vi.fn(),
  createFinanceEntry: vi.fn(),
  listIncomeSources: vi.fn(),
  createIncomeSource: vi.fn(),
  updateIncomeSource: vi.fn(),
  deleteIncomeSource: vi.fn(),
  getFinancialReport: vi.fn(),
  getProgressReport: vi.fn(),
  getPersonalReviewReport: vi.fn(),
  getHealthSummary: vi.fn(),
  getHealthOverview: vi.fn(),
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
  getTimelineOverview: vi.fn(),
  getAnalyticsOverview: vi.fn(),
  getWeeklyReviewPreview: vi.fn(),
  listWeeklyReviews: vi.fn(),
  generateWeeklyReview: vi.fn(),
  updateWeeklyReview: vi.fn(),
  listSuggestions: vi.fn(),
  actSuggestion: vi.fn(),
  dismissSuggestion: vi.fn(),
  getPipelineWorkspace: vi.fn(),
  getWorkOverview: vi.fn(),
  createOpportunity: vi.fn(),
  updateOpportunity: vi.fn(),
  listMarketingActions: vi.fn(),
  createMarketingAction: vi.fn(),
  updateMarketingAction: vi.fn(),
  deleteMarketingAction: vi.fn(),
  getIdeasOverview: vi.fn(),
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

function paginated<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

afterEach(() => {
  cleanup()
})

const goalNode = {
  id: 'goal-1',
  code: 'g2',
  title: 'Reach EUR 1,000/month independent income',
  type: 'goal',
  category: 'Finance',
  status: 'active',
  parent: null,
  parent_title: null,
  notes: 'Protect the income engine.',
  deps: [],
  blocked_by_titles: [],
  ancestor_titles: [],
  progress_pct: 25,
  due_date: null,
  manual_priority: null,
  dependency_unblock_count: 2,
  recommended_tool: 'Claude',
  tool_reasoning: 'This work benefits from thinking, structuring, or drafting before execution.',
  is_overdue: false,
  due_in_days: null,
}

const taskNode = {
  id: 'task-1',
  code: 't1',
  title: 'Build command center backend',
  type: 'task',
  category: 'Career',
  status: 'available',
  parent: 'goal-1',
  parent_title: 'Reach EUR 1,000/month independent income',
  notes: 'Wire the overview endpoints and keep the UX clear.',
  deps: [],
  blocked_by_titles: [],
  ancestor_titles: ['Reach EUR 1,000/month independent income'],
  progress_pct: 0,
  due_date: '2026-04-06',
  manual_priority: 'high',
  dependency_unblock_count: 3,
  recommended_tool: 'Codex',
  tool_reasoning: 'Implementation-heavy work is best handled in the coding workspace.',
  is_overdue: false,
  due_in_days: 2,
}

const todaySchedule = {
  date: '2026-04-04',
  template: { id: 'template-1', name: 'Core Day', is_active: true },
  low_energy_today: false,
  reduced_mode: false,
  notes: ['One follow-up is due today.'],
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
      sort_order: 10,
      log: null,
      suggestion_reason: 'This is still the highest leverage work.',
      suggestion: {
        kind: 'goal_node',
        reason: 'This is still the highest leverage work.',
        goal_node: {
          id: 'task-1',
          title: 'Build command center backend',
          type: 'task',
          status: 'available',
          parent_title: 'Reach EUR 1,000/month independent income',
        },
        marketing_action: null,
      },
    },
    {
      id: 'block-2',
      label: 'Follow-up slot',
      type: 'marketing',
      time: '13:00',
      is_fixed: false,
      is_adjustable: true,
      duration_mins: 45,
      sort_order: 20,
      log: null,
      suggestion_reason: 'A follow-up is due today.',
      suggestion: {
        kind: 'marketing_follow_up',
        reason: 'A follow-up is due today.',
        goal_node: null,
        marketing_action: {
          id: 'marketing-1',
          action: 'Follow up with warm LinkedIn lead',
          platform: 'LinkedIn',
          follow_up_date: '2026-04-04',
        },
      },
    },
  ],
}

const healthToday = {
  date: '2026-04-04',
  summary: {
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
  health_log: null,
  mood_log: null,
  spiritual_log: null,
  habit_board: [
    {
      habit: { id: 'habit-1', name: 'Cold shower', target: 'daily', custom_days: null, goal: null },
      today_log: null,
      completion_rate_7d: 43,
      completion_rate_30d: 48,
      current_streak: 0,
    },
    {
      habit: { id: 'habit-2', name: 'LinkedIn outreach', target: '3x_week', custom_days: null, goal: 'goal-1' },
      today_log: null,
      completion_rate_7d: 67,
      completion_rate_30d: 58,
      current_streak: 0,
    },
  ],
}

const commandCenterPayload = {
  date: '2026-04-04',
  profile: { id: 'profile-1', full_name: 'Mohamed Badawy' },
  settings: {
    id: 'settings-1',
    name: 'Default Settings',
    independent_income_target_eur: '1000.00',
  },
  briefing: {
    briefing_text: 'Protect the income system first, then close one follow-up loop.',
    top_priorities: ['Income system'],
    observations: ['Energy is stable.'],
    encouragement: 'Keep the plan narrow and visible.',
  },
  key_signals: ['Income-generating work stays highest leverage.'],
  overwhelm: {
    date: '2026-04-04',
    overwhelm_score: 1,
    reduced_mode: false,
    max_priorities: 3,
    burnout_risk: false,
    signals: [],
  },
  reentry: {
    active: true,
    days_away: 3,
    message: 'You have been away for a few days, so start with what changed and what still matters.',
    what_changed: ['A follow-up became due.'],
    matters_now: ['Protect the first income block.'],
    can_wait: ['Lower-leverage cleanup can wait until after the core work block.'],
  },
  priorities: [taskNode],
  top_priorities: [goalNode],
  schedule: todaySchedule,
  health_today: healthToday,
  finance: {
    summary: {
      month: '2026-04-01',
      total_income_eur: 700,
      total_expense_eur: 100,
      independent_income_eur: 250,
      net_eur: 600,
      kyrgyzstan_progress_pct: 25,
      months_to_target: 3,
      target_eur: '1000.00',
      eur_to_usd_rate: '1.08',
      eur_to_egp_rate: '33.5',
    },
    recent_entries: [
      {
        id: 'entry-1',
        type: 'income',
        source: 'Freelance Client',
        amount: '250.00',
        amount_eur: 250,
        currency: 'EUR',
        is_independent: true,
        is_recurring: false,
        date: '2026-04-03',
        notes: 'Landing page build',
      },
    ],
  },
  pipeline: {
    summary: {
      new_or_reviewing_count: 1,
      applied_count: 0,
      won_count: 0,
      lost_count: 0,
      empty_pipeline: false,
      days_since_last_application: 1,
      due_follow_ups_count: 1,
    },
    active_opportunities: [
      {
        id: 'opp-1',
        name: 'Warm Upwork lead',
        platform: 'Upwork',
        description: 'Migration and dashboard work',
        budget: '450.00',
        status: 'reviewing',
        fit_score: 82,
        fit_reasoning: 'Strong fit with backend and frontend systems work.',
        date_found: '2026-04-02',
        date_applied: null,
        date_closed: null,
        proposal_draft: 'Draft proposal',
        outcome_notes: '',
      },
    ],
    due_follow_ups: [
      {
        id: 'marketing-1',
        action: 'Follow up with warm LinkedIn lead',
        platform: 'LinkedIn',
        date: '2026-04-01',
        follow_up_date: '2026-04-04',
        follow_up_done: false,
        result: 'Awaiting reply',
      },
    ],
  },
  weekly_review: {
    status: {
      week_start: '2026-03-30',
      week_end: '2026-04-05',
      review_exists: false,
      current_review_id: null,
      latest_review_id: null,
    },
    preview: {
      week_start: '2026-03-30',
      week_end: '2026-04-05',
      snippet: 'Weekly Review - independent income is moving again.',
      report: 'Weekly Review\n- independent income is moving again.',
    },
    pending_suggestions_count: 2,
    pending_suggestions: [
      {
        id: 'suggestion-1',
        topic: 'weekly_review',
        module: 'analytics',
        suggestion_text: 'Generate the weekly review before the week closes.',
        shown_at: '2026-04-04T08:00:00Z',
        acted_on: false,
        dismissed_at: null,
      },
    ],
  },
  status_cards: [
    { id: 'goals', label: 'Goals', value: 2, total: 5, status: 'attention', detail: 'Two priorities still open.', route: '/goals' },
    { id: 'finance', label: 'Finance', value: 250, total: 1000, status: 'attention', detail: 'Independent income is 25% of target.', route: '/finance?tab=ledger' },
  ],
  recent_progress: [
    { id: 'progress-1', kind: 'win', domain: 'Work', title: 'Command center foundation shipped', detail: 'The main workspace is now live.', date: '2026-04-03' },
  ],
  latest_checkin: null,
}

const goalTree = [
  {
    ...goalNode,
    children: [
      {
        ...taskNode,
        children: [],
      },
    ],
  },
]

const goalMap = {
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
      due_date: null,
      manual_priority: null,
      recommended_tool: 'Claude',
      tool_reasoning: 'Start with structured thinking.',
    },
    {
      id: 'task-1',
      code: 't1',
      title: 'Build command center backend',
      type: 'task',
      category: 'Career',
      status: 'available',
      parent: 'goal-1',
      progress_pct: 0,
      child_count: 0,
      blocked_by: [],
      due_date: '2026-04-06',
      manual_priority: 'high',
      recommended_tool: 'Codex',
      tool_reasoning: 'Implementation-heavy work is best handled in the coding workspace.',
    },
  ],
  edges: [
    { source: 'goal-1', target: 'task-1', kind: 'hierarchy' },
  ],
  summary: {
    goal_count: 1,
    project_count: 0,
    task_count: 1,
    blocked_count: 0,
  },
}

const goalContext = {
  node: {
    ...taskNode,
    children: [],
  },
  ancestors: [goalNode],
  dependents: [],
  progress_pct: 0,
  attachment_profile: null,
  attachment_suggestions: [
    { key: 'process', label: 'Process', reason: 'This work will be easier to repeat if the steps are written down clearly.' },
    { key: 'tools', label: 'Tools', reason: 'A defined tool stack keeps execution faster.' },
    { key: 'learning_path', label: 'Learning Path', reason: 'This domain benefits from an explicit skill-building track.' },
  ],
}

const familyGoals = [
  {
    id: 'family-1',
    title: 'Plan family relocation docs',
    who_involved: 'Mohamed and spouse',
    target_date: '2026-05-01',
    notes: 'Collect passport and school papers.',
    status: 'active',
    created_at: '2026-04-01T08:00:00Z',
  },
]

const relationships = [
  {
    id: 'relationship-1',
    name: 'Ahmed Mentor',
    relationship_type: 'mentor',
    last_contact: '2026-04-01',
    follow_up_notes: 'Share current pipeline progress.',
    created_at: '2026-04-01T08:00:00Z',
  },
]

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

const pipelineWorkspace = {
  date: '2026-04-04',
  summary: commandCenterPayload.pipeline.summary,
  active_opportunities: commandCenterPayload.pipeline.active_opportunities,
  recent_outcomes: [],
  due_follow_ups: commandCenterPayload.pipeline.due_follow_ups,
  recent_clients: [],
}

const workOverview = {
  date: '2026-04-04',
  summary: {
    active_task_count: 2,
    blocked_task_count: 0,
    deadline_count: 1,
    proposal_draft_count: 1,
    due_follow_ups_count: 1,
    active_opportunity_count: 1,
  },
  task_board: [taskNode],
  deadlines: [taskNode],
  pipeline: pipelineWorkspace,
  marketing_actions: marketingActions,
  proposal_drafts: [
    {
      ...commandCenterPayload.pipeline.active_opportunities[0],
      proposal_draft: 'Draft proposal for the work.',
    },
  ],
}

const financeSummary = {
  month: '2026-04-01',
  total_income_eur: 700,
  total_expense_eur: 100,
  independent_income_eur: 250,
  net_eur: 600,
  kyrgyzstan_progress_pct: 25,
  months_to_target: 3,
  target_eur: '1000.00',
  eur_to_usd_rate: '1.08',
  eur_to_egp_rate: '33.5',
}

const financeOverview = {
  date: '2026-04-04',
  summary: financeSummary,
  monthly_summary: {
    month: '2026-04-01',
    income_entry_count: 2,
    expense_entry_count: 1,
    recurring_income_eur: 700,
    recurring_expense_eur: 50,
  },
  target_tracking: {
    independent_income_eur: 250,
    target_eur: '1000.00',
    progress_pct: 25,
    months_to_target: 3,
    active_income_sources: 1,
  },
  income_sources: [
    {
      id: 'source-1',
      name: 'Freelance Retainers',
      category: 'Freelance',
      monthly_target_eur: '1000.00',
      baseline_amount_eur: '250.00',
      active: true,
      notes: 'Main target stream.',
      realized_this_month_eur: 250,
      progress_pct: 25,
    },
  ],
  recent_entries: commandCenterPayload.finance.recent_entries,
}

const healthOverview = {
  date: '2026-04-04',
  summary: healthToday.summary,
  today: healthToday,
  recent_health_logs: [
    {
      id: 'health-1',
      date: '2026-04-03',
      sleep_hours: '7.5',
      sleep_quality: 4,
      energy_level: 3,
      exercise_done: true,
      exercise_type: 'Walk',
      exercise_duration_mins: 30,
      weight_kg: null,
      nutrition_notes: '',
    },
  ],
  recent_mood_logs: [
    {
      id: 'mood-1',
      date: '2026-04-03',
      mood_score: 3,
      notes: 'Steady',
    },
  ],
  recent_spiritual_logs: [
    {
      id: 'spiritual-1',
      date: '2026-04-03',
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: false,
      quran_pages: 3,
      dhikr_done: true,
      prayers_count: 4,
      notes: '',
    },
  ],
  capacity_signals: ['Health signals are stable enough for a normal day.'],
}

const analyticsOverview = {
  date: '2026-04-04',
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
  pipeline: commandCenterPayload.pipeline.summary,
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
      detail: 'Landing page build',
      date: '2026-04-03',
    },
  ],
  pattern_analysis: 'Momentum is strongest when daily capture stays simple and visible.',
}

const weeklyReviewPreview = {
  week_start: '2026-03-30',
  week_end: '2026-04-05',
  report: 'Weekly Review\n- Independent income is recovering.\n- Keep the scope narrow.',
  context: { goals: { done_count: 1 } },
}

const weeklyReviews = [
  {
    id: 'review-1',
    week_start: '2026-03-30',
    week_end: '2026-04-05',
    ai_report: 'Weekly Review\n- Independent income is recovering.',
    personal_notes: 'Keep the week narrow.',
    created_at: '2026-04-04T08:00:00Z',
  },
]

const suggestions = [
  {
    id: 'suggestion-1',
    topic: 'weekly_review',
    module: 'analytics',
    suggestion_text: 'Generate the weekly review before the week closes.',
    shown_at: '2026-04-04T08:00:00Z',
    acted_on: false,
    dismissed_at: null,
  },
  {
    id: 'suggestion-2',
    topic: 'pipeline_follow_up',
    module: 'pipeline',
    suggestion_text: 'Close one follow-up loop today.',
    shown_at: '2026-04-04T09:00:00Z',
    acted_on: false,
    dismissed_at: null,
  },
]

const timelineWeek = {
  today: '2026-04-04',
  week_start: '2026-03-30',
  week_end: '2026-04-05',
  days: [
    {
      date: '2026-03-30',
      is_today: false,
      is_future: false,
      score: 58,
      indicators: { health: true, mood: true, spiritual: false, habits: false, finance: false, marketing: false, achievements: false, decisions: false },
      detail_rows: [{ domain: 'Mood', label: 'Mood', value: '3/5 - Steady' }],
      ai_note: 'Debrief: mood stayed steady.',
    },
    {
      date: '2026-03-31',
      is_today: false,
      is_future: false,
      score: 64,
      indicators: { health: true, mood: false, spiritual: true, habits: true, finance: false, marketing: true, achievements: false, decisions: false },
      detail_rows: [{ domain: 'Habits', label: 'Habits', value: 'Cold shower' }],
      ai_note: 'Debrief: anchors were decent.',
    },
    {
      date: '2026-04-01',
      is_today: false,
      is_future: false,
      score: 75,
      indicators: { health: true, mood: true, spiritual: true, habits: true, finance: true, marketing: false, achievements: false, decisions: false },
      detail_rows: [{ domain: 'Finance', label: 'Money', value: '+700 EUR' }],
      ai_note: 'Debrief: money moved and that mattered.',
    },
    {
      date: '2026-04-02',
      is_today: false,
      is_future: false,
      score: 68,
      indicators: { health: true, mood: false, spiritual: false, habits: true, finance: false, marketing: false, achievements: false, decisions: true },
      detail_rows: [{ domain: 'Decision', label: 'Decisions', value: 'Keep focus on income' }],
      ai_note: 'Debrief: decisions stayed aligned.',
    },
    {
      date: '2026-04-03',
      is_today: false,
      is_future: false,
      score: 70,
      indicators: { health: true, mood: true, spiritual: true, habits: true, finance: true, marketing: true, achievements: false, decisions: false },
      detail_rows: [{ domain: 'Health', label: 'Body', value: 'Sleep 7h - Energy 3/5' }],
      ai_note: 'Debrief: keep the day narrow and finish the outreach block.',
    },
    {
      date: '2026-04-04',
      is_today: true,
      is_future: false,
      score: 72,
      indicators: { health: true, mood: true, spiritual: true, habits: true, finance: true, marketing: true, achievements: true, decisions: false },
      detail_rows: [{ domain: 'Achievement', label: 'Wins', value: 'Command center foundation shipped' }],
      ai_note: 'Debrief: momentum is visible now.',
    },
    {
      date: '2026-04-05',
      is_today: false,
      is_future: true,
      score: 0,
      indicators: { health: false, mood: false, spiritual: false, habits: false, finance: false, marketing: false, achievements: false, decisions: false },
      detail_rows: [],
      ai_note: 'Prepare: leave room for weekly review and recovery.',
    },
  ],
}

const timelineOverview = {
  date: '2026-04-04',
  timeline: timelineWeek,
  weekly_review: {
    status: {
      week_start: '2026-03-30',
      week_end: '2026-04-05',
      review_exists: false,
      current_review_id: null,
      latest_review_id: 'review-1',
    },
    preview: weeklyReviewPreview,
  },
  pattern_analysis: analyticsOverview.pattern_analysis,
  achievements: [
    {
      id: 'achievement-1',
      title: 'Command center foundation shipped',
      domain: 'Work',
      date: '2026-04-03',
      notes: 'Main grouped workspace is now live.',
    },
  ],
  retrospectives: [
    {
      id: 'retro-1',
      title: 'Closed project reflection',
      source_type: 'project',
      status: 'done',
      summary: 'The project closed cleanly.',
      what_worked: 'Strong scoping.',
      what_didnt: 'Polish came late.',
      next_time: 'Validate the UX sooner.',
      closed_at: '2026-04-02',
    },
  ],
  archived_goals: [
    {
      id: 'goal-archived-1',
      title: 'Stabilize MVP',
      type: 'project',
      category: 'Career',
      completed_at: '2026-03-28T08:00:00Z',
      notes: 'Done.',
    },
  ],
}

const ideas = [
  {
    id: 'idea-1',
    title: 'Telegram notifications',
    context: 'Useful for daily reminders later.',
    status: 'raw',
    linked_goal: null,
    created_at: '2026-04-03T08:00:00Z',
  },
]

const decisions = [
  {
    id: 'decision-1',
    decision: 'Ship backend first',
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
    title: 'Command center foundation shipped',
    domain: 'Work',
    date: '2026-04-03',
    notes: 'Main grouped workspace is now live.',
    created_at: '2026-04-03T08:00:00Z',
  },
]

const learnings = [
  {
    id: 'learning-1',
    topic: 'Django service design',
    source: 'Internal implementation',
    status: 'in_progress',
    key_insights: 'Keep orchestration in services.',
    linked_goal: null,
    created_at: '2026-04-01T08:00:00Z',
  },
]

const ideasOverview = {
  date: '2026-04-04',
  summary: {
    raw_ideas: 1,
    validated_ideas: 0,
    decisions: 1,
    learning_items: 1,
  },
  ideas,
  decisions,
  learning: learnings,
}

const financialReport = {
  name: 'financial',
  generated_at: '2026-04-04T09:00:00Z',
  report: 'Financial Report\n- Independent income: EUR 250\n- Progress to target: 25%',
  sections: {},
}

beforeEach(() => {
  vi.resetAllMocks()

  vi.mocked(api.getCommandCenter).mockResolvedValue(commandCenterPayload as never)
  vi.mocked(api.getDashboard).mockResolvedValue({} as never)
  vi.mocked(api.sendChatMessage).mockResolvedValue({
    reply: 'Captured that and updated the system.',
    actions: [],
    affected_modules: ['goals'],
    proposed_actions: [],
    requires_confirmation: false,
  } as never)

  vi.mocked(api.getGoalTree).mockResolvedValue(goalTree as never)
  vi.mocked(api.getGoalMap).mockResolvedValue(goalMap as never)
  vi.mocked(api.getGoalContext).mockResolvedValue(goalContext as never)
  vi.mocked(api.createGoalNode).mockResolvedValue(taskNode as never)
  vi.mocked(api.updateGoalNode).mockResolvedValue(taskNode as never)
  vi.mocked(api.deleteGoalNode).mockResolvedValue(null as never)
  vi.mocked(api.createGoalAttachmentProfile).mockResolvedValue({
    id: 'attachment-1',
    node: 'task-1',
    habits: ['Cold shower'],
  } as never)
  vi.mocked(api.updateGoalAttachmentProfile).mockResolvedValue({
    id: 'attachment-1',
    node: 'task-1',
    habits: ['Cold shower'],
  } as never)
  vi.mocked(api.listFamilyGoals).mockResolvedValue(paginated(familyGoals) as never)
  vi.mocked(api.listRelationships).mockResolvedValue(paginated(relationships) as never)

  vi.mocked(api.getFinanceSummary).mockResolvedValue(financeSummary as never)
  vi.mocked(api.getFinanceOverview).mockResolvedValue(financeOverview as never)
  vi.mocked(api.listFinanceEntries).mockResolvedValue(paginated(commandCenterPayload.finance.recent_entries) as never)
  vi.mocked(api.createFinanceEntry).mockResolvedValue(commandCenterPayload.finance.recent_entries[0] as never)
  vi.mocked(api.createIncomeSource).mockResolvedValue(financeOverview.income_sources[0] as never)
  vi.mocked(api.updateIncomeSource).mockResolvedValue(financeOverview.income_sources[0] as never)
  vi.mocked(api.deleteIncomeSource).mockResolvedValue(null as never)
  vi.mocked(api.getFinancialReport).mockResolvedValue(financialReport as never)
  vi.mocked(api.getProgressReport).mockResolvedValue({
    name: 'progress',
    generated_at: '2026-04-04T09:00:00Z',
    report: 'Progress Report',
    sections: {},
  } as never)
  vi.mocked(api.getPersonalReviewReport).mockResolvedValue({
    name: 'personal-review',
    generated_at: '2026-04-04T09:00:00Z',
    report: 'Personal Review Report',
    sections: {},
  } as never)

  vi.mocked(api.getHealthSummary).mockResolvedValue(healthToday.summary as never)
  vi.mocked(api.getHealthOverview).mockResolvedValue(healthOverview as never)
  vi.mocked(api.getHealthToday).mockResolvedValue(healthToday as never)
  vi.mocked(api.listHealthLogs).mockResolvedValue(paginated(healthOverview.recent_health_logs) as never)
  vi.mocked(api.listMoodLogs).mockResolvedValue(paginated(healthOverview.recent_mood_logs) as never)
  vi.mocked(api.createHealthLog).mockResolvedValue({
    id: 'health-2',
    date: '2026-04-04',
    sleep_hours: '6.5',
    sleep_quality: 3,
    energy_level: 3,
    exercise_done: false,
    exercise_type: '',
    exercise_duration_mins: null,
    weight_kg: null,
    nutrition_notes: '',
  } as never)
  vi.mocked(api.updateHealthLog).mockResolvedValue({
    id: 'health-2',
    date: '2026-04-04',
    sleep_hours: '6.5',
    sleep_quality: 3,
    energy_level: 3,
    exercise_done: false,
    exercise_type: '',
    exercise_duration_mins: null,
    weight_kg: null,
    nutrition_notes: '',
  } as never)
  vi.mocked(api.createMoodLog).mockResolvedValue(healthOverview.recent_mood_logs[0] as never)
  vi.mocked(api.updateMoodLog).mockResolvedValue(healthOverview.recent_mood_logs[0] as never)
  vi.mocked(api.createSpiritualLog).mockResolvedValue(healthOverview.recent_spiritual_logs[0] as never)
  vi.mocked(api.updateSpiritualLog).mockResolvedValue(healthOverview.recent_spiritual_logs[0] as never)
  vi.mocked(api.createHabitLog).mockResolvedValue({
    id: 'habit-log-1',
    habit: 'habit-1',
    date: '2026-04-04',
    done: true,
    note: '',
  } as never)
  vi.mocked(api.updateHabitLog).mockResolvedValue({
    id: 'habit-log-1',
    habit: 'habit-1',
    date: '2026-04-04',
    done: true,
    note: '',
  } as never)

  vi.mocked(api.getTodaySchedule).mockResolvedValue(todaySchedule as never)
  vi.mocked(api.updateScheduleBlock).mockResolvedValue(todaySchedule.blocks[0] as never)
  vi.mocked(api.createScheduleLog).mockResolvedValue({
    id: 'schedule-log-1',
    date: '2026-04-04',
    status: 'done',
    actual_time: null,
    note: '',
    task_node: {
      id: 'task-1',
      title: 'Build command center backend',
      type: 'task',
      status: 'available',
      parent_title: 'Reach EUR 1,000/month independent income',
    },
  } as never)
  vi.mocked(api.updateScheduleLog).mockResolvedValue({
    id: 'schedule-log-1',
    date: '2026-04-04',
    status: 'done',
    actual_time: null,
    note: '',
    task_node: {
      id: 'task-1',
      title: 'Build command center backend',
      type: 'task',
      status: 'available',
      parent_title: 'Reach EUR 1,000/month independent income',
    },
  } as never)

  vi.mocked(api.getTimeline).mockResolvedValue(timelineWeek as never)
  vi.mocked(api.getTimelineOverview).mockResolvedValue(timelineOverview as never)
  vi.mocked(api.getAnalyticsOverview).mockResolvedValue(analyticsOverview as never)
  vi.mocked(api.getWeeklyReviewPreview).mockResolvedValue(weeklyReviewPreview as never)
  vi.mocked(api.listWeeklyReviews).mockResolvedValue(paginated(weeklyReviews) as never)
  vi.mocked(api.generateWeeklyReview).mockResolvedValue({
    review: weeklyReviews[0],
    preview: weeklyReviewPreview,
  } as never)
  vi.mocked(api.updateWeeklyReview).mockResolvedValue(weeklyReviews[0] as never)
  vi.mocked(api.listSuggestions).mockResolvedValue(paginated(suggestions) as never)
  vi.mocked(api.actSuggestion).mockResolvedValue({
    ...suggestions[0],
    acted_on: true,
  } as never)
  vi.mocked(api.dismissSuggestion).mockResolvedValue({
    ...suggestions[1],
    dismissed_at: '2026-04-04T10:00:00Z',
  } as never)

  vi.mocked(api.getPipelineWorkspace).mockResolvedValue(pipelineWorkspace as never)
  vi.mocked(api.getWorkOverview).mockResolvedValue(workOverview as never)
  vi.mocked(api.createOpportunity).mockResolvedValue(commandCenterPayload.pipeline.active_opportunities[0] as never)
  vi.mocked(api.updateOpportunity).mockResolvedValue(commandCenterPayload.pipeline.active_opportunities[0] as never)
  vi.mocked(api.listMarketingActions).mockResolvedValue(paginated(marketingActions) as never)
  vi.mocked(api.createMarketingAction).mockResolvedValue(marketingActions[0] as never)
  vi.mocked(api.updateMarketingAction).mockResolvedValue({
    ...marketingActions[0],
    follow_up_done: true,
  } as never)
  vi.mocked(api.deleteMarketingAction).mockResolvedValue(null as never)

  vi.mocked(api.getIdeasOverview).mockResolvedValue(ideasOverview as never)
  vi.mocked(api.listIdeas).mockResolvedValue(paginated(ideas) as never)
  vi.mocked(api.createIdea).mockResolvedValue(ideas[0] as never)
  vi.mocked(api.updateIdea).mockResolvedValue(ideas[0] as never)
  vi.mocked(api.deleteIdea).mockResolvedValue(null as never)
  vi.mocked(api.listDecisions).mockResolvedValue(paginated(decisions) as never)
  vi.mocked(api.createDecision).mockResolvedValue(decisions[0] as never)
  vi.mocked(api.updateDecision).mockResolvedValue(decisions[0] as never)
  vi.mocked(api.deleteDecision).mockResolvedValue(null as never)
  vi.mocked(api.listAchievements).mockResolvedValue(paginated(achievements) as never)
  vi.mocked(api.createAchievement).mockResolvedValue(achievements[0] as never)
  vi.mocked(api.updateAchievement).mockResolvedValue(achievements[0] as never)
  vi.mocked(api.deleteAchievement).mockResolvedValue(null as never)
  vi.mocked(api.listLearnings).mockResolvedValue(paginated(learnings) as never)
  vi.mocked(api.createLearning).mockResolvedValue(learnings[0] as never)
  vi.mocked(api.updateLearning).mockResolvedValue(learnings[0] as never)
  vi.mocked(api.deleteLearning).mockResolvedValue(null as never)
})

describe('route smoke tests', () => {
  test('renders / command center with briefing and capture form', async () => {
    renderRoute('/')
    // Briefing text is always visible in the BriefingStrip
    await screen.findByText(/protect the income system first/i)
    // Capture form textarea is present
    expect(screen.getByLabelText(/capture input/i)).toBeInTheDocument()
  })

  test.each([
    ['/goals', /map the structure, then support it with people and systems\./i],
    ['/work', /run tasks, deadlines, pipeline, marketing, and proposals from one work surface\./i],
    ['/finance', /see money clearly, track income streams, and generate reports\./i],
    ['/health', /see capacity, body state, mood, habits, and spiritual anchor together\./i],
    ['/timeline', /see history, weekly review, patterns, wins, and retrospectives in one timeline view\./i],
    ['/ideas', /keep raw ideas, decisions, learning, and structured thinking in one place\./i],
  ])('renders %s under the new 7-view IA', async (route, heading) => {
    renderRoute(route)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  test.each([
    ['/analytics', /overview, history, patterns, and review/i],
    ['/schedule', /daily operating loop/i],
    ['/pipeline', /opportunities, follow-ups, and outcomes/i],
    ['/family', /shared family goals deserve a dedicated place in the system\./i],
    ['/achievements', /wins should stay visible so momentum has a timeline\./i],
  ])('keeps legacy route %s working through grouped views', async (route, text) => {
    renderRoute(route)
    expect(await screen.findByText(text)).toBeInTheDocument()
  })
})

describe('command center behavior', () => {
  test('prefills the unified capture box from a quick action', async () => {
    renderRoute('/')

    await screen.findByText(/protect the income system first/i)
    await userEvent.click(screen.getByRole('button', { name: /^task$/i }))

    expect(screen.getByLabelText(/capture input/i)).toHaveValue('Create a task: ')
  })

  test('uses a reviewable capture flow before applying multi-step changes', async () => {
    vi.mocked(api.sendChatMessage)
      .mockResolvedValueOnce({
        reply: 'I mapped this into a few changes. Review them before I apply anything structural or multi-step.',
        actions: [],
        affected_modules: ['finance', 'analytics'],
        proposed_actions: [
          { tool: 'add_finance_entry', module: 'finance', summary: 'Log expense: Taxi (120 EGP)', input: {} },
          { tool: 'capture_idea', module: 'analytics', summary: 'Capture idea: Telegram reminder bot', input: {} },
        ],
        requires_confirmation: true,
      } as never)
      .mockResolvedValueOnce({
        reply: 'Applied 2 changes across finance, analytics.',
        actions: [],
        affected_modules: ['finance', 'analytics'],
        proposed_actions: [],
        requires_confirmation: false,
      } as never)

    renderRoute('/')
    await screen.findByLabelText(/capture input/i)

    fireEvent.change(screen.getByLabelText(/capture input/i), {
      target: {
        value: 'Log a 120 EGP taxi expense and capture an idea about a Telegram reminder bot',
      },
    })
    await userEvent.click(screen.getByRole('button', { name: /process capture/i }))

    expect(await screen.findByText(/review before apply/i)).toBeInTheDocument()
    expect(screen.getByText(/log expense: taxi/i)).toBeInTheDocument()
    expect(screen.getByText(/capture idea: telegram reminder bot/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /confirm and apply/i }))

    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/applied 2 changes across finance, analytics/i)).toBeInTheDocument()
  })
})

describe('command center redesign components', () => {
  test('renders first priority row with "Work on next" eyebrow', async () => {
    renderRoute('/')

    await screen.findByText(/protect the income system first/i)
    // The first priority row shows a "Work on next" eyebrow label
    expect(screen.getByText(/work on next/i)).toBeInTheDocument()
    // The priority title is visible in the row body (may also appear as a linked chip in schedule rows)
    expect(screen.getAllByText(/build command center backend/i).length).toBeGreaterThan(0)
  })

  test('progress strip chips are present on the command center', async () => {
    renderRoute('/')

    await screen.findByText(/protect the income system first/i)
    // Habits chip
    expect(screen.getByRole('button', { name: /habits/i })).toBeInTheDocument()
    // Schedule chip
    expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument()
  })

  test('InlineHealthLog is visible in the today section', async () => {
    renderRoute('/')

    await screen.findByText(/protect the income system first/i)
    // Health row is always visible — since health_log is null in mock, shows "not logged today"
    expect(screen.getByText(/not logged today/i)).toBeInTheDocument()
    // Expand button is present
    expect(screen.getByRole('button', { name: /expand health log/i })).toBeInTheDocument()
  })

  test('Habit rows are visible in the today section', async () => {
    renderRoute('/')

    await screen.findByText(/protect the income system first/i)

    // Both habits from mock data should be rendered as inline rows
    expect(screen.getByText(/cold shower/i)).toBeInTheDocument()
    expect(screen.getByText(/linkedin outreach/i)).toBeInTheDocument()

    // Each habit row has Done and Missed buttons
    const doneButtons = screen.getAllByRole('button', { name: /^done$/i })
    expect(doneButtons.length).toBeGreaterThanOrEqual(2)
  })
})

describe('grouped workspace flows', () => {
  test('saves a goal attachment profile from the goals workspace', async () => {
    renderRoute('/goals?tab=attachments')

    await screen.findByText(/attachment profile/i)
    await userEvent.type(await screen.findByLabelText(/process notes/i), 'Write the backend sequence clearly.')
    await userEvent.type(screen.getByLabelText(/tools/i), 'Codex, Django shell')
    await userEvent.click(screen.getByRole('button', { name: /save attachment profile/i }))

    await waitFor(() => expect(api.createGoalAttachmentProfile).toHaveBeenCalledTimes(1))
  })

  test('opens an AI thinking session from the work task board', async () => {
    vi.mocked(api.sendChatMessage).mockResolvedValueOnce({
      reply: 'Start with the overview endpoint and then wire the task board mutations.',
      actions: [],
      affected_modules: [],
      proposed_actions: [],
      requires_confirmation: false,
    } as never)

    renderRoute('/work?tab=board')

    // PriorityRow renders a "Work on next" eyebrow for the first task — confirms board loaded
    await screen.findByText(/work on next/i)
    // AI thinking session button is now the inline "AI" button in PriorityRow
    await userEvent.click(screen.getByRole('button', { name: /^ai$/i }))

    await waitFor(() =>
      expect(api.sendChatMessage).toHaveBeenCalledWith(
        [{ role: 'user', content: expect.stringContaining('Build command center backend') }],
        { mode: 'task_thinking', task_id: 'task-1' },
      ),
    )
    expect(await screen.findByText(/start with the overview endpoint/i)).toBeInTheDocument()
  })

  test('creates an income source inside the finance workspace', async () => {
    renderRoute('/finance?tab=income')

    await userEvent.type(await screen.findByLabelText(/^name$/i), 'Upwork Retainers')
    await userEvent.clear(screen.getByLabelText(/monthly target/i))
    await userEvent.type(screen.getByLabelText(/monthly target/i), '1200')
    await userEvent.click(screen.getByRole('button', { name: /add income source/i }))

    await waitFor(() => expect(api.createIncomeSource).toHaveBeenCalledTimes(1))
  })

  test('renders named reports inside the finance workspace', async () => {
    renderRoute('/finance?tab=reports')

    expect(await screen.findByText(/financial report/i)).toBeInTheDocument()
    expect(screen.getByText(/progress to target: 25%/i)).toBeInTheDocument()
  })

  test('shows the grouped health overview signals', async () => {
    renderRoute('/health')

    expect(await screen.findByText(/capacity signals/i)).toBeInTheDocument()
    expect(screen.getByText(/health signals are stable enough for a normal day/i)).toBeInTheDocument()
  })

  test('supports weekly review actions from the timeline workspace', async () => {
    renderRoute('/timeline?tab=review')

    await userEvent.click(await screen.findByRole('button', { name: /generate weekly review/i }))
    await waitFor(() => expect(api.generateWeeklyReview).toHaveBeenCalledTimes(1))

    await userEvent.clear(await screen.findByLabelText(/personal notes/i))
    await userEvent.type(screen.getByLabelText(/personal notes/i), 'Protect the first two hours every day.')
    await userEvent.click(screen.getByRole('button', { name: /save review notes/i }))

    await waitFor(() =>
      expect(api.updateWeeklyReview).toHaveBeenCalledWith('review-1', {
        personal_notes: 'Protect the first two hours every day.',
      }),
    )

    const weeklyReviewSuggestion = (await screen.findByText(/generate the weekly review before the week closes\./i)).closest('article')
    const pipelineSuggestion = (await screen.findByText(/close one follow-up loop today\./i)).closest('article')

    expect(weeklyReviewSuggestion).not.toBeNull()
    expect(pipelineSuggestion).not.toBeNull()

    await userEvent.click(within(weeklyReviewSuggestion as HTMLElement).getByRole('button', { name: /acted on/i }))
    await userEvent.click(within(pipelineSuggestion as HTMLElement).getByRole('button', { name: /dismiss/i }))

    await waitFor(() => expect(api.actSuggestion).toHaveBeenCalledWith('suggestion-1', expect.anything()))
    await waitFor(() => expect(api.dismissSuggestion).toHaveBeenCalledWith('suggestion-2', expect.anything()))
  })

  test('lets the ideas workspace run a structured thinking session', async () => {
    vi.mocked(api.sendChatMessage).mockResolvedValueOnce({
      reply: 'Break the idea into trigger, message, and delivery constraints before building it.',
      actions: [],
      affected_modules: [],
      proposed_actions: [],
      requires_confirmation: false,
    } as never)

    renderRoute('/ideas?tab=thinking')

    await userEvent.type(await screen.findByLabelText(/prompt/i), 'How should I design a Telegram reminder workflow?')
    await userEvent.click(screen.getByRole('button', { name: /start thinking session/i }))

    await waitFor(() =>
      expect(api.sendChatMessage).toHaveBeenCalledWith(
        [{ role: 'user', content: 'How should I design a Telegram reminder workflow?' }],
        { mode: 'task_thinking', surface: 'ideas_thinking' },
      ),
    )
    expect(await screen.findByText(/break the idea into trigger/i)).toBeInTheDocument()
  })

  test('shows future-day preparation notes in the timeline strip', async () => {
    renderRoute('/timeline?tab=timeline')

    await userEvent.click(await screen.findByRole('button', { name: /5 apr 2026/i }))

    expect(await screen.findByText(/leave room for weekly review and recovery/i)).toBeInTheDocument()
  })
})

describe('error states', () => {
  test('shows an error state when the timeline overview fails', async () => {
    vi.mocked(api.getTimelineOverview).mockRejectedValueOnce(new Error('boom'))

    renderRoute('/timeline')

    expect(await screen.findByText(/could not load the timeline workspace/i)).toBeInTheDocument()
  })

  test('shows an error state when the work overview fails', async () => {
    vi.mocked(api.getWorkOverview).mockRejectedValueOnce(new Error('boom'))

    renderRoute('/work')

    expect(await screen.findByText(/could not load the work workspace/i)).toBeInTheDocument()
  })
})
