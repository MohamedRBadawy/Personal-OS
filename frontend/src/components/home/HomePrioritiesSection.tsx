// [AR] قسم الأولويات — قائمة المهام الأعلى أولوية والأهداف المعطلة
// [EN] Priorities section — top-priority task list, blocked goals, and add task modal
// Connects to: /goals (goal links), createNode API

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNode, getActiveGoalContext, updateNode } from '../../lib/api'
import type { ActiveGoalContext, CommandCenterPriorityItem, NodeCreatePayload, NodeStatus, NodeUpdatePayload } from '../../lib/types'
import { TradeoffPromptModal } from '../goals/TradeoffPromptModal'

interface HomePrioritiesSectionProps {
  priorities: CommandCenterPriorityItem[]
  blockedGoals: CommandCenterPriorityItem[]
  tomorrowFocus?: string
}

// [AR] ألوان حالة الأهداف
// [EN] Node status colour mapping
const NODE_STATUS_COLORS: Record<NodeStatus, string> = {
  active:   '#2563eb', available: '#16a34a',
  blocked:  '#dc2626', done:      '#6b7280', deferred: '#9333ea',
}
const NODE_STATUSES: NodeStatus[] = ['active', 'available', 'blocked', 'done', 'deferred']
const CATEGORIES = ['Life', 'Work', 'Finance', 'Health', 'Spiritual', 'Family', 'Learning', 'Ideas']

// [AR] نافذة تغيير حالة الأولوية
// [EN] Status change popover for priority items
function PriorityStatusPopover({ item, onClose }: { item: CommandCenterPriorityItem; onClose: () => void }) {
  const qc = useQueryClient()
  const [tradeoffContext, setTradeoffContext] = useState<ActiveGoalContext | null>(null)
  const mut = useMutation({
    mutationFn: (status: NodeStatus) => updateNode(item.id, { status } as NodeUpdatePayload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['command-center'] })
      qc.invalidateQueries({ queryKey: ['dashboard-v2'] })
      qc.invalidateQueries({ queryKey: ['nodes-v2'] })
      onClose()
    },
  })

  async function handleStatus(status: NodeStatus) {
    if (status === 'active' && item.status !== 'active') {
      const context = await getActiveGoalContext()
      if (context.active_goal_count >= context.max_safe_active) {
        setTradeoffContext(context)
        return
      }
    }
    mut.mutate(status)
  }

  return (
    <div className="status-popover" onClick={e => e.stopPropagation()}>
      {NODE_STATUSES.map(s => (
        <button key={s} className={`status-popover-btn ${s === item.status ? 'active' : ''}`}
          style={{ '--status-color': NODE_STATUS_COLORS[s] } as React.CSSProperties}
          disabled={mut.isPending} onClick={() => handleStatus(s)}>{s}</button>
      ))}
      {tradeoffContext && (
        <TradeoffPromptModal
          context={tradeoffContext}
          targetNodeId={item.id}
          targetTitle={item.title}
          onClose={() => setTradeoffContext(null)}
          onComplete={onClose}
        />
      )}
    </div>
  )
}

// [AR] بطاقة الأولوية الأولى — العنصر البصري الأبرز في القسم
// [EN] Top priority card — the most visually dominant element in the section
export function TopPriorityCard({ item, isActive, onToggle }: {
  item: CommandCenterPriorityItem; isActive: boolean; onToggle: () => void
}) {
  return (
    <div
      className="top-priority-card"
      style={{ position: 'relative' }}
      onClick={e => { e.stopPropagation(); onToggle() }}
    >
      <p className="top-priority-eyebrow">Most important right now</p>
      <p className="top-priority-title">{item.title}</p>
      {item.notes && (
        <p className="top-priority-notes">
          {item.notes.slice(0, 150)}{item.notes.length > 150 ? '…' : ''}
        </p>
      )}
      <div className="top-priority-meta">
        {item.dependency_unblock_count > 0 && (
          <span className="cc-unblock-badge" title={`Unlocks ${item.dependency_unblock_count} other goal${item.dependency_unblock_count !== 1 ? 's' : ''}`}>
            ↗{item.dependency_unblock_count}
          </span>
        )}
        {item.is_overdue && <span className="overdue-badge">OVERDUE</span>}
        {item.due_date && !item.is_overdue && (
          <span className="task-date">{item.due_date}</span>
        )}
        <span
          className="task-status-chip"
          style={{
            background: `color-mix(in srgb, ${NODE_STATUS_COLORS[item.status as NodeStatus] ?? '#6b7280'} 15%, transparent)`,
            color: NODE_STATUS_COLORS[item.status as NodeStatus] ?? '#6b7280',
          }}
        >
          {item.status}
        </span>
        <Link
          className="task-goto-btn"
          style={{ opacity: 1 }}
          to={`/goals?node=${item.id}`}
          onClick={e => e.stopPropagation()}
        >
          Open →
        </Link>
      </div>
      {isActive && <PriorityStatusPopover item={item} onClose={onToggle} />}
    </div>
  )
}

