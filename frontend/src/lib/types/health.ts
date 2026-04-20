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
  health_domain: 'sleep' | 'movement' | 'nutrition' | 'recovery' | 'mental' | 'general'
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
  goals: HealthGoalProfile
  direction: HealthDirection
  recent_health_logs: HealthLog[]
  recent_mood_logs: MoodLog[]
  recent_spiritual_logs: SpiritualLog[]
  capacity_signals: string[]
  readiness: HealthReadinessScore | null
  body_composition_latest: BodyCompositionLog | null
  recent_workout_sessions: WorkoutSession[]
  muscle_activation: MuscleActivation[]
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

// ── Workout Engine ─────────────────────────────────────────────────────────────

export type SetLog = {
  id: string
  exercise: string
  set_number: number
  reps: number | null
  weight_kg: string | null
  duration_secs: number | null
  distance_km: string | null
  notes: string
}

export type SetLogPayload = {
  exercise: string
  set_number: number
  reps?: number | null
  weight_kg?: string | null
  duration_secs?: number | null
  distance_km?: string | null
  notes?: string
}

export type WorkoutExercise = {
  id: string
  session: string
  name: string
  category: 'compound' | 'isolation' | 'cardio' | 'flexibility'
  order: number
  notes: string
  sets: SetLog[]
  primary_muscle: string
  secondary_muscles: string[]
}

export type WorkoutExercisePayload = {
  session: string
  name: string
  category?: 'compound' | 'isolation' | 'cardio' | 'flexibility'
  order?: number
  notes?: string
  primary_muscle?: string
  secondary_muscles?: string[]
}

export type WorkoutSession = {
  id: string
  date: string
  title: string
  session_type: 'strength' | 'cardio' | 'swimming' | 'yoga' | 'other'
  duration_mins: number | null
  notes: string
  health_log: string | null
  exercises: WorkoutExercise[]
  created_at: string
}

export type WorkoutSessionPayload = {
  date: string
  session_type: 'strength' | 'cardio' | 'swimming' | 'yoga' | 'other'
  title?: string
  duration_mins?: number | null
  notes?: string
  health_log?: string | null
}

// ── Body Composition ──────────────────────────────────────────────────────────

export type BodyCompositionLog = {
  id: string
  date: string
  weight_kg: string
  body_fat_pct: string | null
  muscle_mass_kg: string | null
  fat_mass_kg: string | null
  visceral_fat_level: number | null
  body_water_pct: string | null
  bmi: string | null
  metabolic_age: number | null
  source: 'inbody' | 'manual' | 'estimate'
  notes: string
  lean_mass_kg: string | null
  created_at: string
}

export type BodyCompositionLogPayload = {
  date: string
  weight_kg: string
  body_fat_pct?: string | null
  muscle_mass_kg?: string | null
  fat_mass_kg?: string | null
  visceral_fat_level?: number | null
  body_water_pct?: string | null
  bmi?: string | null
  metabolic_age?: number | null
  source?: 'inbody' | 'manual' | 'estimate'
  notes?: string
}

// ── Wearable ──────────────────────────────────────────────────────────────────

export type WearableLog = {
  id: string
  date: string
  source: 'garmin' | 'apple_watch' | 'fitbit' | 'manual'
  steps: number | null
  active_minutes: number | null
  calories_burned: number | null
  resting_heart_rate: number | null
  avg_heart_rate: number | null
  hrv_ms: number | null
  sleep_score: number | null
  spo2_pct: string | null
  vo2_max: string | null
  stress_score: number | null
  created_at: string
}

export type WearableLogPayload = Omit<WearableLog, 'id' | 'created_at'>

// ── Analytics types ───────────────────────────────────────────────────────────

export type HealthReadinessComponent = {
  score: number
  available: boolean
}

export type HealthPrimaryGoal =
  | 'sleep_energy'
  | 'strength'
  | 'body_composition'
  | 'nutrition'
  | 'mood_stability'
  | 'consistency'
  | 'spiritual_consistency'

export type HealthBodyGoal = 'lose_fat' | 'maintain' | 'gain_muscle'

export type HealthGoalProfile = {
  id: string
  primary_goals: HealthPrimaryGoal[]
  sleep_hours_target: string
  weekly_workouts_target: number
  protein_g_target: number
  body_goal: HealthBodyGoal
  created_at: string
  updated_at: string
}

export type HealthGoalProfilePayload = Partial<{
  primary_goals: HealthPrimaryGoal[]
  sleep_hours_target: string
  weekly_workouts_target: number
  protein_g_target: number
  body_goal: HealthBodyGoal
}>

export type HealthDirectionStatus = 'strong' | 'steady' | 'attention'
export type HealthDirectionTrend = 'improving' | 'stable' | 'declining'
export type HealthDirectionPillarId =
  | 'recovery'
  | 'performance_body'
  | 'nutrition'
  | 'mood'
  | 'habits'
  | 'spiritual'

export type HealthDirectionPillar = {
  id: HealthDirectionPillarId
  label: string
  score: number
  delta: number
  trend: HealthDirectionTrend
  status: HealthDirectionStatus
  confidence: number
  drivers: string[]
  recommended_action: string
  weight: number
  weighted_score: number
  details: Record<string, unknown>
}

export type HealthDirection = {
  overall_score: number
  trend: HealthDirectionTrend
  status: HealthDirectionStatus
  confidence: number
  headline: string
  strengths: string[]
  watchouts: string[]
  next_actions: string[]
  pillars: HealthDirectionPillar[]
  cross_domain_insights: string[]
  score_delta: number
  window: {
    current_start: string
    current_end: string
    previous_start: string
    previous_end: string
  }
}

export type HealthReadinessScore = {
  score: number
  label: 'Poor' | 'Moderate' | 'Good' | 'High'
  components: {
    hrv: HealthReadinessComponent
    sleep: HealthReadinessComponent
    resting_hr: HealthReadinessComponent
    mood: HealthReadinessComponent
  }
  recommendation: string
  suggested_intensity: 'rest' | 'light' | 'moderate' | 'full'
  workout_load_7d_kg: number
  rest_days_streak: number
  session_count_7d: number
}

export type HealthAIInsight = {
  type: 'strength' | 'recovery' | 'composition' | 'correlation' | 'neutral'
  headline: string
  detail: string
  severity: 'positive' | 'neutral' | 'warning'
}

export type HealthAIInsightsPayload = {
  insights: HealthAIInsight[]
  week_summary: string
  suggested_focus: string
}

export type MuscleActivation = {
  muscle: string
  last_trained: string | null
  days_since: number | null
  sets_7d: number
  sets_14d: number
  status: 'fresh' | 'recovering' | 'ready' | 'untrained'
}

export type StrengthHistoryPayload = {
  exercise_name: string
  weekly_volume: { week: string; total_kg: number }[]
  estimated_1rm_over_time: { date: string; e1rm: number }[]
  all_time_best: { date: string; weight_kg: number; reps: number; e1rm: number } | null
}
