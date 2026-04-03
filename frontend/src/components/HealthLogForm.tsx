import { useState } from 'react'
import type { HealthLogPayload } from '../lib/types'

type HealthLogFormProps = {
  onSubmit: (payload: HealthLogPayload) => void
  isSubmitting: boolean
}

export function HealthLogForm({ onSubmit, isSubmitting }: HealthLogFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [sleepHours, setSleepHours] = useState('7.0')
  const [sleepQuality, setSleepQuality] = useState(4)
  const [energyLevel, setEnergyLevel] = useState(3)
  const [exerciseDone, setExerciseDone] = useState(false)
  const [exerciseType, setExerciseType] = useState('')
  const [exerciseDuration, setExerciseDuration] = useState('')
  const [weight, setWeight] = useState('')
  const [nutritionNotes, setNutritionNotes] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      date,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      energy_level: energyLevel,
      exercise_done: exerciseDone,
      exercise_type: exerciseDone ? exerciseType : '',
      exercise_duration_mins: exerciseDone && exerciseDuration ? Number(exerciseDuration) : null,
      weight_kg: weight || null,
      nutrition_notes: nutritionNotes,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="health-date">Date</label>
        <input id="health-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="health-sleep-hours">Sleep hours</label>
        <input
          id="health-sleep-hours"
          min="0"
          step="0.5"
          type="number"
          value={sleepHours}
          onChange={(event) => setSleepHours(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="health-sleep-quality">Sleep quality</label>
        <select
          id="health-sleep-quality"
          value={sleepQuality}
          onChange={(event) => setSleepQuality(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="health-energy">Energy level</label>
        <select
          id="health-energy"
          value={energyLevel}
          onChange={(event) => setEnergyLevel(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="field span-2 checkbox-row">
        <input
          checked={exerciseDone}
          id="health-exercise"
          type="checkbox"
          onChange={(event) => setExerciseDone(event.target.checked)}
        />
        <label htmlFor="health-exercise">Exercise completed today</label>
      </div>
      <div className="field">
        <label htmlFor="health-exercise-type">Exercise type</label>
        <input
          id="health-exercise-type"
          value={exerciseType}
          onChange={(event) => setExerciseType(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="health-duration">Exercise duration (mins)</label>
        <input
          id="health-duration"
          min="0"
          type="number"
          value={exerciseDuration}
          onChange={(event) => setExerciseDuration(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="health-weight">Weight (kg)</label>
        <input
          id="health-weight"
          min="0"
          step="0.1"
          type="number"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />
      </div>
      <div className="field span-2">
        <label htmlFor="health-notes">Nutrition notes</label>
        <textarea
          id="health-notes"
          value={nutritionNotes}
          onChange={(event) => setNutritionNotes(event.target.value)}
        />
      </div>
      <div className="field span-2 form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving health log...' : 'Save health log'}
        </button>
      </div>
    </form>
  )
}
