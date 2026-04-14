import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listRoutineBlocks,
  listNodes,
  listScheduledEntries,
  listScheduledEntriesRange,
  createScheduledEntry,
  updateScheduledEntry,
  deleteScheduledEntry,
  listGCalEvents,
  suggestScheduleBlocks,
} from '../lib/api'
import type { GCalEvent, Node, RoutineBlock, ScheduledEntry, ScheduledEntryPayload, ScheduleSuggestion } from '../lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const START_HOUR      = 5    // 5 am
const END_HOUR        = 23   // 11 pm
const PX_PER_HOUR     = 80
const PX_PER_MIN      = PX_PER_HOUR / 60
const TIMELINE_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR  // 1440 px
const MIN_SLOT_MINS   = 30
const DAY_NAMES       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Pure helpers ──────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeStr(m: number): string {
  const h   = Math.floor(m / 60).toString().padStart(2, '0')
  const min = (m % 60).toString().padStart(2, '0')
  return `${h}:${min}`
}

function minuteToY(minutes: number): number {
  return (minutes - START_HOUR * 60) * PX_PER_MIN
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Returns 1=Mon … 7=Sun for a YYYY-MM-DD string. */
function dateToDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  return ((d.getDay() + 6) % 7) + 1
}

function isBlockActiveOnDate(block: RoutineBlock, dateStr: string): boolean {
  if (!block.active) return false
  if (!block.days_of_week) return true  // empty = every day
  return block.days_of_week.includes(String(dateToDayOfWeek(dateStr)))
}

/** Returns [Mon, Tue, …, Sun] dates for the ISO week containing dateStr. */
function getWeekDates(dateStr: string): string[] {
  const d   = new Date(dateStr + 'T00:00:00')
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))  // rewind to Monday
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon)
    dd.setDate(mon.getDate() + i)
    return dd.toISOString().split('T')[0]
  })
}

function formatMonthDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`
}

// ── Available slot detection ──────────────────────────────────────────────────

type Interval = { start: number; end: number }

function getAvailableSlots(
  routineBlocks: RoutineBlock[],
  entries: ScheduledEntry[],
  dateStr: string,
): Interval[] {
  const WORKING_START = START_HOUR * 60
  const WORKING_END   = END_HOUR   * 60

  const busy: Interval[] = []

  routineBlocks
    .filter(b => isBlockActiveOnDate(b, dateStr))
    .forEach(b => {
      const start = timeToMinutes(b.time_str)
      busy.push({ start, end: start + b.duration_minutes })
    })

  entries.forEach(e => {
    const start = timeToMinutes(e.time.slice(0, 5))
    busy.push({ start, end: start + e.duration_minutes })
  })

  busy.sort((a, b) => a.start - b.start)
  const merged: Interval[] = []
  for (const iv of busy) {
    if (!merged.length || iv.start > merged[merged.length - 1].end) {
      merged.push({ ...iv })
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end)
    }
  }

  const gaps: Interval[] = []
  let cursor = WORKING_START
  for (const iv of merged) {
    const slotStart = Math.max(cursor, WORKING_START)
    if (iv.start > slotStart && iv.start - slotStart >= MIN_SLOT_MINS) {
      gaps.push({ start: slotStart, end: iv.start })
    }
    cursor = Math.max(cursor, iv.end)
  }
  if (WORKING_END - cursor >= MIN_SLOT_MINS) {
    gaps.push({ start: cursor, end: WORKING_END })
  }
  return gaps
}

// ── AddEntryModal ─────────────────────────────────────────────────────────────

function AddEntryModal({
  date,
  initialTime,
  initialDuration,
  taskPool,
  onClose,
  onSaved,
}: {
  date: string
  initialTime: string
  initialDuration: number
  taskPool: Node[]
  onClose: () => void
  onSaved: () => void
}) {
  const [time, setTime]               = useState(initialTime)
  const [duration, setDuration]       = useState(initialDuration)
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [label, setLabel]             = useState('')
  const [conflictError, setConflictError] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: () => {
      const payload: ScheduledEntryPayload = {
        date,
        time:             time.length === 5 ? time + ':00' : time,
        duration_minutes: duration,
        node:             selectedNode || null,
        label:            selectedNode ? '' : label,
      }
      return createScheduledEntry(payload)
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      setConflictError((err as Error).message ?? 'Could not save — time conflict with another task.')
    },
  })

  const canSave = !createMut.isPending && (!!selectedNode || !!label.trim())

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box ds-modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Add to Schedule</h3>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={date} readOnly style={{ opacity: 0.7 }} />
        </div>
        <div className="form-group">
          <label className="form-label">Time</label>
          <input type="time" className="form-input" value={time}
            onChange={e => { setTime(e.target.value); setConflictError(null) }} />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input type="number" className="form-input" value={duration} min={15} step={15}
            onChange={e => { setDuration(Number(e.target.value)); setConflictError(null) }} />
        </div>
        <div className="form-group">
          <label className="form-label">Task from Goals</label>
          <select className="form-input" value={selectedNode}
            onChange={e => setSelectedNode(e.target.value)}>
            <option value="">— free label —</option>
            {taskPool.map(n => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>
        {!selectedNode && (
          <div className="form-group">
            <label className="form-label">Label</label>
            <input className="form-input" value={label} placeholder="e.g. Review email"
              onChange={e => setLabel(e.target.value)} />
          </div>
        )}
        {conflictError && (
          <p className="ds-conflict-error">⚠ {conflictError}</p>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => createMut.mutate()} disabled={!canSave}>
            {createMut.isPending ? 'Saving…' : 'Add to schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Conflict detection ────────────────────────────────────────────────────────

function findConflictIds(entries: ScheduledEntry[]): Set<number> {
  const ids = new Set<number>()
  for (let i = 0; i < entries.length; i++) {
    const a      = entries[i]
    const aStart = timeToMinutes(a.time.slice(0, 5))
    const aEnd   = aStart + a.duration_minutes
    for (let j = i + 1; j < entries.length; j++) {
      const b      = entries[j]
      const bStart = timeToMinutes(b.time.slice(0, 5))
      const bEnd   = bStart + b.duration_minutes
      if (aStart < bEnd && bStart < aEnd) {
        ids.add(a.id)
        ids.add(b.id)
      }
    }
  }
  return ids
}

// ── Shared Timeline Column ────────────────────────────────────────────────────
// Used both in Day view (full width) and Week view (one column per day).

function TimelineColumn({
  dateStr,
  routineBlocks,
  entries,
  gcalEvents = [],
  nowMinutes,
  isToday,
  onAddEntry,
  onDone,
  onDelete,
  compact = false,
}: {
  dateStr: string
  routineBlocks: RoutineBlock[]
  entries: ScheduledEntry[]
  gcalEvents?: GCalEvent[]
  nowMinutes: number
  isToday: boolean
  onAddEntry: (dateStr: string, time: string, duration: number) => void
  onDone: (id: number, done: boolean) => void
  onDelete: (id: number) => void
  compact?: boolean  // week view: narrower cards, no duration text
}) {
  const activeBlocks    = routineBlocks.filter(b => isBlockActiveOnDate(b, dateStr))
  const availableSlots  = getAvailableSlots(routineBlocks, entries, dateStr)
  const showNow         = isToday && nowMinutes >= START_HOUR * 60 && nowMinutes < END_HOUR * 60
  const conflictIds     = findConflictIds(entries)

  return (
    <div className="ds-events-col" style={{ height: TIMELINE_HEIGHT }}>

      {/* Grid lines */}
      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
        <div key={i} className="ds-grid-line" style={{ top: i * PX_PER_HOUR }} />
      ))}

      {/* Available slots */}
      {availableSlots.map((slot, i) => (
        <div
          key={i}
          className={`ds-slot-available${compact ? ' ds-slot-compact' : ''}`}
          style={{
            top:    minuteToY(slot.start),
            height: Math.max((slot.end - slot.start) * PX_PER_MIN, compact ? 20 : 28),
          }}
          onClick={() => onAddEntry(
            dateStr,
            minutesToTimeStr(slot.start),
            Math.min(slot.end - slot.start, 60),
          )}
        >
          {!compact && (
            <span className="ds-slot-label">+ Free {formatDuration(slot.end - slot.start)}</span>
          )}
        </div>
      ))}

      {/* Routine blocks */}
      {activeBlocks.map(block => (
        <div
          key={block.id}
          className={`ds-block ds-block-routine ds-type-${block.type}`}
          style={{
            top:    minuteToY(timeToMinutes(block.time_str)),
            height: Math.max(block.duration_minutes * PX_PER_MIN, 20),
          }}
          title={`${block.time_str} — ${block.label} (${formatDuration(block.duration_minutes)})`}
        >
          <span className="ds-block-time">{block.time_str}</span>
          <span className="ds-block-label">{block.label}</span>
          {!compact && <span className="ds-block-dur">{formatDuration(block.duration_minutes)}</span>}
        </div>
      ))}

      {/* Google Calendar events */}
      {gcalEvents.filter(ev => !ev.all_day && ev.start_time).map(ev => (
        <div
          key={ev.id}
          className="ds-block ds-block-gcal"
          style={{
            top:    minuteToY(timeToMinutes(ev.start_time!)),
            height: Math.max(ev.duration_minutes * PX_PER_MIN, 20),
          }}
          title={`${ev.start_time} — ${ev.title} (Google Calendar)`}
        >
          <span className="ds-block-time">{ev.start_time}</span>
          <span className="ds-block-label">📅 {ev.title}</span>
          {!compact && <span className="ds-block-dur">{formatDuration(ev.duration_minutes)}</span>}
        </div>
      ))}

      {/* Scheduled entries */}
      {entries.map(entry => {
        const hasConflict = conflictIds.has(entry.id)
        return (
          <div
            key={entry.id}
            className={`ds-block ds-block-entry${entry.done ? ' ds-done' : ''}${hasConflict ? ' ds-block-conflict' : ''}`}
            style={{
              top:    minuteToY(timeToMinutes(entry.time.slice(0, 5))),
              height: Math.max(entry.duration_minutes * PX_PER_MIN, 24),
            }}
            title={`${entry.time.slice(0, 5)} — ${entry.node_title || entry.label || 'Task'}${hasConflict ? ' ⚠ Time conflict' : ''}`}
          >
            <span className="ds-block-time">{entry.time.slice(0, 5)}</span>
            <span className="ds-block-label">{entry.node_title || entry.label || 'Task'}</span>
            {hasConflict && <span className="ds-conflict-badge" title="Time conflict">⚠</span>}
            {!compact && <span className="ds-block-dur">{formatDuration(entry.duration_minutes)}</span>}
            <div className="ds-entry-actions">
              <button className="ds-done-btn" title={entry.done ? 'Undo' : 'Done'}
                onClick={() => onDone(entry.id, !entry.done)}>
                {entry.done ? '↩' : '✓'}
              </button>
              <button className="ds-del-btn" title="Remove"
                onClick={() => onDelete(entry.id)}>×</button>
            </div>
          </div>
        )
      })}

      {/* Now line */}
      {showNow && (
        <div className="ds-now-line" style={{ top: minuteToY(nowMinutes) }}>
          <span className="ds-now-dot" />
        </div>
      )}
    </div>
  )
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  weekDates,
  routineBlocks,
  entriesByDate,
  nowMinutes,
  today,
  selectedDate,
  onAddEntry,
  onDone,
  onDelete,
  onSelectDay,
}: {
  weekDates: string[]
  routineBlocks: RoutineBlock[]
  entriesByDate: Map<string, ScheduledEntry[]>
  nowMinutes: number
  today: string
  selectedDate: string
  onAddEntry: (dateStr: string, time: string, duration: number) => void
  onDone: (id: number, done: boolean) => void
  onDelete: (id: number) => void
  onSelectDay: (dateStr: string) => void
}) {
  return (
    <div className="ds-week-container">

      {/* Sticky day-header row */}
      <div className="ds-week-header-row">
        <div className="ds-week-corner" />
        {weekDates.map((d, i) => (
          <button
            key={d}
            className={`ds-week-day-header${d === today ? ' ds-wday-today' : ''}${d === selectedDate ? ' ds-wday-selected' : ''}`}
            onClick={() => onSelectDay(d)}
            title={`Switch to day view: ${d}`}
          >
            <span className="ds-wday-name">{DAY_NAMES[i]}</span>
            <span className="ds-wday-date">{formatMonthDay(d)}</span>
          </button>
        ))}
      </div>

      {/* Scrollable timeline grid */}
      <div className="ds-week-scroll">
        {/* Hour labels */}
        <div className="ds-hour-labels">
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
            <div key={i} className="ds-hour-label" style={{ height: PX_PER_HOUR }}>
              {String(START_HOUR + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map(d => (
          <div key={d} className={`ds-week-day-col${d === today ? ' ds-wday-col-today' : ''}`}>
            <TimelineColumn
              dateStr={d}
              routineBlocks={routineBlocks}
              entries={entriesByDate.get(d) ?? []}
              nowMinutes={nowMinutes}
              isToday={d === today}
              onAddEntry={onAddEntry}
              onDone={onDone}
              onDelete={onDelete}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ViewMode = 'day' | 'week'
type ModalState = { date: string; time: string; duration: number }

export default function DaySchedulePage() {
  const today = new Date().toISOString().split('T')[0]

  const [view, setView]           = useState<ViewMode>('day')
  const [selectedDate, setSelectedDate] = useState(today)
  const [addModal, setAddModal]   = useState<ModalState | null>(null)

  // AI schedule suggestions
  const [aiSuggestions, setAiSuggestions]       = useState<ScheduleSuggestion[]>([])
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false)
  const [aiSuggestError, setAiSuggestError]     = useState<string | null>(null)

  const qc = useQueryClient()

  // ── Data queries ──
  const blocksQ = useQuery({ queryKey: ['routine-blocks'], queryFn: listRoutineBlocks })
  const nodesQ  = useQuery({ queryKey: ['nodes'],          queryFn: listNodes })

  const weekDates = getWeekDates(selectedDate)

  // Day-view entries
  const dayEntriesQ = useQuery({
    queryKey: ['scheduled-entries', selectedDate],
    queryFn:  () => listScheduledEntries(selectedDate),
    enabled:  view === 'day',
  })

  // Google Calendar events (silently empty if not configured)
  const gcalQ = useQuery({
    queryKey: ['gcal-events', selectedDate],
    queryFn:  () => listGCalEvents(selectedDate),
    enabled:  view === 'day',
    staleTime: 5 * 60 * 1000,  // treat as fresh for 5 minutes
  })

  // Week-view entries (one range fetch for all 7 days)
  const weekEntriesQ = useQuery({
    queryKey: ['scheduled-entries', 'week', weekDates[0]],
    queryFn:  () => listScheduledEntriesRange(weekDates[0], weekDates[6]),
    enabled:  view === 'week',
  })

  const routineBlocks = blocksQ.data  ?? []
  const allNodes      = nodesQ.data   ?? []
  const dayEntries    = dayEntriesQ.data ?? []
  const gcalEvents    = gcalQ.data    ?? []

  // Build date→entries map for week view
  const entriesByDate = useMemo<Map<string, ScheduledEntry[]>>(() => {
    const map = new Map<string, ScheduledEntry[]>()
    if (weekEntriesQ.data) {
      for (const e of weekEntriesQ.data) {
        if (!map.has(e.date)) map.set(e.date, [])
        map.get(e.date)!.push(e)
      }
    }
    return map
  }, [weekEntriesQ.data])

  // Live "now" indicator
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date(); setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(iv)
  }, [])

  // Task pool
  const scheduledNodeIds = new Set(dayEntries.map(e => e.node).filter(Boolean) as string[])
  const taskPool = allNodes.filter(n =>
    n.status !== 'done' &&
    (n.type === 'task' || n.type === 'sub_task') &&
    !scheduledNodeIds.has(n.id),
  )
  const todayFocusNodes = allNodes.filter(
    n => n.focus_date === selectedDate && n.status !== 'done',
  )
  const modalPool = [
    ...todayFocusNodes,
    ...taskPool.filter(n => !todayFocusNodes.some(f => f.id === n.id)),
  ]

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['scheduled-entries'] })
  }

  const deleteMut = useMutation({ mutationFn: deleteScheduledEntry, onSuccess: invalidate })
  const doneMut   = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => updateScheduledEntry(id, { done }),
    onSuccess: invalidate,
  })

  // Navigation
  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dayCount     = view === 'week' ? 7 : 1
  const prevLabel    = view === 'week' ? '‹ Week' : '‹'
  const nextLabel    = view === 'week' ? 'Week ›' : '›'

  // Stats for header
  const activeBlocksToday = routineBlocks.filter(b => isBlockActiveOnDate(b, selectedDate))
  const availSlotsToday   = getAvailableSlots(routineBlocks, dayEntries, selectedDate)

  async function handleAISuggest() {
    setAiSuggestLoading(true)
    setAiSuggestError(null)
    try {
      const res = await suggestScheduleBlocks(selectedDate)
      setAiSuggestions(res.suggestions)
      if (res.suggestions.length === 0) setAiSuggestError('No suggestions — add more tasks or free up some time slots.')
    } catch {
      setAiSuggestError('Could not load suggestions. Try again.')
    } finally {
      setAiSuggestLoading(false)
    }
  }

  function dismissSuggestion(idx: number) {
    setAiSuggestions(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="ds-page">

      {/* ── Header ── */}
      <div className="ds-header">

        {/* View toggle */}
        <div className="ds-view-toggle">
          <button className={`ds-view-btn${view === 'day' ? ' active' : ''}`}
            onClick={() => setView('day')}>Day</button>
          <button className={`ds-view-btn${view === 'week' ? ' active' : ''}`}
            onClick={() => setView('week')}>Week</button>
        </div>

        {/* Date navigation */}
        <button className="btn-ghost-sm" onClick={() => shiftDate(-dayCount)}>{prevLabel}</button>
        <input type="date" className="ds-date-input" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)} />
        <button className="btn-ghost-sm" onClick={() => shiftDate(dayCount)}>{nextLabel}</button>
        {selectedDate !== today && (
          <button className="btn-ghost-sm" onClick={() => setSelectedDate(today)}>Today</button>
        )}

        {/* Stats (day view only) */}
        {view === 'day' && (
          <span className="ds-header-info">
            {activeBlocksToday.length} block{activeBlocksToday.length !== 1 ? 's' : ''} ·{' '}
            {dayEntries.length} scheduled ·{' '}
            {availSlotsToday.length} free slot{availSlotsToday.length !== 1 ? 's' : ''}
            {gcalEvents.length > 0 && ` · 📅 ${gcalEvents.length} meeting${gcalEvents.length !== 1 ? 's' : ''}`}
          </span>
        )}

        {/* AI Schedule Suggestions button (day view only) */}
        {view === 'day' && (
          <button
            className="btn-ghost-sm ds-ai-suggest-btn"
            onClick={handleAISuggest}
            disabled={aiSuggestLoading}
            title="Get AI suggestions for scheduling your top tasks into free slots"
          >
            {aiSuggestLoading ? '…' : '💡 AI Suggest'}
          </button>
        )}
        {view === 'week' && (
          <span className="ds-header-info">
            Week of {formatMonthDay(weekDates[0])} – {formatMonthDay(weekDates[6])}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      {view === 'day' && (
        <div className="ds-body">

          {/* AI suggestion cards */}
          {(aiSuggestions.length > 0 || aiSuggestError) && (
            <div className="ds-ai-banner">
              {aiSuggestError && (
                <p className="ds-ai-error">{aiSuggestError}</p>
              )}
              {aiSuggestions.map((s, i) => (
                <div key={i} className="ds-ai-card">
                  <div className="ds-ai-card-body">
                    <div className="ds-ai-card-title">
                      <strong>{s.node_title}</strong>
                      <span className="ds-ai-card-time"> @ {s.start_time} ({s.duration_minutes}m)</span>
                    </div>
                    <p className="ds-ai-card-reason">{s.reason}</p>
                  </div>
                  <div className="ds-ai-card-actions">
                    <button
                      className="btn-sm"
                      onClick={() => {
                        setAddModal({ date: selectedDate, time: s.start_time, duration: s.duration_minutes })
                        dismissSuggestion(i)
                      }}
                    >
                      Add to schedule
                    </button>
                    <button className="btn-ghost-sm" onClick={() => dismissSuggestion(i)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Day timeline */}
          <div className="ds-timeline-wrap">
            <div className="ds-hour-labels">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div key={i} className="ds-hour-label" style={{ height: PX_PER_HOUR }}>
                  {String(START_HOUR + i).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            <TimelineColumn
              dateStr={selectedDate}
              routineBlocks={routineBlocks}
              entries={dayEntries}
              gcalEvents={gcalEvents}
              nowMinutes={nowMinutes}
              isToday={selectedDate === today}
              onAddEntry={(d, time, dur) => setAddModal({ date: d, time, duration: dur })}
              onDone={(id, done) => doneMut.mutate({ id, done })}
              onDelete={id => deleteMut.mutate(id)}
            />
          </div>

          {/* Right task panel */}
          <div className="ds-task-panel">
            {todayFocusNodes.length > 0 && (
              <div className="ds-panel-section">
                <div className="ds-panel-heading">📅 Today's Focus</div>
                {todayFocusNodes.map(n => (
                  <div key={n.id} className="ds-pool-item ds-pool-focus"
                    onClick={() => setAddModal({
                      date: selectedDate,
                      time: minutesToTimeStr(Math.max(nowMinutes, START_HOUR * 60)),
                      duration: 60,
                    })}>
                    <span className="ds-pool-title">{n.title}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="ds-panel-section">
              <div className="ds-panel-heading">Task Pool</div>
              {taskPool.length === 0
                ? <div className="ds-pool-empty">No unscheduled tasks</div>
                : taskPool.map(n => (
                  <div key={n.id} className="ds-pool-item"
                    onClick={() => setAddModal({
                      date: selectedDate,
                      time: minutesToTimeStr(Math.max(nowMinutes, START_HOUR * 60)),
                      duration: 60,
                    })}>
                    <span className="ds-pool-type">{n.type === 'sub_task' ? 'sub' : n.type}</span>
                    <span className="ds-pool-title">{n.title}</span>
                  </div>
                ))
              }
            </div>
            <div className="ds-panel-section">
              <button className="btn-ghost-sm" style={{ width: '100%' }}
                onClick={() => setAddModal({
                  date: selectedDate,
                  time: minutesToTimeStr(Math.max(nowMinutes, START_HOUR * 60)),
                  duration: 60,
                })}>
                + Add entry manually
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'week' && (
        <WeekView
          weekDates={weekDates}
          routineBlocks={routineBlocks}
          entriesByDate={entriesByDate}
          nowMinutes={nowMinutes}
          today={today}
          selectedDate={selectedDate}
          onAddEntry={(d, time, dur) => setAddModal({ date: d, time, duration: dur })}
          onDone={(id, done) => doneMut.mutate({ id, done })}
          onDelete={id => deleteMut.mutate(id)}
          onSelectDay={d => { setSelectedDate(d); setView('day') }}
        />
      )}

      {/* ── Modal ── */}
      {addModal && (
        <AddEntryModal
          date={addModal.date}
          initialTime={addModal.time}
          initialDuration={addModal.duration}
          taskPool={modalPool}
          onClose={() => setAddModal(null)}
          onSaved={() => { setAddModal(null); invalidate() }}
        />
      )}
    </div>
  )
}
