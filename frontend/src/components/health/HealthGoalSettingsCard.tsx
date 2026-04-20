import { useEffect, useState } from 'react'
import type { HealthGoalProfile, HealthGoalProfilePayload, HealthPrimaryGoal } from '../../lib/types'

type HealthGoalSettingsCardProps = {
  goals: HealthGoalProfile
  isSaving: boolean
  onSave: (payload: HealthGoalProfilePayload) => void
}

const GOAL_OPTIONS: { id: HealthPrimaryGoal; label: string }[] = [
  { id: 'sleep_energy', label: 'Sleep & energy' },
  { id: 'strength', label: 'Strength' },
  { id: 'body_composition', label: 'Body composition' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'mood_stability', label: 'Mood stability' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'spiritual_consistency', label: 'Spiritual consistency' },
]

export function HealthGoalSettingsCard({ goals, isSaving, onSave }: HealthGoalSettingsCardProps) {
  const [form, setForm] = useState<HealthGoalProfilePayload>({
    primary_goals: goals.primary_goals,
    sleep_hours_target: goals.sleep_hours_target,
    weekly_workouts_target: goals.weekly_workouts_target,
    protein_g_target: goals.protein_g_target,
    body_goal: goals.body_goal,
  })

  useEffect(() => {
    setForm({
      primary_goals: goals.primary_goals,
      sleep_hours_target: goals.sleep_hours_target,
      weekly_workouts_target: goals.weekly_workouts_target,
      protein_g_target: goals.protein_g_target,
      body_goal: goals.body_goal,
    })
  }, [goals])

  function toggleGoal(goalId: HealthPrimaryGoal) {
    const current = form.primary_goals ?? []
    if (current.includes(goalId)) {
      setForm((prev) => ({ ...prev, primary_goals: current.filter((item) => item !== goalId) }))
      return
    }
    if (current.length >= 3) {
      return
    }
    setForm((prev) => ({ ...prev, primary_goals: [...current, goalId] }))
  }

  return (
    <section className="health-goal-settings">
      <div className="health-goal-settings__header">
        <div>
          <p className="health-goal-settings__eyebrow">Health settings</p>
          <h3 className="health-goal-settings__title">What “right direction” means for you</h3>
          <p className="health-goal-settings__description">
            Pick up to three priorities. The shared health score will weight itself around them.
          </p>
        </div>
        <button
          className="btn-sm"
          onClick={() => onSave(form)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Save goals'}
        </button>
      </div>

      <div className="health-goal-settings__goal-grid">
        {GOAL_OPTIONS.map((goal) => {
          const selected = form.primary_goals?.includes(goal.id)
          return (
            <button
              key={goal.id}
              type="button"
              className={`health-goal-pill${selected ? ' is-selected' : ''}`}
              onClick={() => toggleGoal(goal.id)}
            >
              {goal.label}
            </button>
          )
        })}
      </div>

      <div className="health-goal-settings__fields">
        <label className="health-goal-settings__field">
          <span>Sleep target (hours)</span>
          <input
            className="workout-input"
            type="number"
            min="4"
            max="12"
            step="0.5"
            value={form.sleep_hours_target ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, sleep_hours_target: event.target.value }))}
          />
        </label>
        <label className="health-goal-settings__field">
          <span>Workouts / week</span>
          <input
            className="workout-input"
            type="number"
            min="1"
            max="14"
            value={form.weekly_workouts_target ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, weekly_workouts_target: Number(event.target.value) || 1 }))}
          />
        </label>
        <label className="health-goal-settings__field">
          <span>Protein target (g)</span>
          <input
            className="workout-input"
            type="number"
            min="40"
            max="350"
            value={form.protein_g_target ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, protein_g_target: Number(event.target.value) || 40 }))}
          />
        </label>
        <label className="health-goal-settings__field">
          <span>Body goal</span>
          <select
            className="workout-select"
            value={form.body_goal ?? 'maintain'}
            onChange={(event) => setForm((prev) => ({ ...prev, body_goal: event.target.value as HealthGoalProfile['body_goal'] }))}
          >
            <option value="lose_fat">Lose fat</option>
            <option value="maintain">Maintain</option>
            <option value="gain_muscle">Gain muscle</option>
          </select>
        </label>
      </div>
    </section>
  )
}
