/**
 * ActualDayPanel — "Log how today actually went"
 *
 * A slide-in right-side panel for days where the routine deviated from the plan.
 * Lets the user:
 *   1. Set the actual start time + status for each routine block
 *   2. Add unplanned activities (saved as ScheduledEntries for today)
 *
 * Uses existing API:
 *   saveRoutineLog   — POST /schedule/routine-log/
 *   createScheduledEntry — POST /schedule/scheduled-entries/
 */
import { useState } from 'react'
import { saveRoutineLog, createScheduledEntry } from '../../lib/api'
import type { RoutineBlock, RoutineLogEntry } from '../../lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

type Status = 'done' | 'partial' | 'skipped' | null

interface BlockState {
  block_time: string          // "HH:MM" — used as the API key
  label: string
  planned_time: string        // display label
  planned_duration: number    // minutes — used as default for actual_duration
  status: Status
  actual_time: string         // editable start time
  actual_duration: number     // editable duration in minutes
}

interface UnplannedActivity {
  id: number           // local key only
  label: string
  time: string         // "HH:MM"
  duration: number     // minutes
}

interface Props {
  blocks: RoutineBlock[]
  logs: RoutineLogEntry[]
  today: string        // "YYYY-MM-DD"
  onClose: () => void
  onSaved: () => void
}

