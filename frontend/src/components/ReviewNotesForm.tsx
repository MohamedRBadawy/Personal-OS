import { useState } from 'react'

type ReviewNotesFormProps = {
  initialValue: string
  isSubmitting: boolean
  onSubmit: (personalNotes: string) => void
}

export function ReviewNotesForm({ initialValue, isSubmitting, onSubmit }: ReviewNotesFormProps) {
  const [personalNotes, setPersonalNotes] = useState(initialValue)

  return (
    <form
      className="form-grid single"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(personalNotes)
      }}
    >
      <div className="field">
        <label htmlFor="weekly-review-notes">Personal notes</label>
        <textarea
          id="weekly-review-notes"
          value={personalNotes}
          onChange={(event) => setPersonalNotes(event.target.value)}
        />
      </div>
      <div className="field form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving notes...' : 'Save review notes'}
        </button>
      </div>
    </form>
  )
}
