import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { getDashboardV2, createNode, updateNode } from '../lib/api'
import type { DashboardTask, DashboardV2, NodeCreatePayload, NodeStatus, NodeUpdatePayload } from '../lib/types'

// ── Status Popover ───────────────────────────────────────────────────────────

const STATUSES: NodeStatus[] = ['active', 'available', 'blocked', 'done', 'deferred']

const STATUS_COLORS: Record<NodeStatus, string> = {
  active:   '#2563eb',
  available:'#16a34a',
  blocked:  '#dc2626',
  done:     '#6b7280',
  deferred: '#9333ea',
}

function StatusPopover({
  task, onClose,
}: {
  task: DashboardTask
  onClose: () => void
}) {
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

  const { data, isLoading, error } = useQuery<DashboardV2>({
    queryKey: ['dashboard-v2'],
    queryFn: getDashboardV2,
  })

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <div className="page-error">Could not load dashboard.</div>

  const independentPct = data.target_independent > 0
    ? Math.min(100, Math.round((data.independent_monthly / data.target_independent) * 100))
    : 0

  const today = new Date().toLocaleDateString('en-CA')

  const statCards = [
    { label: 'Active',     value: data.node_counts.active,    to: '/goals?status=active' },
    { label: 'Available',  value: data.node_counts.available, to: '/goals?status=available' },
    { label: 'Blocked',    value: data.node_counts.blocked,   to: '/goals?status=blocked' },
    { label: 'Done',       value: data.node_counts.done,      to: '/goals?status=done' },
    { label: 'Surplus EGP',value: `~${formatK(data.surplus_egp)}`, to: '/finance' },
    { label: 'Nodes total',value: data.node_counts.total,     to: '/goals' },
  ]

  return (
    <div className="home-page" onClick={() => setActivePopover(null)}>

      {/* ── Date ── */}
      <p className="home-date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

      {/* ── Section 1: Unlock Bar ── */}
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
        </p>
      </div>

      {/* ── Section 2: Stat Cards ── */}
      <div className="stat-grid">
        {statCards.map(card => (
          <Link key={card.label} to={card.to} className="stat-card">
            <span className="stat-value">{card.value}</span>
            <span className="stat-label">{card.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Section 2.5: Routine Today ── */}
      <Link to="/routine" className="routine-today-row">
        <span className="routine-today-icon">▦</span>
        <span className="routine-today-label">Daily Routine</span>
        <span className="routine-today-count">{data.routine_today.done}/{data.routine_today.total} done</span>
        <span className="routine-today-pct">{data.routine_today.pct}%</span>
        <div className="routine-today-bar-wrap">
          <div className="routine-today-bar-fill" style={{ width: `${data.routine_today.pct}%` }} />
        </div>
      </Link>

      {/* ── Section 3: Top Priority Tasks ── */}
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Top priority tasks</h2>
          <button className="btn-ghost-sm" onClick={e => { e.stopPropagation(); setShowAddTask(true) }}>+ Add task</button>
        </div>
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
      </div>

      {/* ── Section 4: Blocked Goals ── */}
      {data.blocked_goals.length > 0 && (
        <div className="home-section blocked-panel">
          <h2 className="section-title">⚠ Blocked goals</h2>
          <div className="blocked-list">
            {data.blocked_goals.map(g => (
              <div key={g.id} className="blocked-row">
                <span className="blocked-title">{g.title}</span>
                {g.blocked_by.length > 0 && (
                  <span className="blocked-by">blocked by: {g.blocked_by.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 5: Road to Kyrgyzstan ── */}
      <div className="home-section">
        <h2 className="section-title">Road to Kyrgyzstan</h2>
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
