import { useState } from 'react'
import type { SpiritualLog, SpiritualLogPayload } from '../lib/types'

type SpiritualLogFormProps = {
  today: string
  initialValue?: SpiritualLog | null
  isSubmitting: boolean
  onSubmit: (payload: SpiritualLogPayload) => void
}

const prayerFields = [
  ['fajr', 'Fajr'],
  ['dhuhr', 'Dhuhr'],
  ['asr', 'Asr'],
  ['maghrib', 'Maghrib'],
  ['isha', 'Isha'],
] as const

export function SpiritualLogForm({
  today,
  initialValue,
  isSubmitting,
  onSubmit,
}: SpiritualLogFormProps) {
  const [prayers, setPrayers] = useState({
    fajr: initialValue?.fajr ?? false,
    dhuhr: initialValue?.dhuhr ?? false,
    asr: initialValue?.asr ?? false,
    maghrib: initialValue?.maghrib ?? false,
    isha: initialValue?.isha ?? false,
  })
  const [quranPages, setQuranPages] = useState(String(initialValue?.quran_pages ?? 0))
  const [dhikrDone, setDhikrDone] = useState(initialValue?.dhikr_done ?? false)
  const [notes, setNotes] = useState(initialValue?.notes ?? '')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      date: today,
      ...prayers,
      quran_pages: Number(quranPages || 0),
      dhikr_done: dhikrDone,
      notes,
    })
  }

  return (
    <form className="form-grid single" onSubmit={handleSubmit}>
      <div className="stack">
        {prayerFields.map(([key, label]) => (
          <div key={key} className="checkbox-row">
            <input
              checked={prayers[key]}
              id={`spiritual-${key}`}
              type="checkbox"
              onChange={(event) => setPrayers((current) => ({ ...current, [key]: event.target.checked }))}
            />
            <label htmlFor={`spiritual-${key}`}>{label}</label>
          </div>
        ))}
      </div>
      <div className="field">
        <label htmlFor="spiritual-quran-pages">Quran pages</label>
        <input
          id="spiritual-quran-pages"
          min="0"
          type="number"
          value={quranPages}
          onChange={(event) => setQuranPages(event.target.value)}
        />
      </div>
      <div className="checkbox-row">
        <input
          checked={dhikrDone}
          id="spiritual-dhikr"
          type="checkbox"
          onChange={(event) => setDhikrDone(event.target.checked)}
        />
        <label htmlFor="spiritual-dhikr">Dhikr completed</label>
      </div>
      <div className="field">
        <label htmlFor="spiritual-notes">Spiritual notes</label>
        <textarea id="spiritual-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <div className="field form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving spiritual log...' : initialValue ? 'Update spiritual log' : 'Save spiritual log'}
        </button>
      </div>
    </form>
  )
}
