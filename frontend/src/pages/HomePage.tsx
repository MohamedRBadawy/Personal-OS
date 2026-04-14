import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { getDashboardV2, createNode, updateNode, getNextAction, listRoutineBlocks, getRoutineLogs, saveRoutineLog, getCheckinTodayStatus, getReadinessScore, listAppSettings, toggleBadDayMode } from '../lib/api'
import type { ReadinessScore } from '../lib/api'
import type { DashboardTask, DashboardV2, NodeCreatePayload, NodeStatus, NodeUpdatePayload, RoutineBlock, RoutineLogEntry } from '../lib/types'
import { getCurrentBlock, blockEndTime } from '../components/routine/helpers'

// ── Readiness Widget ─────────────────────────────────────────────────────────

function ReadinessWidget() {
  const [expanded, setExpanded] = useState(false)
  const { data } = useQuery<ReadinessScore>({
    queryKey: ['readiness-score'],
    queryFn: getReadinessScore,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  if (!data) return null

  const score = Math.round(data.total_score)
  const pct = Math.min(score, 100)

  // Determine color tier
  const color = pct >= 75 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : '#f59e0b'

  return (
    <div className="readiness-card" onClick={() => setExpanded(p => !p)}>
      <div className="readiness-main">
        <div className="readiness-score-wrap">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color} fontFamily="var(--mono)">
              {score}
            </text>
          </svg>
        </div>
        <div className="readiness-info">
          <p className="readiness-title">🕌 Kyrgyzstan Readiness</p>
          <p className="readiness-subtitle">
            {score}/100
            {data.projected_date && (
              <span className="caption"> · on track for {new Date(data.projected_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
            )}
          </p>
        </div>
        <span className="readiness-expand">{expanded ? '▴' : '▾'}</span>
      </div>

      {expanded && (
        <div className="readiness-breakdown">
          {Object.entries(data.breakdown).map(([key, item]) => (
            <div key={key} className="readiness-dimension">
              <span className="readiness-dim-label">{item.label}</span>
              <div className="readiness-dim-bar-wrap">
                <div
                  className="readiness-dim-bar-fill"
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
              <span className="readiness-dim-score" style={{ fontFamily: 'var(--mono)' }}>
                {Math.round(item.score)}/{item.max}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Next Action Card ─────────────────────────────────────────────────────────

function NextActionCard() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['next-action'],
    queryFn: getNextAction,
    staleTime: 5 * 60 * 1000,   // cache for 5 minutes
    retry: 1,
  })
  return (
    <div className="next-action-card">
      <div className="next-action-header">
        <span className="next-action-label">⚡ What to do right now</span>
        <button
          className="next-action-refresh"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh recommendation"
        >
          {isFetching ? '…' : '↺'}
        </button>
      </div>
      {isLoading && <p className="next-action-idle">Calculating…</p>}
      {data && !isLoading && (
        <div className="next-action-result">
          <p className="next-action-action">{data.action}</p>
          <p className="next-action-reason">{data.reason}</p>
          {data.node_id && (
            <Link to={`/goals?node=${data.node_id}`} className="next-action-link">
              Open goal →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ── Routine Quick Panel ───────────────────────────────────────────────────────

const RQP_STATUS_LABELS: { value: string; label: string }[] = [
  { value: 'done',    label: '✓' },
  { value: 'partial', label: '~' },
  { value: 'skipped', label: '✗' },
]

function RoutineQuickPanel({
  blocks,
  logs,
  today: _today,
  onLog,
  pending,
}: {
  blocks: RoutineBlock[]
  logs: RoutineLogEntry[]
  today: string
  onLog: (blockTime: string, status: string) => void
  pending: boolean
}) {
  const logMap = new Map(logs.map(l => [l.block_time.slice(0, 5), l]))
  return (
    <div className="rqp-panel">
      {blocks.map(block => {
        const timeKey = (block.time_str || block.time.slice(0, 5))
        const log = logMap.get(timeKey)
        const loggedStatus = log?.status ?? null
        return (
          <div key={block.id} className="rqp-row">
            <span className="rqp-time">{timeKey}</span>
            <span className="rqp-label">{block.label}</span>
            <div className="rqp-btns">
              {RQP_STATUS_LABELS.map(s => (
                <button
                  key={s.value}
                  className={`rqp-btn${loggedStatus === s.value ? ` active-${s.value === 'skipped' ? 'skipped' : s.value}` : ''}`}
                  disabled={pending}
                  title={s.value}
                  onClick={() => onLog(block.time, s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Status Popover ───────────────────────────────────────────────────────────

const STATUSES: NodeStatus[] = ['active', 'available', 'blocked', 'done', 'deferred']

const STATUS_COLORS: Record<NodeStatus, string> = {
  active:   '#2563eb',
  available:'#16a34a',
  blocked:  '#dc2626',
  done:     '#6b7280',
  deferred: '#9333ea',
}

const HEALTH_ALERT_LABELS: Record<string, string> = {
  low_sleep:  'Low sleep',
  low_mood:   'Low mood',
  prayer_gap: 'Prayer gap',
}

function StatusPopover({ task, onClose }: { task: DashboardTask; onClose: () => void }) {
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: (status: NodeStatus) => updateNode(task.id, { status } as NodeUpdatePayload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-v2'] })
      qc.invalidateQueries({ queryKey: ['nodes-v2'] })
      onClose()
    },
  })

  return (
    <div className="status-popover" onClick={e => e.stopPropagation()}>
      {STATUSES.map(s => (
        <button
          key={s}
          className={`status-popover-btn ${s === task.status ? 'active' : ''}`}
          style={{ '--status-color': STATUS_COLORS[s] } as React.CSSProperties}
          disabled={mut.isPending}
          onClick={() => mut.mutate(s)}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

// ── Add-task quick modal ──────────────────────────────────────────────────────

const CATEGORIES = ['Life', 'Work', 'Finance', 'Health', 'Spiritual', 'Family', 'Learning', 'Ideas']

function AddTaskModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Work')
  const [notes, setNotes] = useState('')
  const [effort, setEffort] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: NodeCreatePayload) => createNode(payload),
    onSuccess: () => { onSaved(); onClose() },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    mutation.mutate({
      title,
      type: 'task',
      category,
      status: 'available',
      priority: 1,
      notes,
      effort: effort || undefined,
      target_date: targetDate || undefined,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Add P1 Task</h3>
        <form onSubmit={handleSubmit} className="modal-form">
          <input
            autoFocus
            className="form-input"
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" value={effort} onChange={e => setEffort(e.target.value)}>
              <option value="">Effort…</option>
              <option value="15min">15 min</option>
              <option value="30min">30 min</option>
              <option value="1h">1 hour</option>
              <option value="2h">2 hours</option>
              <option value="4h">4 hours</option>
              <option value="1day">1 day</option>
            </select>
          </div>
          <input
            className="form-input"
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
          />
          <textarea
            className="form-input"
            placeholder="Notes (optional)"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const queryClient = useQueryClient()
  const [showAddTask, setShowAddTask] = useState(false)
  const [activePopover, setActivePopover] = useState<string | null>(null)
  const [routineExpanded, setRoutineExpanded] = useState(false)

  const today = new Date().toLocaleDateString('en-CA')

  const { data, isLoading, error } = useQuery<DashboardV2>({
    queryKey: ['dashboard-v2'],
    queryFn: getDashboardV2,
  })

  const { data: routineBlocks = [] } = useQuery<RoutineBlock[]>({
    queryKey: ['routine-blocks'],
    queryFn: listRoutineBlocks,
    staleTime: 5 * 60 * 1000,
  })
  const currentBlock = getCurrentBlock(routineBlocks)

  const { data: checkinStatus } = useQuery({
    queryKey: ['checkin-today-status'],
    queryFn: getCheckinTodayStatus,
    staleTime: 5 * 60 * 1000,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['app-settings'],
    queryFn: listAppSettings,
    staleTime: 30 * 1000,
  })
  const appSettings = settingsData?.results?.[0]
  const badDayMode = appSettings?.bad_day_mode ?? false

  const badDayMutation = useMutation({
    mutationFn: () => toggleBadDayMode(appSettings!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
  })

  // Determine if a nudge should be shown
  const nowHour = new Date().getHours()
  const showMorningNudge = nowHour < 9 && checkinStatus && !checkinStatus.morning_done && !badDayMode
  const showEveningNudge = nowHour >= 20 && checkinStatus && !checkinStatus.evening_done && !badDayMode

  const { data: todayLogs = [] } = useQuery<RoutineLogEntry[]>({
    queryKey: ['routine-logs', today],
    queryFn: () => getRoutineLogs(today),
    staleTime: 60_000,
  })

  const logMut = useMutation({
    mutationFn: saveRoutineLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-logs', today] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-v2'] })
    },
  })

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <div className="page-error">Could not load dashboard.</div>

  const independentPct = data.target_independent > 0
    ? Math.min(100, Math.round((data.independent_monthly / data.target_independent) * 100))
    : 0

  const hp = data.health_pulse
  const js = data.journal_status
  const cd = data.contacts_due
  const fd = data.finance_detail

  return (
    <div className="home-page" onClick={() => setActivePopover(null)}>

      {/* ── Date + Focus shortcut ── */}
      <div className="home-top-row">
        <p className="home-date">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className="home-top-actions">
          {badDayMode && (
            <span className="home-bad-day-chip">😔 Minimal day</span>
          )}
          {appSettings && (
            <button
              type="button"
              className={`home-bad-day-btn${badDayMode ? ' active' : ''}`}
              onClick={() => badDayMutation.mutate()}
              disabled={badDayMutation.isPending}
              title={badDayMode ? 'Exit minimal mode' : 'Activate minimal/bad day mode'}
            >
              {badDayMode ? '✓ Minimal mode' : '🌧 Bad day?'}
            </button>
          )}
          <Link to="/focus" className="home-focus-btn">⚡ Focus Mode</Link>
        </div>
      </div>

      {/* ── Check-in nudge ── */}
      {(showMorningNudge || showEveningNudge) && (
        <Link to="/daily" className="home-checkin-nudge">
          <span className="home-checkin-nudge-icon">{showMorningNudge ? '🌅' : '🌙'}</span>
          <div className="home-checkin-nudge-text">
            <strong>{showMorningNudge ? 'Morning check-in' : 'Evening check-in'}</strong>
            <span className="caption">
              {showMorningNudge ? 'Start the day right — takes 2 minutes' : 'Close the day with intention'}
            </span>
          </div>
          <span className="home-checkin-nudge-cta">Start →</span>
        </Link>
      )}

      {/* ── Next Action ── */}
      <NextActionCard />

      {/* ── SECTION 1: North Star ── */}
      <div className="unlock-bar">
        <p className="unlock-eyebrow">The number that unlocks everything</p>
        <div className="unlock-numbers">
          <span className="unlock-current">€{data.independent_monthly}/mo</span>
          <span className="unlock-sep"> / </span>
          <span className="unlock-target">€{data.target_independent}/mo independent</span>
        </div>
        <div className="unlock-track">
          <div className="unlock-fill" style={{ width: `${independentPct}%` }} />
        </div>
        <p className="unlock-sub">
          {independentPct === 0
            ? 'First outreach message → first client → first €'
            : 'Kyrgyzstan unlocks at 100%'}
          {' · '}
          <Link to="/finance" style={{ color: 'inherit', opacity: 0.7 }}>Finance →</Link>
        </p>
      </div>

      {/* ── Kyrgyzstan Readiness ── */}
      <ReadinessWidget />

      {/* ── SECTION 2: Today ── */}
      <div className="home-section">
        <div className="home-section-header">
          <p className="home-section-title">Today</p>
          <Link to="/daily" className="home-section-link">Check-in →</Link>
        </div>

        {/* Routine */}
        <div className="pulse-row" style={{ cursor: 'default' }}>
          <Link to="/schedule" className="pulse-row-inner" style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
            <span className="pulse-icon">▦</span>
            <span className="pulse-label">Routine</span>
            <span className="pulse-value">{data.routine_today.done}/{data.routine_today.total}</span>
            <div className="pulse-bar-wrap">
              <div className="pulse-bar-fill" style={{ width: `${data.routine_today.pct}%` }} />
            </div>
            <span className="pulse-pct">{data.routine_today.pct}%</span>
          </Link>
          <button
            className="rqp-toggle"
            onClick={e => { e.stopPropagation(); setRoutineExpanded(p => !p) }}
            title={routineExpanded ? 'Collapse' : 'Log blocks'}
          >
            {routineExpanded ? '▴ Close' : '▾ Log'}
          </button>
        </div>

        {/* Inline quick-log panel */}
        {routineExpanded && routineBlocks.length > 0 && (
          <RoutineQuickPanel
            blocks={routineBlocks}
            logs={todayLogs}
            today={today}
            onLog={(blockTime, status) => logMut.mutate({ date: today, block_time: blockTime, status })}
            pending={logMut.isPending}
          />
        )}

        {/* Current block indicator */}
        {currentBlock && (
          <Link to="/schedule" className="home-current-block">
            <span className="home-current-now">● NOW</span>
            <strong>{currentBlock.label}</strong>
            <span className="home-current-until">until {blockEndTime(currentBlock)}</span>
          </Link>
        )}

        {/* Journal */}
        <Link
          to="/journal"
          className={`pulse-row${!js.journaled_today ? ' pulse-row--alert' : ''}`}
        >
          <span className="pulse-icon">✏</span>
          <span className="pulse-label">Journal</span>
          {js.journaled_today
            ? <span className="pulse-value pulse-value--ok">Done</span>
            : <span className="pulse-value pulse-value--warn">Not yet</span>
          }
          {js.tomorrow_focus && (
            <span className="pulse-sub">Focus: {js.tomorrow_focus}</span>
          )}
        </Link>

        {/* Health */}
        <Link
          to="/health"
          className={`pulse-row${hp.alerts.length > 0 ? ' pulse-row--alert' : ''}`}
        >
          <span className="pulse-icon">❤</span>
          <span className="pulse-label">Health</span>
          {hp.avg_sleep_7d !== null && (
            <span className="pulse-value">{hp.avg_sleep_7d}h sleep</span>
          )}
          {hp.avg_mood_7d !== null && (
            <span className="pulse-meta">· mood {hp.avg_mood_7d}/5</span>
          )}
          {hp.full_prayer_streak > 0 && (
            <span className="pulse-meta">· {hp.full_prayer_streak}d prayer</span>
          )}
          {hp.alerts.map(a => (
            <span key={a} className="pulse-chip">{HEALTH_ALERT_LABELS[a]}</span>
          ))}
          {!hp.health_logged_today && (
            <span className="pulse-chip">Log today</span>
          )}
        </Link>

        {/* Contacts — only when there are overdue follow-ups */}
        {cd.count > 0 && (
          <Link to="/contacts" className="pulse-row pulse-row--alert">
            <span className="pulse-icon">👥</span>
            <span className="pulse-label">Contacts</span>
            <span className="pulse-value pulse-value--warn">{cd.count} follow-up{cd.count !== 1 ? 's' : ''} due</span>
            <span className="pulse-sub">{cd.top.map(c => c.name).join(', ')}</span>
          </Link>
        )}
      </div>

      {/* ── SECTION 3: Priorities ── */}
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Priorities</h2>
          <button
            className="btn-ghost-sm"
            onClick={e => { e.stopPropagation(); setShowAddTask(true) }}
          >
            + Add task
          </button>
        </div>

        {/* Tomorrow's focus note */}
        {js.tomorrow_focus && (
          <div className="focus-note">
            <span className="sp-label" style={{ flexShrink: 0 }}>Focus:</span>
            <em>{js.tomorrow_focus}</em>
            <Link to="/journal" className="focus-note-link">Edit →</Link>
          </div>
        )}

        {data.top_tasks.length === 0 ? (
          <p className="empty-hint">No P1 tasks available. <Link to="/goals">Go to Goals to add.</Link></p>
        ) : (
          <div className="task-list">
            {data.top_tasks.map(task => (
              <div
                key={task.id}
                className="task-row"
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setActivePopover(p => p === task.id ? null : task.id) }}
              >
                <div className="task-row-main">
                  <span className="task-title">{task.title}</span>
                  {task.effort && <span className="task-meta">{task.effort}</span>}
                  {task.target_date && (
                    <span className="task-date task-date-urgent">{task.target_date}</span>
                  )}
                  {task.target_date && task.target_date < today && task.status !== 'done' && (
                    <span className="overdue-badge">OVERDUE</span>
                  )}
                  <span
                    className="task-status-chip"
                    style={{ background: `color-mix(in srgb, ${STATUS_COLORS[task.status]} 15%, transparent)`, color: STATUS_COLORS[task.status] }}
                  >
                    {task.status}
                  </span>
                  <Link
                    className="task-goto-btn"
                    to={`/goals?node=${task.id}`}
                    onClick={e => e.stopPropagation()}
                    title="Open in Goals"
                  >
                    →
                  </Link>
                </div>
                {task.notes && <p className="task-notes">{task.notes}</p>}
                {task.tags.length > 0 && (
                  <div className="tag-row">
                    {task.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                )}
                {activePopover === task.id && (
                  <StatusPopover task={task} onClose={() => setActivePopover(null)} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Blocked goals — inside Priorities section */}
        {data.blocked_goals.length > 0 && (
          <div className="blocked-panel" style={{ marginTop: 8 }}>
            <p className="section-title" style={{ marginBottom: 6 }}>⚠ Blocked goals</p>
            <div className="blocked-list">
              {data.blocked_goals.map(g => (
                <Link key={g.id} to={`/goals?node=${g.id}`} className="blocked-row" style={{ textDecoration: 'none' }}>
                  <span className="blocked-title">{g.title}</span>
                  {g.blocked_by.length > 0 && (
                    <span className="blocked-by">blocked by: {g.blocked_by.join(', ')}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 4: Finance Snapshot ── */}
      <CollapsibleSection title="Finance" storageKey="home-finance" defaultOpen={true}>
        <div className="home-section">
          <div className="home-section-header">
            <p className="home-section-title">Finance</p>
            <Link to="/finance" className="home-section-link">Details →</Link>
          </div>
          <Link to="/finance" className="finance-snapshot">
            <div className="finance-snap-grid">
              <div className="finance-snap-item">
                <span className="finance-snap-value">~{formatK(data.surplus_egp)} EGP</span>
                <span className="finance-snap-label">Monthly surplus</span>
              </div>
              {fd.savings_pct !== null && fd.savings_target_egp > 0 && (
                <div className="finance-snap-item">
                  <span className="finance-snap-value">{fd.savings_pct}%</span>
                  <span className="finance-snap-label">Savings target</span>
                </div>
              )}
              {fd.total_debt_egp > 0 && (
                <div className="finance-snap-item finance-snap-item--warn">
                  <span className="finance-snap-value">{formatK(fd.total_debt_egp)} EGP</span>
                  <span className="finance-snap-label">Total debt</span>
                </div>
              )}
            </div>
          </Link>
        </div>
      </CollapsibleSection>

      {/* ── SECTION 5: Goals Overview ── */}
      <CollapsibleSection title="Goals" storageKey="home-goals" defaultOpen={true}>
        <div className="home-section">
          <div className="home-section-header">
            <p className="home-section-title">Goals</p>
            <Link to="/goals" className="home-section-link">All goals →</Link>
          </div>
          <div className="stat-grid">
            {[
              { label: 'Active',    value: data.node_counts.active,    to: '/goals?status=active' },
              { label: 'Available', value: data.node_counts.available, to: '/goals?status=available' },
              { label: 'Blocked',   value: data.node_counts.blocked,   to: '/goals?status=blocked' },
              { label: 'Done',      value: data.node_counts.done,      to: '/goals?status=done' },
            ].map(card => (
              <Link key={card.label} to={card.to} className="stat-card">
                <span className="stat-value">{card.value}</span>
                <span className="stat-label">{card.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── SECTION 6: Road to Kyrgyzstan ── */}
      <CollapsibleSection title="Road to Kyrgyzstan" storageKey="home-kyrgyzstan" defaultOpen={true}>
        <div className="home-section">
          <div className="milestone-chain">
            {data.milestones.map((m, i) => (
              <div key={i} className={`milestone-row ${m.done ? 'done' : m.next ? 'next' : ''}`}>
                <span className="milestone-dot">{m.done ? '✓' : m.next ? '→' : '○'}</span>
                <span className="milestone-label">{m.label}</span>
                {m.next && <span className="milestone-badge">NEXT</span>}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {showAddTask && createPortal(
        <AddTaskModal
          onClose={() => setShowAddTask(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['dashboard-v2'] })}
        />,
        document.body
      )}
    </div>
  )
}

function formatK(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}
