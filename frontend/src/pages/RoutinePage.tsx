import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRoutineLogs,
  getRoutineStreak,
  getRoutineMetrics,
  getRoutineAnalytics,
  getRoutineNotes,
  getRoutineBriefing,
  saveRoutineLog,
  listRoutineBlocks,
  createRoutineBlock,
  updateRoutineBlock,
  deleteRoutineBlock,
  reorderRoutineBlocks,
  listNodes,
} from '../lib/api'
import type {
  RoutineBlock, RoutineLogEntry, RoutineMetrics, Node,
  RoutineDailyEntry, RoutineTypeStats, RoutineBlockStat,
} from '../lib/types'

// ── Constants ──────────────────────────────────────────────────────────────

type BlockType = RoutineBlock['type']

const TYPE_COLORS: Record<BlockType, string> = {
  spiritual: '#7c3aed',
  health:    '#16a34a',
  work:      '#2563eb',
  personal:  '#6b7280',
  family:    '#db2777',
}

const STATUS_LABELS = [
  { value: 'done',    label: '✓ Done' },
  { value: 'partial', label: '~ Partial' },
  { value: 'late',    label: '⏰ Late' },
  { value: 'skipped', label: '✕ Skipped' },
]

const DAYS = [
  { digit: '1', label: 'Mon' },
  { digit: '2', label: 'Tue' },
  { digit: '3', label: 'Wed' },
  { digit: '4', label: 'Thu' },
  { digit: '5', label: 'Fri' },
  { digit: '6', label: 'Sat' },
  { digit: '7', label: 'Sun' },
]

// ── Helpers ───────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA')
}

