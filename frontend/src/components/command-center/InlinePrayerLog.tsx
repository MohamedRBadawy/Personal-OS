import { useState } from 'react'
import type { SpiritualLog, SpiritualLogPayload } from '../../lib/types'

type InlinePrayerLogProps = {
  log: SpiritualLog | null
  today: string
  isSubmitting: boolean
  onSubmit: (payload: SpiritualLogPayload & { id?: string | null }) => void
}

const PRAYERS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
] as const

type PrayerKey = (typeof PRAYERS)[number]['key']

export function InlinePrayerLog({ log, today, isSubmitting, onSubmit }: InlinePrayerLogProps) {
  const [prayers, setPrayers] = useState<Record<PrayerKey, boolean>>({
    fajr: log?.fajr ?? false,
    dhuhr: log?.dhuhr ?? false,
    asr: log?.asr ?? false,
    maghrib: log?.maghrib ?? false,
    isha: log?.isha ?? false,
  })
  const [quranPages, setQuranPages] = useState(String(log?.quran_pages ?? 0))
  const [dhikrDone, setDhikrDone] = useState(log?.dhikr_done ?? false)
  const [notes, setNotes] = useState(log?.notes ?? '')

  const doneCount = Object.values(prayers).filter(Boolean).length

  function toggle(key: PrayerKey) {
    setPrayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSave() {
    onSubmit({
      date: today,
      ...prayers,
      quran_pages: Number(quranPages || 0),
      dhikr_done: dhikrDone,
      notes,
      id: log?.id,
    })
  }

  return (
    <div className="prayer-row">
      <span className="prayer-row__label">🤲 Prayers</span>
      <div className="prayer-row__controls">
        {PRAYERS.map(({ key, label }) => (
          <button
            key={key}
            className={`prayer-btn${prayers[key] ? ' prayer-btn--done' : ''}`}
            type="button"
            onClick={() => toggle(key)}
          >
            {prayers[key] ? '✓ ' : ''}{label}
          </button>
        ))}
        <span className="record-meta-chip" style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
          {doneCount}/5
        </span>
      </div>
      <div className="prayer-row__extra">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
          Quran
          <input
            style={{ width: 52 }}
            type="number"
            min="0"
            value={quranPages}
            onChange={(e) => setQuranPages(e.target.value)}
          />
          pages
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={dhikrDone}
            onChange={(e) => setDhikrDone(e.target.checked)}
          />
          Dhikr
        </label>
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
          onClick={handleSave}
        >
          {isSubmitting ? 'Saving...' : 'Save prayers'}
        </button>
      </div>
    </div>
  )
}
