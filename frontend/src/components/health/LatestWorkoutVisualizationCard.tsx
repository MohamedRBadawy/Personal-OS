import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import anatomyBack from '../../assets/health/anatomy-back.svg'
import anatomyFront from '../../assets/health/anatomy-front.svg'
import type { HealthLog, WorkoutSession } from '../../lib/types'
import { BODY_REGION_KEYS, MUSCLE_LABELS, inferMuscleProfile, isBodyRegionKey, type BodyRegionKey } from './workoutMuscles'

type Mode = 'body_logs' | 'workouts'
type Range = 7 | 14 | 30 | 'all'
type Side = 'front' | 'back'
type Tone = 'primary' | 'secondary' | 'idle'
type Role = 'primary' | 'secondary' | 'none'

type Region = { muscle: BodyRegionKey; d: string }
type ExerciseItem = {
  id: string
  sessionDate: string
  sessionLabel: string
  name: string
  setCount: number
  volumeKg: number
  primary: BodyRegionKey | null
  secondary: BodyRegionKey[]
}
type WorkoutSummary = {
  source: 'sessions' | 'body_logs'
  sessions: WorkoutSession[]
  latest: WorkoutSession
  durationMins: number
  volumeKg: number
  exerciseCount: number
  setCount: number
  primaryHits: Record<BodyRegionKey, number>
  secondaryHits: Record<BodyRegionKey, number>
  exercises: ExerciseItem[]
}
type BodySummary = {
  logs: HealthLog[]
  latest: HealthLog
  avgSleep: number | null
  avgEnergy: number | null
  latestWeight: number | null
  exerciseDays: number
}

const RANGES: Range[] = [7, 14, 30, 'all']
const FRONT: Region[] = [
  { muscle: 'chest', d: 'M 80,64 C 66,62 46,66 36,77 C 28,87 30,103 40,110 C 48,116 62,114 72,109 C 78,105 80,97 80,85 Z M 80,64 C 94,62 114,66 124,77 C 132,87 130,103 120,110 C 112,116 98,114 88,109 C 82,105 80,97 80,85 Z' },
  { muscle: 'shoulders', d: 'M 28,63 C 15,69 9,84 13,98 C 17,108 28,110 36,102 C 40,95 40,79 34,69 Z M 132,63 C 145,69 151,84 147,98 C 143,108 132,110 124,102 C 120,95 120,79 126,69 Z' },
  { muscle: 'biceps', d: 'M 8,99 C 4,113 4,130 8,142 C 12,150 22,152 28,145 C 34,138 34,121 30,108 C 26,98 16,92 8,99 Z M 152,99 C 156,113 156,130 152,142 C 148,150 138,152 132,145 C 126,138 126,121 130,108 C 134,98 144,92 152,99 Z' },
  { muscle: 'core', d: 'M 46,112 C 43,126 43,143 46,159 L 114,159 C 117,143 117,126 114,112 Z' },
  { muscle: 'quads', d: 'M 28,167 C 24,185 22,220 24,249 C 26,261 34,267 44,265 C 54,263 58,253 60,241 L 62,167 Z M 132,167 C 136,185 138,220 136,249 C 134,261 126,267 116,265 C 106,263 102,253 100,241 L 98,167 Z' },
]
const BACK: Region[] = [
  { muscle: 'back', d: 'M 32,63 C 22,69 18,86 18,110 C 20,134 24,152 28,163 L 132,163 C 136,152 140,134 142,110 C 142,86 138,69 128,63 C 112,57 96,55 80,55 C 64,55 48,57 32,63 Z' },
  { muscle: 'shoulders', d: 'M 28,63 C 15,69 9,84 13,98 C 17,108 28,110 36,102 C 40,95 40,79 34,69 Z M 132,63 C 145,69 151,84 147,98 C 143,108 132,110 124,102 C 120,95 120,79 126,69 Z' },
  { muscle: 'triceps', d: 'M 8,99 C 4,113 4,130 8,142 C 12,150 22,152 28,145 C 34,138 34,121 30,108 C 26,98 16,92 8,99 Z M 152,99 C 156,113 156,130 152,142 C 148,150 138,152 132,145 C 126,138 126,121 130,108 C 134,98 144,92 152,99 Z' },
  { muscle: 'glutes', d: 'M 28,165 C 22,177 20,196 26,212 C 32,224 46,230 62,228 C 70,226 78,224 80,222 C 82,224 90,226 98,228 C 114,230 128,224 134,212 C 140,196 138,177 132,165 Z' },
  { muscle: 'hamstrings', d: 'M 28,224 C 24,238 22,257 24,270 C 26,282 34,287 44,285 C 54,283 58,273 60,261 L 62,224 Z M 132,224 C 136,238 138,257 136,270 C 134,282 126,287 116,285 C 106,283 102,273 100,261 L 98,224 Z' },
  { muscle: 'calves', d: 'M 24,272 C 20,284 22,303 26,315 C 30,323 38,326 48,324 C 56,322 60,314 58,302 L 58,268 Z M 136,272 C 140,284 138,303 134,315 C 130,323 122,326 112,324 C 104,322 100,314 102,302 L 102,268 Z' },
]

