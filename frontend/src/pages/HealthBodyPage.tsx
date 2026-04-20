import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { PageSkeleton } from '../components/PageSkeleton'
import { Panel } from '../components/Panel'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { HealthLogForm } from '../components/HealthLogForm'
import { HealthGoalSettingsCard } from '../components/health/HealthGoalSettingsCard'
import { HealthSignalsPanel } from '../components/health/HealthSignalsPanel'
import {
  createHealthLog,
  createBodyCompositionLog,
  createSetLog,
  createWorkoutExercise,
  createWorkoutSession,
  deleteSetLog,
  deleteWorkoutExercise,
  deleteWorkoutSession,
  getHealthAIInsights,
  getHealthOverview,
  getStrengthHistory,
  listBodyCompositionLogs,
  updateHealthLog,
  updateHealthGoals,
} from '../lib/api'
import type {
  BodyCompositionLog,
  BodyCompositionLogPayload,
  HealthAIInsight,
  HealthAIInsightsPayload,
  HealthLog,
  HealthLogPayload,
  HealthReadinessScore,
  HealthSummary,
  MuscleActivation,
  StrengthHistoryPayload,
  WorkoutExercise,
  WorkoutSession,
} from '../lib/types'
import { formatPercent } from '../lib/formatters'

// ── Alert chip helpers ────────────────────────────────────────────────────────

type AlertLevel = 'warn' | 'danger' | 'ok'

function AlertChip({ level, text }: { level: AlertLevel; text: string }) {
  const color = level === 'danger' ? '#dc2626' : level === 'warn' ? '#f59e0b' : '#16a34a'
  return (
    <span className="health-alert-chip" style={{ background: color + '1a', color, border: `1px solid ${color}40` }}>
      {text}
    </span>
  )
}

function buildAlerts(s: HealthSummary) {
  const alerts: { level: AlertLevel; text: string }[] = []
  const sleep = s.avg_sleep_7d ?? 0
  if (sleep < 6 && sleep > 0) alerts.push({ level: 'danger', text: `Sleep avg ${sleep.toFixed(1)}h — below 6h` })
  else if (sleep < 7 && sleep > 0) alerts.push({ level: 'warn', text: `Sleep avg ${sleep.toFixed(1)}h — below 7h` })
  const energy = s.avg_energy_7d ?? 0
  if (energy > 0 && energy < 3) alerts.push({ level: 'warn', text: `Energy avg ${energy.toFixed(1)}/5 — low` })
  if (s.low_mood_streak >= 3) alerts.push({ level: 'danger', text: `Low mood for ${s.low_mood_streak} days straight` })
  else if (s.low_mood_streak >= 2) alerts.push({ level: 'warn', text: `Low mood for ${s.low_mood_streak} consecutive days` })
  if (s.prayer_gap_streak >= 2) alerts.push({ level: 'warn', text: `Prayer gap: ${s.prayer_gap_streak} days without full prayers` })
  if (s.exercise_streak >= 5) alerts.push({ level: 'ok', text: `Exercise streak: ${s.exercise_streak} days 🔥` })
  if (s.full_prayer_streak >= 7) alerts.push({ level: 'ok', text: `Full prayers streak: ${s.full_prayer_streak} days ✨` })
  return alerts
}

// ── Mini sparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ logs, field, max, color }: {
  logs: HealthLog[]
  field: 'sleep_hours' | 'energy_level' | 'weight_kg'
  max: number
  color: string
}) {
  const last7 = logs.slice(0, 7).reverse()
  if (last7.length === 0) return <span className="muted" style={{ fontSize: 14 }}>No data</span>
  if (field === 'weight_kg' && !last7.some(l => l.weight_kg != null)) {
    return <span className="muted" style={{ fontSize: 14 }}>No weight data</span>
  }
  return (
    <div className="health-sparkline">
      {last7.map((log, i) => {
        let val: number | null = null
        if (field === 'sleep_hours') val = parseFloat(log.sleep_hours)
        else if (field === 'energy_level') val = log.energy_level
        else if (field === 'weight_kg') val = log.weight_kg != null ? parseFloat(log.weight_kg) : null
        if (val == null) {
          return (
            <div key={i} className="health-sparkline-bar" title="No data">
              <div className="health-sparkline-fill" style={{ height: '4%', background: color, opacity: 0.2 }} />
            </div>
          )
        }
        const pct = Math.min(100, Math.round((val / max) * 100))
        const isLow = field === 'sleep_hours' ? val < 6 : field === 'energy_level' ? val < 3 : false
        return (
          <div key={i} className="health-sparkline-bar" title={`${val}`}>
            <div className="health-sparkline-fill" style={{ height: `${Math.max(pct, 4)}%`, background: isLow ? '#dc2626' : color }} />
          </div>
        )
      })}
    </div>
  )
}

// ── 7-day averages panel ──────────────────────────────────────────────────────

function SevenDayAverages({ s, logs }: { s: HealthSummary; logs: HealthLog[] }) {
  const latestWeight = logs.find(l => l.weight_kg != null)?.weight_kg
  const hasWeight = logs.some(l => l.weight_kg != null)
  type SparkField = 'sleep_hours' | 'energy_level' | 'weight_kg'
  const rows: { label: string; value: string; sparkField: SparkField; max: number; color: string }[] = [
    { label: 'Sleep', value: s.avg_sleep_7d != null ? `${s.avg_sleep_7d.toFixed(1)}h` : '—', sparkField: 'sleep_hours', max: 10, color: '#6366f1' },
    { label: 'Energy', value: s.avg_energy_7d != null ? `${s.avg_energy_7d.toFixed(1)}/5` : '—', sparkField: 'energy_level', max: 5, color: '#f59e0b' },
    ...(hasWeight ? [{ label: 'Weight', value: latestWeight ? `${latestWeight} kg` : '—', sparkField: 'weight_kg' as SparkField, max: 120, color: '#a78bfa' }] : []),
  ]
  return (
    <div className="health-avg-row">
      {rows.map(r => (
        <div key={r.label} className="health-avg-item">
          <div className="health-avg-header">
            <span className="health-avg-label">{r.label}</span>
            <span className="health-avg-val">{r.value}</span>
          </div>
          <MiniSparkline logs={logs} field={r.sparkField} max={r.max} color={r.color} />
          <span className="health-avg-sub">7-day trend</span>
        </div>
      ))}
    </div>
  )
}

// ── Section B: Readiness Widget ───────────────────────────────────────────────