// [AR] صف الأولوية الواحدة — يعرض العنوان والحالة وشارة الإلغاء
// [EN] Single priority row — shows title, status, unblock badge, due date
function PriorityRow({ item, isActive, onToggle }: {
  item: CommandCenterPriorityItem; isActive: boolean; onToggle: () => void
}) {
  return (
    <div className="task-row" style={{ position: 'relative', cursor: 'pointer' }}
      onClick={e => { e.stopPropagation(); onToggle() }}>
      <div className="task-row-main">
        <span className="task-title">{item.title}</span>
        {item.dependency_unblock_count > 0 && (
          <span className="cc-unblock-badge" title={`Completes this → unlocks ${item.dependency_unblock_count} other goal${item.dependency_unblock_count !== 1 ? 's' : ''}`}>
            ↗{item.dependency_unblock_count}
          </span>
        )}
        {item.is_overdue && <span className="overdue-badge">OVERDUE</span>}
        {!item.is_overdue && item.due_in_days !== null && item.due_in_days <= 3 && (
          <span className="cc-due-soon-chip">in {item.due_in_days === 0 ? 'today' : `${item.due_in_days}d`}</span>
        )}
        {item.due_date && !item.is_overdue && (item.due_in_days === null || item.due_in_days > 3) && (
          <span className="task-date">{item.due_date}</span>
        )}
        <span className="task-status-chip"
          style={{
            background: `color-mix(in srgb, ${NODE_STATUS_COLORS[item.status as NodeStatus] ?? '#6b7280'} 15%, transparent)`,
            color: NODE_STATUS_COLORS[item.status as NodeStatus] ?? '#6b7280',
          }}>
          {item.status}
        </span>
        <Link className="task-goto-btn" to={`/goals?node=${item.id}`}
          onClick={e => e.stopPropagation()} title="Open in Goals">→</Link>
      </div>
      {item.notes && <p className="task-notes">{item.notes.slice(0, 120)}{item.notes.length > 120 ? '…' : ''}</p>}
      {item.parent_title && <p className="cc-priority-parent">↳ {item.parent_title}</p>}
      {isActive && <PriorityStatusPopover item={item} onClose={onToggle} />}
    </div>
  )
}

// [AR] نافذة إضافة مهمة سريعة
// [EN] Quick add task modal
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
    mutation.mutate({ title, type: 'task', category, status: 'available', priority: 1, notes, effort: effort || undefined, target_date: targetDate || undefined })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Add P1 Task</h3>
        <form onSubmit={handleSubmit} className="modal-form">
          <input autoFocus className="form-input" placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" value={effort} onChange={e => setEffort(e.target.value)}>
              <option value="">Effort…</option>
              {['15min', '30min', '1h', '2h', '4h', '1day'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <input className="form-input" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          <textarea className="form-input" placeholder="Notes (optional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
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

export function HomePrioritiesSection({ priorities, blockedGoals, tomorrowFocus }: HomePrioritiesSectionProps) {
  const qc = useQueryClient()
  const [activePopover, setActivePopover] = useState<string | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)

  return (
    <div onClick={() => setActivePopover(null)}>
      {/* [AR] قسم الأولويات — قائمة المهام الأعلى درجة */}
      {/* [EN] Priorities section — top-ranked task list */}
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Priorities</h2>
          <button className="btn-ghost-sm" onClick={e => { e.stopPropagation(); setShowAddTask(true) }}>+ Add task</button>
        </div>
        {tomorrowFocus && (
          <div className="focus-note">
            <span className="sp-label" style={{ flexShrink: 0 }}>Focus:</span>
            <em>{tomorrowFocus}</em>
            <Link to="/journal" className="focus-note-link">Edit →</Link>
          </div>
        )}
        {priorities.length === 0 ? (
          <div className="home-empty-priorities">
            <p className="home-empty-message">No priorities set yet</p>
            <Link to="/goals" className="home-empty-cta">Add your first priority →</Link>
          </div>
        ) : (
          <>
            <TopPriorityCard
              item={priorities[0]}
              isActive={activePopover === priorities[0].id}
              onToggle={() => setActivePopover(p => p === priorities[0].id ? null : priorities[0].id)}
            />
            {priorities.length > 1 && (
              <div className="task-list">
                {priorities.slice(1, 8).map(item => (
                  <PriorityRow key={item.id} item={item}
                    isActive={activePopover === item.id}
                    onToggle={() => setActivePopover(p => p === item.id ? null : item.id)} />
                ))}
              </div>
            )}
          </>
        )}
        {blockedGoals.length > 0 && (
          <div className="blocked-panel" style={{ marginTop: 8 }}>
            <p className="section-title" style={{ marginBottom: 6 }}>⚠ Blocked goals</p>
            <div className="blocked-list">
              {blockedGoals.map(g => (
                <Link key={g.id} to={`/goals?node=${g.id}`} className="blocked-row" style={{ textDecoration: 'none' }}>
                  <span className="blocked-title">{g.title}</span>
                  {g.blocked_by_titles.length > 0 && (
                    <span className="blocked-by">blocked by: {g.blocked_by_titles.join(', ')}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddTask && createPortal(
        <AddTaskModal onClose={() => setShowAddTask(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['dashboard-v2'] })
            qc.invalidateQueries({ queryKey: ['command-center'] })
          }} />,
        document.body
      )}
    </div>
  )
}