const fullDate = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const intFmt = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })
const weightFmt = new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 1 })

const parseDay = (date: string) => new Date(`${date}T00:00:00`)
const fmtFull = (date: string) => Number.isNaN(parseDay(date).getTime()) ? date : fullDate.format(parseDay(date))
const fmtShort = (date: string) => Number.isNaN(parseDay(date).getTime()) ? date : shortDate.format(parseDay(date))
const fmtRange = (newest: string, oldest: string) => newest === oldest ? fmtFull(newest) : `${fmtShort(oldest)} - ${fmtFull(newest)}`
const fmtRangeLabel = (range: Range) => range === 'all' ? 'All entries' : `Last ${range}`
const fmtVolume = (value: number) => `${intFmt.format(value)} kg`
const fmtDuration = (value: number | null) => value != null ? `${value} min` : '-'
const fmtAverage = (value: number | null, suffix: string) => value != null ? `${value.toFixed(1)}${suffix}` : '-'
const fmtWeight = (value: number | null) => value != null ? `${weightFmt.format(value)} kg` : '-'
const setVolume = (weightKg: string | null, reps: number | null) => weightKg == null || reps == null ? 0 : (Number.parseFloat(weightKg) || 0) * reps
const sleepHours = (log: HealthLog) => { const v = Number.parseFloat(log.sleep_hours); return Number.isNaN(v) ? null : v }
const weightKg = (log: HealthLog) => log.weight_kg == null ? null : (Number.parseFloat(log.weight_kg) || null)
const bySession = (a: WorkoutSession, b: WorkoutSession) => parseDay(b.date).getTime() - parseDay(a.date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
const byLog = (a: HealthLog, b: HealthLog) => parseDay(b.date).getTime() - parseDay(a.date).getTime()
const take = <T,>(items: T[], range: Range) => range === 'all' ? items : items.slice(0, range)
const titleize = (type: WorkoutSession['session_type']) => type.split(/[_-]/g).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

function inferSessionType(exerciseLabel: string): WorkoutSession['session_type'] {
  const lower = exerciseLabel.toLowerCase()
  if (lower.includes('swim')) return 'swimming'
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('mobility') || lower.includes('pilates')) return 'yoga'
  if (lower.includes('cardio') || lower.includes('treadmill') || lower.includes('elliptical') || lower.includes('walk') || lower.includes('run') || lower.includes('bike') || lower.includes('cycling')) return 'cardio'
  return 'strength'
}

function inferCategory(sessionType: WorkoutSession['session_type']): WorkoutSession['exercises'][number]['category'] {
  if (sessionType === 'cardio' || sessionType === 'swimming') return 'cardio'
  if (sessionType === 'yoga') return 'flexibility'
  return 'compound'
}

