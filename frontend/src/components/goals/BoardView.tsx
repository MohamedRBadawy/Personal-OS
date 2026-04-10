import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateNode } from '../../lib/api'
import type { Node } from '../../lib/types'
import { TYPE_ICONS, EFFORT_LABELS } from './constants'
import { isOverdue, isStalled, formatMinutes, bySortKey } from './utils'

function BoardCard({ node, onSelect, onUpdated }: {
  node: Node
  onSelect: (n: Node) => void
  onUpdated: () => void
}) {
  const isTaskLike = node.type === 'task' || node.type === 'subtask'
  const quickDone = useMutation({
    mutationFn: () => updateNode(node.id, { status: 'done' }),
    onSuccess: onUpdated,
  })

  return (
    <div className="board-card" onClick={() => onSelect(node)}>
      <div className="board-card-top">
        <span className="board-card-icon">{TYPE_ICONS[node.type] || '·'}</span>
        <span className="board-card-title">{node.title}</span>
        {node.priority && node.priority <= 2 && (
          <span className={`node-priority-badge p${node.priority}`}>P{node.priority}</span>
        )}
      </div>

      {node.why && <div className="board-card-why">{node.why}</div>}

      {node.progress > 0 && (
        <div className="board-card-progress">
          <div className="board-card-progress-fill" style={{ width: `${node.progress}%` }} />
        </div>
      )}

      <div className="board-card-meta">
        {node.category && <span className="node-category-pill">{node.category}</span>}
        {node.effort && <span>{EFFORT_LABELS[node.effort] || node.effort}</span>}
        {node.target_date && (
          <span className={isOverdue(node.target_date) ? 'overdue' : ''}>{node.target_date}</span>
        )}
        {isStalled(node) && <span className="node-stalled-badge" title="No updates in 14+ days">stalled</span>}
        {(node.total_logged_minutes ?? 0) > 0 && (
          <span title="Time logged">⏱ {formatMinutes(node.total_logged_minutes)}</span>
        )}
        {(node.tags || []).slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
        {(node.attachment_count ?? 0) > 0 && <span>📎 {node.attachment_count}</span>}
      </div>

      <div className="board-card-footer">
        <span className={`node-status-badge status-${node.status}`}>{node.status}</span>
        {isTaskLike && node.status !== 'done' && (
          <button
            className="node-quick-done"
            title="Mark done"
            disabled={quickDone.isPending}
            onClick={e => { e.stopPropagation(); quickDone.mutate() }}
          >✓ done</button>
        )}
      </div>
    </div>
  )
}

export function GoalsBoardView({ nodes, onSelect, onUpdated }: {
  nodes: Node[]
  onSelect: (n: Node) => void
  onUpdated: () => void
}) {
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'type'>('none')

  const groups = useMemo(() => {
    const sorted = [...nodes].sort(bySortKey)
    if (groupBy === 'none') return [{ label: null as string | null, nodes: sorted }]
    const map = new Map<string, Node[]>()
    sorted.forEach(n => {
      const key = groupBy === 'category' ? (n.category || 'Uncategorised') : n.type
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    })
    return [...map.entries()].map(([label, items]) => ({ label, nodes: items }))
  }, [nodes, groupBy])

  return (
    <div className="board-view">
      <div className="board-groupby">
        <span>Group by:</span>
        {(['none', 'category', 'type'] as const).map(g => (
          <button
            key={g}
            className={`btn-ghost-sm${groupBy === g ? ' active' : ''}`}
            onClick={() => setGroupBy(g)}
          >
            {g === 'none' ? 'None' : g === 'category' ? 'Category' : 'Type'}
          </button>
        ))}
      </div>
      {nodes.length === 0 ? (
        <div className="empty-hint" style={{ padding: 24 }}>No nodes match this filter.</div>
      ) : (
        groups.map(g => (
          <div key={g.label ?? 'all'}>
            {g.label && <h3 className="board-group-header">{g.label}</h3>}
            <div className="board-grid">
              {g.nodes.map(n => <BoardCard key={n.id} node={n} onSelect={onSelect} onUpdated={onUpdated} />)}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
