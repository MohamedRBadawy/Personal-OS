import { Link } from 'react-router-dom'
import { StatusPill } from '../StatusPill'
import { titleCase } from '../../lib/formatters'
import type { CommandCenterPriorityItem } from '../../lib/types'

type TodayFocusCardProps = {
  priority: CommandCenterPriorityItem | null
  isSaving: boolean
  onMarkDone: () => void
  onOpenChat?: () => void
}

export function TodayFocusCard({ priority, isSaving, onMarkDone, onOpenChat }: TodayFocusCardProps) {
  if (!priority) {
    return (
      <div className="today-focus-card today-focus-card--empty">
        <div>
          <p className="eyebrow">Work on next</p>
          <h2 className="today-focus-card__title">Nothing blocking you.</h2>
          <p className="muted">Review your pipeline or capture what's next.</p>
          <div className="today-focus-card__meta">
            <Link className="button-link" to="/goals">Open goals</Link>
          </div>
        </div>
      </div>
    )
  }

  const progressPct = Math.min(100, Math.max(0, priority.progress_pct ?? 0))

  return (
    <div className="today-focus-card">
      <div>
        <p className="eyebrow">Work on next</p>
        <h2 className="today-focus-card__title">{priority.title}</h2>
        <div className="today-focus-card__meta">
          <StatusPill label={priority.status} />
          <span className="record-meta-chip">{titleCase(priority.type)}</span>
          {priority.parent_title ? (
            <span className="record-meta-chip">{priority.parent_title}</span>
          ) : null}
          {priority.is_overdue ? <span className="record-meta-chip" style={{ color: 'var(--warning)' }}>Overdue</span> : null}
        </div>
        <div className="today-focus-card__progress" title={`${progressPct}% complete`}>
          <div className="today-focus-card__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 6 }}>{progressPct}% complete</p>
        {priority.recommended_tool ? (
          <span className="record-meta-chip" style={{ marginBottom: 8, display: 'inline-block' }}>
            🛠 {priority.recommended_tool}
          </span>
        ) : null}
        {priority.tool_reasoning ? (
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: 4 }}>{priority.tool_reasoning}</p>
        ) : null}
      </div>
      <div className="today-focus-card__actions">
        <button
          disabled={isSaving}
          type="button"
          onClick={onMarkDone}
        >
          {isSaving ? 'Saving...' : 'Mark done'}
        </button>
        {onOpenChat ? (
          <button
            className="button-muted"
            type="button"
            onClick={onOpenChat}
          >
            Think with AI
          </button>
        ) : null}
        <Link className="button-link" to="/goals">Goal context →</Link>
      </div>
    </div>
  )
}