// ── Helper ───────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  return t.slice(0, 5)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActualDayPanel({ blocks, logs, today, onClose, onSaved }: Props) {
  const logsByTime = Object.fromEntries(logs.map(l => [l.block_time.slice(0, 5), l]))

  // Initialise block states from existing logs
  const [blockStates, setBlockStates] = useState<BlockState[]>(() =>
    blocks.map(b => {
      const timeKey = (b.time_str || b.time).slice(0, 5)
      const existing = logsByTime[timeKey]
      const plannedDur = b.duration_minutes ?? 30
      return {
        block_time: timeKey,
        label: b.label,
        planned_time: timeKey,
        planned_duration: plannedDur,
        status: (existing?.status as Status) ?? null,
        actual_time: existing?.actual_time ? formatTime(existing.actual_time) : timeKey,
        actual_duration: existing?.actual_duration_minutes ?? plannedDur,
      }
    })
  )

  const [unplanned, setUnplanned] = useState<UnplannedActivity[]>([])
  const [nextId, setNextId] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── New unplanned activity form state ────────────────────────────────────
  const [newLabel, setNewLabel]       = useState('')
  const [newTime, setNewTime]         = useState('06:00')
  const [newDuration, setNewDuration] = useState(60)
  const [showAddForm, setShowAddForm] = useState(false)

  // ── Block state handlers ─────────────────────────────────────────────────

  function setBlockStatus(idx: number, status: Status) {
    setBlockStates(prev => prev.map((b, i) => i === idx ? { ...b, status } : b))
  }

  function setBlockActualTime(idx: number, time: string) {
    setBlockStates(prev => prev.map((b, i) => i === idx ? { ...b, actual_time: time } : b))
  }

  function setBlockDuration(idx: number, duration: number) {
    setBlockStates(prev => prev.map((b, i) => i === idx ? { ...b, actual_duration: duration } : b))
  }

  // ── Unplanned activity handlers ──────────────────────────────────────────

  function addUnplanned() {
    if (!newLabel.trim()) return
    setUnplanned(prev => [...prev, { id: nextId, label: newLabel.trim(), time: newTime, duration: newDuration }])
    setNextId(n => n + 1)
    setNewLabel('')
    setShowAddForm(false)
  }

  function removeUnplanned(id: number) {
    setUnplanned(prev => prev.filter(u => u.id !== id))
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // Save each block that has been given a status
      for (const b of blockStates.filter(b => b.status !== null)) {
        await saveRoutineLog({
          date: today,
          block_time: b.block_time,
          status: b.status!,
          actual_time: b.status !== 'skipped' ? b.actual_time || undefined : undefined,
          actual_duration_minutes: b.status !== 'skipped' ? b.actual_duration : undefined,
        })
      }

      // Create ScheduledEntries for unplanned activities
      for (const act of unplanned) {
        await createScheduledEntry({
          date: today,
          time: act.time + ':00',
          label: act.label,
          duration_minutes: act.duration,
        })
      }

      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const changedCount = blockStates.filter(b => b.status !== null).length

  return (
    <div className="actual-day-panel">
      {/* Backdrop */}
      <div className="actual-day-panel-backdrop" onClick={onClose} />

      {/* Panel body */}
      <div className="actual-day-panel-body">

        {/* Header */}
        <div className="actual-day-panel-header">
          <span>📝 Log actual day — {new Date(today + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <button className="btn-ghost-sm" onClick={onClose}>✕</button>
        </div>

        {/* Scrollable content */}
        <div className="actual-day-panel-scroll">

          {/* Section: Planned blocks */}
          <p className="adp-section-label">PLANNED BLOCKS</p>
          <p className="adp-section-hint">Set what actually happened for each block. Skip the ones you didn't do.</p>

          {blockStates.map((b, i) => (
            <div key={b.block_time} className="adp-block-row">
              <span className="adp-block-time">{b.planned_time}</span>
              <span className="adp-block-label">{b.label}</span>

              {/* Status buttons */}
              <div className="adp-status-btns">
                {(['done', 'partial', 'skipped'] as const).map(s => (
                  <button
                    key={s}
                    className={`adp-status-btn${b.status === s ? ` active-${s}` : ''}`}
                    onClick={() => setBlockStatus(i, b.status === s ? null : s)}
                    title={s}
                  >
                    {s === 'done' ? '✓' : s === 'partial' ? '~' : '✕'}
                  </button>
                ))}
              </div>

              {/* Actual start time + duration — shown when done or partial */}
              {(b.status === 'done' || b.status === 'partial') && (
                <>
                  <input
                    type="time"
                    className="adp-actual-time"
                    value={b.actual_time}
                    onChange={e => setBlockActualTime(i, e.target.value)}
                    title="Actual start time"
                  />
                  <select
                    className="adp-duration-select"
                    value={b.actual_duration}
                    onChange={e => setBlockDuration(i, parseInt(e.target.value, 10))}
                    title="Actual duration"
                  >
                    {[5, 10, 15, 20, 25, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360].map(d => (
                      <option key={d} value={d}>
                        {d < 60 ? `${d}m` : `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ''}`}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          ))}

          {/* Section: Unplanned activities */}
          <div className="adp-section-header">
            <p className="adp-section-label">UNPLANNED ACTIVITIES</p>
            <button className="btn-ghost-sm" onClick={() => setShowAddForm(v => !v)}>
              {showAddForm ? 'Cancel' : '+ Add'}
            </button>
          </div>
          <p className="adp-section-hint">Things that happened that aren't in your routine — gym, extra sleep, etc.</p>

          {showAddForm && (
            <div className="adp-add-form">
              <input
                className="adp-add-input"
                placeholder="Activity name (e.g. Back to sleep, Gym)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUnplanned()}
                autoFocus
              />
              <div className="adp-add-row">
                <input type="time" className="adp-actual-time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                <select
                  className="adp-duration-select"
                  value={newDuration}
                  onChange={e => setNewDuration(parseInt(e.target.value, 10))}
                >
                  {[15, 20, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360].map(d => (
                    <option key={d} value={d}>{d < 60 ? `${d}m` : `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ''}`}</option>
                  ))}
                </select>
                <button className="btn-sm" onClick={addUnplanned}>Add</button>
              </div>
            </div>
          )}

          {unplanned.length > 0 && (
            <div className="adp-unplanned-list">
              {unplanned.map(act => (
                <div key={act.id} className="adp-unplanned-row">
                  <span className="adp-unplanned-label">{act.label}</span>
                  <span className="adp-unplanned-meta">
                    {act.time} · {act.duration < 60 ? `${act.duration}m` : `${act.duration / 60}h${act.duration % 60 ? ` ${act.duration % 60}m` : ''}`}
                  </span>
                  <button className="adp-remove-btn" onClick={() => removeUnplanned(act.id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="adp-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="actual-day-panel-footer">
          <button className="btn-ghost-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || (changedCount === 0 && unplanned.length === 0)}
          >
            {saving
              ? 'Saving…'
              : changedCount > 0 || unplanned.length > 0
                ? `Save log (${changedCount} block${changedCount !== 1 ? 's' : ''}${unplanned.length > 0 ? ` + ${unplanned.length} activity` : ''})`
                : 'Nothing to save'}
          </button>
        </div>
      </div>
    </div>
  )
}
