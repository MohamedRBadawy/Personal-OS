import type {
  Achievement,
  AchievementPayload,
  AISuggestion,
  AnalyticsOverviewPayload,
  ChatResponse,
  CheckInPayload,
  CheckInResponse,
  CommandCenterPayload,
  DashboardPayload,
  DashboardV2,
  ExchangeRates,
  FinanceSummaryV2,
  Node,
  NodeCreatePayload,
  NodeUpdatePayload,
  RoutineLogEntry,
  DecisionLog,
  DecisionLogPayload,
  FamilyGoal,
  FamilyGoalPayload,
  FinanceEntry,
  FinanceEntryPayload,
  FinanceOverviewPayload,
  FinanceSummary,
  GoalContext,
  GoalAttachmentProfile,
  GoalAttachmentProfilePayload,
  GoalMapPayload,
  GoalNode,
  GoalNodeCreatePayload,
  GoalNodeUpdatePayload,
  GoalTreeNode,
  Habit,
  HabitLog,
  HabitLogPayload,
  HealthLog,
  HealthLogPayload,
  HealthOverviewPayload,
  HealthSummary,
  HealthTodayPayload,
  Idea,
  IdeasOverviewPayload,
  IdeaPayload,
  IncomeSource,
  IncomeSourcePayload,
  Learning,
  LearningPayload,
  MarketingAction,
  MarketingActionPayload,
  NamedReportPayload,
  MoodLog,
  MoodLogPayload,
  Opportunity,
  OpportunityPayload,
  PaginatedResponse,
  PipelineWorkspacePayload,
  ProjectRetrospective,
  ProjectRetrospectivePayload,
  Relationship,
  RelationshipPayload,
  ScheduleBlockPayload,
  ScheduleBlockLog,
  ScheduleLogPayload,
  SpiritualLog,
  SpiritualLogPayload,
  TimelineOverviewPayload,
  TimelineWeekPayload,
  WeeklyReview,
  WeeklyReviewGenerateResponse,
  WeeklyReviewPreview,
  WeeklyReviewUpdatePayload,
  TodaySchedulePayload,
  WorkOverviewPayload,
  RoutineBlock,
  RoutineMetrics,
  RoutineAnalyticsData,
  Attachment,
  IncomeEvent,
  JournalEntry,
  JournalEntryPayload,
  MonthlyChartPoint,
  CategoryBreakdownItem,
  RecurringChecklistItem,
  NodePriorityEntry,
  MonthlyBudgetPlan,
  MonthlyBudgetPlanPayload,
  MealPlan,
  MealLog,
  MealTotals,
  MealTemplate,
  FoodItem,
  MealIngredient,
  WorkoutSession,
  WorkoutSessionPayload,
  WorkoutExercise,
  WorkoutExercisePayload,
  SetLog,
  SetLogPayload,
  BodyCompositionLog,
  BodyCompositionLogPayload,
  WearableLog,
  WearableLogPayload,
  HealthReadinessScore,
  HealthAIInsightsPayload,
  StrengthHistoryPayload,
} from './types'

export function resolveApiBaseUrl(rawValue: string | undefined = import.meta.env.VITE_API_BASE_URL) {
  const value = rawValue?.trim()
  if (!value) {
    throw new Error(
      'VITE_API_BASE_URL is not configured. Set it in frontend/.env or your shell before starting Vite.',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(
      `VITE_API_BASE_URL must be an absolute URL such as http://127.0.0.1:8000/api. Received: ${value}`,
    )
  }

  return parsed.toString().replace(/\/+$/, '')
}

async function request<T>(path: string, init?: RequestInit) {
  const apiBaseUrl = resolveApiBaseUrl()
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    })
  } catch {
    throw new Error(
      `Could not reach the API at ${apiBaseUrl}. Check VITE_API_BASE_URL and make sure the backend is running.`,
    )
  }

  if (!response.ok) {
    let errMsg = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (Array.isArray(body.non_field_errors) && body.non_field_errors[0]) {
        errMsg = body.non_field_errors[0]
      } else if (typeof body.detail === 'string') {
        errMsg = body.detail
      }
    } catch { /* ignore parse failure */ }
    throw new Error(errMsg)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

function listResource<T>(path: string) {
  return request<PaginatedResponse<T>>(path)
}

