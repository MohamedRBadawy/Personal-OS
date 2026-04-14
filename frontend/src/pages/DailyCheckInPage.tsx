import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getHealthToday,
  getJournalToday,
  listRoutineBlocks,
  getRoutineLogs,
  upsertJournalToday,
  createMoodLog,
  updateMoodLog,
  createHealthLog,
  updateHealthLog,
  createSpiritualLog,
  updateSpiritualLog,
  createHabitLog,
  updateHabitLog,
  createFinanceEntry,
  createIdea,
  saveRoutineLog,
  getCheckinTodayStatus,
  submitEveningCheckIn,
} from '../lib/api'
import type {
  RoutineBlock,
  RoutineLogEntry,
  FinanceEntryType,
  CurrencyCode,
} from '../lib/types'
import '../styles/daily.css'

// ── Mode detection ────────────────────────────────────────────────────────────
// Morning: 00:00 – 13:00  |  Evening: 18:00 – 23:59  |  Midday: show both
function getCheckinMode(): 'morning' | 'evening' | 'midday' {
  const h = new Date().getHours()
  if (h < 13) return 'morning'
  if (h >= 18) return 'evening'
  return 'midday'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { score: 1, label: '😞', desc: 'Rough' },
  { score: 2, label: '😕', desc: 'Low' },
  { score: 3, label: '😐', desc: 'OK' },
  { score: 4, label: '🙂', desc: 'Good' },
  { score: 5, label: '😊', desc: 'Great' },
]

const ENERGY_LEVELS = [1, 2, 3, 4, 5]

const RQP_STATUSES = [
  { value: 'done',    label: '✓' },
  { value: 'partial', label: '~' },
  { value: 'skipped', label: '✗' },
]

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({
  id: _id,
  title,
  done,
  status,
  optional,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  done: boolean
  status: string
  optional?: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`dc-section${done ? ' dc-section--done' : ''}${optional ? ' dc-section--optional' : ''}`}>
      <button className="dc-section-header" onClick={onToggle}>
        <span className="dc-section-check">{done ? '✓' : ''}</span>
        <span className="dc-section-title">{title}</span>
        <span className="dc-section-status">{status}</span>
        {optional && <span className="dc-section-optional">optional</span>}
        <span className="dc-section-arrow">{open ? '▴' : '▾'}</span>
      </button>
      {open && <div className="dc-section-body">{children}</div>}
    </div>
  )
}

// ── Routine Quick Panel (inline) ──────────────────────────────────────────────

