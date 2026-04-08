import { HealthLogForm } from '../HealthLogForm'
import type { HealthLog, HealthLogPayload, HealthTodayPayload } from '../../lib/types'

type InlineHealthLogProps = {
  healthToday: HealthTodayPayload
  isExpanded: boolean
  onToggle: () => void
  isSubmitting: boolean
  onSubmit: (payload: HealthLogPayload & { id?: string | null }) => void
}

function summarize(log: HealthLog): string {
  const parts: string[] = [`${log.sleep_hours}h sleep`, `${log.energy_level}/5 energy`]
  if (log.exercise_done) parts.push(log.exercise_type ? log.exercise_type : 'exercised')
  else parts.push('no exercise')
  if (log.weight_kg) parts.push(`${log.weight_kg}kg`)
  return parts.join(' · ')
}

export function InlineHealthLog({
  healthToday,
  isExpanded,
  onToggle,
  isSubmitting,
  onSubmit,
}: InlineHealthLogProps) {
  const { health_log, date, summary } = healthToday
  const notLogged = !summary.health_logged_today

  return (
    <div className={`row-item${notLogged ? ' row-item--warning' : ''}`}>
      <div className="row-item__head">
        <div className="row-item__body">
          <span style={{ fontWeight: 600 }}>💊 Health</span>
          {' '}
          <span className="muted" style={{ fontSize: '0.9rem' }}>
            {health_log ? summarize(health_log) : 'not logged today'}
          </span>
          {(summary.avg_sleep_7d !== null || summary.avg_energy_7d !== null) ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              7d avg:
              {summary.avg_sleep_7d !== null ? ` ${summary.avg_sleep_7d.toFixed(1)}h sleep` : ''}
              {summary.avg_energy_7d !== null ? ` · ${summary.avg_energy_7d.toFixed(1)}/5 energy` : ''}
              {summary.avg_mood_7d !== null ? ` · ${summary.avg_mood_7d.toFixed(1)}/5 mood` : ''}
            </div>
          ) : null}
          {(summary.low_sleep_today || summary.low_energy_today || summary.exercise_streak > 0 || summary.full_prayer_streak > 0) ? (
            <div className="row-item__sub" style={{ marginTop: 4 }}>
              {summary.low_sleep_today ? <span className="record-meta-chip" style={{ color: 'var(--warning)' }}>low sleep</span> : null}
              {summary.low_energy_today ? <span className="record-meta-chip" style={{ color: 'var(--warning)' }}>low energy</span> : null}
              {summary.exercise_streak > 0 ? <span className="record-meta-chip">🏃 {summary.exercise_streak}d</span> : null}
              {summary.full_prayer_streak > 0 ? <span className="record-meta-chip">🤲 {summary.full_prayer_streak}d</span> : null}
            </div>
          ) : null}
        </div>
        <div className="row-item__actions">
          <button
            className="expand-btn"
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse health log' : 'Expand health log'}
            onClick={onToggle}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="row-item__expand-content">
          <HealthLogForm
            key={health_log?.id ?? `health-${date}`}
            initialValue={health_log}
            isSubmitting={isSubmitting}
            today={date}
            onSubmit={(payload) => onSubmit({ ...payload, id: health_log?.id })}
          />
        </div>
      ) : null}
    </div>
  )
}