function createResource<TItem, TPayload>(path: string, payload: TPayload) {
  return request<TItem>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

function updateResource<TItem, TPayload>(path: string, payload: TPayload) {
  return request<TItem>(path, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

function deleteResource(path: string) {
  return request<null>(path, {
    method: 'DELETE',
  })
}

export function getDashboard() {
  return request<DashboardPayload>('/core/dashboard/')
}

export function getCommandCenter() {
  return request<CommandCenterPayload>('/core/command-center/')
}

export function getNextAction() {
  return request<{ action: string; reason: string; node_id: string | null }>('/core/next-action/', {
    method: 'POST',
  })
}

export function submitCheckIn(payload: CheckInPayload) {
  return request<CheckInResponse>('/checkin/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getGoalTree() {
  return request<GoalTreeNode[]>('/goals/nodes/tree/')
}

export function getGoalMap() {
  return request<GoalMapPayload>('/goals/nodes/map/')
}

export function getGoalContext(id: string) {
  return request<GoalContext>(`/goals/nodes/${id}/context/`)
}

export function createGoalNode(payload: GoalNodeCreatePayload) {
  return createResource<GoalNode, GoalNodeCreatePayload>('/goals/nodes/', payload)
}

export function updateGoalNode(id: string, payload: GoalNodeUpdatePayload) {
  return request<GoalNode>(`/goals/nodes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteGoalNode(id: string) {
  return deleteResource(`/goals/nodes/${id}/`)
}

export function getFinanceSummary() {
  return request<FinanceSummary>('/finance/entries/summary/')
}

export function getFinanceOverview() {
  return request<FinanceOverviewPayload>('/finance/overview/')
}

export function listFinanceEntries(params?: { month?: string; type?: string; category?: string }) {
  const q = new URLSearchParams()
  if (params?.month) q.set('month', params.month)
  if (params?.type) q.set('type', params.type)
  if (params?.category) q.set('category', params.category)
  const qs = q.toString()
  return listResource<FinanceEntry>(`/finance/entries/${qs ? '?' + qs : ''}`)
}

export function createFinanceEntry(payload: FinanceEntryPayload) {
  return createResource<FinanceEntry, FinanceEntryPayload>('/finance/entries/', payload)
}

export function updateFinanceEntry(id: number, payload: Partial<FinanceEntryPayload>): Promise<FinanceEntry> {
  return request<FinanceEntry>(`/finance/entries/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteFinanceEntry(id: number): Promise<void> {
  return request<void>(`/finance/entries/${id}/`, { method: 'DELETE' })
}

export function getMonthlyChart(): Promise<MonthlyChartPoint[]> {
  return request<MonthlyChartPoint[]>('/finance/monthly-chart/')
}

export function getCategoryBreakdown(month?: string): Promise<CategoryBreakdownItem[]> {
  return request<CategoryBreakdownItem[]>(`/finance/category-breakdown/${month ? '?month=' + month : ''}`)
}

export function getBudgetPlan(month: string): Promise<MonthlyBudgetPlan> {
  return request<MonthlyBudgetPlan>(`/finance/budget-plans/${month}/`)
}

export async function upsertBudgetPlan(month: string, payload: MonthlyBudgetPlanPayload): Promise<MonthlyBudgetPlan> {
  try {
    return await request<MonthlyBudgetPlan>(`/finance/budget-plans/${month}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  } catch {
    // Plan doesn't exist yet for this month — create it
    return await request<MonthlyBudgetPlan>('/finance/budget-plans/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

export function getRecurringChecklist(): Promise<RecurringChecklistItem[]> {
  return request<RecurringChecklistItem[]>('/finance/recurring-checklist/')
}

export function exportFinanceCSV(month?: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
  return `${base}/finance/export/${month ? '?month=' + month : ''}`
}

export function listIncomeSources() {
  return listResource<IncomeSource>('/finance/income-sources/')
}

export function createIncomeSource(payload: IncomeSourcePayload) {
  return createResource<IncomeSource, IncomeSourcePayload>('/finance/income-sources/', payload)
}

export function updateIncomeSource(id: string, payload: Partial<IncomeSourcePayload>) {
  return updateResource<IncomeSource, Partial<IncomeSourcePayload>>(`/finance/income-sources/${id}/`, payload)
}

export function deleteIncomeSource(id: string) {
  return deleteResource(`/finance/income-sources/${id}/`)
}

export function getHealthSummary() {
  return request<HealthSummary>('/health/summary/')
}

export function getHealthOverview() {
  return request<HealthOverviewPayload>('/health/overview/')
}

export function getHealthToday() {
  return request<HealthTodayPayload>('/health/today/')
}

export function listHealthLogs() {
  return listResource<HealthLog>('/health/logs/')
}

export function createHealthLog(payload: HealthLogPayload) {
  return createResource<HealthLog, HealthLogPayload>('/health/logs/', payload)
}

export function updateHealthLog(id: string, payload: Partial<HealthLogPayload>) {
  return updateResource<HealthLog, Partial<HealthLogPayload>>(`/health/logs/${id}/`, payload)
}

export function listMoodLogs() {
  return listResource<MoodLog>('/health/moods/')
}

export function createMoodLog(payload: MoodLogPayload) {
  return createResource<MoodLog, MoodLogPayload>('/health/moods/', payload)
}

export function updateMoodLog(id: string, payload: Partial<MoodLogPayload>) {
  return updateResource<MoodLog, Partial<MoodLogPayload>>(`/health/moods/${id}/`, payload)
}

export function createSpiritualLog(payload: SpiritualLogPayload) {
  return createResource<SpiritualLog, SpiritualLogPayload>('/health/spiritual/', payload)
}

export function updateSpiritualLog(id: string, payload: Partial<SpiritualLogPayload>) {
  return updateResource<SpiritualLog, Partial<SpiritualLogPayload>>(`/health/spiritual/${id}/`, payload)
}

export function createHabitLog(payload: HabitLogPayload) {
  return createResource<HabitLog, HabitLogPayload>('/health/habit-logs/', payload)
}

export function updateHabitLog(id: string, payload: Partial<HabitLogPayload>) {
  return updateResource<HabitLog, Partial<HabitLogPayload>>(`/health/habit-logs/${id}/`, payload)
}

export function createHabit(payload: { name: string; target: string; custom_days?: number }) {
  return request<Habit>('/health/habits/', { method: 'POST', body: JSON.stringify(payload) })
}

export function deleteHabit(id: string) {
  return request<void>(`/health/habits/${id}/`, { method: 'DELETE' })
}

export function getTodaySchedule() {
  return request<TodaySchedulePayload>('/schedule/today/')
}

export function updateScheduleBlock(id: string, payload: Partial<ScheduleBlockPayload>) {
  return updateResource(`/schedule/blocks/${id}/`, payload)
}

export function createScheduleLog(payload: ScheduleLogPayload) {
  return createResource<ScheduleBlockLog, ScheduleLogPayload>('/schedule/logs/', payload)
}

export function updateScheduleLog(id: string, payload: Partial<ScheduleLogPayload>) {
  return updateResource<ScheduleBlockLog, Partial<ScheduleLogPayload>>(`/schedule/logs/${id}/`, payload)
}

export function getAnalyticsOverview() {
  return request<AnalyticsOverviewPayload>('/analytics/overview/')
}

export function getWeeklyReviewPreview() {
  return request<WeeklyReviewPreview>('/analytics/reviews/preview/')
}

export function listWeeklyReviews() {
  return listResource<WeeklyReview>('/analytics/reviews/')
}

export function generateWeeklyReview() {
  return request<WeeklyReviewGenerateResponse>('/analytics/reviews/generate/', {
    method: 'POST',
  })
}

export function updateWeeklyReview(id: string, payload: WeeklyReviewUpdatePayload) {
  return updateResource<WeeklyReview, WeeklyReviewUpdatePayload>(`/analytics/reviews/${id}/`, payload)
}

export function listSuggestions() {
  return listResource<AISuggestion>('/analytics/suggestions/')
}

export function actSuggestion(id: string) {
  return request<AISuggestion>(`/analytics/suggestions/${id}/act/`, {
    method: 'POST',
  })
}

export function dismissSuggestion(id: string) {
  return request<AISuggestion>(`/analytics/suggestions/${id}/dismiss/`, {
    method: 'POST',
  })
}

export function getTimeline(weekStart?: string) {
  const suffix = weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : ''
  return request<TimelineWeekPayload>(`/analytics/timeline/${suffix}`)
}

export function getTimelineOverview() {
  return request<TimelineOverviewPayload>('/timeline/overview/')
}

export function getPipelineWorkspace() {
  return request<PipelineWorkspacePayload>('/pipeline/workspace/')
}

export function getWorkOverview() {
  return request<WorkOverviewPayload>('/work/overview/')
}

export function listOpportunities() {
  return listResource<Opportunity>('/pipeline/opportunities/')
}

export function createOpportunity(payload: OpportunityPayload) {
  return createResource<Opportunity, OpportunityPayload>('/pipeline/opportunities/', payload)
}

export function updateOpportunity(id: string, payload: Partial<OpportunityPayload>) {
  return updateResource<Opportunity, Partial<OpportunityPayload>>(`/pipeline/opportunities/${id}/`, payload)
}

export function deleteOpportunity(id: string) {
  return deleteResource(`/pipeline/opportunities/${id}/`)
}

export function listMarketingActions() {
  return listResource<MarketingAction>('/pipeline/marketing/')
}

export function createMarketingAction(payload: MarketingActionPayload) {
  return createResource<MarketingAction, MarketingActionPayload>('/pipeline/marketing/', payload)
}

export function updateMarketingAction(id: string, payload: Partial<MarketingActionPayload>) {
  return updateResource<MarketingAction, Partial<MarketingActionPayload>>(`/pipeline/marketing/${id}/`, payload)
}

export function deleteMarketingAction(id: string) {
  return deleteResource(`/pipeline/marketing/${id}/`)
}

export function listIdeas() {
  return listResource<Idea>('/analytics/ideas/')
}

export function getIdeasOverview() {
  return request<IdeasOverviewPayload>('/ideas/overview/')
}

export function createIdea(payload: IdeaPayload) {
  return createResource<Idea, IdeaPayload>('/analytics/ideas/', payload)
}

export function updateIdea(id: string, payload: Partial<IdeaPayload>) {
  return updateResource<Idea, Partial<IdeaPayload>>(`/analytics/ideas/${id}/`, payload)
}

export function deleteIdea(id: string) {
  return deleteResource(`/analytics/ideas/${id}/`)
}

export function convertIdeaToNode(id: string, payload: { type: string; parent?: string | null }) {
  return request<{ node_id: string; node_title: string }>(`/analytics/ideas/${id}/convert_to_node/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listDecisions() {
  return listResource<DecisionLog>('/analytics/decisions/')
}

export function createDecision(payload: DecisionLogPayload) {
  return createResource<DecisionLog, DecisionLogPayload>('/analytics/decisions/', payload)
}

export function updateDecision(id: string, payload: Partial<DecisionLogPayload>) {
  return updateResource<DecisionLog, Partial<DecisionLogPayload>>(`/analytics/decisions/${id}/`, payload)
}

export function deleteDecision(id: string) {
  return deleteResource(`/analytics/decisions/${id}/`)
}

export function listAchievements() {
  return listResource<Achievement>('/analytics/achievements/')
}

export function createAchievement(payload: AchievementPayload) {
  return createResource<Achievement, AchievementPayload>('/analytics/achievements/', payload)
}

export function updateAchievement(id: string, payload: Partial<AchievementPayload>) {
  return updateResource<Achievement, Partial<AchievementPayload>>(`/analytics/achievements/${id}/`, payload)
}

export function deleteAchievement(id: string) {
  return deleteResource(`/analytics/achievements/${id}/`)
}

export function listRetrospectives() {
  return listResource<ProjectRetrospective>('/analytics/retrospectives/')
}

export function createRetrospective(payload: ProjectRetrospectivePayload) {
  return createResource<ProjectRetrospective, ProjectRetrospectivePayload>('/analytics/retrospectives/', payload)
}

export function updateRetrospective(id: string, payload: Partial<ProjectRetrospectivePayload>) {
  return updateResource<ProjectRetrospective, Partial<ProjectRetrospectivePayload>>(`/analytics/retrospectives/${id}/`, payload)
}

export function listFamilyGoals() {
  return listResource<FamilyGoal>('/analytics/family-goals/')
}

export function createFamilyGoal(payload: FamilyGoalPayload) {
  return createResource<FamilyGoal, FamilyGoalPayload>('/analytics/family-goals/', payload)
}

export function updateFamilyGoal(id: string, payload: Partial<FamilyGoalPayload>) {
  return updateResource<FamilyGoal, Partial<FamilyGoalPayload>>(`/analytics/family-goals/${id}/`, payload)
}

export function deleteFamilyGoal(id: string) {
  return deleteResource(`/analytics/family-goals/${id}/`)
}

export function listRelationships() {
  return listResource<Relationship>('/analytics/relationships/')
}

export function createRelationship(payload: RelationshipPayload) {
  return createResource<Relationship, RelationshipPayload>('/analytics/relationships/', payload)
}

export function updateRelationship(id: string, payload: Partial<RelationshipPayload>) {
  return updateResource<Relationship, Partial<RelationshipPayload>>(`/analytics/relationships/${id}/`, payload)
}

export function deleteRelationship(id: string) {
  return deleteResource(`/analytics/relationships/${id}/`)
}

export function listLearnings() {
  return listResource<Learning>('/analytics/learnings/')
}

export function createLearning(payload: LearningPayload) {
  return createResource<Learning, LearningPayload>('/analytics/learnings/', payload)
}

export function updateLearning(id: string, payload: Partial<LearningPayload>) {
  return updateResource<Learning, Partial<LearningPayload>>(`/analytics/learnings/${id}/`, payload)
}

export function deleteLearning(id: string) {
  return deleteResource(`/analytics/learnings/${id}/`)
}

export function listGoalAttachmentProfiles(nodeId?: string) {
  const suffix = nodeId ? `?node=${encodeURIComponent(nodeId)}` : ''
  return listResource<GoalAttachmentProfile>(`/goals/attachments/${suffix}`)
}

export function createGoalAttachmentProfile(payload: GoalAttachmentProfilePayload) {
  return createResource<GoalAttachmentProfile, GoalAttachmentProfilePayload>('/goals/attachments/', payload)
}

export function updateGoalAttachmentProfile(id: string, payload: Partial<GoalAttachmentProfilePayload>) {
  return updateResource<GoalAttachmentProfile, Partial<GoalAttachmentProfilePayload>>(`/goals/attachments/${id}/`, payload)
}

export function getFinancialReport() {
  return request<NamedReportPayload>('/reports/financial/')
}

export function getProgressReport() {
  return request<NamedReportPayload>('/reports/progress/')
}

export function getPersonalReviewReport() {
  return request<NamedReportPayload>('/reports/personal-review/')
}

// ---------------------------------------------------------------------------
// Data Export
// ---------------------------------------------------------------------------

export function getFullExport(): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/core/export/')
}

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

/**
 * Send the full conversation history to the AI chat endpoint.
 * Returns Claude's reply text and a list of actions that were executed.
 */
export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: Record<string, unknown>,
): Promise<ChatResponse> {
  return request<ChatResponse>('/core/chat/', {
    method: 'POST',
    body: JSON.stringify({ messages, context }),
  })
}

// ---------------------------------------------------------------------------
// Life OS Redesign — new simplified endpoints
// ---------------------------------------------------------------------------

export function getDashboardV2() {
  return request<DashboardV2>('/dashboard/')
}

export async function listNodes(): Promise<Node[]> {
  // Fetch all pages
  const first = await request<{ count: number; results: Node[] }>('/nodes/?page_size=200')
  return first.results
}

export function createNode(payload: NodeCreatePayload) {
  return request<Node>('/nodes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateNode(id: string, payload: NodeUpdatePayload) {
  return request<Node>(`/nodes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteNode(id: string) {
  return request<null>(`/nodes/${id}/`, { method: 'DELETE' })
}

export function reorderNodes(items: { id: string; order: number }[]) {
  return request<{ ok: boolean }>('/nodes/reorder/', {
    method: 'POST',
    body: JSON.stringify(items),
  })
}

export function getPrioritizedNodes() {
  return request<NodePriorityEntry[]>('/nodes/prioritize/')
}

export function getFinanceSummaryV2() {
  return request<FinanceSummaryV2>('/finance/summary/')
}

export function updateFinanceSummaryV2(payload: Partial<FinanceSummaryV2>) {
  return request<FinanceSummaryV2>('/finance/summary/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function getRoutineLogs(date: string) {
  return request<RoutineLogEntry[]>(`/schedule/routine-log/?date=${date}`)
}

export function saveRoutineLog(entry: {
  date: string; block_time: string; status: string;
  actual_time?: string; actual_duration_minutes?: number | null; note?: string;
  prayed_in_mosque?: boolean | null;
  first_row?: boolean | null;
  takbirat_al_ihram?: boolean | null;
  prayed_sunnah?: boolean | null;
  morning_adhkar?: boolean | null;
  evening_adhkar?: boolean | null;
  salah_adhkar?: boolean | null;
}) {
  return request<RoutineLogEntry>('/schedule/routine-log/', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export function getRoutineStreak() {
  return request<{ streak: number; total_blocks: number }>('/schedule/routine-streak/')
}

export function getBlockStreaks() {
  return request<import('./types').BlockStreaksPayload>('/schedule/block-streaks/')
}

export function getRoutineMetrics(days = 30) {
  return request<RoutineMetrics>(`/schedule/routine-metrics/?days=${days}`)
}

export function getRoutineAnalytics(days = 90) {
  return request<RoutineAnalyticsData>(`/schedule/routine-analytics/?days=${days}`)
}

export function getRoutineBriefing() {
  return request<{ briefing: string; fallback: boolean }>('/schedule/routine-briefing/', { method: 'POST', body: '{}' })
}

export function getRoutineNotes(blockTime: string, limit = 10) {
  return request<{ date: string; status: string; actual_time: string | null; note: string }[]>(
    `/schedule/routine-notes/?block_time=${encodeURIComponent(blockTime)}&limit=${limit}`
  )
}

// ── Routine Blocks (editable schedule) ────────────────────────────────────────

export function listRoutineBlocks() {
  return request<RoutineBlock[]>('/schedule/routine-blocks/')
}

export function createRoutineBlock(data: Partial<RoutineBlock>) {
  return request<RoutineBlock>('/schedule/routine-blocks/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRoutineBlock(id: number, data: Partial<RoutineBlock>) {
  return request<RoutineBlock>(`/schedule/routine-blocks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteRoutineBlock(id: number) {
  return request<void>(`/schedule/routine-blocks/${id}/`, { method: 'DELETE' })
}

export function reorderRoutineBlocks(items: { id: number; order: number }[]) {
  return request<{ ok: boolean }>('/schedule/routine-blocks/reorder/', {
    method: 'POST',
    body: JSON.stringify(items),
  })
}

// ── Node Attachments ──────────────────────────────────────────────────────────

export function listAttachments(nodeId: number) {
  return request<Attachment[]>(`/goals/node-attachments/?node=${nodeId}`)
}

export function createAttachment(data: Partial<Attachment>) {
  return request<Attachment>('/goals/node-attachments/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteAttachment(id: number) {
  return request<void>(`/goals/node-attachments/${id}/`, { method: 'DELETE' })
}

// ── Income Events ─────────────────────────────────────────────────────────────

export function listIncomeEvents() {
  return request<IncomeEvent[]>('/finance/income-events/')
}

export function createIncomeEvent(data: Omit<IncomeEvent, 'id' | 'created_at'>) {
  return request<IncomeEvent>('/finance/income-events/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteIncomeEvent(id: number) {
  return request<void>(`/finance/income-events/${id}/`, { method: 'DELETE' })
}

// ── Journal ───────────────────────────────────────────────────────────────────

export function getJournalToday() {
  return request<JournalEntry>('/journal/today/')
}

export function upsertJournalToday(payload: JournalEntryPayload) {
  return request<JournalEntry>('/journal/today/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listJournalEntries() {
  return request<{ results: JournalEntry[] }>('/journal/entries/')
}

// ── Learning tracker ──────────────────────────────────────────────────────────

export function listLearningItems(status?: string) {
  const qs = status ? `?status=${status}` : ''
  return request<{ results: import('./types').LearningItem[] }>(`/goals/learning/${qs}`)
}

export function createLearningItem(payload: import('./types').LearningItemPayload) {
  return request<import('./types').LearningItem>('/goals/learning/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateLearningItem(id: number, payload: Partial<import('./types').LearningItemPayload>) {
  return request<import('./types').LearningItem>(`/goals/learning/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteLearningItem(id: number) {
  return request<void>(`/goals/learning/${id}/`, { method: 'DELETE' })
}

export function getDueLearningReviews() {
  return request<import('./types').LearningItem[]>('/goals/learning/due_review/')
}

export function markLearningReviewed(id: number): Promise<{ reviewed_count: number; next_review_at: string; days_until_next: number }> {
  return request(`/goals/learning/${id}/reviewed/`, { method: 'POST' })
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export function listContacts(relation?: string) {
  const qs = relation ? `?relation=${relation}` : ''
  return request<{ results: import('./types').Contact[] }>(`/contacts/contacts/${qs}`)
}

export function getDueFollowups() {
  return request<{ results: import('./types').Contact[]; count: number }>('/contacts/due-followups/')
}

export function createContact(payload: import('./types').ContactPayload) {
  return request<import('./types').Contact>('/contacts/contacts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateContact(id: number, payload: Partial<import('./types').ContactPayload>) {
  return request<import('./types').Contact>(`/contacts/contacts/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteContact(id: number) {
  return request<void>(`/contacts/contacts/${id}/`, { method: 'DELETE' })
}

export function listInteractions(contactId: number) {
  return request<import('./types').ContactInteraction[]>(`/contacts/interactions/?contact=${contactId}`)
}

export function logInteraction(payload: import('./types').ContactInteractionPayload) {
  return request<import('./types').ContactInteraction>('/contacts/interactions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteInteraction(id: number) {
  return request<void>(`/contacts/interactions/${id}/`, { method: 'DELETE' })
}

// ── Cross-domain node connections ─────────────────────────────────────────────

export function listRoutineBlocksForNode(nodeId: string) {
  return request<import('./types').RoutineBlock[]>(`/schedule/routine-blocks/?linked_node=${nodeId}`)
}

export function listHabitsForNode(nodeId: string) {
  return request<{ results: Array<{ id: number; name: string; target: string }> }>(`/health/habits/?goal=${nodeId}`)
}

export function listContactsForNode(nodeId: string) {
  return request<{ results: import('./types').Contact[] }>(`/contacts/contacts/?linked_node=${nodeId}`)
}

export function listLearningItemsForNode(nodeId: string) {
  return request<{ results: import('./types').LearningItem[] }>(`/goals/learning/?linked_node=${nodeId}`)
}

export function listMarketingActionsForNode(nodeId: string) {
  return request<{ results: Array<{ id: number; action: string; platform: string; date: string }> }>(`/pipeline/marketing/?goal=${nodeId}`)
}

// ── Marketing Hub ─────────────────────────────────────────────────────────────

export function getMarketingWorkspace() {
  return request<import('./types').MarketingWorkspacePayload>('/pipeline/marketing-workspace/')
}

export function listMarketingChannels() {
  return listResource<import('./types').MarketingChannel>('/pipeline/channels/')
}

export function createMarketingChannel(payload: Partial<import('./types').MarketingChannel>) {
  return createResource<import('./types').MarketingChannel, Partial<import('./types').MarketingChannel>>('/pipeline/channels/', payload)
}

export function updateMarketingChannel(id: string, payload: Partial<import('./types').MarketingChannel>) {
  return updateResource<import('./types').MarketingChannel, Partial<import('./types').MarketingChannel>>(`/pipeline/channels/${id}/`, payload)
}

export function deleteMarketingChannel(id: string) {
  return deleteResource(`/pipeline/channels/${id}/`)
}

export function listMarketingCampaigns() {
  return listResource<import('./types').MarketingCampaign>('/pipeline/campaigns/')
}

export function createMarketingCampaign(payload: Partial<import('./types').MarketingCampaign>) {
  return createResource<import('./types').MarketingCampaign, Partial<import('./types').MarketingCampaign>>('/pipeline/campaigns/', payload)
}

export function updateMarketingCampaign(id: string, payload: Partial<import('./types').MarketingCampaign>) {
  return updateResource<import('./types').MarketingCampaign, Partial<import('./types').MarketingCampaign>>(`/pipeline/campaigns/${id}/`, payload)
}

export function deleteMarketingCampaign(id: string) {
  return deleteResource(`/pipeline/campaigns/${id}/`)
}

// ── Goals Analytics ───────────────────────────────────────────────────────────

export type GoalsAnalyticsSummary = {
  status_counts: Record<string, number>
  stalled_goals: Array<{ id: string; title: string; category: string; type: string; updated_at: string }>
  top_time_goals: Array<{ id: string; title: string; type: string; category: string; status: string; total_mins: number }>
  completed_this_month: Array<{ id: string; title: string; type: string; category: string; completed_at: string }>
  completed_this_month_count: number
}

export function getGoalsAnalyticsSummary() {
  return request<GoalsAnalyticsSummary>('/goals/nodes/analytics_summary/')
}

export type NodeVelocityPayload = {
  weeks: { week_start: string; completed_count: number }[]
  total_12w: number
  trend: 'up' | 'down'
}

export type FunnelStage = {
  stage: string
  label: string
  count: number
  conversion_from_prev: number | null
}

export type GoalFunnelPayload = {
  stages: FunnelStage[]
  total_active: number
  total_all: number
}

export function getNodeVelocity(): Promise<NodeVelocityPayload> {
  return request<NodeVelocityPayload>('/goals/nodes/velocity/')
}

export function getGoalFunnel(): Promise<GoalFunnelPayload> {
  return request<GoalFunnelPayload>('/goals/nodes/funnel/')
}

// ── Time Logs ─────────────────────────────────────────────────────────────────

export function listTimeLogs(nodeId: string) {
  return request<import('./types').TimeLog[]>(`/goals/timelogs/?node=${nodeId}`)
}

export function createTimeLog(payload: import('./types').TimeLogPayload) {
  return request<import('./types').TimeLog>('/goals/timelogs/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteTimeLog(id: number) {
  return request<void>(`/goals/timelogs/${id}/`, { method: 'DELETE' })
}

// ── Goal Decomposition ────────────────────────────────────────────────────────

export function decomposeNode(id: string) {
  return request<import('./types').DecomposeResponse>(`/goals/nodes/${id}/decompose/`, { method: 'POST' })
}

// ── Scheduled Entries ─────────────────────────────────────────────────────────

export function listScheduledEntries(date: string) {
  return request<import('./types').ScheduledEntry[]>(`/schedule/scheduled-entries/?date=${date}`)
}

export function listScheduledEntriesRange(dateFrom: string, dateTo: string) {
  return request<import('./types').ScheduledEntry[]>(
    `/schedule/scheduled-entries/?date_from=${dateFrom}&date_to=${dateTo}`,
  )
}

export function createScheduledEntry(payload: import('./types').ScheduledEntryPayload) {
  return request<import('./types').ScheduledEntry>('/schedule/scheduled-entries/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateScheduledEntry(id: number, payload: Partial<import('./types').ScheduledEntryPayload>) {
  return request<import('./types').ScheduledEntry>(`/schedule/scheduled-entries/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteScheduledEntry(id: number) {
  return request<void>(`/schedule/scheduled-entries/${id}/`, { method: 'DELETE' })
}

export function listGCalEvents(date: string) {
  return request<import('./types').GCalEvent[]>(`/schedule/gcal-events/?date=${date}`)
}

// ── AI Schedule Suggester ─────────────────────────────────────────────────────

export interface ScheduleSuggestion {
  node_id: number | null
  node_title: string
  start_time: string        // "HH:MM"
  duration_minutes: number
  reason: string
}

export function suggestScheduleBlocks(date: string) {
  return request<{ suggestions: ScheduleSuggestion[]; date: string }>(
    `/schedule/ai-suggest/?date=${date}`,
    { method: 'POST' }
  )
}

// ── Gmail → Contacts ──────────────────────────────────────────────────────────

export interface GmailThread {
  id: string
  subject: string
  from_address: string
  date: string
  message_count: number
  snippet: string
}

export function listContactGmailThreads(contactId: number) {
  return request<{ threads: GmailThread[]; email: string; note?: string }>(
    `/contacts/contacts/${contactId}/gmail-threads/`
  )
}

// ── About Me / Self Profile ───────────────────────────────────────────────────

export function getProfile(): Promise<import('./types').UserProfile> {
  return request<import('./types').UserProfile>('/profile/')
}

export function updateProfile(data: Partial<import('./types').UserProfile>): Promise<import('./types').UserProfile> {
  return request<import('./types').UserProfile>('/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function getAIContext(): Promise<{ context: string }> {
  return request<{ context: string }>('/profile/ai-context/')
}

// ── Exchange Rates ────────────────────────────────────────────────────────────

export function getExchangeRates(): Promise<ExchangeRates> {
  return request<ExchangeRates>('/finance/exchange-rates/')
}

export function updateExchangeRates(data: { eur_to_egp?: number; eur_to_usd?: number }): Promise<ExchangeRates> {
  return request<ExchangeRates>('/finance/exchange-rates/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── Meal Plans ────────────────────────────────────────────────────────────────

export function listMealPlans(date: string): Promise<MealPlan[]> {
  return request<MealPlan[]>(`/health/meal-plans/?date=${date}`)
}

export function createMealPlan(data: Partial<MealPlan>): Promise<MealPlan> {
  return request<MealPlan>('/health/meal-plans/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateMealPlan(id: string, data: Partial<MealPlan>): Promise<MealPlan> {
  return request<MealPlan>(`/health/meal-plans/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteMealPlan(id: string): Promise<void> {
  return request<void>(`/health/meal-plans/${id}/`, { method: 'DELETE' })
}

export function getMealTotals(date: string): Promise<MealTotals> {
  return request<MealTotals>(`/health/meal-plans/totals/?date=${date}`)
}

export function saveMealLog(data: {
  plan?: string; date: string; slot: string; status: string; notes?: string
}): Promise<MealLog> {
  return request<MealLog>('/health/meal-logs/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateMealLog(id: string, data: Partial<MealLog>): Promise<MealLog> {
  return request<MealLog>(`/health/meal-logs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── Meal Templates ─────────────────────────────────────────────────────────────

export function listMealTemplates(): Promise<MealTemplate[]> {
  return request<MealTemplate[]>('/health/meal-templates/')
}

export function createMealTemplate(data: Partial<MealTemplate>): Promise<MealTemplate> {
  return request<MealTemplate>('/health/meal-templates/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteMealTemplate(id: string): Promise<void> {
  return request<void>(`/health/meal-templates/${id}/`, { method: 'DELETE' })
}

export function copyMealDay(fromDate: string, toDate: string): Promise<MealPlan[]> {
  return request<MealPlan[]>('/health/meal-plans/copy-day/', {
    method: 'POST',
    body: JSON.stringify({ from_date: fromDate, to_date: toDate }),
  })
}

export function getMealWeekSummary(start: string): Promise<MealPlan[]> {
  return request<MealPlan[]>(`/health/meal-plans/week-summary/?start=${start}`)
}

// ── Food Library ───────────────────────────────────────────────────────────────

export function listFoodItems(search?: string, category?: string): Promise<FoodItem[]> {
  const params: string[] = []
  if (search) params.push(`search=${encodeURIComponent(search)}`)
  if (category) params.push(`category=${encodeURIComponent(category)}`)
  const qs = params.length ? `?${params.join('&')}` : ''
  return request<FoodItem[]>(`/health/food-items/${qs}`)
}

export function createFoodItem(data: Partial<FoodItem>): Promise<FoodItem> {
  return request<FoodItem>('/health/food-items/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateFoodItem(id: string, data: Partial<FoodItem>): Promise<FoodItem> {
  return request<FoodItem>(`/health/food-items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteFoodItem(id: string): Promise<void> {
  return request<void>(`/health/food-items/${id}/`, { method: 'DELETE' })
}

// ── Meal Ingredients ──────────────────────────────────────────────────────────

export function createMealIngredient(data: Partial<MealIngredient>): Promise<MealIngredient> {
  return request<MealIngredient>('/health/meal-ingredients/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateMealIngredient(id: string, data: Partial<MealIngredient>): Promise<MealIngredient> {
  return request<MealIngredient>(`/health/meal-ingredients/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteMealIngredient(id: string): Promise<void> {
  return request<void>(`/health/meal-ingredients/${id}/`, { method: 'DELETE' })
}

// ── Daily Check-in status ─────────────────────────────────────────────────────

export type CheckInStatus = {
  date: string
  morning_done: boolean
  evening_done: boolean
  morning_completed_at: string | null
  evening_completed_at: string | null
}

export type EveningCheckInPayload = {
  mood_score?: number | null
  gratitude_note?: string
  evening_wins?: string
  tomorrow_focus?: string
}

// ── Outreach Pipeline / AI Drafting ──────────────────────────────────────────

export type DraftMessagePayload = { channel?: string; refresh?: boolean }
export type DraftMessageResult = { draft: string; cached: boolean }

export function draftOpportunityMessage(id: string, payload: DraftMessagePayload = {}): Promise<DraftMessageResult> {
  return request<DraftMessageResult>(`/pipeline/opportunities/${id}/draft_message/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function markOutreachSent(id: string, followupDays = 7): Promise<{ outreach_count: number; next_followup_date: string }> {
  return request<{ outreach_count: number; next_followup_date: string }>(
    `/pipeline/opportunities/${id}/mark_outreach_sent/`,
    { method: 'POST', body: JSON.stringify({ followup_days: followupDays }) },
  )
}

export function getDuePipelineFollowups() {
  return request<import('./types').Opportunity[]>('/pipeline/opportunities/due_followups/')
}

// ── Debt Payoff Engine ────────────────────────────────────────────────────────

export type DebtEntry = {
  id: string
  creditor: string
  original_amount: string
  remaining_amount: string
  monthly_payment: string
  paid_off: boolean
  priority: number
  notes: string
  paid_pct: number
  created_at: string
  updated_at: string
}

export type DebtScenario = {
  label: string
  monthly_egp: number
  months: number | null
  payoff_date: string | null
}

export type DebtOverview = {
  debts: DebtEntry[]
  total_remaining_egp: number
  total_monthly_payment_egp: number
  surplus_egp: number
  scenarios: Record<string, DebtScenario>
}

export function getDebtOverview(extraEgp?: number): Promise<DebtOverview> {
  const qs = extraEgp ? `?extra_egp=${extraEgp}` : ''
  return request<DebtOverview>(`/finance/debts/overview/${qs}`)
}

export function listDebts(): Promise<DebtEntry[]> {
  return request<DebtEntry[]>('/finance/debts/')
}

export function createDebt(payload: Partial<DebtEntry>): Promise<DebtEntry> {
  return request<DebtEntry>('/finance/debts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateDebt(id: string, payload: Partial<DebtEntry>): Promise<DebtEntry> {
  return request<DebtEntry>(`/finance/debts/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteDebt(id: string): Promise<void> {
  return request<void>(`/finance/debts/${id}/`, { method: 'DELETE' })
}

// ── Kyrgyzstan Readiness Score ────────────────────────────────────────────────

export type ReadinessBreakdownItem = {
  score: number
  max: number
  label: string
}

export type ReadinessScore = {
  date: string
  total_score: number
  breakdown: Record<string, ReadinessBreakdownItem>
  snapshot_data: Record<string, number | string>
  history: { date: string; score: number }[]
  projected_date: string | null
}

export function getReadinessScore(): Promise<ReadinessScore> {
  return request<ReadinessScore>('/core/readiness/')
}

// ── Daily Check-in status ─────────────────────────────────────────────────────

export function getCheckinTodayStatus(): Promise<CheckInStatus> {
  return request<CheckInStatus>('/core/checkin/today-status/')
}

export function submitEveningCheckIn(payload: EveningCheckInPayload): Promise<{ checkin_id: string; evening_done: boolean }> {
  return request<{ checkin_id: string; evening_done: boolean }>('/core/checkin/today-status/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Focus Mode ────────────────────────────────────────────────────────────────

export type FocusBlock = {
  label: string
  type: string
  time: string
  duration_minutes: number
}

export type FocusNode = {
  id: string
  title: string
  type: string
  leverage_score: number
  dependent_count: number
}

export type FocusContext = {
  current_block: FocusBlock | null
  next_block: FocusBlock | null
  top_node: FocusNode | null
  morning_done: boolean
  evening_done: boolean
  next_prayer: string | null
  minutes_to_prayer: number | null
  instruction: string
}

export function getFocusContext(): Promise<FocusContext> {
  return request<FocusContext>('/core/focus/')
}

// ── App Settings / Bad Day Mode ───────────────────────────────────────────────

export type AppSettings = {
  id: string
  name: string
  bad_day_mode: boolean
  timezone: string
}

export function listAppSettings(): Promise<{ results: AppSettings[] }> {
  return request<{ results: AppSettings[] }>('/core/settings/')
}

export function toggleBadDayMode(id: string): Promise<{ bad_day_mode: boolean }> {
  return request<{ bad_day_mode: boolean }>(`/core/settings/${id}/toggle_bad_day/`, { method: 'POST' })
}

// ── Habit & Spiritual Heatmaps ────────────────────────────────────────────────

export type HabitHeatmapPayload = {
  habits: { id: string; name: string }[]
  grid: Record<string, Record<string, boolean>>   // habit_id → date → done
  date_range: { start: string; end: string }
}

export type SpiritualHeatmapPayload = {
  dates: string[]
  grid: Record<string, { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }>
  stats: {
    full_prayer_days: number
    prayer_counts: Record<string, number>
    days_tracked: number
  }
}

export function getHabitHeatmap(): Promise<HabitHeatmapPayload> {
  return request<HabitHeatmapPayload>('/health/habit-heatmap/')
}

export function getSpiritualHeatmap(): Promise<SpiritualHeatmapPayload> {
  return request<SpiritualHeatmapPayload>('/health/spiritual-heatmap/?days=60')
}

// ── Workout Sessions ──────────────────────────────────────────────────────────

export function listWorkoutSessions(params?: { date?: string; date_from?: string; date_to?: string }): Promise<WorkoutSession[]> {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString() : ''
  return request<WorkoutSession[]>(`/health/workout-sessions/${qs}`)
}

export function createWorkoutSession(payload: WorkoutSessionPayload): Promise<WorkoutSession> {
  return request<WorkoutSession>('/health/workout-sessions/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateWorkoutSession(id: string, payload: Partial<WorkoutSessionPayload>): Promise<WorkoutSession> {
  return request<WorkoutSession>(`/health/workout-sessions/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteWorkoutSession(id: string): Promise<void> {
  return request<void>(`/health/workout-sessions/${id}/`, { method: 'DELETE' })
}

export function createWorkoutExercise(payload: WorkoutExercisePayload): Promise<WorkoutExercise> {
  return request<WorkoutExercise>('/health/workout-exercises/', { method: 'POST', body: JSON.stringify(payload) })
}

export function deleteWorkoutExercise(id: string): Promise<void> {
  return request<void>(`/health/workout-exercises/${id}/`, { method: 'DELETE' })
}

export function createSetLog(payload: SetLogPayload): Promise<SetLog> {
  return request<SetLog>('/health/set-logs/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateSetLog(id: string, payload: Partial<SetLogPayload>): Promise<SetLog> {
  return request<SetLog>(`/health/set-logs/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteSetLog(id: string): Promise<void> {
  return request<void>(`/health/set-logs/${id}/`, { method: 'DELETE' })
}

export function getStrengthHistory(exerciseName: string, weeks = 8): Promise<StrengthHistoryPayload> {
  return request<StrengthHistoryPayload>(`/health/workout-sessions/strength-history/?exercise_name=${encodeURIComponent(exerciseName)}&weeks=${weeks}`)
}

// ── Body Composition ──────────────────────────────────────────────────────────

export function listBodyCompositionLogs(): Promise<BodyCompositionLog[]> {
  return request<BodyCompositionLog[]>('/health/body-composition/')
}

export function createBodyCompositionLog(payload: BodyCompositionLogPayload): Promise<BodyCompositionLog> {
  return request<BodyCompositionLog>('/health/body-composition/', { method: 'POST', body: JSON.stringify(payload) })
}

// ── Wearable ──────────────────────────────────────────────────────────────────

export function listWearableLogs(): Promise<WearableLog[]> {
  return request<WearableLog[]>('/health/wearable-logs/')
}

export function createWearableLog(payload: WearableLogPayload): Promise<WearableLog> {
  return request<WearableLog>('/health/wearable-logs/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateWearableLog(id: string, payload: Partial<WearableLogPayload>): Promise<WearableLog> {
  return request<WearableLog>(`/health/wearable-logs/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

// ── Health AI + Readiness ─────────────────────────────────────────────────────

export function getHealthReadiness(): Promise<HealthReadinessScore> {
  return request<HealthReadinessScore>('/health/readiness/')
}

export function getHealthAIInsights(): Promise<HealthAIInsightsPayload> {
  return request<HealthAIInsightsPayload>('/health/ai-insights/', { method: 'POST' })
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export type SystemAlert = {
  id: string
  alert_type: string
  title: string
  body: string
  priority: 'critical' | 'warning' | 'info'
  link_url: string
  read: boolean
  sent_telegram: boolean
  dismissed_at: string | null
  resolved_at: string | null
  date: string
  created_at: string
}

export type AlertsPayload = {
  alerts: SystemAlert[]
  unread_count: number
  critical_count: number
}

export type AlertCount = {
  unread_count: number
  critical_count: number
}

export function listAlerts(): Promise<AlertsPayload> {
  return request<AlertsPayload>('/core/alerts/')
}

export function getAlertCount(): Promise<AlertCount> {
  return request<AlertCount>('/core/alerts/count/')
}

export function markAlertRead(id: string): Promise<SystemAlert> {
  return request<SystemAlert>(`/core/alerts/${id}/read/`, { method: 'POST' })
}

export function dismissAlert(id: string): Promise<SystemAlert> {
  return request<SystemAlert>(`/core/alerts/${id}/dismiss/`, { method: 'POST' })
}

export function markAllAlertsRead(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/core/alerts/read-all/', { method: 'POST' })
}

// ── AI Data Bridge — Export ───────────────────────────────────────────────────

export type BridgeDomain = 'goals' | 'finance' | 'pipeline' | 'health' | 'learning' | 'journal' | 'ideas' | 'contacts' | 'all'
export type BridgeFormat = 'json' | 'markdown'

export async function exportDomain(domain: BridgeDomain, fmt: BridgeFormat): Promise<string> {
  const apiBaseUrl = resolveApiBaseUrl()
  const url = `${apiBaseUrl}/core/export/domain/?domain=${domain}&format=${fmt}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Export failed (${res.status})`)
  if (fmt === 'markdown') return res.text()
  const json = await res.json()
  return JSON.stringify(json, null, 2)
}

// ── AI Data Bridge — Import ───────────────────────────────────────────────────

export type ImportDomain = 'goals' | 'pipeline' | 'learning' | 'finance' | 'ideas' | 'contacts' | 'journal' | 'habits'

export type ImportPreviewRow = {
  name: string
  action: 'create' | 'skip' | 'update'
  type?: string
  reason?: string
  changes?: string
}

export type ImportPreview = {
  domain: string
  dry_run: boolean
  preview: ImportPreviewRow[]
  created: number
  updated?: number
  skipped: number
  errors: { item: unknown; error: string }[]
}

export function previewImport(
  domain: ImportDomain,
  data: unknown[],
  updateExisting = false,
): Promise<ImportPreview> {
  return request<ImportPreview>('/core/import/', {
    method: 'POST',
    body: JSON.stringify({ domain, data, confirm: false, update_existing: updateExisting }),
  })
}

export function confirmImport(
  domain: ImportDomain,
  data: unknown[],
  updateExisting = false,
): Promise<ImportPreview> {
  return request<ImportPreview>('/core/import/', {
    method: 'POST',
    body: JSON.stringify({ domain, data, confirm: true, update_existing: updateExisting }),
  })
}