function buildFallbackSessionsFromBodyLogs(logs: HealthLog[]): WorkoutSession[] {
  return [...logs]
    .sort(byLog)
    .filter((log) => log.exercise_done && log.exercise_type.trim())
    .map((log) => {
      const exerciseLabel = log.exercise_type.trim()
      const muscleProfile = inferMuscleProfile(exerciseLabel)
      const sessionType = inferSessionType(exerciseLabel)
      const syntheticSetCount = Math.max(muscleProfile.matchCount, 1)
      const sessionId = `body-log-session-${log.id}`
      const exerciseId = `body-log-exercise-${log.id}`

      return {
        id: sessionId,
        date: log.date,
        title: exerciseLabel,
        session_type: sessionType,
        duration_mins: log.exercise_duration_mins,
        notes: 'Derived from body log exercise text.',
        health_log: log.id,
        created_at: `${log.date}T00:00:00Z`,
        exercises: [
          {
            id: exerciseId,
            session: sessionId,
            name: exerciseLabel,
            category: inferCategory(sessionType),
            order: 0,
            notes: 'Derived from body log exercise text.',
            primary_muscle: muscleProfile.primary,
            secondary_muscles: muscleProfile.secondary,
            sets: Array.from({ length: syntheticSetCount }, (_, index) => ({
              id: `body-log-set-${log.id}-${index + 1}`,
              exercise: exerciseId,
              set_number: index + 1,
              reps: null,
              weight_kg: null,
              duration_secs: index === 0 && log.exercise_duration_mins ? log.exercise_duration_mins * 60 : null,
              distance_km: null,
              notes: 'Derived from body log exercise text.',
            })),
          },
        ],
      }
    })
}

function buildWorkout(sessions: WorkoutSession[], bodyLogs: HealthLog[], range: Range): WorkoutSummary | null {
  const source = sessions.length > 0 ? 'sessions' : 'body_logs'
  const sourceSessions = sessions.length > 0 ? sessions : buildFallbackSessionsFromBodyLogs(bodyLogs)
  const picked = take([...sourceSessions].sort(bySession), range)
  if (picked.length === 0) return null
  const primaryHits = Object.fromEntries(BODY_REGION_KEYS.map((k) => [k, 0])) as Record<BodyRegionKey, number>
  const secondaryHits = Object.fromEntries(BODY_REGION_KEYS.map((k) => [k, 0])) as Record<BodyRegionKey, number>
  const exercises = picked.flatMap((session) => session.exercises.map((exercise) => {
    const setCount = exercise.sets.length
    const primary = isBodyRegionKey(exercise.primary_muscle) ? exercise.primary_muscle : null
    const secondary = exercise.secondary_muscles.filter(isBodyRegionKey)
    if (primary) primaryHits[primary] += setCount
    secondary.forEach((muscle) => { secondaryHits[muscle] += setCount })
    return {
      id: exercise.id,
      sessionDate: session.date,
      sessionLabel: session.title || titleize(session.session_type),
      name: exercise.name,
      setCount,
      volumeKg: exercise.sets.reduce((sum, set) => sum + setVolume(set.weight_kg, set.reps), 0),
      primary,
      secondary,
    }
  }))
  return {
    source,
    sessions: picked,
    latest: picked[0],
    durationMins: picked.reduce((sum, session) => sum + (session.duration_mins ?? 0), 0),
    volumeKg: exercises.reduce((sum, item) => sum + item.volumeKg, 0),
    exerciseCount: exercises.length,
    setCount: exercises.reduce((sum, item) => sum + item.setCount, 0),
    primaryHits,
    secondaryHits,
    exercises,
  }
}

function buildBody(logs: HealthLog[], range: Range): BodySummary | null {
  const picked = take([...logs].sort(byLog), range)
  if (picked.length === 0) return null
  const sleeps = picked.map(sleepHours).filter((v): v is number => v != null)
  return {
    logs: picked,
    latest: picked[0],
    avgSleep: sleeps.length ? sleeps.reduce((sum, v) => sum + v, 0) / sleeps.length : null,
    avgEnergy: picked.length ? picked.reduce((sum, log) => sum + log.energy_level, 0) / picked.length : null,
    latestWeight: picked.map(weightKg).find((v): v is number => v != null) ?? null,
    exerciseDays: picked.filter((log) => log.exercise_done).length,
  }
}

