import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { Panel } from '../components/Panel'
import { getJournalToday, upsertJournalToday, listJournalEntries } from '../lib/api'
import type { JournalEntry } from '../lib/types'

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Auto-saving textarea section ──────────────────────────────────────────────
function JournalSection({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="journal-section">
      <label className="journal-section-label">{label}</label>
      <textarea
        className="journal-textarea"
        placeholder={placeholder}
        value={value}
        rows={3}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ── Past entry card ───────────────────────────────────────────────────────────
function EntryCard({ entry }: { entry: JournalEntry }) {
  const [open, setOpen] = useState(false)
  const d = new Date(entry.date + 'T00:00:00')
  const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <article className="journal-past-card">
      <button className="journal-past-header" onClick={() => setOpen(o => !o)}>
        <span className="journal-past-date">{label}</span>
        <span className="journal-past-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="journal-past-body">
          {entry.mood_note && (
            <div className="journal-past-section">
              <p className="journal-past-label">How I felt</p>
              <p className="journal-past-text">{entry.mood_note}</p>
            </div>
          )}
          {entry.gratitude && (
            <div className="journal-past-section">
              <p className="journal-past-label">Gratitude</p>
              <p className="journal-past-text">{entry.gratitude}</p>
            </div>
          )}
          {entry.wins && (
            <div className="journal-past-section">
              <p className="journal-past-label">Wins</p>
              <p className="journal-past-text">{entry.wins}</p>
            </div>
          )}
          {entry.tomorrow_focus && (
            <div className="journal-past-section">
              <p className="journal-past-label">Tomorrow's focus</p>
              <p className="journal-past-text">{entry.tomorrow_focus}</p>
            </div>
          )}
          {!entry.mood_note && !entry.gratitude && !entry.wins && !entry.tomorrow_focus && (
            <p className="muted">Nothing written for this day.</p>
          )}
        </div>
      )}
    </article>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JournalPage() {
  const qc = useQueryClient()

  const todayQuery = useQuery({
    queryKey: ['journal-today'],
    queryFn: getJournalToday,
  })
  const historyQuery = useQuery({
    queryKey: ['journal-entries'],
    queryFn: listJournalEntries,
    staleTime: 2 * 60 * 1000,
  })

  const [moodNote, setMoodNote] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [wins, setWins] = useState('')
  const [tomorrowFocus, setTomorrowFocus] = useState('')
  const [saved, setSaved] = useState(false)

  // Sync initial values once today's entry loads
  useEffect(() => {
    if (!todayQuery.data) return
    const e = todayQuery.data
    setMoodNote(e.mood_note)
    setGratitude(e.gratitude)
    setWins(e.wins)
    setTomorrowFocus(e.tomorrow_focus)
  }, [todayQuery.data])

  const saveMutation = useMutation({
    mutationFn: upsertJournalToday,
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['journal-today'] })
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
    },
  })

  // Debounced auto-save
  const debouncedPayload = useDebounce(
    { mood_note: moodNote, gratitude, wins, tomorrow_focus: tomorrowFocus },
    900,
  )
  const hasData = Boolean(moodNote || gratitude || wins || tomorrowFocus)

  useEffect(() => {
    if (!todayQuery.data) return
    if (!hasData) return
    setSaved(false)
    saveMutation.mutate(debouncedPayload)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPayload])

  if (todayQuery.isLoading) return <PageSkeleton />
  if (todayQuery.isError) return <section className="error-state">Could not load journal.</section>

  const pastEntries = (historyQuery.data?.results ?? []).filter(
    e => e.date !== new Date().toLocaleDateString('en-CA'),
  )

  const today = new Date()
  const todayLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Journal</p>
          <h2>Daily reflection</h2>
          <p className="muted">Write once, auto-saved. No submit button needed.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span className="review-autosave-badge">✓ Saved</span>}
          {saveMutation.isPending && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving…</span>}
        </div>
      </div>

      <Panel
        title={`Today — ${todayLabel}`}
        description="Write what's on your mind. Each field saves automatically after you stop typing."
      >
        <div className="journal-form">
          <JournalSection
            label="🌙 How am I feeling?"
            placeholder="What's on your mind today? Emotions, energy, stress..."
            value={moodNote}
            onChange={v => { setMoodNote(v); setSaved(false) }}
          />
          <JournalSection
            label="🤲 Gratitude"
            placeholder="1–3 things I'm grateful for today..."
            value={gratitude}
            onChange={v => { setGratitude(v); setSaved(false) }}
          />
          <JournalSection
            label="✅ Wins"
            placeholder="What went well? What did I accomplish or make progress on?"
            value={wins}
            onChange={v => { setWins(v); setSaved(false) }}
          />
          <JournalSection
            label="🎯 Tomorrow's focus"
            placeholder="The single most important thing to do tomorrow..."
            value={tomorrowFocus}
            onChange={v => { setTomorrowFocus(v); setSaved(false) }}
          />
        </div>
      </Panel>

      {pastEntries.length > 0 && (
        <Panel title="Past entries" description="Click any day to expand its reflection.">
          <div className="journal-past-list">
            {pastEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </Panel>
      )}
    </section>
  )
}