function fmtDuration(mins: number): string {
  if (mins <= 0) return '—'
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60}m`
  return `${mins}m`
}

function blockHasPassed(blockTime: string): boolean {
  const [h, m] = blockTime.split(':').map(Number)
  const cairoTime = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const [nowH, nowM] = cairoTime.split(':').map(Number)
  return nowH * 60 + nowM > h * 60 + m
}

function toggleDay(prev: string, digit: string): string {
  return prev.includes(digit)
    ? prev.split('').filter(d => d !== digit).sort().join('')
    : [...prev.split(''), digit].sort().join('')
}

// ── Block Context (detail summary shown inside expanded log panel) ────────

function BlockContext({ block, onEdit }: { block: RoutineBlock; onEdit: () => void }) {
  const hasDetails = !!(
    block.description || block.location || block.target ||
    block.exercise_type || block.intensity ||
    block.focus_area || block.deliverable ||
    block.days_of_week || block.linked_node_title
  )
  if (!hasDetails) return (
    <div className="routine-block-context routine-block-context-empty">
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No details added yet.</span>
      <button className="routine-ctx-edit-btn" onClick={onEdit}>✏ Add details</button>
    </div>
  )

  return (
    <div className="routine-block-context">
      <div className="routine-ctx-top">
        {block.description && (
          <p className="routine-ctx-description">{block.description}</p>
        )}
        <button className="routine-ctx-edit-btn" onClick={onEdit} title="Edit block details">
          ✏ Edit
        </button>
      </div>
      <div className="routine-ctx-chips">
        {block.type === 'spiritual' && block.location && (
          <span className="routine-ctx-chip ctx-spiritual">
            {block.location === 'mosque' ? '🕌' : block.location === 'home' ? '🏠' : '💻'} {block.location}
          </span>
        )}
        {block.type === 'spiritual' && block.target && (
          <span className="routine-ctx-chip ctx-spiritual">{block.target}</span>
        )}
        {block.type === 'health' && block.exercise_type && (
          <span className="routine-ctx-chip ctx-health">{block.exercise_type}</span>
        )}
        {block.type === 'health' && block.intensity && (
          <span className={`routine-ctx-chip ctx-intensity-${block.intensity}`}>
            {block.intensity === 'high' ? '🔴' : block.intensity === 'medium' ? '🟡' : '🟢'} {block.intensity}
          </span>
        )}
        {block.type === 'work' && block.focus_area && (
          <span className="routine-ctx-chip ctx-work">{block.focus_area.replace('_', ' ')}</span>
        )}
        {block.type === 'work' && block.deliverable && (
          <span className="routine-ctx-chip ctx-work" title="Deliverable">📋 {block.deliverable}</span>
        )}
        {block.days_of_week && (
          <span className="routine-ctx-chip ctx-days">
            📅 {block.days_of_week.split('').map(d =>
              ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][Number(d) - 1]
            ).join(' · ')} only
          </span>
        )}
        {block.linked_node_title && (
          <span className="routine-ctx-chip ctx-goal">
            🎯 {block.linked_node_title}
            {block.linked_node_progress != null && block.linked_node_progress > 0
              ? ` (${block.linked_node_progress}%)` : null}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Block Notes History ────────────────────────────────────────────────────

type NoteEntry = { date: string; status: string; actual_time: string | null; note: string }

function BlockNotesHistory({ blockTime }: { blockTime: string }) {
  const { data = [], isLoading } = useQuery<NoteEntry[]>({
    queryKey: ['routine-notes', blockTime],
    queryFn: () => getRoutineNotes(blockTime, 5),
    staleTime: 2 * 60 * 1000,
  })

  if (isLoading) return null

  return (
    <div className="block-notes-history">
      <div className="block-notes-title">Past notes</div>
      {data.length === 0 ? (
        <p className="block-notes-empty">No notes logged yet.</p>
      ) : (
        data.map((entry, i) => (
          <div key={i} className="block-note-entry">
            <div className="block-note-meta">
              <span className="block-note-date">
                {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span className={`block-note-status note-status-${entry.status}`}>{entry.status}</span>
            </div>
            <span className="block-note-text">{entry.note}</span>
          </div>
        ))
      )}
    </div>
  )
}

// ── Block Row ──────────────────────────────────────────────────────────────

function BlockRow({
  block,
  log,
  missedYesterday,
  onSave,
  onEdit,
}: {
  block: RoutineBlock
  log: RoutineLogEntry | undefined
  missedYesterday: boolean
  onSave: (entry: { block_time: string; status: string; actual_time?: string; note?: string }) => void
  onEdit: () => void
}) {
  const [expanded, setExpanded] = useState(false)
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
    <div className={`routine-row ${log?.status ? `logged-${log.status}` : ''} ${!log?.status && missedYesterday ? 'missed-yesterday' : ''}`}>
      <div className="routine-row-main" onClick={() => setExpanded(p => !p)}>
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

// ── AI Morning Briefing ────────────────────────────────────────────────────

function AIMorningBriefing() {
  const today = todayStr()
  const cacheKey = `routine-briefing-${today}`

  const [open, setOpen] = useState(false)
  const [briefing, setBriefing] = useState<string | null>(() => {
    try { return localStorage.getItem(cacheKey) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [isFallback, setIsFallback] = useState(false)

  async function fetchBriefing() {
    if (briefing) { setOpen(true); return }
    setLoading(true)
    try {
      const result = await getRoutineBriefing()
      setBriefing(result.briefing)
      setIsFallback(result.fallback)
      try { localStorage.setItem(cacheKey, result.briefing) } catch { /* storage full */ }
      setOpen(true)
    } catch {
      setBriefing('Could not load briefing — check your AI configuration.')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  function refresh() {
    setBriefing(null)
    try { localStorage.removeItem(cacheKey) } catch { /* ignore */ }
    setLoading(true)
    setOpen(true)
    getRoutineBriefing().then(r => {
      setBriefing(r.briefing)
      setIsFallback(r.fallback)
      try { localStorage.setItem(cacheKey, r.briefing) } catch { /* ignore */ }
    }).catch(() => {
      setBriefing('Could not load briefing.')
    }).finally(() => setLoading(false))
  }

  const bullets = briefing?.split('\n').filter(l => l.trim()) ?? []

  return (
    <div className={`ra-briefing-card${open ? ' open' : ''}`}>
      <div className="ra-briefing-header" onClick={() => open ? setOpen(false) : fetchBriefing()}>
        <span className="ra-briefing-icon">✨</span>
        <span className="ra-briefing-title">Today's focus</span>
        {briefing && !loading && (
          <button
            className="ra-briefing-refresh"
            onClick={e => { e.stopPropagation(); refresh() }}
            title="Regenerate"
          >↻</button>
        )}
        {isFallback && briefing && <span className="ra-briefing-fallback-tag">offline</span>}
        <span className="ra-briefing-chevron">{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="ra-briefing-body">
          {loading ? (
            <p className="ra-briefing-loading">Generating…</p>
          ) : (
            <ul className="ra-briefing-bullets">
              {bullets.map((line, i) => (
                <li key={i} className="ra-briefing-bullet">
                  {line.replace(/^[•\-]\s*/, '')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Weekly Grid ────────────────────────────────────────────────────────────

function WeeklyGrid({ total }: { total: number }) {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA')
  })

  const results = useQueries({
    queries: dates.map(date => ({
      queryKey: ['routine-logs', date],
      queryFn: () => getRoutineLogs(date),
    })),
  })

  const blockTotal = total > 0 ? total : 20

  return (
    <div className="weekly-grid">
      {dates.map((date, i) => {
        const logs = results[i].data || []
        const done = logs.filter(l => l.status === 'done' || l.status === 'partial').length
        const pct = Math.round((done / blockTotal) * 100)
        const d = new Date(date + 'T00:00:00')
        const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' })
        const isToday = date === todayStr()
        return (
          <div key={date} className={`weekly-cell ${isToday ? 'weekly-cell-today' : ''}`}>
            <span className="weekly-day">{dayName}</span>
            <div className="weekly-bar-wrap">
              <div
                className="weekly-bar-fill"
                style={{
                  height: `${pct}%`,
                  background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#e5e7eb',
                }}
              />
            </div>
            <span className="weekly-pct">{pct > 0 ? `${pct}%` : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Metrics Panel ──────────────────────────────────────────────────────────

function RateDot({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return <span style={{ color, fontWeight: 700 }}>{pct}%</span>
}

function MetricsPanel() {
  const { data: m } = useQuery<RoutineMetrics>({
    queryKey: ['routine-metrics'],
    queryFn: () => getRoutineMetrics(30),
    staleTime: 5 * 60 * 1000,
  })

  if (!m) return null

  return (
    <div className="routine-metrics">
      <div className="routine-metric-card">
        <span className="routine-metric-icon">🕌</span>
        <div className="routine-metric-body">
          <span className="routine-metric-label">Prayer (30d)</span>
          <span className="routine-metric-value"><RateDot pct={m.prayer_rate} /></span>
        </div>
        {m.prayer_streak > 0 && (
          <span className="routine-metric-streak">🔥 {m.prayer_streak}d</span>
        )}
      </div>
      <div className="routine-metric-card">
        <span className="routine-metric-icon">💪</span>
        <div className="routine-metric-body">
          <span className="routine-metric-label">Exercise (30d)</span>
          <span className="routine-metric-value"><RateDot pct={m.exercise_rate} /></span>
        </div>
        {m.exercise_streak > 0 && (
          <span className="routine-metric-streak">🔥 {m.exercise_streak}d</span>
        )}
      </div>
    </div>
  )
}

// ── Block Edit Panel ───────────────────────────────────────────────────────

function BlockEditPanel({
  block,
  linkableNodes,
  onClose,
  onSaved,
}: {
  block: RoutineBlock | null
  linkableNodes: Node[]
  onClose: () => void
  onSaved: () => void
}) {
  const [label, setLabel] = useState(block?.label ?? '')
  const [time, setTime] = useState(block?.time_str ?? '08:00')
  const [type, setType] = useState<BlockType>(block?.type ?? 'work')
  const [importance, setImportance] = useState<'must' | 'should' | 'nice'>(block?.importance ?? 'should')
  const [durationMinutes, setDurationMinutes] = useState(block?.duration_minutes ?? 30)
  const [isFixed, setIsFixed] = useState(block?.is_fixed ?? false)
  const [linkedNode, setLinkedNode] = useState<string | null>(block?.linked_node ?? null)
  const [description, setDescription] = useState(block?.description ?? '')
  const [daysOfWeek, setDaysOfWeek] = useState(block?.days_of_week ?? '')
  // Spiritual
  const [location, setLocation] = useState(block?.location ?? '')
  const [target, setTarget] = useState(block?.target ?? '')
  // Health
  const [exerciseType, setExerciseType] = useState(block?.exercise_type ?? '')
  const [intensity, setIntensity] = useState(block?.intensity ?? '')
  // Work
  const [focusArea, setFocusArea] = useState(block?.focus_area ?? '')
  const [deliverable, setDeliverable] = useState(block?.deliverable ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!label.trim()) { setError('Label is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<RoutineBlock> = {
        label: label.trim(), time, type, importance,
        duration_minutes: durationMinutes, is_fixed: isFixed,
        linked_node: linkedNode,
        description, days_of_week: daysOfWeek,
        location, target,
        exercise_type: exerciseType, intensity,
        focus_area: focusArea, deliverable,
      }
      if (block) {
        await updateRoutineBlock(block.id, payload)
      } else {
        await createRoutineBlock({ ...payload, active: true, order: 9999 })
      }
      onSaved()
    } catch {
      setError('Save failed — check your inputs.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel bep-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="side-panel-header">
          <span className="side-panel-icon" style={{ color: TYPE_COLORS[type], fontSize: 18 }}>◉</span>
          <h3 className="side-panel-title">{block ? block.label || 'Edit block' : 'New block'}</h3>
          <button className="side-panel-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="side-panel-body">

          {/* Core fields */}
          <div className="sp-field">
            <label className="sp-label">Label</label>
            <input className="form-input" value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Block label…" autoFocus />
          </div>

          <div className="sp-row">
            <div className="sp-field">
              <label className="sp-label">Start time</label>
              <input className="form-input" type="time" value={time}
                onChange={e => setTime(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label">Duration (min)</label>
              <input className="form-input" type="number" min={5} max={720}
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))} />
            </div>
          </div>

          <div className="sp-row">
            <div className="sp-field">
              <label className="sp-label">Type</label>
              <select className="form-input" value={type}
                onChange={e => setType(e.target.value as BlockType)}>
                <option value="spiritual">🕌 Spiritual</option>
                <option value="health">💪 Health</option>
                <option value="work">💼 Work</option>
                <option value="personal">🧘 Personal</option>
                <option value="family">👨‍👩‍👧 Family</option>
              </select>
            </div>
            <div className="sp-field">
              <label className="sp-label">Commitment</label>
              <label className="bep-toggle-row">
                <input type="checkbox" checked={isFixed}
                  onChange={e => setIsFixed(e.target.checked)} />
                <span style={{ color: isFixed ? 'var(--text)' : 'var(--text-muted)' }}>
                  {isFixed ? 'Fixed (committed)' : 'Flexible'}
                </span>
              </label>
            </div>
          </div>

          {/* Importance */}
          <div className="sp-field">
            <label className="sp-label">Importance</label>
            <div className="bep-importance-row">
              {(['must', 'should', 'nice'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  className={`bep-importance-btn importance-${level}${importance === level ? ' active' : ''}`}
                  onClick={() => setImportance(level)}
                >
                  {level === 'must' ? '🔴 Must' : level === 'should' ? '🟡 Should' : '🟢 Nice'}
                </button>
              ))}
            </div>
            <p className="sp-hint-inline" style={{ marginTop: 4 }}>
              {importance === 'must' ? 'Non-negotiable — weights 3× in your core score'
                : importance === 'should' ? 'Regular habit — weights 2× in your core score'
                : 'Bonus — skipping isn\'t failure (1× weight)'}
            </p>
          </div>

          {/* Days of week */}
          <div className="sp-field">
            <label className="sp-label">
              Days active{' '}
              <span className="sp-hint-inline">
                {daysOfWeek === '' ? '(every day)' : `(${daysOfWeek.split('').map(d => DAYS.find(x => x.digit === d)?.label).join(', ')})`}
              </span>
            </label>
            <div className="bep-day-chips">
              {DAYS.map(d => (
                <button
                  key={d.digit}
                  type="button"
                  className={`bep-day-chip${daysOfWeek.includes(d.digit) ? ' active' : ''}`}
                  onClick={() => setDaysOfWeek(prev => toggleDay(prev, d.digit))}
                >
                  {d.label}
                </button>
              ))}
              {daysOfWeek !== '' && (
                <button type="button" className="btn-ghost-sm" style={{ fontSize: 11 }}
                  onClick={() => setDaysOfWeek('')}>
                  every day
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="sp-field">
            <label className="sp-label">Description / notes</label>
            <textarea className="form-input" rows={2} value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Why this block exists…" />
          </div>

          {/* Spiritual-specific */}
          {type === 'spiritual' && (
            <div className="bep-type-section bep-type-spiritual">
              <div className="bep-type-header">Spiritual details</div>
              <div className="sp-row">
                <div className="sp-field">
                  <label className="sp-label">Location</label>
                  <select className="form-input" value={location}
                    onChange={e => setLocation(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="mosque">🕌 Mosque</option>
                    <option value="home">🏠 Home</option>
                    <option value="online">💻 Online</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">Target / goal</label>
                  <input className="form-input" value={target}
                    onChange={e => setTarget(e.target.value)}
                    placeholder="1 juz, adhkar…" />
                </div>
              </div>
            </div>
          )}

          {/* Health-specific */}
          {type === 'health' && (
            <div className="bep-type-section bep-type-health">
              <div className="bep-type-header">Health details</div>
              <div className="sp-row">
                <div className="sp-field">
                  <label className="sp-label">Exercise type</label>
                  <select className="form-input" value={exerciseType}
                    onChange={e => setExerciseType(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="cardio">Cardio</option>
                    <option value="strength">Strength</option>
                    <option value="yoga">Yoga</option>
                    <option value="hiit">HIIT</option>
                    <option value="swimming">Swimming</option>
                    <option value="cycling">Cycling</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">Intensity</label>
                  <select className="form-input" value={intensity}
                    onChange={e => setIntensity(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Work-specific */}
          {type === 'work' && (
            <div className="bep-type-section bep-type-work">
              <div className="bep-type-header">Work details</div>
              <div className="sp-row">
                <div className="sp-field">
                  <label className="sp-label">Focus area</label>
                  <select className="form-input" value={focusArea}
                    onChange={e => setFocusArea(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="deep_work">Deep work</option>
                    <option value="email">Email / comms</option>
                    <option value="calls">Calls / meetings</option>
                    <option value="admin">Admin</option>
                    <option value="outreach">Outreach</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">Deliverable</label>
                  <input className="form-input" value={deliverable}
                    onChange={e => setDeliverable(e.target.value)}
                    placeholder="Expected output…" />
                </div>
              </div>
            </div>
          )}

          {/* Linked goal */}
          <div className="sp-field">
            <label className="sp-label">Linked goal / project</label>
            <select className="form-input"
              value={linkedNode ?? ''}
              onChange={e => setLinkedNode(e.target.value || null)}>
              <option value="">— no link —</option>
              {linkableNodes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Footer */}
        <div className="side-panel-footer">
          {error && <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>}
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !label.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}

// ── Routine Analytics ──────────────────────────────────────────────────────

const TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  spiritual: { label: 'Spiritual', icon: '🕌', color: '#7c3aed' },
  health:    { label: 'Health',    icon: '💪', color: '#16a34a' },
  work:      { label: 'Work',      icon: '💼', color: '#2563eb' },
  personal:  { label: 'Personal',  icon: '🧘', color: '#6b7280' },
  family:    { label: 'Family',    icon: '👨‍👩‍👧', color: '#db2777' },
}

function heatLevel(pct: number): '0' | '1' | '2' | '3' {
  if (pct === 0) return '0'
  if (pct < 50)  return '1'
  if (pct < 80)  return '2'
  return '3'
}

function CompletionHeatmap({ daily }: { daily: RoutineDailyEntry[] }) {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = new Date(sorted[0]?.date + 'T00:00:00')
  const firstDow = (firstDate.getDay() + 6) % 7  // 0 = Mon

  const padded: (RoutineDailyEntry | null)[] = [...Array(firstDow).fill(null), ...sorted]
  const weeks: (RoutineDailyEntry | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  return (
    <div className="ra-heatmap-wrap">
      <div className="ra-heatmap-days">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="ra-heatmap-day-label">{d}</span>
        ))}
      </div>
      <div className="ra-heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="ra-heatmap-week">
            {week.map((day, di) => (
              <div
                key={di}
                className={`ra-heatmap-cell${day ? ` heat-${heatLevel(day.pct)}` : ' heat-empty'}`}
                title={day
                  ? `${day.date}: ${day.pct}% — ✓${day.done} ~${day.partial} ⏰${day.late} ✕${day.skipped}`
                  : ''}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBreakdown({ daily, totalBlocks }: { daily: RoutineDailyEntry[]; totalBlocks: number }) {
  const last30 = [...daily]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .reverse()
  const tb = totalBlocks || 1

  return (
    <div className="ra-breakdown">
      {last30.map(d => {
        const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const isToday = d.date === new Date().toLocaleDateString('en-CA')
        return (
          <div key={d.date} className={`ra-breakdown-row${isToday ? ' ra-today' : ''}`}>
            <span className="ra-breakdown-label">{label}</span>
            <div className="ra-stacked-bar">
              {d.done    > 0 && <div className="ra-seg ra-seg-done"    style={{ width: `${d.done/tb*100}%`    }} title={`Done: ${d.done}`} />}
              {d.partial > 0 && <div className="ra-seg ra-seg-partial" style={{ width: `${d.partial/tb*100}%` }} title={`Partial: ${d.partial}`} />}
              {d.late    > 0 && <div className="ra-seg ra-seg-late"    style={{ width: `${d.late/tb*100}%`    }} title={`Late: ${d.late}`} />}
              {d.skipped > 0 && <div className="ra-seg ra-seg-skipped" style={{ width: `${d.skipped/tb*100}%` }} title={`Skipped: ${d.skipped}`} />}
            </div>
            <span className="ra-breakdown-pct">{d.pct > 0 ? `${d.pct}%` : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

function TypeCards({ byType }: { byType: Record<string, RoutineTypeStats> }) {
  const entries = Object.entries(byType).sort((a, b) => b[1].rate - a[1].rate)
  return (
    <div className="ra-type-cards">
      {entries.map(([type, stats]) => {
        const info = TYPE_INFO[type] ?? { label: type, icon: '●', color: '#6b7280' }
        return (
          <div key={type} className="ra-type-card">
            <div className="ra-type-card-top">
              <span className="ra-type-icon">{info.icon}</span>
              <span className="ra-type-label">{info.label}</span>
              <span className="ra-type-rate" style={{ color: info.color }}>{stats.rate}%</span>
            </div>
            <div className="ra-type-bar-bg">
              <div className="ra-type-bar-fill" style={{ width: `${stats.rate}%`, background: info.color }} />
            </div>
            <div className="ra-type-counts">
              <span className="ra-count-done">✓ {stats.done}</span>
              <span className="ra-count-partial">~ {stats.partial}</span>
              <span className="ra-count-late">⏰ {stats.late}</span>
              <span className="ra-count-skipped">✕ {stats.skipped}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BlockStatsTable({ blockStats }: { blockStats: RoutineBlockStat[] }) {
  const [sortBy, setSortBy] = useState<'rate' | 'done' | 'skipped' | 'late'>('rate')
  const sorted = [...blockStats].sort((a, b) => {
    if (sortBy === 'rate') return a.rate - b.rate
    if (sortBy === 'done') return b.done - a.done
    if (sortBy === 'skipped') return b.skipped - a.skipped
    if (sortBy === 'late') return b.late - a.late
    return 0
  })

  function SortBtn({ col, label }: { col: typeof sortBy; label: string }) {
    return (
      <button
        className={`ra-sort-btn${sortBy === col ? ' active' : ''}`}
        onClick={() => setSortBy(col)}
      >{label}</button>
    )
  }

  return (
    <div className="ra-block-table-wrap">
      <div className="ra-sort-row">
        Sort: <SortBtn col="rate" label="% rate" /> <SortBtn col="done" label="done" />
        <SortBtn col="skipped" label="skipped" /> <SortBtn col="late" label="late" />
      </div>
      <div className="ra-block-table">
        {sorted.map(bs => {
          const info = TYPE_INFO[bs.type] ?? { color: '#6b7280' }
          return (
            <div key={bs.block_id} className="ra-block-row">
              <span className="ra-block-time">{bs.time_str}</span>
              <span className="ra-block-dot" style={{ background: info.color }} />
              <span className="ra-block-label">{bs.label}</span>
              <div className="ra-block-mini-bar-bg">
                <div
                  className="ra-block-mini-bar-fill"
                  style={{
                    width: `${bs.rate}%`,
                    background: bs.rate >= 80 ? '#16a34a' : bs.rate >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <span className="ra-block-rate-num">{bs.rate}%</span>
              <div className="ra-block-counts">
                <span className="ra-count-done">✓{bs.done}</span>
                <span className="ra-count-partial">~{bs.partial}</span>
                <span className="ra-count-late">⏰{bs.late}</span>
                <span className="ra-count-skipped">✕{bs.skipped}</span>
              </div>
              {bs.avg_drift_minutes !== null && (
                <span className={`ra-drift ${bs.avg_drift_minutes > 15 ? 'ra-drift-late' : bs.avg_drift_minutes < -5 ? 'ra-drift-early' : 'ra-drift-ok'}`}>
                  {bs.avg_drift_minutes > 0 ? `+${bs.avg_drift_minutes}` : bs.avg_drift_minutes}m
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekdayHeatmap({ byWeekday }: { byWeekday: Record<string, Record<string, number>> }) {
  const typeOrder = ['spiritual', 'health', 'work', 'personal', 'family']
  const types = typeOrder.filter(t => byWeekday[t])
  if (types.length === 0) return null

  return (
    <div className="ra-weekday-grid">
      {/* Header */}
      <div className="ra-weekday-header-row">
        <span className="ra-weekday-type-label" />
        {DAY_SHORT.map(d => (
          <span key={d} className="ra-weekday-day-header">{d}</span>
        ))}
      </div>
      {/* Type rows */}
      {types.map(type => {
        const info = TYPE_INFO[type] ?? { icon: '●', label: type, color: '#6b7280' }
        const wdRates = byWeekday[type] || {}
        return (
          <div key={type} className="ra-weekday-row">
            <span className="ra-weekday-type-label">
              <span style={{ marginRight: 5 }}>{info.icon}</span>{info.label}
            </span>
            {DAY_DIGITS.map(d => {
              const rate = wdRates[d] ?? 0
              const level = heatLevel(rate)
              return (
                <span
                  key={d}
                  className={`ra-weekday-cell heat-${level}`}
                  title={`${info.label} on ${DAY_SHORT[Number(d) - 1]}: ${rate}%`}
                >
                  <span className="ra-weekday-pct">{rate > 0 ? `${rate}` : ''}</span>
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function RoutineAnalyticsView({ blocks }: { blocks: RoutineBlock[] }) {
  const [days, setDays] = useState(90)
  const { data, isLoading } = useQuery({
    queryKey: ['routine-analytics', days],
    queryFn: () => getRoutineAnalytics(days),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="ra-page">

      {/* Lookback selector */}
      <div className="ra-controls">
        <span className="ra-controls-label">Lookback:</span>
        {([30, 60, 90] as const).map(d => (
          <button
            key={d}
            className={`btn-ghost-sm${days === d ? ' active' : ''}`}
            onClick={() => setDays(d)}
          >{d} days</button>
        ))}
      </div>

      {isLoading || !data ? (
        <p style={{ padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading analytics…</p>
      ) : (
        <>
          {/* ── Heatmap ── */}
          <div className="ra-section">
            <div className="ra-section-head">
              <h3 className="ra-section-title">Completion heatmap</h3>
              <div className="ra-heatmap-legend">
                <span className="ra-legend-label">Less</span>
                <span className="ra-heatmap-cell heat-0" />
                <span className="ra-heatmap-cell heat-1" />
                <span className="ra-heatmap-cell heat-2" />
                <span className="ra-heatmap-cell heat-3" />
                <span className="ra-legend-label">More</span>
              </div>
            </div>
            <CompletionHeatmap daily={data.daily} />
          </div>

          {/* ── Time investment ── */}
          <div className="ra-section">
            <h3 className="ra-section-title">Scheduled time / day</h3>
            <TimeInvestmentSummary blocks={blocks} />
          </div>

          {/* ── By type ── */}
          <div className="ra-section">
            <h3 className="ra-section-title">Completion by type</h3>
            <TypeCards byType={data.by_type} />
          </div>

          {/* ── Weekday heatmap ── */}
          {data.by_weekday && Object.keys(data.by_weekday).length > 0 && (
            <div className="ra-section">
              <h3 className="ra-section-title">Performance by day of week</h3>
              <p className="ra-section-sub">Completion rate per type per weekday — reveals patterns like "always skip Sunday."</p>
              <WeekdayHeatmap byWeekday={data.by_weekday} />
            </div>
          )}

          {/* ── Status breakdown ── */}
          <div className="ra-section">
            <div className="ra-section-head">
              <h3 className="ra-section-title">Daily breakdown — last 30 days</h3>
              <div className="ra-bar-legend">
                <span className="ra-bar-legend-dot" style={{ background: '#16a34a' }} />Done
                <span className="ra-bar-legend-dot" style={{ background: '#2563eb' }} />Partial
                <span className="ra-bar-legend-dot" style={{ background: '#f59e0b' }} />Late
                <span className="ra-bar-legend-dot" style={{ background: '#ef4444' }} />Skipped
              </div>
            </div>
            <StatusBreakdown daily={data.daily} totalBlocks={blocks.length || 1} />
          </div>

          {/* ── Block consistency ── */}
          <div className="ra-section">
            <h3 className="ra-section-title">Block consistency — {days} days</h3>
            <p className="ra-section-sub">Sorted worst → best by default. Drift = avg minutes early/late vs scheduled time.</p>
            <BlockStatsTable blockStats={data.block_stats} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Weekly Schedule Matrix ─────────────────────────────────────────────────

const DAY_DIGITS = ['1', '2', '3', '4', '5', '6', '7']
const DAY_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WeekMatrixView({ blocks, onEdit }: { blocks: RoutineBlock[]; onEdit: (id: number) => void }) {
  // Compute total scheduled minutes per day-of-week
  const dayTotals = DAY_DIGITS.map(d => {
    return blocks.filter(b => b.days_of_week === '' || b.days_of_week.includes(d))
                 .reduce((s, b) => s + b.duration_minutes, 0)
  })

  return (
    <div className="week-matrix">
      {/* Header */}
      <div className="week-matrix-header">
        <span />
        <span className="week-matrix-time-col" />
        {DAY_SHORT.map(d => (
          <span key={d} className="week-matrix-day-col">{d}</span>
        ))}
        <span className="week-matrix-dur-col">Dur</span>
      </div>

      {/* Rows */}
      {blocks.map(block => {
        const info = TYPE_INFO[block.type] ?? { color: '#6b7280' }
        const active = block.days_of_week === '' ? '1234567' : block.days_of_week
        return (
          <div key={block.id} className="week-matrix-row" onClick={() => onEdit(block.id)}>
            <span className="routine-dot" style={{ background: info.color, flexShrink: 0 }} />
            <span className="week-matrix-time">{block.time_str || block.time.slice(0, 5)}</span>
            <span className="week-matrix-label-cell">{block.label}</span>
            {DAY_DIGITS.map(d => (
              <span
                key={d}
                className={`week-matrix-cell${active.includes(d) ? ' week-cell-on' : ''}`}
                style={active.includes(d) ? { background: info.color + '22', borderColor: info.color + '66' } : {}}
              >
                {active.includes(d) && <span className="week-cell-dot" style={{ background: info.color }} />}
              </span>
            ))}
            <span className="week-matrix-dur">{fmtDuration(block.duration_minutes)}</span>
          </div>
        )
      })}

      {/* Footer: daily load */}
      <div className="week-matrix-footer">
        <span style={{ gridColumn: '1 / 3' }}>Daily load</span>
        {dayTotals.map((mins, i) => (
          <span key={i} className="week-matrix-day-load">{fmtDuration(mins)}</span>
        ))}
        <span />
      </div>
    </div>
  )
}

// ── Time Investment Summary (used in RoutineAnalyticsView) ─────────────────

function TimeInvestmentSummary({ blocks }: { blocks: RoutineBlock[] }) {
  const byType: Record<string, number> = {}
  for (const b of blocks) byType[b.type] = (byType[b.type] || 0) + b.duration_minutes
  const totalMins = Object.values(byType).reduce((s, v) => s + v, 0)

  function fmtM(m: number) {
    if (m >= 60) return `${(m / 60).toFixed(1).replace('.0', '')}h`
    return `${m}m`
  }

  return (
    <div className="ra-time-invest">
      {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, mins]) => {
        const info = TYPE_INFO[type] ?? { icon: '●', label: type, color: '#6b7280' }
        return (
          <span key={type} className="ra-time-invest-item">
            <span style={{ color: info.color, fontSize: 15 }}>{info.icon}</span>
            <strong className="ra-time-invest-val">{fmtM(mins)}</strong>
            <span className="ra-time-invest-label">{info.label}</span>
          </span>
        )
      })}
      <span className="ra-time-invest-item ra-time-invest-total">
        <span style={{ fontWeight: 700, fontSize: 13 }}>Σ</span>
        <strong className="ra-time-invest-val">{fmtM(totalMins)}</strong>
        <span className="ra-time-invest-label">/ day</span>
      </span>
    </div>
  )
}

// ── Routine Editor ─────────────────────────────────────────────────────────

type EditorRow = {
  _id: number
  time: string
  label: string
  type: BlockType
  duration_minutes: number
  is_fixed: boolean
  order: number
  linked_node: string | null
}

function RoutineEditor({ blocks, onDone }: { blocks: RoutineBlock[]; onDone: () => void }) {
  const qc = useQueryClient()

  const [rows, setRows] = useState<EditorRow[]>(() =>
    blocks.map(b => ({
      _id: b.id, time: b.time, label: b.label, type: b.type,
      duration_minutes: b.duration_minutes, is_fixed: b.is_fixed,
      order: b.order, linked_node: b.linked_node,
    }))
  )

  // Re-sync rows when blocks prop refreshes (after panel saves)
  useEffect(() => {
    setRows(blocks.map(b => ({
      _id: b.id, time: b.time, label: b.label, type: b.type,
      duration_minutes: b.duration_minutes, is_fixed: b.is_fixed,
      order: b.order, linked_node: b.linked_node,
    })))
  }, [blocks])

  const { data: allNodes = [] } = useQuery<Node[]>({
    queryKey: ['nodes-v2'],
    queryFn: listNodes,
  })
  const linkableNodes = allNodes.filter(n => n.type === 'goal' || n.type === 'project' || n.type === 'task')

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  async function deleteRow(idx: number) {
    const row = rows[idx]
    try {
      await deleteRoutineBlock(row._id)
      await qc.invalidateQueries({ queryKey: ['routine-blocks'] })
    } catch {
      // ignore
    }
  }

  function onDragStart(idx: number) { setDragIdx(idx) }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setRows(r => {
      const next = [...r]
      const [dragged] = next.splice(dragIdx, 1)
      next.splice(idx, 0, dragged)
      return next
    })
    setDragIdx(idx)
  }

  async function onDragEnd() {
    setDragIdx(null)
    const items = rows.map((r, i) => ({ id: r._id, order: i + 1 }))
    await reorderRoutineBlocks(items)
    qc.invalidateQueries({ queryKey: ['routine-blocks'] })
  }

  return (
    <div className="routine-editor">
      <div className="routine-editor-header">
        <span />
        <span>Time</span>
        <span>Label</span>
        <span>Type</span>
        <span>Dur</span>
        <span />
        <span />
      </div>

      {rows.map((row, idx) => (
        <div
          key={row._id}
          className={`routine-editor-row ${dragIdx === idx ? 'dragging' : ''}`}
          draggable
          onDragStart={() => onDragStart(idx)}
          onDragOver={e => onDragOver(e, idx)}
          onDragEnd={onDragEnd}
        >
          <span className="routine-edit-drag" title="Drag to reorder">⠿</span>

          <span
            className="routine-editor-time-badge"
            onClick={() => setSelectedId(row._id)}
          >
            {row.time.slice(0, 5)}
          </span>

          <span className="routine-editor-label-cell">
            <span className="routine-dot" style={{ background: TYPE_COLORS[row.type], flexShrink: 0 }} />
            <span className="routine-editor-label-text">{row.label || '—'}</span>
          </span>

          <span className={`routine-editor-type-badge type-${row.type}`}>{row.type}</span>

          <span className="routine-editor-duration">{row.duration_minutes}m</span>

          <button
            className="routine-edit-btn routine-edit-detail"
            title="Edit details"
            onClick={() => setSelectedId(row._id)}
          >
            ›
          </button>

          <button
            className="routine-edit-btn routine-edit-delete"
            title="Delete block"
            onClick={() => deleteRow(idx)}
          >
            ✕
          </button>
        </div>
      ))}

      <div className="routine-editor-actions">
        <button className="btn-ghost-sm" onClick={() => setSelectedId(-1)}>＋ Add block</button>
        <button className="btn-ghost-sm" onClick={onDone}>Done</button>
      </div>

      {/* Block detail panel */}
      {selectedId !== null && (
        <BlockEditPanel
          block={selectedId === -1 ? null : blocks.find(b => b.id === selectedId) ?? null}
          linkableNodes={linkableNodes}
          onClose={() => setSelectedId(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['routine-blocks'] })
            setSelectedId(null)
          }}
        />
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function RoutinePage() {
  const qc = useQueryClient()
  const today = todayStr()
  const yesterday = yesterdayStr()
  const [view, setView] = useState<'today' | 'week' | 'analytics'>('today')
  const [editMode, setEditMode] = useState(false)
  // null = panel closed; number = editing block by id (from timeline view)
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null)

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<RoutineBlock[]>({
    queryKey: ['routine-blocks'],
    queryFn: listRoutineBlocks,
  })

  const { data: logs = [] } = useQuery<RoutineLogEntry[]>({
    queryKey: ['routine-logs', today],
    queryFn: () => getRoutineLogs(today),
  })

  const { data: yesterdayLogs = [] } = useQuery<RoutineLogEntry[]>({
    queryKey: ['routine-logs', yesterday],
    queryFn: () => getRoutineLogs(yesterday),
  })

  const { data: streakData } = useQuery({
    queryKey: ['routine-streak'],
    queryFn: getRoutineStreak,
  })

  // For page-level BlockEditPanel (opened from timeline BlockRow)
  const { data: allNodes = [] } = useQuery<Node[]>({
    queryKey: ['nodes-v2'],
    queryFn: listNodes,
  })
  const linkableNodes = allNodes.filter(n => n.type === 'goal' || n.type === 'project' || n.type === 'task')

  const saveMut = useMutation({
    mutationFn: (entry: { block_time: string; status: string; actual_time?: string; note?: string }) =>
      saveRoutineLog({ date: today, ...entry }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routine-logs', today] }),
  })

  const logsByTime = Object.fromEntries(logs.map(l => [l.block_time.slice(0, 5), l]))
  const yesterdayLogsByTime = Object.fromEntries(yesterdayLogs.map(l => [l.block_time.slice(0, 5), l]))
  const doneCount = logs.filter(l => l.status === 'done' || l.status === 'partial').length
  const total = blocks.length || streakData?.total_blocks || 20
  const pct = Math.round((doneCount / total) * 100)

  // Weighted "core score": must×3 + should×2 + nice×1
  const WEIGHT = { must: 3, should: 2, nice: 1 } as const
  const maxScore = blocks.reduce((s, b) => s + (WEIGHT[b.importance] ?? 2), 0)
  const earnedScore = blocks.reduce((s, b) => {
    const log = logsByTime[b.time_str || b.time.slice(0, 5)]
    return s + (log && (log.status === 'done' || log.status === 'partial') ? (WEIGHT[b.importance] ?? 2) : 0)
  }, 0)
  const coreScore = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0
  const showCoreScore = blocks.some(b => b.importance !== 'should')

  function closeDay() {
    const unlogged = blocks.filter(b => !logsByTime[b.time])
    unlogged.forEach(b => saveMut.mutate({ block_time: b.time, status: 'skipped' }))
  }

  const showCloseDay = new Date().getHours() >= 21 && doneCount < total

  if (blocksLoading) {
    return <div className="routine-page"><p style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</p></div>
  }

  return (
    <div className="routine-page">
      {/* Header */}
      <div className="routine-header">
        <div>
          <h1 className="routine-title">Daily Routine</h1>
          <p className="routine-date">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <div className="routine-completion">
          <span className="routine-pct">{pct}%</span>
          <span className="routine-pct-sub">{doneCount}/{total} done</span>
          {showCoreScore && (
            <span className="routine-core-score" title="Weighted core score (must×3 + should×2 + nice×1)">
              core {coreScore}%
            </span>
          )}
          {streakData !== undefined && streakData.streak > 0 && (
            <span className="routine-streak">🔥 {streakData.streak} day streak</span>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {view === 'today' && showCloseDay && (
              <button className="btn-ghost-sm" style={{ fontSize: 12 }} onClick={closeDay}>
                ✕ Close day
              </button>
            )}
            {view === 'today' && (
              <button
                className={`btn-ghost-sm ${editMode ? 'active' : ''}`}
                style={{ fontSize: 12 }}
                onClick={() => setEditMode(m => !m)}
                title="Edit schedule"
              >
                ⚙ Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="routine-progress-bar">
        <div className="routine-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* View tabs */}
      <div className="routine-view-tabs">
        <button
          className={`routine-view-tab${view === 'today' ? ' active' : ''}`}
          onClick={() => { setView('today'); setEditMode(false) }}
        >
          ▦ Today
        </button>
        <button
          className={`routine-view-tab${view === 'week' ? ' active' : ''}`}
          onClick={() => { setView('week'); setEditMode(false) }}
        >
          📅 Week
        </button>
        <button
          className={`routine-view-tab${view === 'analytics' ? ' active' : ''}`}
          onClick={() => { setView('analytics'); setEditMode(false) }}
        >
          📊 Analytics
        </button>
      </div>

      {view === 'analytics' ? (
        <RoutineAnalyticsView blocks={blocks} />
      ) : view === 'week' ? (
        <WeekMatrixView blocks={blocks} onEdit={id => setEditingBlockId(id)} />
      ) : editMode ? (
        <RoutineEditor blocks={blocks} onDone={() => setEditMode(false)} />
      ) : (
        <>
          <AIMorningBriefing />
          <WeeklyGrid total={total} />
          <MetricsPanel />

          {/* Timeline */}
          <div className="routine-timeline">
            {blocks.map(block => {
              const yLog = yesterdayLogsByTime[block.time]
              const missedYesterday =
                blockHasPassed(block.time) &&
                (yLog === undefined || yLog.status === 'skipped')
              return (
                <BlockRow
                  key={block.id}
                  block={block}
                  log={logsByTime[block.time]}
                  missedYesterday={missedYesterday}
                  onSave={entry => saveMut.mutate(entry)}
                  onEdit={() => setEditingBlockId(block.id)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Page-level BlockEditPanel — opened from timeline view */}
      {editingBlockId !== null && (
        <BlockEditPanel
          block={blocks.find(b => b.id === editingBlockId) ?? null}
          linkableNodes={linkableNodes}
          onClose={() => setEditingBlockId(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['routine-blocks'] })
            setEditingBlockId(null)
          }}
        />
      )}
    </div>
  )
}
