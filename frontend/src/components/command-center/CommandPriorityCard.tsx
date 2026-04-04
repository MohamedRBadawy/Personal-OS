import { useState } from 'react'
import { Link } from 'react-router-dom'
import { titleCase } from '../../lib/formatters'
import type { CommandCenterPriorityItem, GoalNodeManualPriority } from '../../lib/types'
import { StatusPill } from '../StatusPill'

type CommandPriorityCardProps = {
  priority: CommandCenterPriorityItem
  isSaving: boolean
  onSave: (payload: {
    title: string
    notes: string
    status: CommandCenterPriorityItem['status']
    dueDate: string | null
    manualPriority: GoalNodeManualPriority
  }) => void
  onMarkDone: () => void
}

export function CommandPriorityCard({
  priority,
  isSaving,
  onSave,
  onMarkDone,
}: CommandPriorityCardProps) {
  const [title, setTitle] = useState(priority.title)
  const [notes, setNotes] = useState(priority.notes)
  const [status, setStatus] = useState(priority.status)
  const [dueDate, setDueDate] = useState(priority.due_date ?? '')
  const [manualPriority, setManualPriority] = useState<GoalNodeManualPriority>(priority.manual_priority)
  const canPlanTask = priority.type === 'task' || priority.type === 'sub_task'

  return (
    <article className="command-priority-card">
      <div className="record-card-header">
        <div>
          <h3>{priority.title}</h3>
          <div className="priority-meta">
            <StatusPill label={priority.status} />
            <span>{titleCase(priority.type)}</span>
            <span>{priority.progress_pct}% progress</span>
            {priority.parent_title ? <span>{priority.parent_title}</span> : null}
          </div>
        </div>
        <div className="button-row">
          <span className="record-meta-chip">{priority.recommended_tool}</span>
          <Link className="button-link" to="/goals">
            Open goal context
          </Link>
        </div>
      </div>

      <p className="muted">{priority.tool_reasoning}</p>

      <div className="summary-strip">
        <div>
          <strong>{priority.blocked_by_titles.length}</strong>
          <p className="muted">Blocking items</p>
        </div>
        <div>
          <strong>{priority.dependency_unblock_count}</strong>
          <p className="muted">Items unblocked</p>
        </div>
        <div>
          <strong>{priority.due_in_days == null ? '-' : priority.due_in_days}</strong>
          <p className="muted">{priority.is_overdue ? 'Days overdue' : 'Days to due date'}</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor={`priority-title-${priority.id}`}>Title</label>
          <input id={`priority-title-${priority.id}`} value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`priority-status-${priority.id}`}>Status</label>
          <select
            id={`priority-status-${priority.id}`}
            value={status}
            onChange={(event) => setStatus(event.target.value as CommandCenterPriorityItem['status'])}
          >
            {['active', 'available', 'blocked', 'done'].map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`priority-due-${priority.id}`}>Due date</label>
          <input
            disabled={!canPlanTask}
            id={`priority-due-${priority.id}`}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`priority-manual-${priority.id}`}>Manual priority</label>
          <select
            disabled={!canPlanTask}
            id={`priority-manual-${priority.id}`}
            value={manualPriority ?? ''}
            onChange={(event) => setManualPriority((event.target.value || null) as GoalNodeManualPriority)}
          >
            <option value="">None</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="field span-2">
          <label htmlFor={`priority-notes-${priority.id}`}>Notes</label>
          <textarea id={`priority-notes-${priority.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </div>

      <div className="button-row">
        <button
          disabled={isSaving}
          type="button"
          onClick={() =>
            onSave({
              title,
              notes,
              status,
              dueDate: canPlanTask && dueDate ? dueDate : null,
              manualPriority: canPlanTask ? manualPriority : null,
            })
          }
        >
          {isSaving ? 'Saving...' : 'Save priority'}
        </button>
        {priority.status !== 'done' ? (
          <button className="button-muted" disabled={isSaving} type="button" onClick={onMarkDone}>
            Mark done
          </button>
        ) : null}
      </div>
    </article>
  )
}