const toneFor = (summary: WorkoutSummary | null, muscle: BodyRegionKey): Tone => !summary ? 'idle' : summary.primaryHits[muscle] > 0 ? 'primary' : summary.secondaryHits[muscle] > 0 ? 'secondary' : 'idle'
const roleFor = (summary: WorkoutSummary, muscle: BodyRegionKey): Role => summary.primaryHits[muscle] > 0 ? 'primary' : summary.secondaryHits[muscle] > 0 ? 'secondary' : 'none'
const setsFor = (summary: WorkoutSummary, muscle: BodyRegionKey) => roleFor(summary, muscle) === 'primary' ? summary.primaryHits[muscle] : summary.secondaryHits[muscle]

function Figure({ side, summary, selected, onSelect }: { side: Side; summary: WorkoutSummary | null; selected: BodyRegionKey | null; onSelect: (muscle: BodyRegionKey) => void }) {
  const regions = side === 'front' ? FRONT : BACK
  const src = side === 'front' ? anatomyFront : anatomyBack
  return (
    <div className="latest-workout-figure">
      <p className="latest-workout-figure__label">{side}</p>
      <div className="latest-workout-figure__canvas">
        <img src={src} alt={`${side} anatomy`} className="latest-workout-figure__art" />
        {summary ? <svg viewBox="0 0 160 340" className="latest-workout-figure__overlay">{regions.map((region) => {
          const tone = toneFor(summary, region.muscle)
          const active = selected === region.muscle
          const onKeyDown = (event: KeyboardEvent<SVGPathElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(region.muscle) } }
          return <path key={`${side}-${region.muscle}`} d={region.d} role="button" tabIndex={0} aria-label={`${MUSCLE_LABELS[region.muscle]} region`} data-testid={`region-${side}-${region.muscle}`} className={`latest-workout-region latest-workout-region--${tone}${active ? ' is-selected' : ''}`} fill="rgba(255,126,87,1)" fillOpacity={tone === 'primary' ? 0.88 : tone === 'secondary' ? 0.38 : 0.02} stroke="rgba(255,243,232,1)" strokeOpacity={active ? 1 : tone === 'idle' ? 0.12 : 0.6} strokeWidth={active ? 1.6 : 1} onMouseEnter={() => onSelect(region.muscle)} onFocus={() => onSelect(region.muscle)} onClick={() => onSelect(region.muscle)} onKeyDown={onKeyDown} />
        })}</svg> : null}
      </div>
    </div>
  )
}

function Trend({ label, values, color, latest }: { label: string; values: (number | null)[]; color: string; latest: string }) {
  const nums = values.filter((v): v is number => v != null)
  if (!nums.length) return <div className="body-log-trend-card"><div className="body-log-trend-card__header"><span className="body-log-trend-card__label">{label}</span><strong className="body-log-trend-card__value">-</strong></div><div className="body-log-trend-card__empty">No data in this range.</div></div>
  const min = Math.min(...nums); const max = Math.max(...nums); const pad = max === min ? Math.max(1, max * 0.08) : (max - min) * 0.18
  const points = values.map((value, index) => value == null ? null : `${8 + (index / Math.max(values.length - 1, 1)) * 104},${46 - (((value - (min - pad)) / Math.max((max + pad) - (min - pad), 1)) * 40)}`)
  return <div className="body-log-trend-card"><div className="body-log-trend-card__header"><span className="body-log-trend-card__label">{label}</span><strong className="body-log-trend-card__value">{latest}</strong></div><svg viewBox="0 0 120 52" className="body-log-trend-card__chart" aria-hidden="true"><polyline points={points.filter(Boolean).join(' ')} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />{points.map((point, index) => point ? <circle key={index} cx={point.split(',')[0]} cy={point.split(',')[1]} r="2.8" fill={color} /> : null)}</svg></div>
}

