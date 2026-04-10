import { useState } from 'react'
import type { BlockStreakStatus, RoutineBlock, RoutineLogEntry } from '../../lib/types'
import { TYPE_COLORS, STATUS_LABELS } from './constants'
import { fmtDuration } from './helpers'
import { BlockContext } from './BlockContext'
import { BlockNotesHistory } from './BlockNotesHistory'

const STREAK_DOT_COLORS: Record<NonNullable<BlockStreakStatus>, string> = {
  done: 'var(--success)',
  partial: '#22c55e99',
  late: 'var(--warning)',
  skipped: 'var(--danger)',
}

interface BlockRowProps {
  block: RoutineBlock
  log: RoutineLogEntry | undefined
  missedYesterday: boolean
  onSave: (entry: { block_time: string; status: string; actual_time?: string; note?: string }) => void
  onEdit: () => void
  streakDots?: BlockStreakStatus[]
  streak?: number
  isCurrent?: boolean
  defaultExpanded?: boolean
}

export function BlockRow({ block, log, missedYesterday, onSave, onEdit, streakDots, streak, isCurrent, defaultExpanded }: BlockRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const [status, setStatus] = useState(log?.status || '')
  const [actualTime, setActualTime] = useState(log?.actual_time || new Date().toTimeString().slice(0, 5))
  const [note, setNote] = useState(log?.note || '')
  const [saving, setSaving] = useState(false)

  async function handleStatusClick(s: string) {
    const newStatus = status === s ? '' : s
    setStatus(newStatus)
    if (newStatus) {
      setSaving(true)
      onSave({ block_time: block.time, status: newStatus, actual_time: actualTime || undefined, note: note || undefined })
      setSaving(false)
    }
  }

  return (
    <div className={`routine-row ${log?.status ? `logged-${log.status}` : ''} ${!log?.status && missedYesterday ? 'missed-yesterday' : ''} ${isCurrent ? 'block-current' : ''}`}>
      <div className="routine-row-main" onClick={() => setExpanded(p => !p)}>
        {isCurrent && <span className="block-now-chip">● NOW</span>}
        <span className="routine-time">{block.time_str || block.time}</span>
        <span
          className={`routine-dot${block.importance === 'must' ? ' dot-must' : block.importance === 'nice' ? ' dot-nice' : ''}`}
          style={{ background: TYPE_COLORS[block.type] }}
        />
        <span className="routine-label">{block.label}</span>
        {block.linked_node_title && (
          <span className="routine-goal-badge">
            🎯 {block.linked_node_title}
            {block.linked_node_progress != null && block.linked_node_progress > 0
              ? ` (${block.linked_node_progress}%)` : null}
          </span>
        )}
        {/* Type-specific detail badges in header row */}
        {block.type === 'spiritual' && block.location && (
          <span className="routine-detail-badge routine-detail-spiritual">
            {block.location === 'mosque' ? '🕌' : block.location === 'home' ? '🏠' : '💻'} {block.location}
          </span>
        )}
        {block.type === 'spiritual' && block.target && (
          <span className="routine-detail-badge routine-detail-spiritual">{block.target}</span>
        )}
        {block.type === 'health' && block.exercise_type && (
          <span className="routine-detail-badge routine-detail-health">{block.exercise_type}</span>
        )}
        {block.type === 'health' && block.intensity && (
          <span className={`routine-detail-badge intensity-${block.intensity}`}>{block.intensity}</span>
        )}
        {block.type === 'work' && block.focus_area && (
          <span className="routine-detail-badge routine-detail-work">
            {block.focus_area.replace('_', ' ')}
          </span>
        )}
        <span className="routine-duration">{fmtDuration(block.duration_minutes)}</span>
        {!block.is_fixed && <span className="routine-flex-tag">flex</span>}
        {!log?.status && missedYesterday && <span className="missed-yesterday-badge">↩ missed</span>}
        {log?.status && <span className={`routine-status-badge log-${log.status}`}>{log.status}</span>}
        {streakDots && streakDots.length > 0 && (
          <span className="routine-streak-chain" title="Last 7 days">
            {streakDots.map((s, i) => (
              <span
                key={i}
                className="routine-streak-dot"
                style={{ background: s ? STREAK_DOT_COLORS[s] : 'var(--border)' }}
                title={s ?? 'no log'}
              />
            ))}
          </span>
        )}
        {streak !== undefined && streak > 0 && (
          <span className="routine-streak-badge">🔥{streak}</span>
        )}
        <span className="routine-expand-arrow">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="routine-log-panel" onClick={e => e.stopPropagation()}>

          {/* Block context: type-specific details + quick-edit */}
          <BlockContext block={block} onEdit={onEdit} />

          {/* Past notes for this block */}
          <BlockNotesHistory blockTime={block.time_str || block.time.slice(0, 5)} />

          {/* Log fields */}
          <div className="routine-status-buttons">
            {STATUS_LABELS.map(s => (
              <button
                key={s.value}
                className={`routine-status-btn ${status === s.value ? 'active' : ''}`}
                disabled={saving}
                onClick={() => handleStatusClick(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="routine-log-fields">
            <div className="sp-field">
              <label className="sp-label">Actual time</label>
              <input
                className="form-input"
                type="time"
                value={actualTime}
                onChange={e => setActualTime(e.target.value)}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label">Notes</label>
              <textarea
                className="form-input"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional notes…"
              />
            </div>
            {(actualTime || note) && (
              <button
                className="btn-primary"
                style={{ alignSelf: 'flex-end' }}
                disabled={saving}
                onClick={() => {
                  setSaving(true)
                  onSave({ block_time: block.time, status: status || 'done', actual_time: actualTime || undefined, note: note || undefined })
                  setSaving(false)
                }}
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
