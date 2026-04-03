import { useState } from 'react'
import type { MoodLog, MoodLogPayload } from '../lib/types'

type MoodLogFormProps = {
  today: string
  initialValue?: MoodLog | null
  isSubmitting: boolean
  onSubmit: (payload: MoodLogPayload) => void
}

export function MoodLogForm({ today, initialValue, isSubmitting, onSubmit }: MoodLogFormProps) {
  const [moodScore, setMoodScore] = useState(initialValue?.mood_score ?? 3)
  const [notes, setNotes] = useState(initialValue?.notes ?? '')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      date: today,
      mood_score: moodScore,
      notes,
    })
  }

  return (
    <form className="form-grid single" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="mood-score">Mood score</label>
        <select id="mood-score" value={moodScore} onChange={(event) => setMoodScore(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="mood-notes">Mood notes</label>
        <textarea id="mood-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <div className="field form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving mood...' : initialValue ? 'Update mood log' : 'Save mood log'}
        </button>
      </div>
    </form>
  )
}
