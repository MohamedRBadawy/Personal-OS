import { useState } from 'react'
import { formatTime, titleCase } from '../../lib/formatters'
import type { ScheduleBlockPayload, TodayScheduleBlock } from '../../lib/types'
import { StatusPill } from '../StatusPill'

const scheduleStatuses = ['done', 'partial', 'late', 'skipped'] as const

type ScheduleRowProps = {
  block: TodayScheduleBlock
  date: string
  isExpanded: boolean
  onToggle: () => void
  isSaving: boolean
  onLogStatus: (status: (typeof scheduleStatuses)[number]) => void
  onSaveBlock: (payload: Partial<ScheduleBlockPayload>) => void
  onUpdateNote: (note: string) => void
  lowEnergy?: boolean
}

export function ScheduleRow({
  block,
  date: _date,
  isExpanded,
  onToggle,
  isSaving,
  onLogStatus,
  onSaveBlock,
  onUpdateNote,
  lowEnergy,
}: ScheduleRowProps) {
  const [label, setLabel] = useState(block.label)
  const [time, setTime] = useState(block.time.slice(0, 5))
  const [durationMins, setDurationMins] = useState(String(block.duration_mins))
  const [isFixed, setIsFixed] = useState(block.is_fixed)
  const [isAdjustable, setIsAdjustable] = useState(block.is_adjustable)
  const [note, setNote] = useState(block.log?.note ?? '')

  const currentStatus = block.log?.status ?? 'pending'
  const isDone = currentStatus === 'done'
  const isWarning = (currentStatus === 'late' || currentStatus === 'skipped') && !isDone

  const linkedNode = block.suggestion?.goal_node
  const linkedAction = block.suggestion?.marketing_action

  return (
    <div
      className={`row-item${isDone ? ' row-item--done' : ''}${isWarning ? ' row-item--warning' : ''}${lowEnergy && !isDone ? ' row-item--dim' : ''}`}
    >
      <div className="row-item__head">
        <span className="schedule-row-time">{formatTime(block.time)}</span>
        <div className="row-item__body">
          <strong>{block.label}</strong>
          <div className="row-item__sub">
            <span className="record-meta-chip">{block.duration_mins}m</span>
            <StatusPill label={currentStatus === 'pending' ? 'pending' : currentStatus} />
            {linkedNode ? (
              <span className="record-meta-chip" title={linkedNode.title}>→ {linkedNode.title}</span>
            ) : linkedAction ? (
              <span className="record-meta-chip" title={linkedAction.action}>→ {linkedAction.action}</span>
            ) : null}
          </div>
          {block.suggestion_reason && !block.log ? (
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {block.suggestion_reason}
            </p>
          ) : null}
        </div>
        <div className="row-item__actions">
          {scheduleStatuses.map((status) => (
            <button
              key={status}
              className={currentStatus === status ? 'button-muted active' : 'button-muted'}
              disabled={isSaving}
              type="button"
              onClick={() => onLogStatus(status)}
            >
              {titleCase(status)}
            </button>
          ))}
          <button
            className="expand-btn"
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse block' : 'Expand block'}
            onClick={onToggle}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="row-item__expand-content">
          <div className="field">
            <label htmlFor={`srow-note-${block.id}`}>Note</label>
            <textarea
              id={`srow-note-${block.id}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened? Any context for this block..."
            />
          </div>
          {block.log ? (
            <div>
              <button
                className="button-muted"
                disabled={isSaving}
                type="button"
                onClick={() => onUpdateNote(note)}
              >
                {isSaving ? 'Saving...' : 'Save note'}
              </button>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>Log a status above first to save a note.</p>
          )}
          {block.log?.actual_time ? (
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
              Actual: {formatTime(block.log.actual_time)} · Scheduled: {formatTime(block.time)}
            </p>
          ) : null}
          <div className="form-grid">
            <div className="field span-2">
              <label htmlFor={`srow-label-${block.id}`}>Label</label>
              <input id={`srow-label-${block.id}`} value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`srow-time-${block.id}`}>Time</label>
              <input id={`srow-time-${block.id}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`srow-dur-${block.id}`}>Duration (mins)</label>
              <input id={`srow-dur-${block.id}`} type="number" min="5" step="5" value={durationMins} onChange={(e) => setDurationMins(e.target.value)} />
            </div>
            <div className="field span-2 command-checkbox-grid">
              <label className="checkbox-row">
                <input type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} />
                Fixed block
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={isAdjustable} onChange={(e) => setIsAdjustable(e.target.checked)} />
                Adjustable slot
              </label>
            </div>
          </div>
          <div>
            <button
              disabled={isSaving}
              type="button"
              onClick={() => onSaveBlock({ label, time, duration_mins: Number(durationMins || block.duration_mins), is_fixed: isFixed, is_adjustable: isAdjustable })}
            >
              {isSaving ? 'Saving...' : 'Save block'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
