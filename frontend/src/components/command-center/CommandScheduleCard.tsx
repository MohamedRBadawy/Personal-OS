import { useState } from 'react'
import { formatDate, formatTime, titleCase } from '../../lib/formatters'
import type { ScheduleBlockPayload, TodayScheduleBlock } from '../../lib/types'
import { StatusPill } from '../StatusPill'

const scheduleStatuses = ['done', 'partial', 'late', 'skipped'] as const

type CommandScheduleCardProps = {
  block: TodayScheduleBlock
  date: string
  isSaving: boolean
  onSaveBlock: (payload: Partial<ScheduleBlockPayload>) => void
  onLogStatus: (status: (typeof scheduleStatuses)[number]) => void
}

export function CommandScheduleCard({
  block,
  date,
  isSaving,
  onSaveBlock,
  onLogStatus,
}: CommandScheduleCardProps) {
  const [label, setLabel] = useState(block.label)
  const [time, setTime] = useState(block.time.slice(0, 5))
  const [durationMins, setDurationMins] = useState(String(block.duration_mins))
  const [isFixed, setIsFixed] = useState(block.is_fixed)
  const [isAdjustable, setIsAdjustable] = useState(block.is_adjustable)
  const currentStatus = block.log?.status ?? 'not_logged'

  return (
    <article className="schedule-card">
      <div className="schedule-card-header">
        <div>
          <p className="schedule-time">{formatTime(block.time)}</p>
          <h3>{block.label}</h3>
          <div className="list-inline">
            <span className="record-meta-chip">{titleCase(block.type)}</span>
            <span className="record-meta-chip">{block.duration_mins} mins</span>
            <StatusPill label={currentStatus === 'not_logged' ? 'pending' : currentStatus} />
          </div>
        </div>
        <span className="record-meta-chip">{formatDate(date)}</span>
      </div>

      <p className="muted">
        {block.suggestion?.goal_node
          ? `Suggested work: ${block.suggestion.goal_node.title}`
          : block.suggestion?.marketing_action
            ? `Suggested follow-up: ${block.suggestion.marketing_action.action}`
            : 'No specific suggestion is attached to this block yet.'}
      </p>
      <p className="muted">{block.suggestion_reason}</p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor={`block-time-${block.id}`}>Time</label>
          <input id={`block-time-${block.id}`} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`block-duration-${block.id}`}>Duration</label>
          <input
            id={`block-duration-${block.id}`}
            min="5"
            step="5"
            type="number"
            value={durationMins}
            onChange={(event) => setDurationMins(event.target.value)}
          />
        </div>
        <div className="field span-2">
          <label htmlFor={`block-label-${block.id}`}>Label</label>
          <input id={`block-label-${block.id}`} value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>
        <div className="field span-2 command-checkbox-grid">
          <label className="checkbox-row">
            <input checked={isFixed} type="checkbox" onChange={(event) => setIsFixed(event.target.checked)} />
            Fixed block
          </label>
          <label className="checkbox-row">
            <input checked={isAdjustable} type="checkbox" onChange={(event) => setIsAdjustable(event.target.checked)} />
            Adjustable slot
          </label>
        </div>
      </div>

      <div className="button-row">
        <button
          disabled={isSaving}
          type="button"
          onClick={() =>
            onSaveBlock({
              label,
              time,
              duration_mins: Number(durationMins || block.duration_mins),
              is_fixed: isFixed,
              is_adjustable: isAdjustable,
            })
          }
        >
          {isSaving ? 'Saving...' : 'Save block'}
        </button>
        {scheduleStatuses.map((status) => (
          <button
            key={status}
            className={status === currentStatus ? 'button-muted active' : 'button-muted'}
            disabled={isSaving}
            type="button"
            onClick={() => onLogStatus(status)}
          >
            {titleCase(status)}
          </button>
        ))}
      </div>
    </article>
  )
}
