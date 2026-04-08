import { useState } from 'react'
import { Link } from 'react-router-dom'
import { titleCase } from '../../lib/formatters'
import type { CommandCenterPriorityItem, GoalNodeManualPriority } from '../../lib/types'
import { StatusPill } from '../StatusPill'

type PriorityRowProps = {
  priority: CommandCenterPriorityItem
  isFirst?: boolean
  isExpanded: boolean
  onToggle: () => void
  isSaving: boolean
  onSave: (payload: {
    title: string
    notes: string
    status: CommandCenterPriorityItem['status']
    dueDate: string | null
    manualPriority: GoalNodeManualPriority
  }) => void
  onMarkDone: () => void
  onOpenChat?: () => void
}

function formatDueDays(due_in_days: number | null, is_overdue: boolean): string | null {
  if (due_in_days === null) return null
  if (is_overdue) return `overdue ${Math.abs(due_in_days)}d`
  if (due_in_days === 0) return 'due today'
  return `due in ${due_in_days}d`
}

export function PriorityRow({
  priority,
  isFirst,
  isExpanded,
  onToggle,
  isSaving,
  onSave,
  onMarkDone,
  onOpenChat,
}: PriorityRowProps) {
  const [notes, setNotes] = useState(priority.notes)
  const [status, setStatus] = useState(priority.status)
  const [dueDate, setDueDate] = useState(priority.due_date ?? '')
  const [manualPriority, setManualPriority] = useState<GoalNodeManualPriority>(priority.manual_priority)

  const isDone = priority.status === 'done'
  const progressPct = Math.min(100, Math.max(0, priority.progress_pct ?? 0))
  const canPlanTask = priority.type === 'task' || priority.type === 'sub_task'

  return (
    <div className={`row-item${isDone ? ' row-item--done' : ''}${priority.is_overdue ? ' row-item--warning' : ''}`}>
      <div className="row-item__head">
        <div className="row-item__body">
          {isFirst ? <p className="eyebrow" style={{ margin: '0 0 4px', fontSize: '0.72rem' }}>Work on next</p> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '1rem' }}>{priority.title}</strong>
            <StatusPill label={priority.status} />
            {priority.code ? (
              <span className="record-meta-chip" style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{priority.code}</span>
            ) : null}
            <span className="record-meta-chip">{titleCase(priority.type)}</span>
            <span className="progress-bar-xs" title={`${progressPct}%`}>
              <span className="progress-bar-xs__fill" style={{ width: `${progressPct}%` }} />
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{progressPct}%</span>
            {formatDueDays(priority.due_in_days, priority.is_overdue) !== null ? (
              <span
                className="record-meta-chip"
                style={{ color: priority.is_overdue ? 'var(--warning)' : undefined }}
              >
                {formatDueDays(priority.due_in_days, priority.is_overdue)}
              </span>
            ) : null}
          </div>
          {(priority.parent_title || priority.ancestor_titles.length > 0 || priority.dependency_unblock_count > 0 || priority.recommended_tool) ? (
            <div className="row-item__sub">
              {priority.ancestor_titles.length > 1
                ? <span className="record-meta-chip" title={priority.ancestor_titles.join(' › ')}>↑ {priority.ancestor_titles.join(' › ')}</span>
                : priority.parent_title
                ? <span className="record-meta-chip">↑ {priority.parent_title}</span>
                : null}
              {priority.dependency_unblock_count > 0 ? <span className="record-meta-chip">unblocks {priority.dependency_unblock_count}</span> : null}
              {priority.recommended_tool ? <span className="record-meta-chip">🛠 {priority.recommended_tool}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="row-item__actions">
          {priority.status !== 'done' ? (
            <button disabled={isSaving} type="button" onClick={onMarkDone}>
              {isSaving ? '...' : 'Mark done'}
            </button>
          ) : null}
          {onOpenChat ? (
            <button className="button-muted" type="button" onClick={onOpenChat}>AI</button>
          ) : null}
          <button
            className="expand-btn"
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse priority' : 'Expand priority'}
            onClick={onToggle}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="row-item__expand-content">
          <div className="field">
            <label htmlFor={`prow-notes-${priority.id}`}>Notes</label>
            <textarea
              id={`prow-notes-${priority.id}`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context, blockers, next steps..."
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor={`prow-status-${priority.id}`}>Status</label>
              <select
                id={`prow-status-${priority.id}`}
                value={status}
                onChange={(e) => setStatus(e.target.value as CommandCenterPriorityItem['status'])}
              >
                {['active', 'available', 'blocked', 'done'].map((v) => (
                  <option key={v} value={v}>{titleCase(v)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`prow-due-${priority.id}`}>Due date</label>
              <input
                disabled={!canPlanTask}
                id={`prow-due-${priority.id}`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`prow-mp-${priority.id}`}>Manual priority</label>
              <select
                disabled={!canPlanTask}
                id={`prow-mp-${priority.id}`}
                value={manualPriority ?? ''}
                onChange={(e) => setManualPriority((e.target.value || null) as GoalNodeManualPriority)}
              >
                <option value="">None</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          {priority.tool_reasoning ? (
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>💡 {priority.tool_reasoning}</p>
          ) : null}
          {priority.blocked_by_titles.length > 0 ? (
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
              🚫 Blocked by: {priority.blocked_by_titles.join(', ')}
            </p>
          ) : null}
          <div className="button-row">
            <button
              disabled={isSaving}
              type="button"
              onClick={() => onSave({ title: priority.title, notes, status, dueDate: canPlanTask && dueDate ? dueDate : null, manualPriority: canPlanTask ? manualPriority : null })}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <Link className="button-link" to="/goals">Goal context →</Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