function DailyRoutinePanel({
  blocks,
  logs,
  today: _today,
  onLog,
  pending,
}: {
  blocks: RoutineBlock[]
  logs: RoutineLogEntry[]
  today: string
  onLog: (blockTime: string, status: string) => void
  pending: boolean
}) {
  const logMap = new Map(logs.map(l => [l.block_time.slice(0, 5), l]))
  const done = logs.length
  const total = blocks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div>
      <div className="dc-routine-summary">
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>{done}/{total}</span>
        <div className="dc-routine-bar">
          <div className="dc-routine-fill" style={{ width: `${pct}%` }} />
        </div>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{pct}%</span>
      </div>
      <div className="rqp-panel">
        {blocks.map(block => {
          const timeKey = block.time_str || block.time.slice(0, 5)
          const log = logMap.get(timeKey)
          const loggedStatus = log?.status ?? null
          return (
            <div key={block.id} className="rqp-row">
              <span className="rqp-time">{timeKey}</span>
              <span className="rqp-label">{block.label}</span>
              <div className="rqp-btns">
                {RQP_STATUSES.map(s => (
                  <button
                    key={s.value}
                    className={`rqp-btn${loggedStatus === s.value ? ` active-${s.value}` : ''}`}
                    disabled={pending}
                    title={s.value}
                    onClick={() => onLog(block.time, s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Journal Section Body ──────────────────────────────────────────────────────

function JournalBody({ today: _today }: { today: string }) {
  const qc = useQueryClient()
  const { data: journal } = useQuery({
    queryKey: ['journal-today'],
    queryFn: getJournalToday,
  })

  const [moodNote, setMoodNote] = useState(journal?.mood_note ?? '')
  const [gratitude, setGratitude] = useState(journal?.gratitude ?? '')
  const [wins, setWins] = useState(journal?.wins ?? '')
  const [focus, setFocus] = useState(journal?.tomorrow_focus ?? '')
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mut = useMutation({
    mutationFn: upsertJournalToday,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-today'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const scheduleAutoSave = useCallback((fields: {
    mood_note?: string; gratitude?: string; wins?: string; tomorrow_focus?: string
  }) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      mut.mutate(fields)
    }, 900)
  }, [mut])

  // Sync local state when query data loads
  const initialized = useRef(false)
  if (!initialized.current && journal) {
    initialized.current = true
    if (!moodNote && journal.mood_note) setMoodNote(journal.mood_note)
    if (!gratitude && journal.gratitude) setGratitude(journal.gratitude)
    if (!wins && journal.wins) setWins(journal.wins)
    if (!focus && journal.tomorrow_focus) setFocus(journal.tomorrow_focus)
  }

  function handleChange(field: string, value: string) {
    const fields: Record<string, string> = {
      mood_note: field === 'mood_note' ? value : moodNote,
      gratitude: field === 'gratitude' ? value : gratitude,
      wins: field === 'wins' ? value : wins,
      tomorrow_focus: field === 'tomorrow_focus' ? value : focus,
    }
    scheduleAutoSave(fields)
  }

  return (
    <div>
      <div className="dj-grid">
        {([
          { key: 'mood_note', label: 'How do I feel?', val: moodNote, set: setMoodNote },
          { key: 'gratitude', label: 'Grateful for', val: gratitude, set: setGratitude },
          { key: 'wins', label: "Today's wins", val: wins, set: setWins },
          { key: 'tomorrow_focus', label: "Tomorrow's focus", val: focus, set: setFocus },
        ] as Array<{ key: string; label: string; val: string; set: (v: string) => void }>).map(f => (
          <div key={f.key} className="dj-field">
            <label className="dj-label">{f.label}</label>
            <textarea
              className="form-input"
              rows={3}
              value={f.val}
              placeholder={`${f.label}…`}
              onChange={e => {
                f.set(e.target.value)
                handleChange(f.key, e.target.value)
              }}
            />
          </div>
        ))}
      </div>
      <div className="dj-save-indicator" style={{ opacity: saved ? 1 : 0 }}>
        ✓ Saved
      </div>
    </div>
  )
}

// ── Evening Quick Panel ───────────────────────────────────────────────────────

function EveningCheckInPanel({ onComplete }: { onComplete: () => void }) {
  const [wins, setWins] = useState('')
  const [hardThing, setHardThing] = useState('')
  const [tomorrowFocus, setTomorrowFocus] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [moodScore, setMoodScore] = useState<number | null>(null)
  const [done, setDone] = useState(false)

  const mut = useMutation({
    mutationFn: submitEveningCheckIn,
    onSuccess: () => { setDone(true); onComplete() },
  })

  if (done) {
    return (
      <div className="evening-done-card">
        <div className="evening-done-icon">✓</div>
        <p className="evening-done-text">Evening check-in complete. Rest well.</p>
      </div>
    )
  }

  return (
    <div className="evening-panel">
      <p className="evening-panel-desc">
        Take 3 minutes to close the day with intention.
      </p>

      {/* Mood score 1-10 */}
      <div className="sp-field">
        <label className="sp-label">How was today overall? <span className="caption">(1 low → 10 great)</span></label>
        <div className="evening-mood-row">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              className={`evening-mood-btn${moodScore === n ? ' active' : ''}`}
              onClick={() => setMoodScore(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* 3 wins */}
      <div className="sp-field">
        <label className="sp-label">3 wins today (big or small)</label>
        <textarea
          className="form-input"
          rows={3}
          placeholder="1. …&#10;2. …&#10;3. …"
          value={wins}
          onChange={e => setWins(e.target.value)}
        />
      </div>

      {/* What was hard */}
      <div className="sp-field">
        <label className="sp-label">What was hard or unfinished?</label>
        <textarea
          className="form-input"
          rows={2}
          placeholder="What got in the way?"
          value={hardThing}
          onChange={e => setHardThing(e.target.value)}
        />
      </div>

      {/* Tomorrow's top priority */}
      <div className="sp-field">
        <label className="sp-label">Tomorrow's ONE priority</label>
        <input
          className="form-input"
          placeholder="The most important thing to do tomorrow…"
          value={tomorrowFocus}
          onChange={e => setTomorrowFocus(e.target.value)}
        />
      </div>

      {/* Gratitude */}
      <div className="sp-field">
        <label className="sp-label">Grateful for</label>
        <input
          className="form-input"
          placeholder="Something you're grateful for today…"
          value={gratitude}
          onChange={e => setGratitude(e.target.value)}
        />
      </div>

      <button
        className="btn-primary"
        style={{ alignSelf: 'flex-start' }}
        disabled={mut.isPending}
        onClick={() => mut.mutate({
          mood_score: moodScore,
          evening_wins: wins,
          tomorrow_focus: tomorrowFocus,
          gratitude_note: [gratitude, hardThing ? `What was hard: ${hardThing}` : ''].filter(Boolean).join('\n\n'),
        })}
      >
        {mut.isPending ? 'Saving…' : '✓ Complete evening check-in'}
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DailyCheckInPage() {
  const today = new Date().toLocaleDateString('en-CA')
  const qc = useQueryClient()
  const mode = getCheckinMode()

  // Track which sections are open
  const [open, setOpen] = useState<Record<string, boolean>>({})
  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Today's checkin status
  const { data: checkinStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['checkin-today-status'],
    queryFn: getCheckinTodayStatus,
    staleTime: 60_000,
  })

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: healthToday, refetch: refetchHealth } = useQuery({
    queryKey: ['health-today'],
    queryFn: getHealthToday,
    staleTime: 30_000,
  })

  const { data: routineBlocks = [] } = useQuery({
    queryKey: ['routine-blocks'],
    queryFn: listRoutineBlocks,
    staleTime: 5 * 60_000,
  })

  const { data: todayLogs = [] } = useQuery({
    queryKey: ['routine-logs', today],
    queryFn: () => getRoutineLogs(today),
    staleTime: 60_000,
  })

  // ── Derived data ───────────────────────────────────────────────────────────

  const moodLog     = healthToday?.mood_log ?? null
  const healthLog   = healthToday?.health_log ?? null
  const spiritualLog = healthToday?.spiritual_log ?? null
  const habitBoard  = healthToday?.habit_board ?? []

  // ── Section completion ─────────────────────────────────────────────────────

  const sectionDone = {
    routine:  todayLogs.length > 0,
    journal:  false, // managed inside JournalBody — approximated via healthToday summary
    mood:     Boolean(moodLog),
    health:   Boolean(healthLog),
    spiritual: Boolean(spiritualLog),
    habits:   habitBoard.some(h => h.today_log !== null),
  }

  // Journal done state uses a simple approach: check via query cache
  const journalEntry = qc.getQueryData<{ mood_note?: string; wins?: string; gratitude?: string; tomorrow_focus?: string }>(['journal-today'])
  const journalDone = Boolean(
    journalEntry?.mood_note || journalEntry?.wins || journalEntry?.gratitude || journalEntry?.tomorrow_focus
  )

  const REQUIRED = ['routine', 'journal', 'mood', 'health', 'spiritual', 'habits'] as const
  const completedCount = REQUIRED.filter(k =>
    k === 'journal' ? journalDone : sectionDone[k as keyof typeof sectionDone]
  ).length

  const progressPct = Math.round((completedCount / REQUIRED.length) * 100)

  // ── Mutations ──────────────────────────────────────────────────────────────

  // Routine
  const routineMut = useMutation({
    mutationFn: saveRoutineLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine-logs', today] })
      qc.invalidateQueries({ queryKey: ['dashboard-v2'] })
    },
  })

  // Mood
  const [moodNotes, setMoodNotes] = useState(moodLog?.notes ?? '')
  const moodMut = useMutation({
    mutationFn: ({ score, notes }: { score: number; notes: string }) => {
      if (moodLog) return updateMoodLog(moodLog.id, { mood_score: score, notes })
      return createMoodLog({ date: today, mood_score: score, notes })
    },
    onSuccess: () => refetchHealth(),
  })

  // Health
  const [sleepHours, setSleepHours] = useState(healthLog?.sleep_hours ?? '')
  const [energyLevel, setEnergyLevel] = useState<number>(healthLog?.energy_level ?? 0)
  const [exerciseDone, setExerciseDone] = useState(healthLog?.exercise_done ?? false)
  const [exerciseType, setExerciseType] = useState(healthLog?.exercise_type ?? '')

  const healthMut = useMutation({
    mutationFn: () => {
      const payload = {
        date: today,
        sleep_hours: sleepHours || '0',
        sleep_quality: 3,
        energy_level: energyLevel || 3,
        exercise_done: exerciseDone,
        exercise_type: exerciseType,
        exercise_duration_mins: null,
        weight_kg: null,
        nutrition_notes: '',
      }
      if (healthLog) return updateHealthLog(healthLog.id, payload)
      return createHealthLog(payload)
    },
    onSuccess: () => refetchHealth(),
  })

  // Spiritual
  const [quranPages, setQuranPages] = useState<number>(spiritualLog?.quran_pages ?? 0)
  const [dhikrDone, setDhikrDone] = useState(spiritualLog?.dhikr_done ?? false)
  const [spiritualNotes, setSpiritualNotes] = useState(spiritualLog?.notes ?? '')

  const spiritualMut = useMutation({
    mutationFn: () => {
      const payload = {
        date: today,
        fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
        quran_pages: quranPages,
        dhikr_done: dhikrDone,
        notes: spiritualNotes,
      }
      if (spiritualLog) return updateSpiritualLog(spiritualLog.id, payload)
      return createSpiritualLog(payload)
    },
    onSuccess: () => refetchHealth(),
  })

  // Habit toggle
  const habitMut = useMutation({
    mutationFn: ({ habitId, logId, done }: { habitId: string; logId: string | null; done: boolean }) => {
      if (logId) return updateHabitLog(logId, { done })
      return createHabitLog({ habit: habitId, date: today, done, note: '' })
    },
    onSuccess: () => refetchHealth(),
  })

  // Finance
  const [finType, setFinType] = useState<FinanceEntryType>('income')
  const [finAmount, setFinAmount] = useState('')
  const [finCurrency, setFinCurrency] = useState<CurrencyCode>('EGP')
  const [finSource, setFinSource] = useState('')
  const [finNotes, setFinNotes] = useState('')
  const [finEntries, setFinEntries] = useState<{ type: string; amount: string; currency: string; source: string }[]>([])

  const financeMut = useMutation({
    mutationFn: () => createFinanceEntry({
      type: finType,
      amount: finAmount,
      currency: finCurrency,
      source: finSource || 'Manual',
      is_independent: false,
      is_recurring: false,
      date: today,
      notes: finNotes,
    }),
    onSuccess: () => {
      setFinEntries(prev => [...prev, { type: finType, amount: finAmount, currency: finCurrency, source: finSource }])
      setFinAmount('')
      setFinSource('')
      setFinNotes('')
    },
  })

  // Ideas
  const [ideaTitle, setIdeaTitle] = useState('')
  const [capturedIdeas, setCapturedIdeas] = useState<string[]>([])

  const ideaMut = useMutation({
    mutationFn: () => createIdea({ title: ideaTitle, context: '', status: 'raw', linked_goal: null }),
    onSuccess: () => {
      setCapturedIdeas(prev => [...prev, ideaTitle])
      setIdeaTitle('')
    },
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const modeLabel = mode === 'morning' ? '🌅 Morning Check-in' : mode === 'evening' ? '🌙 Evening Check-in' : '☀ Daily Check-in'
  const morningDone = Boolean(checkinStatus?.morning_done)
  const eveningDone = Boolean(checkinStatus?.evening_done)

  return (
    <div className="daily-page">
      {/* Header */}
      <div className="daily-header">
        <h1>{modeLabel}</h1>
        <p className="daily-date">{dateStr}</p>
      </div>

      {/* Session status badges */}
      <div className="checkin-session-row">
        <span className={`checkin-session-badge${morningDone ? ' done' : ''}`}>
          {morningDone ? '✓' : '○'} Morning
        </span>
        <span className={`checkin-session-badge${eveningDone ? ' done' : ''}`}>
          {eveningDone ? '✓' : '○'} Evening
        </span>
      </div>

      {/* Evening quick panel — show prominently when it's evening time */}
      {mode === 'evening' && !eveningDone && (
        <div className="checkin-evening-highlight">
          <div className="checkin-evening-title">
            <span className="label-mono">Evening Session</span>
            {morningDone && <span className="caption" style={{ color: 'var(--success)' }}>Morning ✓</span>}
          </div>
          <EveningCheckInPanel onComplete={() => refetchStatus()} />
        </div>
      )}
      {mode === 'evening' && eveningDone && (
        <div className="checkin-session-complete">
          <span style={{ fontSize: '1.5rem' }}>🌙</span>
          <div>
            <p style={{ margin: 0, fontWeight: 'var(--weight-semibold)' }}>Evening check-in complete</p>
            <p className="caption">Well done. See the log sections below for updates.</p>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="daily-progress">
        <span className="daily-progress-count">{completedCount}/{REQUIRED.length}</span>
        <div className="daily-progress-bar">
          <div className="daily-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span>{progressPct}% complete</span>
      </div>

      {/* ── 1. Routine ─────────────────────────────────────────────────── */}
      <SectionCard
        id="routine"
        title="Routine"
        done={sectionDone.routine}
        status={`${todayLogs.length}/${routineBlocks.length} blocks logged`}
        open={open.routine ?? false}
        onToggle={() => toggle('routine')}
      >
        <DailyRoutinePanel
          blocks={routineBlocks}
          logs={todayLogs}
          today={today}
          onLog={(blockTime, status) => routineMut.mutate({ date: today, block_time: blockTime, status })}
          pending={routineMut.isPending}
        />
      </SectionCard>

      {/* ── 2. Journal ─────────────────────────────────────────────────── */}
      <SectionCard
        id="journal"
        title="Journal"
        done={journalDone}
        status={journalDone ? 'Written' : 'Not written'}
        open={open.journal ?? false}
        onToggle={() => toggle('journal')}
      >
        <JournalBody today={today} />
      </SectionCard>

      {/* ── 3. Mood ────────────────────────────────────────────────────── */}
      <SectionCard
        id="mood"
        title="Mood"
        done={sectionDone.mood}
        status={moodLog ? `Score: ${moodLog.mood_score}/5` : 'Not logged'}
        open={open.mood ?? false}
        onToggle={() => toggle('mood')}
      >
        <div className="dm-pills">
          {MOOD_OPTIONS.map(opt => (
            <button
              key={opt.score}
              className={`dm-pill${moodLog?.mood_score === opt.score ? ' dm-pill--active' : ''}`}
              disabled={moodMut.isPending}
              onClick={() => moodMut.mutate({ score: opt.score, notes: moodNotes })}
            >
              <div>{opt.label}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
        <div className="sp-field" style={{ marginTop: 4 }}>
          <label className="sp-label">Notes (optional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={moodNotes}
            placeholder="How are you feeling today?"
            onChange={e => setMoodNotes(e.target.value)}
          />
        </div>
        {moodLog && (
          <button
            className="btn-primary"
            style={{ alignSelf: 'flex-start' }}
            disabled={moodMut.isPending}
            onClick={() => moodMut.mutate({ score: moodLog.mood_score, notes: moodNotes })}
          >
            Update notes
          </button>
        )}
      </SectionCard>

      {/* ── 4. Health ──────────────────────────────────────────────────── */}
      <SectionCard
        id="health"
        title="Health"
        done={sectionDone.health}
        status={healthLog ? `Sleep: ${healthLog.sleep_hours}h · Energy: ${healthLog.energy_level}/5` : 'Not logged'}
        open={open.health ?? false}
        onToggle={() => toggle('health')}
      >
        <div className="dh-grid">
          <div className="dh-field">
            <label className="dh-label">Sleep hours</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="12"
              step="0.5"
              value={sleepHours}
              placeholder="e.g. 7.5"
              onChange={e => setSleepHours(e.target.value)}
            />
          </div>
          <div className="dh-field">
            <label className="dh-label">Energy level</label>
            <div className="dh-energy-row">
              {ENERGY_LEVELS.map(n => (
                <button
                  key={n}
                  className={`dh-energy-btn${energyLevel === n ? ' dh-energy-btn--active' : ''}`}
                  onClick={() => setEnergyLevel(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          className={`dh-toggle-row${exerciseDone ? ' dh-toggle-row--on' : ''}`}
          onClick={() => setExerciseDone(p => !p)}
        >
          <span>{exerciseDone ? '✓' : '○'}</span>
          <span>Exercise done today</span>
        </button>
        {exerciseDone && (
          <input
            className="form-input"
            placeholder="Exercise type (e.g. walking, weights…)"
            value={exerciseType}
            onChange={e => setExerciseType(e.target.value)}
          />
        )}
        <button
          className="btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={healthMut.isPending || !sleepHours}
          onClick={() => healthMut.mutate()}
        >
          {healthMut.isPending ? 'Saving…' : healthLog ? 'Update' : 'Save'}
        </button>
        {healthMut.isSuccess && <span style={{ fontSize: 14, color: 'var(--success)' }}>✓ Saved</span>}
      </SectionCard>

      {/* ── 5. Spiritual ───────────────────────────────────────────────── */}
      <SectionCard
        id="spiritual"
        title="Spiritual"
        done={sectionDone.spiritual}
        status={spiritualLog ? `Quran: ${spiritualLog.quran_pages}p · Dhikr: ${spiritualLog.dhikr_done ? 'done' : 'no'}` : 'Not logged'}
        open={open.spiritual ?? false}
        onToggle={() => toggle('spiritual')}
      >
        <div className="ds-row">
          <div className="sp-field" style={{ flex: 1 }}>
            <label className="sp-label">Quran pages read</label>
            <input
              className="form-input ds-quran-input"
              type="number"
              min="0"
              max="604"
              value={quranPages}
              onChange={e => setQuranPages(Number(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 18 }}>
            <button
              className={`ds-toggle-chip${dhikrDone ? ' ds-toggle-chip--on' : ''}`}
              onClick={() => setDhikrDone(p => !p)}
            >
              {dhikrDone ? '✓' : '○'} Dhikr done
            </button>
          </div>
        </div>
        <div className="sp-field">
          <label className="sp-label">Notes</label>
          <textarea
            className="form-input"
            rows={2}
            value={spiritualNotes}
            placeholder="Optional notes…"
            onChange={e => setSpiritualNotes(e.target.value)}
          />
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          Prayer tracking is done via Routine blocks above.
        </p>
        <button
          className="btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={spiritualMut.isPending}
          onClick={() => spiritualMut.mutate()}
        >
          {spiritualMut.isPending ? 'Saving…' : spiritualLog ? 'Update' : 'Save'}
        </button>
        {spiritualMut.isSuccess && <span style={{ fontSize: 14, color: 'var(--success)' }}>✓ Saved</span>}
      </SectionCard>

      {/* ── 6. Habits ──────────────────────────────────────────────────── */}
      <SectionCard
        id="habits"
        title="Habits"
        done={sectionDone.habits}
        status={`${habitBoard.filter(h => h.today_log !== null).length}/${habitBoard.length} done`}
        open={open.habits ?? false}
        onToggle={() => toggle('habits')}
      >
        {habitBoard.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            No habits set up. Add habits from the <a href="/health" style={{ color: 'var(--accent)' }}>Health page</a>.
          </p>
        ) : (
          <div className="dhb-list">
            {habitBoard.map(item => {
              const isDone = item.today_log !== null
              return (
                <button
                  key={item.habit.id}
                  className={`dhb-row${isDone ? ' dhb-row--done' : ''}`}
                  disabled={habitMut.isPending}
                  onClick={() => habitMut.mutate({
                    habitId: item.habit.id,
                    logId: item.today_log?.id ?? null,
                    done: !isDone,
                  })}
                >
                  <span className="dhb-check">{isDone ? '✓' : '○'}</span>
                  <span className="dhb-name">{item.habit.name}</span>
                  <span className="dhb-target">{item.habit.target.replace('_', ' ')}</span>
                  {item.current_streak > 1 && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔥{item.current_streak}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* ── 7. Finance (optional) ──────────────────────────────────────── */}
      <SectionCard
        id="finance"
        title="Finance"
        done={finEntries.length > 0}
        status={finEntries.length > 0 ? `${finEntries.length} entr${finEntries.length === 1 ? 'y' : 'ies'} added` : 'Nothing logged'}
        optional
        open={open.finance ?? false}
        onToggle={() => toggle('finance')}
      >
        {finEntries.length > 0 && (
          <div className="df-entries-list">
            {finEntries.map((e, i) => (
              <span key={i} className="df-entry-chip">
                {e.type === 'income' ? '↑' : '↓'} {e.amount} {e.currency} · {e.source}
              </span>
            ))}
          </div>
        )}
        <div className="df-type-row">
          {(['income', 'expense'] as FinanceEntryType[]).map(t => (
            <button
              key={t}
              className={`df-type-btn df-type-btn--${t}${finType === t ? ' df-type-btn--active' : ''}`}
              onClick={() => setFinType(t)}
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
          <input
            className="form-input"
            type="number"
            placeholder="Amount"
            value={finAmount}
            onChange={e => setFinAmount(e.target.value)}
          />
          <select
            className="form-input"
            value={finCurrency}
            onChange={e => setFinCurrency(e.target.value as CurrencyCode)}
          >
            <option value="EGP">EGP</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <input
          className="form-input"
          placeholder="Source / description"
          value={finSource}
          onChange={e => setFinSource(e.target.value)}
        />
        <input
          className="form-input"
          placeholder="Notes (optional)"
          value={finNotes}
          onChange={e => setFinNotes(e.target.value)}
        />
        <button
          className="btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={financeMut.isPending || !finAmount}
          onClick={() => financeMut.mutate()}
        >
          {financeMut.isPending ? 'Adding…' : 'Add entry'}
        </button>
      </SectionCard>

      {/* ── 8. Ideas (optional) ────────────────────────────────────────── */}
      <SectionCard
        id="ideas"
        title="Ideas"
        done={capturedIdeas.length > 0}
        status={capturedIdeas.length > 0 ? `${capturedIdeas.length} captured` : 'Capture thoughts'}
        optional
        open={open.ideas ?? false}
        onToggle={() => toggle('ideas')}
      >
        {capturedIdeas.length > 0 && (
          <div className="di-captured">
            {capturedIdeas.map((idea, i) => (
              <div key={i} className="di-idea-chip">💡 {idea}</div>
            ))}
          </div>
        )}
        <textarea
          className="form-input"
          rows={3}
          placeholder="Describe the idea…"
          value={ideaTitle}
          onChange={e => setIdeaTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ideaTitle.trim()) {
              e.preventDefault()
              ideaMut.mutate()
            }
          }}
        />
        <button
          className="btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={ideaMut.isPending || !ideaTitle.trim()}
          onClick={() => ideaMut.mutate()}
        >
          {ideaMut.isPending ? 'Capturing…' : 'Capture idea'}
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ctrl+Enter to save quickly</span>
      </SectionCard>
    </div>
  )
}
