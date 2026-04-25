// [AR] حالة الوقت من اليوم — تحدد السياق الزمني للصفحة الرئيسية
// [EN] Time-of-day state — determines home page contextual display mode

export type HomeState = 'morning' | 'afternoon' | 'evening'
export type QuestionPanelId = 'q1' | 'q2' | 'q3' | 'q4'
export type QuestionPanelOpenState = Record<QuestionPanelId, boolean>

export const DEFAULT_QUESTION_PANEL_OPEN: QuestionPanelOpenState = {
  q1: true,
  q2: true,
  q3: true,
  q4: true,
}

export function getHomeState(): HomeState {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  return 'evening'
}
