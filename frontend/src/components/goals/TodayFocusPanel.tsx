import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateNode } from '../../lib/api'
import type { Node } from '../../lib/types'
import { TYPE_LABELS, EFFORT_LABELS } from './constants'
import { isOverdue } from './utils'

function TodayFocusItem({ node, onUpdate }: { node: Node; onUpdate: () => void }) {
  const removeMut = useMutation({
    mutationFn: () => updateNode(node.id, { focus_date: null }),
    onSuccess: onUpdate,
  })
  const doneMut = useMutation({
    mutationFn: () => updateNode(node.id, { status: 'done' }),
    onSuccess: onUpdate,
  })

  return (
    <div className="today-focus-item">
      <span className={`node-type-badge badge-${node.type}`}>{TYPE_LABELS[node.type] || node.type}</span>
      <div className="today-focus-info">
        {node.parent_title && <span className="today-focus-parent">{node.parent_title} ›</span>}
        <span className="today-focus-item-title">{node.title}</span>
      </div>
      {node.effort && <span className="node-meta">{EFFORT_LABELS[node.effort] || node.effort}</span>}
      {node.target_date && (
        <span className={`node-meta${isOverdue(node.target_date) ? ' overdue' : ''}`}>{node.target_date}</span>
      )}
      <span className={`node-status-badge status-${node.status}`}>{node.status}</span>
      {(node.type === 'task' || node.type === 'subtask' || node.type === 'sub_task') && (
        <button
          className="node-quick-done"
          title="Mark done"
          disabled={doneMut.isPending}
          onClick={() => doneMut.mutate()}
        >✓</button>
      )}
      <button
        className="today-focus-remove"
        title="Remove from today's focus"
        disabled={removeMut.isPending}
        onClick={() => removeMut.mutate()}
      >×</button>
    </div>
  )
}

export function TodayFocusPanel({ nodes, onUpdate }: { nodes: Node[]; onUpdate: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const focusNodes = nodes.filter(n => n.focus_date === today && n.status !== 'done')
  const [collapsed, setCollapsed] = useState(false)

  if (focusNodes.length === 0) return null

  return (
    <div className="today-focus-panel">
      <button className="today-focus-header" onClick={() => setCollapsed(p => !p)}>
        <span className="today-focus-icon">📅</span>
        <span className="today-focus-title">Today's focus</span>
        <span className="today-focus-count">{focusNodes.length}</span>
        <span style={{ marginLeft: 'auto', fontSize: 13 }}>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="today-focus-list">
          {focusNodes.map(n => (
            <TodayFocusItem key={n.id} node={n} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
