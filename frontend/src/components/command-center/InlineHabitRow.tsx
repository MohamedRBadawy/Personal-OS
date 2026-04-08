import { useState } from 'react'
import { titleCase } from '../../lib/formatters'
import type { HabitBoardItem } from '../../lib/types'

type InlineHabitRowProps = {
  item: HabitBoardItem
  isExpanded: boolean
  onToggle: () => void
  isPending: boolean
  onToggleDone: (done: boolean) => void
  onUpdateNote: (note: string) => void
  linkedGoalTitle?: string
  atRisk?: boolean
}

function describeTarget(item: HabitBoardItem): string {
  if (item.habit.target === 'custom') return `${item.habit.custom_days ?? 1}x/week`
  return titleCase(item.habit.target).replace('3x Week', '3x/week')
}

export function InlineHabitRow({
  item,
  isExpanded,
  onToggle,
  isPending,
  onToggleDone,
  onUpdateNote,
  linkedGoalTitle,
  atRisk,
}: InlineHabitRowProps) {
  const [note, setNote] = useState(item.today_log?.note ?? '')
  const isDone = item.today_log?.done === true
  const isMissed = item.today_log !== null && item.today_log.done === false

  return (
    <div
      className={`row-item${atRisk && !isDone ? ' row-item--warning' : ''}`}
    >
      <div className="row-item__head">
        <div className="row-item__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isDone ? 'var(--success)' : isMissed ? 'var(--warning)' : 'var(--text-muted)',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <strong>{item.habit.name}</strong>
            <span className="record-meta-chip">{describeTarget(item)}</span>
            {item.current_streak > 0 ? (
              <span className="record-meta-chip">🔥 {item.current_streak}d</span>
            ) : null}
            {linkedGoalTitle ? (
              <span className="record-meta-chip" title={linkedGoalTitle}>↑ {linkedGoalTitle}</span>
            ) : null}
          </div>
        </div>
        <div className="row-item__actions">
          <button
            className={isDone ? 'button-muted active' : 'button-muted'}
            disabled={isPending}
            type="button"
            onClick={() => onToggleDone(true)}
          >
            {isPending && isDone ? '...' : 'Done'}
          </button>
          <button
            className={isMissed ? 'button-muted active' : 'button-muted'}
            disabled={isPending}
            type="button"
            onClick={() => onToggleDone(false)}
          >
            {isPending && isMissed ? '...' : 'Missed'}
          </button>
          <button
            className="expand-btn"
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse habit' : 'Expand habit'}
            onClick={onToggle}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="row-item__expand-content">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>7d: {item.completion_rate_7d ?? 0}%</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>30d: {item.completion_rate_30d ?? 0}%</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>streak: {item.current_streak} days</span>
          </div>
          {item.today_log ? (
            <>
              <div className="field">
                <label htmlFor={`habit-note-${item.habit.id}`}>Note for today</label>
                <textarea
                  id={`habit-note-${item.habit.id}`}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any context about today's log..."
                />
              </div>
              <div>
                <button
                  className="button-muted"
                  type="button"
                  onClick={() => onUpdateNote(note)}
                >
                  Save note
                </button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>Toggle Done or Missed to add a note.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
