import { useEffect, useRef, useState } from 'react'

type ReviewNotesFormProps = {
  initialValue: string
  isSubmitting: boolean
  onSubmit: (personalNotes: string) => void
  onAutoSave?: (personalNotes: string) => void
}

export function ReviewNotesForm({ initialValue, isSubmitting, onSubmit, onAutoSave }: ReviewNotesFormProps) {
  const [personalNotes, setPersonalNotes] = useState(initialValue)
  const [autoSaved, setAutoSaved] = useState(false)
  const autoSaveRef = useRef(onAutoSave)
  autoSaveRef.current = onAutoSave

  // Debounced auto-save — fires 800ms after last keystroke
  useEffect(() => {
    if (!autoSaveRef.current) return
    setAutoSaved(false)
    const timer = setTimeout(() => {
      autoSaveRef.current?.(personalNotes)
      setAutoSaved(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [personalNotes])

  return (
    <form
      className="form-grid single"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(personalNotes)
      }}
    >
      <div className="field">
        <label htmlFor="weekly-review-notes">
          Personal notes
          {autoSaved && <span className="review-autosave-badge">✓ Saved</span>}
        </label>
        <textarea
          id="weekly-review-notes"
          value={personalNotes}
          onChange={(event) => { setPersonalNotes(event.target.value); setAutoSaved(false) }}
        />
      </div>
      {!onAutoSave && (
        <div className="field form-actions">
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving notes...' : 'Save review notes'}
          </button>
        </div>
      )}
    </form>
  )
}
