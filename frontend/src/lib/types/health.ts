export type HealthLog = {
  id: string
  date: string
  sleep_hours: string
  sleep_quality: number
  energy_level: number
  exercise_done: boolean
  exercise_type: string
  exercise_duration_mins: number | null
  weight_kg: string | null
  nutrition_notes: string
}

export type HealthLogPayload = {
  date: string
  sleep_hours: string
  sleep_quality: number
  energy_level: number
  exercise_done: boolean
  exercise_type: string
  exercise_duration_mins: number | null
  weight_kg: string | null
  nutrition_notes: string
}

export type MoodLog = {
  id: string
  date: string
  mood_score: number
  notes: string
}

export type MoodLogPayload = {
  date: string
  mood_score: number
  notes: string
}

export type SpiritualLog = {
  id: string
  date: string
  fajr: boolean
  dhuhr: boolean
  asr: boolean
  maghrib: boolean
  isha: boolean
  quran_pages: number
  dhikr_done: boolean
  notes: string
  prayers_count: number
}

export type SpiritualLogPayload = {
  date: string
  fajr: boolean
  dhuhr: boolean
  asr: boolean
  maghrib: boolean
  isha: boolean
  quran_pages: number
  dhikr_done: boolean
  notes: string
}

export type Habit = {
  id: string
  name: string
  target: 'daily' | '3x_week' | 'weekly' | 'custom'
  custom_days: number | null
  goal: string | null
}

export type HabitLog = {
  id: string
  habit: string
  date: string
  done: boolean
  note: string
}

export type HabitLogPayload = {
  habit: string
  date: string
  done: boolean
  note: string
}

export type HabitBoardItem = {
  habit: Habit
  today_log: HabitLog | null
  completion_rate_7d: number | null
  completion_rate_30d: number | null
  current_streak: number
}

export type HealthSummary = {
  date: string
  avg_sleep_7d: number | null
  avg_energy_7d: number | null
  avg_sleep_30d: number | null
  avg_mood_7d: number | null
  avg_mood_30d: number | null
  avg_quran_7d: number | null
  exercise_streak: number
  full_prayer_streak: number
  habit_completion_rate_7d: number | null
  habit_completion_rate_30d: number | null
  prayer_completion_rate_7d: number | null
  dhikr_completion_rate_7d: number | null
  spiritual_consistency_7d: number | null
  low_energy_today: boolean
  low_sleep_today: boolean
  low_mood_today: boolean
  low_mood_streak: number
  prayer_gap_streak: number
  health_logged_today: boolean
  mood_logged_today: boolean
  spiritual_logged_today: boolean
  active_habits_count: number
  habits_completed_today: number
}

export type HealthTodayPayload = {
  date: string
  summary: HealthSummary
  health_log: HealthLog | null
  mood_log: MoodLog | null
  spiritual_log: SpiritualLog | null
  habit_board: HabitBoardItem[]
}

export type OverwhelmSummary = {
  date: string
  overwhelm_score: number
  reduced_mode: boolean
  max_priorities: number
  burnout_risk: boolean
  signals: string[]
}

export type HealthOverviewPayload = {
  date: string
  summary: HealthSummary
  today: HealthTodayPayload
  recent_health_logs: HealthLog[]
  recent_mood_logs: MoodLog[]
  recent_spiritual_logs: SpiritualLog[]
  capacity_signals: string[]
}

export type MealLog = {
  id: string
  plan: string | null
  date: string
  slot: string
  status: 'as_planned' | 'ate_less' | 'ate_more' | 'ate_differently' | 'skipped'
  notes: string
  created_at: string
}

export type FoodItem = {
  id: string
  name: string
  category: 'protein' | 'grain' | 'vegetable' | 'fruit' | 'dairy' | 'legume' | 'nut' | 'fat' | 'beverage' | 'other'
  calories_per_100g: string | null
  protein_per_100g: string | null
  fat_per_100g: string | null
  carbs_per_100g: string | null
  fiber_per_100g: string | null
  saturated_fat_per_100g: string | null
  sugar_per_100g: string | null
  sodium_mg_per_100g: string | null
  cholesterol_mg_per_100g: string | null
  vitamins_per_100g: Record<string, number>
  minerals_per_100g: Record<string, number>
  is_verified: boolean
  serving_unit: 'g' | 'piece'
  grams_per_piece: string | null
  serving_label: string
}

export type MealIngredient = {
  id: string
  meal_plan: string
  food_item: string | null
  name: string
  quantity_g: string
  quantity_pieces: string | null
  grams_per_piece: string | null
  serving_label: string
  calories_per_100g: string | null
  protein_per_100g: string | null
  fat_per_100g: string | null
  carbs_per_100g: string | null
  fiber_per_100g: string | null
  vitamins_per_100g: Record<string, number>
  minerals_per_100g: Record<string, number>
  // computed by serializer
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
}

export type MealPlan = {
  id: string
  date: string
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number | null
  protein_g: string | null
  fat_g: string | null
  carbs_g: string | null
  fiber_g: string | null
  vitamins: Record<string, number>
  minerals: Record<string, number>
  notes: string
  log: MealLog | null
  ingredients: MealIngredient[]
}

export type MealTotals = {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  vitamins: Record<string, number>
  minerals: Record<string, number>
}

export type MealTemplate = {
  id: string
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number | null
  protein_g: string | null
  fat_g: string | null
  carbs_g: string | null
  fiber_g: string | null
  vitamins: Record<string, number>
  minerals: Record<string, number>
  notes: string
}