export function LatestWorkoutVisualizationCard({ sessions, bodyLogs }: { sessions: WorkoutSession[]; bodyLogs: HealthLog[] }) {
  const [mode, setMode] = useState<Mode>(bodyLogs.length > 0 || sessions.length === 0 ? 'body_logs' : 'workouts')
  const [range, setRange] = useState<Range>(7)
  const [selected, setSelected] = useState<BodyRegionKey | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const workout = useMemo(() => buildWorkout(sessions, bodyLogs, range), [bodyLogs, sessions, range])
  const body = useMemo(() => buildBody(bodyLogs, range), [bodyLogs, range])

  useEffect(() => {
    if (mode === 'body_logs' && bodyLogs.length === 0 && sessions.length > 0) setMode('workouts')
  }, [bodyLogs.length, mode, sessions.length])

  useEffect(() => {
    setSelected(null)
    setShowBreakdown(false)
  }, [mode, range, workout?.latest.id])

  const empty = mode === 'body_logs' ? !body : !workout
  const muscles = workout ? BODY_REGION_KEYS.filter((muscle) => workout.primaryHits[muscle] > 0 || workout.secondaryHits[muscle] > 0).sort((left, right) => (workout.primaryHits[right] + workout.secondaryHits[right]) - (workout.primaryHits[left] + workout.secondaryHits[left])) : []

  return (
    <div className={`latest-workout-card${empty ? ' latest-workout-card--empty' : ''}`}>
      <div className="latest-workout-card__toolbar">
        <div className="latest-workout-toggle-group">
          <button type="button" data-testid="mode-body-logs" className={`latest-workout-toggle${mode === 'body_logs' ? ' is-active' : ''}`} aria-pressed={mode === 'body_logs'} onClick={() => setMode('body_logs')}>Body logs</button>
          <button type="button" data-testid="mode-workouts" className={`latest-workout-toggle${mode === 'workouts' ? ' is-active' : ''}`} aria-pressed={mode === 'workouts'} onClick={() => setMode('workouts')}>Workouts</button>
        </div>
        <div className="latest-workout-toggle-group">
          {RANGES.map((option) => <button key={option} type="button" data-testid={`range-${option}`} className={`latest-workout-toggle${range === option ? ' is-active' : ''}`} aria-pressed={range === option} onClick={() => setRange(option)}>{option === 'all' ? 'All' : option}</button>)}
        </div>
      </div>

      <p className="latest-workout-card__range-note">{mode === 'body_logs' ? `Showing ${fmtRangeLabel(range).toLowerCase()} body log entries.` : workout?.source === 'body_logs' ? `Showing ${fmtRangeLabel(range).toLowerCase()} exercise entries derived from body logs.` : `Showing ${fmtRangeLabel(range).toLowerCase()} workout sessions.`}</p>

      {mode === 'body_logs' ? (
        body ? (
          <>
            <div className="latest-workout-card__header">
              <div>
                <p className="latest-workout-card__eyebrow">Body logs</p>
                <h3 className="latest-workout-card__title">{fmtRangeLabel(range)} body entries</h3>
                <p className="latest-workout-card__date">{fmtRange(body.logs[0].date, body.logs[body.logs.length - 1].date)} - {body.exerciseDays} exercise day{body.exerciseDays === 1 ? '' : 's'}</p>
              </div>
              <span className="latest-workout-card__type">{body.logs.length} entries</span>
            </div>

            <div className="body-log-trends">
              <Trend label="Sleep" values={body.logs.slice().reverse().map((log) => sleepHours(log))} color="#7dd3fc" latest={fmtAverage(sleepHours(body.latest), 'h')} />
              <Trend label="Energy" values={body.logs.slice().reverse().map((log) => log.energy_level)} color="#f59e0b" latest={`${body.latest.energy_level}/5`} />
              <Trend label="Weight" values={body.logs.slice().reverse().map((log) => weightKg(log))} color="#34d399" latest={fmtWeight(weightKg(body.latest))} />
            </div>

            <div className="latest-workout-card__stats">
              <div className="latest-workout-stat"><span className="latest-workout-stat__label">Entries</span><strong className="latest-workout-stat__value">{body.logs.length}</strong></div>
              <div className="latest-workout-stat"><span className="latest-workout-stat__label">Avg sleep</span><strong className="latest-workout-stat__value">{fmtAverage(body.avgSleep, 'h')}</strong></div>
              <div className="latest-workout-stat"><span className="latest-workout-stat__label">Avg energy</span><strong className="latest-workout-stat__value">{fmtAverage(body.avgEnergy, '/5')}</strong></div>
              <div className="latest-workout-stat"><span className="latest-workout-stat__label">Latest weight</span><strong className="latest-workout-stat__value">{fmtWeight(body.latestWeight)}</strong></div>
            </div>

            <div className="body-log-entry-list__header"><p className="latest-workout-breakdown__label">Recent body logs</p><span className="muted">Showing {body.logs.length} log{body.logs.length === 1 ? '' : 's'} in this view.</span></div>
            <div className="body-log-entry-list">
              {body.logs.map((log) => <article key={log.id} className="body-log-entry-card"><div className="body-log-entry-card__top"><strong>{fmtShort(log.date)}</strong><span className={`body-log-entry-card__exercise${log.exercise_done ? ' is-active' : ''}`}>{log.exercise_done ? (log.exercise_type || 'Exercise logged') : 'Rest day'}</span></div><div className="body-log-entry-card__metrics"><span>Sleep {fmtAverage(sleepHours(log), 'h')}</span><span>Energy {log.energy_level}/5</span><span>Weight {fmtWeight(weightKg(log))}</span><span>Duration {log.exercise_duration_mins ? `${log.exercise_duration_mins} min` : '-'}</span></div></article>)}
            </div>
          </>
        ) : (
          <>
            <div className="latest-workout-card__header"><div><p className="latest-workout-card__eyebrow">Body logs</p><h3 className="latest-workout-card__title">No body logs yet</h3><p className="latest-workout-card__date">Log today&apos;s body data to unlock recent trends.</p></div></div>
            <div className="latest-workout-card__detail latest-workout-card__detail--empty">Sleep, energy, exercise, and weight trends will appear here once body logs are available.</div>
            <a href="#body-log-panel" className="latest-workout-card__cta">Open today&apos;s body log</a>
          </>
        )
      ) : workout ? (
        <>
          <div className="latest-workout-card__header">
            <div>
              <p className="latest-workout-card__eyebrow">Workout anatomy</p>
              <h3 className="latest-workout-card__title">{workout.source === 'body_logs' ? `${fmtRangeLabel(range)} workout entries` : `${fmtRangeLabel(range)} workout sessions`}</h3>
              <p className="latest-workout-card__date">{fmtRange(workout.sessions[0].date, workout.sessions[workout.sessions.length - 1].date)} - {workout.sessions.length} {workout.source === 'body_logs' ? `exercise entr${workout.sessions.length === 1 ? 'y' : 'ies'} from body logs` : `session${workout.sessions.length === 1 ? '' : 's'}`}</p>
            </div>
            <span className="latest-workout-card__type">{workout.source === 'body_logs' ? 'From body logs' : (workout.latest.title || titleize(workout.latest.session_type))}</span>
          </div>

          <div className="latest-workout-card__figures">
            <Figure side="front" summary={workout} selected={selected} onSelect={setSelected} />
            <Figure side="back" summary={workout} selected={selected} onSelect={setSelected} />
          </div>

          <div className="latest-workout-card__detail">{selected ? (<><strong>{MUSCLE_LABELS[selected]}</strong>{roleFor(workout, selected) === 'none' ? <span className="muted">Not hit in this range.</span> : <><span className={`latest-workout-detail-chip latest-workout-detail-chip--${roleFor(workout, selected)}`}>{roleFor(workout, selected)}</span><span className="muted">{setsFor(workout, selected)} set{setsFor(workout, selected) === 1 ? '' : 's'} contributed</span></>}</>) : <span className="muted">{workout.source === 'body_logs' ? 'Muscle highlights are inferred from body-log exercise text. Use the workout logger for richer detail.' : 'Hover, tap, or focus a muscle region to inspect the selected workout range.'}</span>}</div>

          <div className="latest-workout-card__stats">
            <div className="latest-workout-stat"><span className="latest-workout-stat__label">Duration</span><strong className="latest-workout-stat__value">{fmtDuration(workout.durationMins)}</strong></div>
            <div className="latest-workout-stat"><span className="latest-workout-stat__label">Volume</span><strong className="latest-workout-stat__value">{fmtVolume(workout.volumeKg)}</strong></div>
            <div className="latest-workout-stat"><span className="latest-workout-stat__label">Exercises</span><strong className="latest-workout-stat__value">{workout.exerciseCount}</strong></div>
            <div className="latest-workout-stat"><span className="latest-workout-stat__label">Total sets</span><strong className="latest-workout-stat__value">{workout.setCount}</strong></div>
          </div>

          <button type="button" className="latest-workout-card__cta" aria-expanded={showBreakdown} onClick={() => setShowBreakdown((current) => !current)}>{showBreakdown ? 'Hide breakdown' : 'View breakdown'}</button>

          {showBreakdown ? <div className="latest-workout-breakdown"><div className="latest-workout-breakdown__section"><p className="latest-workout-breakdown__label">Most trained muscles</p><div className="latest-workout-breakdown__chips">{muscles.length ? muscles.map((muscle) => <button key={muscle} type="button" className={`latest-workout-breakdown__chip latest-workout-breakdown__chip--${roleFor(workout, muscle)}`} onClick={() => setSelected(muscle)}>{MUSCLE_LABELS[muscle]} - {roleFor(workout, muscle)} - {setsFor(workout, muscle)} sets</button>) : <span className="muted">No muscle contributions were detected in this range.</span>}</div></div><div className="latest-workout-breakdown__section"><p className="latest-workout-breakdown__label">Exercise breakdown</p><div className="latest-workout-exercise-list">{workout.exercises.map((exercise) => <article key={exercise.id} className="latest-workout-exercise"><div className="latest-workout-exercise__header"><div><h4 className="latest-workout-exercise__title">{exercise.name}</h4><p className="latest-workout-exercise__meta">{fmtShort(exercise.sessionDate)} - {exercise.sessionLabel} - {exercise.setCount} set{exercise.setCount === 1 ? '' : 's'}{exercise.volumeKg > 0 ? ` - ${fmtVolume(exercise.volumeKg)}` : ''}{workout.source === 'body_logs' ? ' - derived from body log' : ''}</p></div></div><div className="latest-workout-exercise__chips">{exercise.primary ? <span className="latest-workout-exercise-chip latest-workout-exercise-chip--primary">Primary - {MUSCLE_LABELS[exercise.primary]}</span> : null}{exercise.secondary.map((muscle) => <span key={`${exercise.id}-${muscle}`} className="latest-workout-exercise-chip latest-workout-exercise-chip--secondary">Secondary - {MUSCLE_LABELS[muscle]}</span>)}</div></article>)}</div></div></div> : null}
        </>
      ) : (
        <>
          <div className="latest-workout-card__header"><div><p className="latest-workout-card__eyebrow">Workout anatomy</p><h3 className="latest-workout-card__title">No workout logged yet</h3><p className="latest-workout-card__date">Log your first session to see muscle highlights across the selected range.</p></div></div>
          <div className="latest-workout-card__figures"><Figure side="front" summary={null} selected={null} onSelect={() => undefined} /><Figure side="back" summary={null} selected={null} onSelect={() => undefined} /></div>
          <div className="latest-workout-card__detail latest-workout-card__detail--empty">Duration, volume, muscle focus, and exercise breakdown will appear once workouts are logged.</div>
          <a href="#workout-logger-panel" className="latest-workout-card__cta">Open workout logger</a>
        </>
      )}
    </div>
  )
}
