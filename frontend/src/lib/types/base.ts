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

export type WeeklyReviewPreview = {
  week_start: string
  week_end: string
  snippet?: string
  report: string
  context?: Record<string, unknown>
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

export type NamedReportPayload = {
  name: string
  generated_at: string
  report: string
  sections: Record<string, unknown>
}

export type ExchangeRates = {
  eur_to_egp: number
  eur_to_usd: number
  usd_to_egp: number
}

// ── About Me / Self Profile ───────────────────────────────────────────────────

export type ProfileSection = {
  id: number
  title: string
  content: string
  order: number
  updated_at: string
}

export type UserProfile = {
  id: number
  full_name: string
  date_of_birth: string | null
  location: string
  personality_type: string
  religion: string
  weight_kg: number | null
  height_cm: number | null
  monthly_income: string | null
  income_currency: string
  monthly_expenses: string | null
  monthly_independent_income: string | null
  financial_target_monthly: string | null
  financial_target_currency: string
  total_debt: string | null
  debt_currency: string
  theme_preference: 'dark' | 'light' | 'system'
  sections: ProfileSection[]
  ai_context: string
  updated_at: string
}
