import { useQuery } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { PageSkeleton } from '../components/PageSkeleton'
import { Panel } from '../components/Panel'
import { getHealthOverview } from '../lib/api'
import type { HealthLog, HealthSummary } from '../lib/types'
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
  if (sleep < 6 && sleep > 0)
    alerts.push({ level: 'danger', text: `Sleep avg ${sleep.toFixed(1)}h — below 6h` })
  else if (sleep < 7 && sleep > 0)
    alerts.push({ level: 'warn', text: `Sleep avg ${sleep.toFixed(1)}h — below 7h` })

  const energy = s.avg_energy_7d ?? 0
  if (energy > 0 && energy < 3)
    alerts.push({ level: 'warn', text: `Energy avg ${energy.toFixed(1)}/5 — low` })

  if (s.low_mood_streak >= 3)
    alerts.push({ level: 'danger', text: `Low mood for ${s.low_mood_streak} days straight` })
  else if (s.low_mood_streak >= 2)
    alerts.push({ level: 'warn', text: `Low mood for ${s.low_mood_streak} consecutive days` })

  if (s.prayer_gap_streak >= 2)
    alerts.push({ level: 'warn', text: `Prayer gap: ${s.prayer_gap_streak} days without full prayers` })

  if (s.exercise_streak >= 5)
    alerts.push({ level: 'ok', text: `Exercise streak: ${s.exercise_streak} days 🔥` })

  if (s.full_prayer_streak >= 7)
    alerts.push({ level: 'ok', text: `Full prayers streak: ${s.full_prayer_streak} days ✨` })

  return alerts
}

// ── Sparkline for sleep/energy from recent logs ───────────────────────────────

function MiniSparkline({ logs, field, max, color }: {
  logs: HealthLog[]
  field: 'sleep_hours' | 'energy_level'
  max: number
  color: string
}) {
  const last7 = logs.slice(0, 7).reverse()
  if (last7.length === 0) return <span className="muted" style={{ fontSize: 12 }}>No data</span>

  return (
    <div className="health-sparkline">
      {last7.map((log, i) => {
        const val = field === 'sleep_hours' ? parseFloat(log.sleep_hours) : log.energy_level
        const pct = Math.min(100, Math.round((val / max) * 100))
        const isLow = field === 'sleep_hours' ? val < 6 : val < 3
        const barColor = isLow ? '#dc2626' : color
        return (
          <div key={i} className="health-sparkline-bar" title={`${val}`}>
            <div
              className="health-sparkline-fill"
              style={{ height: `${Math.max(pct, 4)}%`, background: barColor }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── SevenDayAverages panel ────────────────────────────────────────────────────

function SevenDayAverages({ s, logs }: { s: HealthSummary; logs: HealthLog[] }) {
  const rows = [
    {
      label: 'Sleep',
      value: s.avg_sleep_7d != null ? `${s.avg_sleep_7d.toFixed(1)}h` : '—',
      sparkField: 'sleep_hours' as const,
      max: 10,
      color: '#6366f1',
    },
    {
      label: 'Energy',
      value: s.avg_energy_7d != null ? `${s.avg_energy_7d.toFixed(1)}/5` : '—',
      sparkField: 'energy_level' as const,
      max: 5,
      color: '#f59e0b',
    },
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

// ── Main page ─────────────────────────────────────────────────────────────────

export function HealthBodyPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health-overview'],
    queryFn: getHealthOverview,
  })

  if (isLoading) return <PageSkeleton />
  if (isError || !data) return <section className="error-state">Could not load health data.</section>

  const s = data.summary
  const alerts = buildAlerts(s)
  const recentLogs = data.recent_health_logs ?? []
  const capacitySignals = data.capacity_signals ?? []

  return (
    <section className="page">
      <div className="metric-grid">
        <MetricCard label="Avg sleep (7d)" value={`${s.avg_sleep_7d ?? 0} h`} />
        <MetricCard label="Avg mood (7d)" value={`${s.avg_mood_7d ?? 0} / 5`} />
        <MetricCard label="Habit completion" value={formatPercent(s.habit_completion_rate_7d ?? 0)} />
        <MetricCard label="Prayer completion" value={formatPercent(s.prayer_completion_rate_7d ?? 0)} />
        <MetricCard label="Exercise streak" value={`${s.exercise_streak} days`} tone="success" />
      </div>

      {alerts.length > 0 && (
        <div className="health-alerts-row">
          {alerts.map((a, i) => (
            <AlertChip key={i} level={a.level} text={a.text} />
          ))}
        </div>
      )}

      <div className="two-column">
        <Panel title="7-day trends" description="Sleep and energy over the last week. Red bars = below threshold.">
          <SevenDayAverages s={s} logs={recentLogs} />
        </Panel>

        <Panel title="Today's logging state" description="Stay honest about what has been captured already.">
          <div className="summary-strip">
            <div>
              <strong>{s.health_logged_today ? 'Yes' : 'No'}</strong>
              <p className="muted">Body logged</p>
            </div>
            <div>
              <strong>{s.mood_logged_today ? 'Yes' : 'No'}</strong>
              <p className="muted">Mood logged</p>
            </div>
            <div>
              <strong>{s.spiritual_logged_today ? 'Yes' : 'No'}</strong>
              <p className="muted">Spiritual logged</p>
            </div>
          </div>
          {capacitySignals.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Capacity signals</p>
              {capacitySignals.map((sig: string, i: number) => (
                <p key={i} className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>· {sig}</p>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </section>
  )
}
