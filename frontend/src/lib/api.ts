import type {
  Achievement,
  AchievementPayload,
  AISuggestion,
  AnalyticsOverviewPayload,
  ChatResponse,
  CheckInPayload,
  CheckInResponse,
  DashboardPayload,
  DecisionLog,
  DecisionLogPayload,
  FamilyGoal,
  FamilyGoalPayload,
  FinanceEntry,
  FinanceEntryPayload,
  FinanceSummary,
  GoalContext,
  GoalMapPayload,
  GoalNode,
  GoalNodeCreatePayload,
  GoalNodeUpdatePayload,
  GoalTreeNode,
  HabitLog,
  HabitLogPayload,
  HealthLog,
  HealthLogPayload,
  HealthSummary,
  HealthTodayPayload,
  Idea,
  IdeaPayload,
  Learning,
  LearningPayload,
  MarketingAction,
  MarketingActionPayload,
  MoodLog,
  MoodLogPayload,
  Opportunity,
  OpportunityPayload,
  PaginatedResponse,
  PipelineWorkspacePayload,
  Relationship,
  RelationshipPayload,
  ScheduleBlockLog,
  ScheduleLogPayload,
  SpiritualLog,
  SpiritualLogPayload,
  WeeklyReview,
  WeeklyReviewGenerateResponse,
  WeeklyReviewPreview,
  WeeklyReviewUpdatePayload,
  TimelineWeekPayload,
  TodaySchedulePayload,
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
    throw new Error(`Request failed (${response.status})`)
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

export function listFinanceEntries() {
  return listResource<FinanceEntry>('/finance/entries/')
}

export function createFinanceEntry(payload: FinanceEntryPayload) {
  return createResource<FinanceEntry, FinanceEntryPayload>('/finance/entries/', payload)
}

export function getHealthSummary() {
  return request<HealthSummary>('/health/summary/')
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

export function getTodaySchedule() {
  return request<TodaySchedulePayload>('/schedule/today/')
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

export function getPipelineWorkspace() {
  return request<PipelineWorkspacePayload>('/pipeline/workspace/')
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

export function createIdea(payload: IdeaPayload) {
  return createResource<Idea, IdeaPayload>('/analytics/ideas/', payload)
}

export function updateIdea(id: string, payload: Partial<IdeaPayload>) {
  return updateResource<Idea, Partial<IdeaPayload>>(`/analytics/ideas/${id}/`, payload)
}

export function deleteIdea(id: string) {
  return deleteResource(`/analytics/ideas/${id}/`)
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

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

/**
 * Send the full conversation history to the AI chat endpoint.
 * Returns Claude's reply text and a list of actions that were executed.
 */
export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ChatResponse> {
  return request<ChatResponse>('/core/chat/', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}
