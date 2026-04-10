import { useState, useRef, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateNode } from '../../lib/api'
import type { Node, NodeStatus } from '../../lib/types'
import { TYPE_ICONS, EFFORT_LABELS, KANBAN_STATUSES, COLLAPSED_BY_DEFAULT } from './constants'
import { isOverdue, isStalled, formatMinutes } from './utils'

const STATUS_COL_COLOR: Record<NodeStatus, string> = {
  active: '#22c55e', available: '#3b82f6', blocked: '#ef4444', done: '#6b7280', deferred: '#9ca3af',
}

function KanbanCard({ node, onSelect, onDragStart, onQuickDone }: {
  node: Node
  onSelect: (n: Node) => void
  onDragStart: (id: string) => void
  onQuickDone: () => void
}) {
  const isTaskLike = node.type === 'task' || node.type === 'subtask'
  const quickDone = useMutation({
    mutationFn: () => updateNode(node.id, { status: 'done' }),
    onSuccess: onQuickDone,
  })

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(node.id) }}
      onClick={() => onSelect(node)}
    >
      <div className="kanban-card-top">
        <span className="kanban-card-icon">{TYPE_ICONS[node.type] || '·'}</span>
        <span className="kanban-card-title">{node.title}</span>
        {node.priority && node.priority <= 2 && (
          <span className={`node-priority-badge p${node.priority}`}>P{node.priority}</span>
        )}
        {isTaskLike && node.status !== 'done' && (
          <button
            className="node-quick-done"
            title="Mark done"
            disabled={quickDone.isPending}
            onClick={e => { e.stopPropagation(); quickDone.mutate() }}
          >✓</button>
        )}
      </div>
      <div className="kanban-card-meta">
        {node.effort && <span>{EFFORT_LABELS[node.effort] || node.effort}</span>}
        {node.target_date && (
          <span className={isOverdue(node.target_date) ? 'overdue' : ''}>{node.target_date}</span>
        )}
        {isStalled(node) && <span className="node-stalled-badge" title="No updates in 14+ days">stalled</span>}
        {(node.total_logged_minutes ?? 0) > 0 && (
          <span title="Time logged">⏱ {formatMinutes(node.total_logged_minutes)}</span>
        )}
        {node.category && <span>{node.category}</span>}
        {(node.tags || []).slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
        {(node.attachment_count ?? 0) > 0 && <span>📎 {node.attachment_count}</span>}
      </div>
    </div>
  )
}

function KanbanColumn({ status, nodes, collapsed, isDragOver, onToggleCollapse, onDragOver, onDrop, onDragLeave, onSelect, onQuickDone, onDragStart }: {
  status: NodeStatus
  nodes: Node[]
  collapsed: boolean
  isDragOver: boolean
  onToggleCollapse: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onSelect: (n: Node) => void
  onQuickDone: () => void
  onDragStart: (id: string) => void
}) {
  return (
    <div className="kanban-col">
      <div className="kanban-col-header" onClick={onToggleCollapse}>
        <span className="kanban-col-dot" style={{ color: STATUS_COL_COLOR[status] }}>●</span>
        <span className="kanban-col-name">{status}</span>
        <span className="kanban-col-count">{nodes.length}</span>
        <span className="kanban-col-chevron">{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && (
        <div
          className={`kanban-col-body${isDragOver ? ' drag-over' : ''}`}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragLeave={onDragLeave}
        >
          {nodes.map(n => (
            <KanbanCard
              key={n.id}
              node={n}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onQuickDone={onQuickDone}
            />
          ))}
          {nodes.length === 0 && (
            <div className="kanban-empty-drop">Drop here</div>
          )}
        </div>
      )}
    </div>
  )
}

export function GoalsKanbanView({ nodes, onSelect, onUpdated }: {
  nodes: Node[]
  onSelect: (n: Node) => void
  onUpdated: () => void
}) {
  const dragIdRef = useRef<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<NodeStatus | null>(null)
  const [collapsed, setCollapsed] = useState<Set<NodeStatus>>(new Set(COLLAPSED_BY_DEFAULT))

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: NodeStatus }) => updateNode(id, { status }),
    onSuccess: onUpdated,
  })

  const byStatus = useMemo(() => {
    const m: Record<NodeStatus, Node[]> = { active: [], available: [], blocked: [], done: [], deferred: [] }
    nodes.forEach(n => { if (m[n.status]) m[n.status].push(n) })
    return m
  }, [nodes])

  function toggleCollapse(s: NodeStatus) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  return (
    <div className="kanban-board">
      {KANBAN_STATUSES.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          nodes={byStatus[status]}
          collapsed={collapsed.has(status)}
          isDragOver={dragOverCol === status}
          onToggleCollapse={() => toggleCollapse(status)}
          onDragStart={id => { dragIdRef.current = id }}
          onDragOver={e => { e.preventDefault(); setDragOverCol(status) }}
          onDrop={e => {
            e.preventDefault()
            if (dragIdRef.current) updateMut.mutate({ id: dragIdRef.current, status })
            dragIdRef.current = null
            setDragOverCol(null)
          }}
          onDragLeave={() => setDragOverCol(null)}
          onSelect={onSelect}
          onQuickDone={onUpdated}
        />
      ))}
    </div>
  )
}
