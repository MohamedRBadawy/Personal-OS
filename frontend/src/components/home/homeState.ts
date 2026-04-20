// [AR] حالة الوقت من اليوم — تحدد السياق الزمني للصفحة الرئيسية
// [EN] Time-of-day state — determines home page contextual display mode

export type HomeState = 'morning' | 'afternoon' | 'evening'

export function getHomeState(): HomeState {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  return 'evening'
}
