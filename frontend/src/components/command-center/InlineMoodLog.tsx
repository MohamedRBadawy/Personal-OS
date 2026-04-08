import { useState } from 'react'
import { EmojiMoodPicker } from '../EmojiMoodPicker'
import type { MoodLog, MoodLogPayload } from '../../lib/types'

type InlineMoodLogProps = {
  moodLog: MoodLog | null
  today: string
  isSubmitting: boolean
  onSubmit: (payload: MoodLogPayload & { id?: string | null }) => void
}

export function InlineMoodLog({ moodLog, today, isSubmitting, onSubmit }: InlineMoodLogProps) {
  const [moodScore, setMoodScore] = useState(moodLog?.mood_score ?? 3)
  const [notes, setNotes] = useState(moodLog?.notes ?? '')

  return (
    <div className="mood-row">
      <span className="mood-row__label">😐 Mood</span>
      <EmojiMoodPicker id="inline-mood" value={moodScore} onChange={setMoodScore} />
      <textarea
        style={{ flex: 1, minWidth: 120 }}
        rows={2}
        placeholder="Notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        className="button-muted"
        disabled={isSubmitting}
        type="button"
        onClick={() => onSubmit({ date: today, mood_score: moodScore, notes, id: moodLog?.id })}
      >
        {isSubmitting ? 'Saving...' : 'Save mood'}
      </button>
    </div>
  )
}