function ReadinessWidget({ readiness }: { readiness: HealthReadinessScore | null }) {
  if (!readiness) {
    return (
      <div className="readiness-empty">
        <p className="muted" style={{ fontSize: 14 }}>Log sleep + mood data for a few days to unlock your readiness score.</p>
      </div>
    )
  }

  const scoreColor = readiness.score >= 80 ? '#3b82f6'
    : readiness.score >= 60 ? '#16a34a'
    : readiness.score >= 40 ? '#f59e0b'
    : '#dc2626'

  const intensityColor = {
    rest: '#dc2626', light: '#f59e0b', moderate: '#16a34a', full: '#3b82f6',
  }[readiness.suggested_intensity]

  const components: { key: keyof HealthReadinessScore['components']; label: string }[] = [
    { key: 'hrv', label: 'HRV' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'resting_hr', label: 'Resting HR' },
    { key: 'mood', label: 'Mood' },
  ]

  return (
    <div className="readiness-widget">
      <div className="readiness-score-row">
        <div className="readiness-score-circle" style={{ borderColor: scoreColor, color: scoreColor }}>
          <span className="readiness-score-num">{readiness.score}</span>
          <span className="readiness-score-denom">/100</span>
        </div>
        <div className="readiness-score-info">
          <div className="readiness-label" style={{ color: scoreColor }}>{readiness.label}</div>
          <div className="readiness-intensity">
            <span className="readiness-intensity-badge" style={{ background: intensityColor + '22', color: intensityColor, border: `1px solid ${intensityColor}44` }}>
              {readiness.suggested_intensity} intensity
            </span>
          </div>
          <p className="readiness-recommendation muted" style={{ fontSize: 13, marginTop: 6 }}>{readiness.recommendation}</p>
        </div>
      </div>

      <div className="readiness-components">
        {components.map(({ key, label }) => {
          const comp = readiness.components[key]
          return (
            <div key={key} className={`readiness-component ${!comp.available ? 'unavailable' : ''}`}>
              <span className="readiness-component-label">{label}</span>
              <div className="readiness-component-bar-track">
                <div
                  className="readiness-component-bar-fill"
                  style={{
                    width: comp.available ? `${comp.score}%` : '40%',
                    background: comp.available ? scoreColor : '#9ca3af',
                    opacity: comp.available ? 1 : 0.4,
                  }}
                />
              </div>
              <span className="readiness-component-score" style={{ color: comp.available ? 'inherit' : '#9ca3af' }}>
                {comp.available ? comp.score : '—'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="readiness-stats">
        <span>Sessions (7d): <strong>{readiness.session_count_7d}</strong></span>
        <span>Volume (7d): <strong>{readiness.workout_load_7d_kg.toFixed(0)} kg</strong></span>
        <span>Rest streak: <strong>{readiness.rest_days_streak}d</strong></span>
      </div>
    </div>
  )
}

// ── Client-side muscle inference (mirrors backend EXERCISE_MUSCLE_MAP) ────────

const CLIENT_MUSCLE_MAP: [string, { primary: string; secondary: string[] }][] = [
  ['bench press',      { primary: 'chest',      secondary: ['triceps', 'shoulders'] }],
  ['chest press',      { primary: 'chest',      secondary: ['triceps'] }],
  ['chest fly',        { primary: 'chest',      secondary: [] }],
  ['cable fly',        { primary: 'chest',      secondary: [] }],
  ['push up',          { primary: 'chest',      secondary: ['triceps', 'shoulders'] }],
  ['lat pulldown',     { primary: 'back',       secondary: ['biceps'] }],
  ['pull up',          { primary: 'back',       secondary: ['biceps'] }],
  ['pull-up',          { primary: 'back',       secondary: ['biceps'] }],
  ['chin up',          { primary: 'back',       secondary: ['biceps'] }],
  ['cable row',        { primary: 'back',       secondary: ['biceps'] }],
  ['seated row',       { primary: 'back',       secondary: ['biceps'] }],
  ['face pull',        { primary: 'back',       secondary: ['shoulders'] }],
  ['deadlift',         { primary: 'back',       secondary: ['glutes', 'hamstrings'] }],
  ['overhead press',   { primary: 'shoulders',  secondary: ['triceps'] }],
  ['shoulder press',   { primary: 'shoulders',  secondary: ['triceps'] }],
  ['lateral raise',    { primary: 'shoulders',  secondary: [] }],
  ['front raise',      { primary: 'shoulders',  secondary: [] }],
  ['shrug',            { primary: 'shoulders',  secondary: [] }],
  ['bicep curl',       { primary: 'biceps',     secondary: [] }],
  ['hammer curl',      { primary: 'biceps',     secondary: [] }],
  ['preacher curl',    { primary: 'biceps',     secondary: [] }],
  ['skull crusher',    { primary: 'triceps',    secondary: [] }],
  ['tricep pushdown',  { primary: 'triceps',    secondary: [] }],
  ['triceps pushdown', { primary: 'triceps',    secondary: [] }],
  ['dip',              { primary: 'triceps',    secondary: ['chest'] }],
  ['tricep',           { primary: 'triceps',    secondary: [] }],
  ['plank',            { primary: 'core',       secondary: [] }],
  ['crunch',           { primary: 'core',       secondary: [] }],
  ['sit up',           { primary: 'core',       secondary: [] }],
  ['leg raise',        { primary: 'core',       secondary: [] }],
  ['hip thrust',       { primary: 'glutes',     secondary: ['hamstrings'] }],
  ['glute bridge',     { primary: 'glutes',     secondary: [] }],
  ['rdl',              { primary: 'hamstrings', secondary: ['glutes'] }],
  ['romanian',         { primary: 'hamstrings', secondary: ['glutes'] }],
  ['squat',            { primary: 'quads',      secondary: ['glutes', 'hamstrings'] }],
  ['leg press',        { primary: 'quads',      secondary: ['glutes'] }],
  ['lunge',            { primary: 'quads',      secondary: ['glutes'] }],
  ['leg extension',    { primary: 'quads',      secondary: [] }],
  ['leg curl',         { primary: 'hamstrings', secondary: [] }],
  ['calf raise',       { primary: 'calves',     secondary: [] }],
  ['curl',             { primary: 'biceps',     secondary: [] }],
  ['calf',             { primary: 'calves',     secondary: [] }],
]

const ALL_MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'glutes', 'quads', 'hamstrings', 'calves']
const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', core: 'Core', glutes: 'Glutes', quads: 'Quads',
  hamstrings: 'Hamstrings', calves: 'Calves',
}

function inferMuscles(name: string): { primary: string; secondary: string[] } {
  const lower = name.toLowerCase()
  for (const [keyword, muscles] of CLIENT_MUSCLE_MAP) {
    if (lower.includes(keyword)) return muscles
  }
  return { primary: '', secondary: [] }
}

const STATUS_COLOR: Record<MuscleActivation['status'], string> = {
  fresh:     '#16a34a',
  recovering:'#f59e0b',
  ready:     '#3b82f6',
  untrained: '#94a3b8',
}

// ── Section B-extra: Muscle Map ───────────────────────────────────────────────

export function MuscleMapSection({ activation }: { activation: MuscleActivation[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const byMuscle: Record<string, MuscleActivation> = {}
  for (const a of activation) byMuscle[a.muscle] = a

  function getColor(muscle: string) {
    const a = byMuscle[muscle]
    return a ? STATUS_COLOR[a.status] : STATUS_COLOR.untrained
  }

  const hoveredData = hovered ? byMuscle[hovered] : null

  // Helper: returns common props for every muscle <path>
  function rg(muscle: string) {
    const color = getColor(muscle)
    const isUntrained = !byMuscle[muscle]
    return {
      fill: color,
      fillOpacity: isUntrained ? 0.55 : 0.88,
      stroke: isUntrained ? '#64748b' : color,
      strokeOpacity: isUntrained ? 0.7 : 0.45,
      strokeWidth: isUntrained ? 1.0 : 0.6,
      className: 'muscle-region',
      onMouseEnter: () => setHovered(muscle),
      onMouseLeave: () => setHovered(null),
    }
  }

  // Shared silhouette style — warm-toned to match the app palette
  const SIL = { fill: '#e2d9cc', stroke: '#c8bfb2', strokeWidth: 0.8 as number }

  // ── Front view ─────────────────────────────────────────────────────────────
  // viewBox "0 0 160 340" — anatomical paths, center x=80
  function FrontBody() {
    return (
      <svg viewBox="0 0 160 340" className="muscle-body-svg" aria-label="Front body">
        {/* ── Silhouette ── */}
        {/* Head */}
        <ellipse cx="80" cy="24" rx="20" ry="22" {...SIL}/>
        {/* Neck */}
        <path d="M 74,43 L 74,58 C 77,61 83,61 86,58 L 86,43 Z" {...SIL}/>
        {/* Torso */}
        <path d="M 30,60 C 20,66 16,83 16,107 C 16,129 20,149 26,163 L 134,163 C 140,149 144,129 144,107 C 144,83 140,66 130,60 C 114,54 98,52 80,52 C 62,52 46,54 30,60 Z" {...SIL}/>
        {/* Left upper arm */}
        <path d="M 14,65 C 6,76 4,103 8,127 C 10,139 18,144 26,142 L 28,63 Z" {...SIL}/>
        {/* Right upper arm */}
        <path d="M 146,65 C 154,76 156,103 152,127 C 150,139 142,144 134,142 L 132,63 Z" {...SIL}/>
        {/* Left forearm */}
        <path d="M 6,129 C 4,143 6,166 10,178 C 14,186 22,189 28,187 L 28,141 Z" {...SIL}/>
        {/* Right forearm */}
        <path d="M 154,129 C 156,143 154,166 150,178 C 146,186 138,189 132,187 L 132,141 Z" {...SIL}/>
        {/* Left thigh */}
        <path d="M 26,165 C 22,183 20,219 22,248 C 24,260 32,266 44,264 C 56,262 60,252 62,240 L 64,165 Z" {...SIL}/>
        {/* Right thigh */}
        <path d="M 134,165 C 138,183 140,219 138,248 C 136,260 128,266 116,264 C 104,262 100,252 98,240 L 96,165 Z" {...SIL}/>
        {/* Left shin */}
        <path d="M 22,250 C 20,264 22,293 26,307 C 30,317 38,321 48,319 C 58,317 62,309 60,296 L 60,246 Z" {...SIL}/>
        {/* Right shin */}
        <path d="M 138,250 C 140,264 138,293 134,307 C 130,317 122,321 112,319 C 102,317 98,309 100,296 L 100,246 Z" {...SIL}/>

        {/* ── Muscle regions ── */}
        {/* Chest — left pec */}
        <path d="M 80,64 C 66,62 46,66 36,77 C 28,87 30,103 40,110 C 48,116 62,114 72,109 C 78,105 80,97 80,85 Z" {...rg('chest')}/>
        {/* Chest — right pec */}
        <path d="M 80,64 C 94,62 114,66 124,77 C 132,87 130,103 120,110 C 112,116 98,114 88,109 C 82,105 80,97 80,85 Z" {...rg('chest')}/>
        {/* Chest centre line */}
        <line x1="80" y1="65" x2="80" y2="109" stroke={getColor('chest')} strokeOpacity="0.4" strokeWidth="0.8" style={{ pointerEvents: 'none' }}/>

        {/* Shoulders — left anterior delt */}
        <path d="M 28,63 C 15,69 9,84 13,98 C 17,108 28,110 36,102 C 40,95 40,79 34,69 Z" {...rg('shoulders')}/>
        {/* Shoulders — right anterior delt */}
        <path d="M 132,63 C 145,69 151,84 147,98 C 143,108 132,110 124,102 C 120,95 120,79 126,69 Z" {...rg('shoulders')}/>

        {/* Biceps — left */}
        <path d="M 8,99 C 4,113 4,130 8,142 C 12,150 22,152 28,145 C 34,138 34,121 30,108 C 26,98 16,92 8,99 Z" {...rg('biceps')}/>
        {/* Biceps — right */}
        <path d="M 152,99 C 156,113 156,130 152,142 C 148,150 138,152 132,145 C 126,138 126,121 130,108 C 134,98 144,92 152,99 Z" {...rg('biceps')}/>

        {/* Core — abs block */}
        <path d="M 46,112 C 43,126 43,143 46,159 L 114,159 C 117,143 117,126 114,112 Z" {...rg('core')}/>
        {/* Abs detail: vertical centre */}
        <line x1="80" y1="113" x2="80" y2="158" stroke={getColor('core')} strokeOpacity="0.45" strokeWidth="0.9" style={{ pointerEvents: 'none' }}/>
        {/* Abs detail: horizontal dividers */}
        <line x1="46" y1="124" x2="114" y2="124" stroke={getColor('core')} strokeOpacity="0.35" strokeWidth="0.7" style={{ pointerEvents: 'none' }}/>
        <line x1="46" y1="136" x2="114" y2="136" stroke={getColor('core')} strokeOpacity="0.35" strokeWidth="0.7" style={{ pointerEvents: 'none' }}/>
        <line x1="46" y1="148" x2="114" y2="148" stroke={getColor('core')} strokeOpacity="0.35" strokeWidth="0.7" style={{ pointerEvents: 'none' }}/>

        {/* Quads — left */}
        <path d="M 28,167 C 24,185 22,220 24,249 C 26,261 34,267 44,265 C 54,263 58,253 60,241 L 62,167 Z" {...rg('quads')}/>
        {/* Quads — right */}
        <path d="M 132,167 C 136,185 138,220 136,249 C 134,261 126,267 116,265 C 106,263 102,253 100,241 L 98,167 Z" {...rg('quads')}/>

        <text x="80" y="336" textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="system-ui, sans-serif" letterSpacing="1">FRONT</text>
      </svg>
    )
  }

  // ── Back view ──────────────────────────────────────────────────────────────
  function BackBody() {
    return (
      <svg viewBox="0 0 160 340" className="muscle-body-svg" aria-label="Back body">
        {/* ── Silhouette ── */}
        <ellipse cx="80" cy="24" rx="20" ry="22" {...SIL}/>
        <path d="M 74,43 L 74,58 C 77,61 83,61 86,58 L 86,43 Z" {...SIL}/>
        <path d="M 30,60 C 20,66 16,83 16,107 C 16,129 20,149 26,163 L 134,163 C 140,149 144,129 144,107 C 144,83 140,66 130,60 C 114,54 98,52 80,52 C 62,52 46,54 30,60 Z" {...SIL}/>
        <path d="M 14,65 C 6,76 4,103 8,127 C 10,139 18,144 26,142 L 28,63 Z" {...SIL}/>
        <path d="M 146,65 C 154,76 156,103 152,127 C 150,139 142,144 134,142 L 132,63 Z" {...SIL}/>
        <path d="M 6,129 C 4,143 6,166 10,178 C 14,186 22,189 28,187 L 28,141 Z" {...SIL}/>
        <path d="M 154,129 C 156,143 154,166 150,178 C 146,186 138,189 132,187 L 132,141 Z" {...SIL}/>
        <path d="M 26,165 C 22,183 20,219 22,248 C 24,260 32,266 44,264 C 56,262 60,252 62,240 L 64,165 Z" {...SIL}/>
        <path d="M 134,165 C 138,183 140,219 138,248 C 136,260 128,266 116,264 C 104,262 100,252 98,240 L 96,165 Z" {...SIL}/>
        <path d="M 22,250 C 20,264 22,293 26,307 C 30,317 38,321 48,319 C 58,317 62,309 60,296 L 60,246 Z" {...SIL}/>
        <path d="M 138,250 C 140,264 138,293 134,307 C 130,317 122,321 112,319 C 102,317 98,309 100,296 L 100,246 Z" {...SIL}/>

        {/* ── Muscle regions ── */}
        {/* Back — traps + lats (full torso back) */}
        <path d="M 32,63 C 22,69 18,86 18,110 C 20,134 24,152 28,163 L 132,163 C 136,152 140,134 142,110 C 142,86 138,69 128,63 C 112,57 96,55 80,55 C 64,55 48,57 32,63 Z" {...rg('back')}/>
        {/* Back — spine groove */}
        <line x1="80" y1="64" x2="80" y2="162" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" style={{ pointerEvents: 'none' }}/>

        {/* Rear shoulders — left posterior delt (on top of back edge) */}
        <path d="M 28,63 C 15,69 9,84 13,98 C 17,108 28,110 36,102 C 40,95 40,79 34,69 Z" {...rg('shoulders')}/>
        {/* Rear shoulders — right posterior delt */}
        <path d="M 132,63 C 145,69 151,84 147,98 C 143,108 132,110 124,102 C 120,95 120,79 126,69 Z" {...rg('shoulders')}/>

        {/* Triceps — left (back of upper arm) */}
        <path d="M 8,99 C 4,113 4,130 8,142 C 12,150 22,152 28,145 C 34,138 34,121 30,108 C 26,98 16,92 8,99 Z" {...rg('triceps')}/>
        {/* Triceps — right */}
        <path d="M 152,99 C 156,113 156,130 152,142 C 148,150 138,152 132,145 C 126,138 126,121 130,108 C 134,98 144,92 152,99 Z" {...rg('triceps')}/>

        {/* Glutes — wide rounded band at top of legs */}
        <path d="M 28,165 C 22,177 20,196 26,212 C 32,224 46,230 62,228 C 70,226 78,224 80,222 C 82,224 90,226 98,228 C 114,230 128,224 134,212 C 140,196 138,177 132,165 Z" {...rg('glutes')}/>

        {/* Hamstrings — left */}
        <path d="M 28,224 C 24,238 22,257 24,270 C 26,282 34,287 44,285 C 54,283 58,273 60,261 L 62,224 Z" {...rg('hamstrings')}/>
        {/* Hamstrings — right */}
        <path d="M 132,224 C 136,238 138,257 136,270 C 134,282 126,287 116,285 C 106,283 102,273 100,261 L 98,224 Z" {...rg('hamstrings')}/>

        {/* Calves — left (medial gastrocnemius shape) */}
        <path d="M 24,272 C 20,284 22,303 26,315 C 30,323 38,326 48,324 C 56,322 60,314 58,302 L 58,268 Z" {...rg('calves')}/>
        {/* Calves — right */}
        <path d="M 136,272 C 140,284 138,303 134,315 C 130,323 122,326 112,324 C 104,322 100,314 102,302 L 102,268 Z" {...rg('calves')}/>

        <text x="80" y="336" textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="system-ui, sans-serif" letterSpacing="1">BACK</text>
      </svg>
    )
  }

  return (
    <div className="muscle-map-section">
      {/* Inline hover info panel */}
      <div className="muscle-info-panel">
        {hovered ? (
          <div className="muscle-info-content">
            <span className="muscle-info-name">{MUSCLE_LABELS[hovered]}</span>
            <span className="muscle-status-badge" style={{
              background: STATUS_COLOR[hoveredData?.status ?? 'untrained'] + '22',
              color: STATUS_COLOR[hoveredData?.status ?? 'untrained'],
              border: `1px solid ${STATUS_COLOR[hoveredData?.status ?? 'untrained']}55`,
            }}>
              {hoveredData?.status ?? 'untrained'}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {hoveredData?.last_trained
                ? `Last: ${hoveredData.last_trained}${hoveredData.sets_7d > 0 ? ` · ${hoveredData.sets_7d} sets this week` : ''}`
                : 'Never trained'}
            </span>
          </div>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>Hover a region to inspect a muscle</span>
        )}
      </div>

      {/* SVG bodies */}
      <div className="muscle-bodies-row">
        <div className="muscle-body-wrap">
          <p className="muscle-body-label">Front</p>
          <FrontBody />
        </div>
        <div className="muscle-body-wrap">
          <p className="muscle-body-label">Back</p>
          <BackBody />
        </div>
      </div>

      {/* Legend */}
      <div className="muscle-legend">
        <div className="muscle-legend-key-row">
          {(['fresh', 'recovering', 'ready', 'untrained'] as const).map(s => (
            <span key={s} className="muscle-status-badge" style={{ background: STATUS_COLOR[s] + '22', color: STATUS_COLOR[s], border: `1px solid ${STATUS_COLOR[s]}55` }}>
              {s === 'fresh' ? '● Trained (0–3d)' : s === 'recovering' ? '● Recovering (4–7d)' : s === 'ready' ? '● Ready (8–14d)' : '● Untrained'}
            </span>
          ))}
        </div>
        <div className="muscle-legend-grid">
          {ALL_MUSCLES.map(m => {
            const a = byMuscle[m]
            const status = a?.status ?? 'untrained'
            return (
              <div key={m} className="muscle-legend-row">
                <span className="muscle-legend-dot" style={{ background: STATUS_COLOR[status] }} />
                <span className="muscle-legend-name">{MUSCLE_LABELS[m]}</span>
                <span className="muscle-legend-detail muted">
                  {a?.last_trained
                    ? `${a.last_trained}${a.sets_7d > 0 ? ` · ${a.sets_7d} sets` : ''}`
                    : 'Never'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Section C: Workout Logger ─────────────────────────────────────────────────

function WorkoutLogger({ sessions, today, onSessionCreated }: {
  sessions: WorkoutSession[]
  today: string
  onSessionCreated: () => void
}) {
  const qc = useQueryClient()
  const [creatingSession, setCreatingSession] = useState(false)
  const [sessionForm, setSessionForm] = useState({ date: today, session_type: 'strength' as WorkoutSession['session_type'], title: '', duration_mins: '' })
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [addingExercise, setAddingExercise] = useState<string | null>(null)
  const [exerciseForm, setExerciseForm] = useState({ name: '', category: 'compound' as WorkoutExercise['category'], primary_muscle: '', secondary_muscles: [] as string[] })
  const [addingSet, setAddingSet] = useState<string | null>(null)
  const [setForm, setSetForm] = useState({ reps: '', weight_kg: '' })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['health-overview'] })
    qc.invalidateQueries({ queryKey: ['workout-sessions'] })
    onSessionCreated()
  }

  const createSessionMut = useMutation({
    mutationFn: createWorkoutSession,
    onSuccess: () => { invalidate(); setCreatingSession(false); setSessionForm({ date: today, session_type: 'strength', title: '', duration_mins: '' }) },
  })

  const deleteSessionMut = useMutation({ mutationFn: deleteWorkoutSession, onSuccess: invalidate })
  const createExerciseMut = useMutation({
    mutationFn: createWorkoutExercise,
    onSuccess: () => { invalidate(); setAddingExercise(null); setExerciseForm({ name: '', category: 'compound', primary_muscle: '', secondary_muscles: [] }) },
  })
  const deleteExerciseMut = useMutation({ mutationFn: deleteWorkoutExercise, onSuccess: invalidate })
  const createSetMut = useMutation({
    mutationFn: createSetLog,
    onSuccess: () => { invalidate(); setAddingSet(null); setSetForm({ reps: '', weight_kg: '' }) },
  })
  const deleteSetMut = useMutation({ mutationFn: deleteSetLog, onSuccess: invalidate })

  return (
    <div className="workout-logger">
      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="workout-sessions-list">
          {sessions.map(session => {
            const totalVolume = session.exercises.reduce((acc, ex) =>
              acc + ex.sets.reduce((s, set) => s + (set.weight_kg ? parseFloat(set.weight_kg) * (set.reps ?? 1) : 0), 0), 0)
            const isExpanded = expandedSession === session.id
            return (
              <div key={session.id} className="workout-session-card">
                <div className="workout-session-header" onClick={() => setExpandedSession(isExpanded ? null : session.id)}>
                  <div className="workout-session-meta">
                    <span className="workout-session-date">{session.date}</span>
                    <span className="workout-session-type-badge">{session.session_type}</span>
                    {session.title && <span className="workout-session-title">{session.title}</span>}
                  </div>
                  <div className="workout-session-stats">
                    {totalVolume > 0 && <span className="muted" style={{ fontSize: 12 }}>{totalVolume.toFixed(0)} kg total</span>}
                    <span className="muted" style={{ fontSize: 12 }}>{session.exercises.length} ex</span>
                    {session.duration_mins && <span className="muted" style={{ fontSize: 12 }}>{session.duration_mins}m</span>}
                    <span className="workout-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="workout-session-body">
                    {session.exercises.map(ex => (
                      <div key={ex.id} className="workout-exercise-block">
                        <div className="workout-exercise-header">
                          <span className="workout-exercise-name">{ex.name}</span>
                          <span className="workout-exercise-cat muted" style={{ fontSize: 11 }}>{ex.category}</span>
                          <button className="btn-ghost-sm" style={{ color: '#dc2626', fontSize: 11 }} onClick={() => deleteExerciseMut.mutate(ex.id)}>✕</button>
                        </div>
                        {ex.sets.length > 0 && (
                          <table className="workout-sets-table">
                            <thead><tr><th>Set</th><th>Reps</th><th>kg</th><th></th></tr></thead>
                            <tbody>
                              {ex.sets.map(set => (
                                <tr key={set.id}>
                                  <td className="muted">{set.set_number}</td>
                                  <td>{set.reps ?? '—'}</td>
                                  <td>{set.weight_kg ?? '—'}</td>
                                  <td><button className="btn-ghost-sm" style={{ color: '#dc2626', fontSize: 11 }} onClick={() => deleteSetMut.mutate(set.id)}>✕</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {addingSet === ex.id ? (
                          <div className="workout-add-set-form">
                            <input type="number" placeholder="Reps" value={setForm.reps} onChange={e => setSetForm(f => ({ ...f, reps: e.target.value }))} className="workout-input-sm" style={{ width: 60 }} />
                            <input type="number" placeholder="kg" value={setForm.weight_kg} onChange={e => setSetForm(f => ({ ...f, weight_kg: e.target.value }))} className="workout-input-sm" style={{ width: 60 }} />
                            <button className="btn-sm" onClick={() => {
                              createSetMut.mutate({
                                exercise: ex.id,
                                set_number: ex.sets.length + 1,
                                reps: setForm.reps ? parseInt(setForm.reps) : null,
                                weight_kg: setForm.weight_kg || null,
                              })
                            }} disabled={createSetMut.isPending}>✓</button>
                            <button className="btn-ghost-sm" onClick={() => setAddingSet(null)}>✕</button>
                          </div>
                        ) : (
                          <button className="btn-ghost-sm" style={{ fontSize: 12, marginTop: 4 }} onClick={() => { setAddingSet(ex.id); setSetForm({ reps: '', weight_kg: '' }) }}>+ Add set</button>
                        )}
                      </div>
                    ))}

                    {addingExercise === session.id ? (
                      <div className="workout-add-exercise-form">
                        <div className="workout-form-row" style={{ gap: 6 }}>
                          <input
                            type="text" placeholder="Exercise name" value={exerciseForm.name}
                            onChange={e => {
                              const name = e.target.value
                              const detected = inferMuscles(name)
                              setExerciseForm(f => ({ ...f, name, primary_muscle: detected.primary, secondary_muscles: detected.secondary }))
                            }}
                            className="workout-input" style={{ flex: 1 }}
                          />
                          <select value={exerciseForm.category} onChange={e => setExerciseForm(f => ({ ...f, category: e.target.value as WorkoutExercise['category'] }))} className="workout-select">
                            <option value="compound">Compound</option>
                            <option value="isolation">Isolation</option>
                            <option value="cardio">Cardio</option>
                            <option value="flexibility">Flexibility</option>
                          </select>
                        </div>
                        {/* Muscle detection row */}
                        <div className="workout-muscle-detect-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Primary</label>
                            <select
                              value={exerciseForm.primary_muscle}
                              onChange={e => setExerciseForm(f => ({ ...f, primary_muscle: e.target.value }))}
                              className="workout-select"
                              style={{ fontSize: 12 }}
                            >
                              <option value="">— auto-detect —</option>
                              {ALL_MUSCLES.map(m => <option key={m} value={m}>{MUSCLE_LABELS[m]}</option>)}
                            </select>
                            {exerciseForm.primary_muscle && (
                              <span className="muscle-auto-badge" style={{ background: STATUS_COLOR.untrained + '44', fontSize: 11, padding: '2px 7px', borderRadius: 99 }}>
                                {exerciseForm.name && inferMuscles(exerciseForm.name).primary === exerciseForm.primary_muscle ? '✓ auto' : 'manual'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button className="btn-sm" onClick={() => createExerciseMut.mutate({
                            session: session.id,
                            name: exerciseForm.name,
                            category: exerciseForm.category,
                            order: session.exercises.length,
                            ...(exerciseForm.primary_muscle && { primary_muscle: exerciseForm.primary_muscle }),
                            ...(exerciseForm.secondary_muscles.length && { secondary_muscles: exerciseForm.secondary_muscles }),
                          })} disabled={!exerciseForm.name.trim() || createExerciseMut.isPending}>Add exercise</button>
                          <button className="btn-ghost-sm" onClick={() => setAddingExercise(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-ghost-sm" style={{ marginTop: 6 }} onClick={() => { setAddingExercise(session.id); setExerciseForm({ name: '', category: 'compound', primary_muscle: '', secondary_muscles: [] }) }}>+ Add exercise</button>
                    )}

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn-ghost-sm" style={{ color: '#dc2626' }} onClick={() => { if (confirm('Delete this session?')) deleteSessionMut.mutate(session.id) }}>Delete session</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New session form */}
      {creatingSession ? (
        <div className="workout-new-session-form">
          <div className="workout-form-row">
            <input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} className="workout-input" />
            <select value={sessionForm.session_type} onChange={e => setSessionForm(f => ({ ...f, session_type: e.target.value as WorkoutSession['session_type'] }))} className="workout-select">
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="swimming">Swimming</option>
              <option value="yoga">Yoga</option>
              <option value="other">Other</option>
            </select>
            <input type="text" placeholder="Title (optional)" value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} className="workout-input" />
            <input type="number" placeholder="Duration (min)" value={sessionForm.duration_mins} onChange={e => setSessionForm(f => ({ ...f, duration_mins: e.target.value }))} className="workout-input" style={{ width: 120 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-sm" onClick={() => createSessionMut.mutate({ date: sessionForm.date, session_type: sessionForm.session_type, title: sessionForm.title || undefined, duration_mins: sessionForm.duration_mins ? parseInt(sessionForm.duration_mins) : null })} disabled={createSessionMut.isPending}>
              {createSessionMut.isPending ? 'Creating…' : 'Create session'}
            </button>
            <button className="btn-ghost-sm" onClick={() => setCreatingSession(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-sm" style={{ marginTop: sessions.length > 0 ? 12 : 0 }} onClick={() => setCreatingSession(true)}>+ Log workout</button>
      )}
    </div>
  )
}

// ── Section D: Body Composition ───────────────────────────────────────────────

function BodyCompositionSection({ latest }: { latest: BodyCompositionLog | null }) {
  const qc = useQueryClient()
  const { data: logs } = useQuery({ queryKey: ['body-composition'], queryFn: listBodyCompositionLogs })
  const [form, setForm] = useState<Partial<BodyCompositionLogPayload>>({ source: 'inbody' })
  const [showForm, setShowForm] = useState(false)

  const createMut = useMutation({
    mutationFn: createBodyCompositionLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-composition'] })
      qc.invalidateQueries({ queryKey: ['health-overview'] })
      setShowForm(false)
      setForm({ source: 'inbody' })
    },
  })

  // Build sparkline from last 8 scans
  const scans = (logs ?? []).slice(0, 8).reverse()
  const fatVals = scans.map(s => s.body_fat_pct ? parseFloat(s.body_fat_pct) : null)
  const muscleVals = scans.map(s => s.muscle_mass_kg ? parseFloat(s.muscle_mass_kg) : null)
  const hasFatData = fatVals.some(v => v != null)
  const hasMuscleData = muscleVals.some(v => v != null)

  function MiniLine({ values, color, max }: { values: (number | null)[]; color: string; max: number }) {
    const pts = values.map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100
      const y = v != null ? 100 - Math.min(100, (v / max) * 100) : null
      return y != null ? `${x},${y}` : null
    }).filter(Boolean)
    if (pts.length < 2) return <span className="muted" style={{ fontSize: 12 }}>—</span>
    return (
      <svg viewBox="0 0 100 40" style={{ width: 80, height: 28 }}>
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => {
          const x = (i / Math.max(values.length - 1, 1)) * 100
          const y = v != null ? 100 - Math.min(100, (v / max) * 100) : null
          return y != null ? <circle key={i} cx={x} cy={y} r="2.5" fill={color} /> : null
        })}
      </svg>
    )
  }

  // Fat/muscle trend arrows
  function trendArrow(trend?: string) {
    if (!trend || trend === 'insufficient_data') return null
    if (trend === 'improving') return <span style={{ color: '#16a34a' }}>↑</span>
    if (trend === 'worsening') return <span style={{ color: '#dc2626' }}>↑</span>
    return <span style={{ color: '#f59e0b' }}>→</span>
  }

  return (
    <div className="body-comp-section">
      {latest ? (
        <div className="body-comp-strip">
          {latest.body_fat_pct && <div className="body-comp-metric"><strong>{latest.body_fat_pct}%</strong><p className="muted">Body fat</p></div>}
          {latest.muscle_mass_kg && <div className="body-comp-metric"><strong>{latest.muscle_mass_kg} kg</strong><p className="muted">Muscle</p></div>}
          {latest.lean_mass_kg && <div className="body-comp-metric"><strong>{latest.lean_mass_kg} kg</strong><p className="muted">Lean mass</p></div>}
          {latest.visceral_fat_level != null && <div className="body-comp-metric"><strong>{latest.visceral_fat_level}</strong><p className="muted">Visceral fat</p></div>}
          {latest.metabolic_age != null && <div className="body-comp-metric"><strong>{latest.metabolic_age}</strong><p className="muted">Metabolic age</p></div>}
          <div className="body-comp-metric"><strong>{latest.weight_kg} kg</strong><p className="muted">Weight</p><span className="muted" style={{ fontSize: 11 }}>{latest.date}</span></div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>No InBody scan data yet. Log your first scan below.</p>
      )}

      {scans.length >= 2 && (
        <div className="body-comp-trends">
          {hasFatData && (
            <div className="body-comp-trend-item">
              <span className="muted" style={{ fontSize: 12 }}>Fat % trend {trendArrow('improving')}</span>
              <MiniLine values={fatVals} color="#f59e0b" max={40} />
            </div>
          )}
          {hasMuscleData && (
            <div className="body-comp-trend-item">
              <span className="muted" style={{ fontSize: 12 }}>Muscle kg trend</span>
              <MiniLine values={muscleVals} color="#3b82f6" max={80} />
            </div>
          )}
        </div>
      )}

      <CollapsibleSection title="Log InBody scan" storageKey="body-comp-form" defaultOpen={showForm}>
        <div className="body-comp-form">
          <div className="body-comp-form-row">
            <label>Date<input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="workout-input" /></label>
            <label>Weight (kg)<input type="number" step="0.1" value={form.weight_kg ?? ''} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} className="workout-input" /></label>
            <label>Body fat %<input type="number" step="0.1" value={form.body_fat_pct ?? ''} onChange={e => setForm(f => ({ ...f, body_fat_pct: e.target.value }))} className="workout-input" /></label>
            <label>Muscle (kg)<input type="number" step="0.1" value={form.muscle_mass_kg ?? ''} onChange={e => setForm(f => ({ ...f, muscle_mass_kg: e.target.value }))} className="workout-input" /></label>
            <label>Fat mass (kg)<input type="number" step="0.1" value={form.fat_mass_kg ?? ''} onChange={e => setForm(f => ({ ...f, fat_mass_kg: e.target.value }))} className="workout-input" /></label>
            <label>Visceral fat<input type="number" value={form.visceral_fat_level ?? ''} onChange={e => setForm(f => ({ ...f, visceral_fat_level: e.target.value ? parseInt(e.target.value) : null }))} className="workout-input" /></label>
            <label>Metabolic age<input type="number" value={form.metabolic_age ?? ''} onChange={e => setForm(f => ({ ...f, metabolic_age: e.target.value ? parseInt(e.target.value) : null }))} className="workout-input" /></label>
            <label>BMI<input type="number" step="0.1" value={form.bmi ?? ''} onChange={e => setForm(f => ({ ...f, bmi: e.target.value }))} className="workout-input" /></label>
            <label>Source
              <select value={form.source ?? 'inbody'} onChange={e => setForm(f => ({ ...f, source: e.target.value as BodyCompositionLogPayload['source'] }))} className="workout-select">
                <option value="inbody">InBody scan</option>
                <option value="manual">Manual</option>
                <option value="estimate">Estimate</option>
              </select>
            </label>
          </div>
          <button className="btn-sm" style={{ marginTop: 10 }} onClick={() => { if (form.date && form.weight_kg) createMut.mutate(form as BodyCompositionLogPayload) }} disabled={!form.date || !form.weight_kg || createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Save scan'}
          </button>
        </div>
      </CollapsibleSection>
    </div>
  )
}

// ── Section E: Strength Trends ────────────────────────────────────────────────

function StrengthTrends({ sessions }: { sessions: WorkoutSession[] }) {
  const exerciseNames = Array.from(new Set(sessions.flatMap(s => s.exercises.map(e => e.name)))).sort()
  const [selected, setSelected] = useState<string>(exerciseNames[0] ?? '')
  const [customName, setCustomName] = useState('')

  const queryName = customName.trim() || selected
  const { data: history, isFetching } = useQuery<StrengthHistoryPayload>({
    queryKey: ['strength-history', queryName],
    queryFn: () => getStrengthHistory(queryName, 8),
    enabled: !!queryName,
  })

  function E1rmChart({ data }: { data: StrengthHistoryPayload }) {
    if (!data.estimated_1rm_over_time.length) return <p className="muted" style={{ fontSize: 13 }}>No sets logged yet.</p>
    const pts = data.estimated_1rm_over_time
    const maxE1rm = Math.max(...pts.map(p => p.e1rm))
    const W = 220; const H = 100; const PAD = 12
    const scaleX = (i: number) => PAD + (i / Math.max(pts.length - 1, 1)) * (W - PAD * 2)
    const scaleY = (v: number) => H - PAD - ((v / (maxE1rm * 1.1)) * (H - PAD * 2))
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.e1rm)}`).join(' ')
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: H }}>
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(p.e1rm)} r="3" fill="#6366f1" />
            <title>{p.date}: {p.e1rm.toFixed(1)} kg e1RM</title>
          </g>
        ))}
        <text x={PAD} y={PAD} fontSize="9" fill="#9ca3af">{maxE1rm.toFixed(0)} kg</text>
      </svg>
    )
  }

  function VolumeChart({ data }: { data: StrengthHistoryPayload }) {
    if (!data.weekly_volume.length) return <p className="muted" style={{ fontSize: 13 }}>No volume data yet.</p>
    const vols = data.weekly_volume
    const maxVol = Math.max(...vols.map(v => v.total_kg))
    const W = 220; const H = 80; const PAD = 12
    const barW = Math.floor((W - PAD * 2) / vols.length) - 3
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: H }}>
        {vols.map((v, i) => {
          const barH = Math.max(3, ((v.total_kg / (maxVol || 1)) * (H - PAD * 2)))
          const x = PAD + i * (barW + 3)
          const y = H - PAD - barH
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill="#6366f1" rx="2" opacity="0.7">
                <title>{v.week}: {v.total_kg.toFixed(0)} kg</title>
              </rect>
            </g>
          )
        })}
        <text x={PAD} y={10} fontSize="9" fill="#9ca3af">{maxVol.toFixed(0)} kg</text>
      </svg>
    )
  }

  return (
    <div className="strength-trends">
      <div className="strength-picker-row">
        {exerciseNames.length > 0 && (
          <select value={selected} onChange={e => { setSelected(e.target.value); setCustomName('') }} className="workout-select">
            {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
        <input type="text" placeholder="Search any exercise…" value={customName} onChange={e => setCustomName(e.target.value)} className="workout-input" style={{ flex: 1 }} />
      </div>

      {isFetching && <p className="muted" style={{ fontSize: 13 }}>Loading…</p>}

      {history && (
        <>
          {history.all_time_best && (
            <div className="strength-best-chip">
              Best: <strong>{history.all_time_best.weight_kg} kg × {history.all_time_best.reps} reps</strong> = {history.all_time_best.e1rm.toFixed(1)} kg e1RM <span className="muted">({history.all_time_best.date})</span>
            </div>
          )}
          <div className="strength-charts-row">
            <div className="strength-chart-block">
              <p className="eyebrow" style={{ marginBottom: 6 }}>Estimated 1RM over time</p>
              <E1rmChart data={history} />
            </div>
            <div className="strength-chart-block">
              <p className="eyebrow" style={{ marginBottom: 6 }}>Weekly volume (kg)</p>
              <VolumeChart data={history} />
            </div>
          </div>
        </>
      )}

      {!queryName && <p className="muted" style={{ fontSize: 13 }}>Select or type an exercise to see strength trends.</p>}
    </div>
  )
}

// ── Section F: AI Health Insights ─────────────────────────────────────────────

function HealthAIInsights() {
  const [result, setResult] = useState<HealthAIInsightsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analysisMut = useMutation({
    mutationFn: getHealthAIInsights,
    onSuccess: (data) => { setResult(data); setError(null) },
    onError: (err: Error) => setError(err.message),
  })

  const severityColor: Record<HealthAIInsight['severity'], string> = {
    positive: '#16a34a',
    neutral: '#6366f1',
    warning: '#dc2626',
  }

  return (
    <div className="ai-insights-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className="btn-sm" onClick={() => analysisMut.mutate()} disabled={analysisMut.isPending}>
          {analysisMut.isPending ? 'Analysing…' : '✦ Analyse this week'}
        </button>
        {analysisMut.isPending && <span className="muted" style={{ fontSize: 13 }}>Claude is reading your last 7 days…</span>}
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

      {result && (
        <>
          <div className="ai-insights-cards">
            {result.insights.map((insight, i) => (
              <div key={i} className="ai-insight-card" style={{ borderLeft: `3px solid ${severityColor[insight.severity]}` }}>
                <div className="ai-insight-header">
                  <span className="ai-insight-type-badge" style={{ background: severityColor[insight.severity] + '22', color: severityColor[insight.severity] }}>{insight.type}</span>
                  <span className="ai-insight-headline">{insight.headline}</span>
                </div>
                <p className="ai-insight-detail muted">{insight.detail}</p>
              </div>
            ))}
          </div>
          {result.week_summary && (
            <div className="ai-insights-summary">
              <p className="eyebrow" style={{ marginBottom: 4 }}>Week summary</p>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{result.week_summary}</p>
            </div>
          )}
          {result.suggested_focus && (
            <div className="ai-insights-focus">
              <p className="eyebrow" style={{ marginBottom: 4 }}>Suggested focus</p>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{result.suggested_focus}</p>
            </div>
          )}
        </>
      )}

      {!result && !analysisMut.isPending && (
        <p className="muted" style={{ fontSize: 13 }}>Analysis not yet run. Click the button when you want Claude to review your training, recovery, and body composition signals.</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function HealthBodyPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health-overview'],
    queryFn: getHealthOverview,
  })

  const [showEditForm, setShowEditForm] = useState(false)

  const updateGoalsMut = useMutation({
    mutationFn: updateHealthGoals,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-overview'] })
    },
  })

  const createMut = useMutation({
    mutationFn: createHealthLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-overview'] })
      qc.invalidateQueries({ queryKey: ['health-today'] })
      qc.invalidateQueries({ queryKey: ['health-logs'] })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<HealthLogPayload> }) => updateHealthLog(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-overview'] })
      qc.invalidateQueries({ queryKey: ['health-today'] })
      qc.invalidateQueries({ queryKey: ['health-logs'] })
      setShowEditForm(false)
    },
  })

  if (isLoading) return <PageSkeleton />
  if (isError || !data) return <section className="error-state">Could not load health data.</section>

  const s = data.summary
  const alerts = buildAlerts(s)
  const recentLogs = data.recent_health_logs ?? []
  const capacitySignals = data.capacity_signals ?? []
  const todayLog = data.today.health_log
  const today = data.date
  const readiness = data.readiness ?? null
  const bodyCompLatest = data.body_composition_latest ?? null
  const workoutSessions = data.recent_workout_sessions ?? []

  const lastExercise = recentLogs.find(l => l.exercise_done)
  const exerciseLabel = s.exercise_streak > 0 ? `${s.exercise_streak} days 🔥` : lastExercise ? `Last: ${lastExercise.date}` : 'None yet'

  const isSaving = createMut.isPending || updateMut.isPending
  const showForm = !s.health_logged_today || showEditForm

  return (
    <section className="page">
      {/* ── Health Signals — plain-English overview ── */}
      <HealthSignalsPanel direction={data.direction} />

      {/* ── Metric cards ── */}
      <div className="metric-grid">
        <MetricCard label="Avg sleep (7d)" value={`${s.avg_sleep_7d ?? 0} h`} />
        <MetricCard label="Avg mood (7d)" value={`${s.avg_mood_7d ?? 0} / 5`} />
        <MetricCard label="Habit completion" value={formatPercent(s.habit_completion_rate_7d ?? 0)} />
        <MetricCard label="Prayer completion" value={formatPercent(s.prayer_completion_rate_7d ?? 0)} />
        <MetricCard label="Exercise streak" value={exerciseLabel} tone={s.exercise_streak > 0 ? 'success' : 'default'} />
      </div>

      {alerts.length > 0 && (
        <div className="health-alerts-row">
          {alerts.map((a, i) => <AlertChip key={i} level={a.level} text={a.text} />)}
        </div>
      )}

      {/* ── 7-day trends + today's log ── */}
      <div className="two-column">
        <Panel title="7-day trends" description="Sleep, energy, and weight over the last week. Red bars = below threshold.">
          <SevenDayAverages s={s} logs={recentLogs} />
        </Panel>

        <div id="body-log-panel">
          <Panel title="Today's body log" description="Stay honest about what has been captured already.">
          {showForm ? (
            <>
              {showEditForm && s.health_logged_today && (
                <div style={{ marginBottom: 8 }}>
                  <button className="btn-ghost-sm" onClick={() => setShowEditForm(false)}>← Back to summary</button>
                </div>
              )}
              <CollapsibleSection title={showEditForm ? "Edit today's log" : "Log today's body data"} storageKey="body-log-form" defaultOpen={true}>
                <HealthLogForm
                  today={today}
                  initialValue={showEditForm ? todayLog : null}
                  isSubmitting={isSaving}
                  onSubmit={payload => {
                    if (showEditForm && todayLog) updateMut.mutate({ id: todayLog.id, payload })
                    else createMut.mutate(payload)
                  }}
                />
              </CollapsibleSection>
            </>
          ) : todayLog ? (
            <div>
              <div className="summary-strip">
                <div><strong>{parseFloat(todayLog.sleep_hours)}h</strong><p className="muted">Sleep</p></div>
                <div><strong>{todayLog.sleep_quality}/5</strong><p className="muted">Quality</p></div>
                <div><strong>{todayLog.energy_level}/5</strong><p className="muted">Energy</p></div>
                <div><strong>{todayLog.exercise_done ? (todayLog.exercise_type || 'Yes') : 'No'}</strong><p className="muted">Exercise</p></div>
                {todayLog.weight_kg && <div><strong>{todayLog.weight_kg} kg</strong><p className="muted">Weight</p></div>}
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn-ghost-sm" onClick={() => setShowEditForm(true)}>Edit log</button>
              </div>
            </div>
          ) : null}

          {capacitySignals.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Capacity signals</p>
              {capacitySignals.map((sig: string, i: number) => (
                <p key={i} className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>· {sig}</p>
              ))}
            </div>
          )}
          </Panel>
        </div>
      </div>

      {/* ── Section B: Readiness ── */}
      <Panel title="Readiness score" description="Composite recovery score based on HRV, sleep quality, resting heart rate, and mood.">
        <ReadinessWidget readiness={readiness} />
      </Panel>

      {/* ── Muscle map ── */}
      <Panel title="Muscle map" description="Hover a region to see training status. Green = trained this week, blue = ready, amber = recovering.">
        <MuscleMapSection activation={data.muscle_activation ?? []} />
      </Panel>

      {/* ── Section C: Workout Logger ── */}
      <div id="workout-logger-panel">
        <Panel title="Workout logger" description="Log sessions with exercises and sets. Volume and e1RM are tracked automatically.">
          <WorkoutLogger
            sessions={workoutSessions}
            today={today}
            onSessionCreated={() => qc.invalidateQueries({ queryKey: ['health-overview'] })}
          />
        </Panel>
      </div>

      {/* ── Section D: Body Composition ── */}
      <Panel title="Body composition" description="InBody scan data — fat %, muscle mass, visceral fat, metabolic age.">
        <BodyCompositionSection latest={bodyCompLatest} />
      </Panel>

      {/* ── Section E: Strength Trends ── */}
      {workoutSessions.length > 0 && (
        <Panel title="Strength trends" description="Estimated 1RM progression and weekly volume over 8 weeks.">
          <StrengthTrends sessions={workoutSessions} />
        </Panel>
      )}

      {/* ── Recent body logs table ── */}
      {recentLogs.length > 0 && (
        <Panel title="Recent body logs" description="Last 7 entries — sleep, energy, exercise, weight.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Sleep</th><th>Quality</th><th>Energy</th><th>Exercise</th><th>Duration</th><th>Weight</th></tr>
              </thead>
              <tbody>
                {recentLogs.map(log => (
                  <tr key={log.id}>
                    <td>{log.date}</td>
                    <td>{parseFloat(log.sleep_hours)}h</td>
                    <td>{log.sleep_quality}/5</td>
                    <td>{log.energy_level}/5</td>
                    <td style={{ fontWeight: log.exercise_done ? 600 : undefined }}>{log.exercise_done ? (log.exercise_type || '✓') : '—'}</td>
                    <td>{log.exercise_duration_mins ? `${log.exercise_duration_mins}m` : '—'}</td>
                    <td>{log.weight_kg ? `${log.weight_kg} kg` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── Section F: AI Health Insights ── */}
      <Panel title="AI health insights" description="Claude analyses your last 7 days of training, recovery, and body composition.">
        <HealthAIInsights />
      </Panel>

      {/* ── Health goal settings — collapsed by default ── */}
      <CollapsibleSection title="Health goals & targets" storageKey="health-goals-settings" defaultOpen={false}>
        <HealthGoalSettingsCard
          goals={data.goals}
          isSaving={updateGoalsMut.isPending}
          onSave={(payload) => updateGoalsMut.mutate(payload)}
        />
      </CollapsibleSection>
    </section>
  )
}
