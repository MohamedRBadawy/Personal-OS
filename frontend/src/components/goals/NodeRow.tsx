import { useState, useEffect, useContext } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateNode } from '../../lib/api'
import type { Node } from '../../lib/types'
import { TYPE_LABELS, EFFORT_LABELS, ExpandAllContext, IsFilteringContext } from './constants'
import { isOverdue, isStalled, formatMinutes } from './utils'
import { NodeList } from './NodeList'

export type NodeWithChildren = Node & { children?: Node[] }

export function NodeRow({ node, depth, onSelect, onQuickDone, onReorder, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }: {
  node: NodeWithChildren
  depth: number
  onSelect: (n: Node) => void
  onQuickDone: () => void
  onReorder?: (items: { id: string; order: number }[]) => void
  isDragOver?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}) {
  const expandAllCtx   = useContext(ExpandAllContext)
  const isFilteringCtx = useContext(IsFilteringContext)
  const [expanded, setExpanded] = useState(expandAllCtx)
  useEffect(() => { setExpanded(expandAllCtx) }, [expandAllCtx])
  const hasChildren = (node.children?.length ?? 0) > 0

  const childProgress = hasChildren
    ? Math.round((node.children!.filter(c => c.status === 'done').length / node.children!.length) * 100)
    : null
  const displayProgress = childProgress !== null ? childProgress : (node.progress ?? 0)

  const quickDone = useMutation({
    mutationFn: () => updateNode(node.id, { status: 'done' }),
    onSuccess: onQuickDone,
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const isFocused = node.focus_date === todayStr
  const focusMut = useMutation({
    mutationFn: () => updateNode(node.id, { focus_date: isFocused ? null : todayStr }),
    onSuccess: onQuickDone,
  })

  const isTaskLike = node.type === 'task' || node.type === 'subtask'

  return (
    <div
      className={`node-tree-item${isDragOver ? ' drag-over' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <button
        className={`node-card type-${node.type}`}
        style={{ paddingLeft: 16 + depth * 20 }}
        title={node.notes ? node.notes.slice(0, 120) : undefined}
        onClick={() => onSelect(node)}
      >
        <span className="node-drag-handle" title="Drag to reorder" onMouseDown={e => e.stopPropagation()}>⠿</span>
        <span
          className={`node-expand${hasChildren ? '' : ' invisible'}`}
          onClick={e => { e.stopPropagation(); setExpanded(p => !p) }}
        >{expanded ? '▾' : '▸'}</span>

        <span className={`node-type-badge badge-${node.type}`}>{TYPE_LABELS[node.type] || node.type}</span>
        <span className="node-card-title">
          {isFilteringCtx && node.parent_title && (
            <small className="node-breadcrumb">{node.parent_title} ›</small>
          )}
          {node.title}
        </span>
        {(node.dependent_count ?? 0) > 0 && (
          <span className="node-dep-badge" title={`${node.dependent_count} node${node.dependent_count === 1 ? '' : 's'} depend on this`}>
            ↗{node.dependent_count}
          </span>
        )}

        {node.priority && node.priority <= 2 && (
          <span className={`node-priority-badge p${node.priority}`}>P{node.priority}</span>
        )}
        {node.effort && <span className="node-meta">{EFFORT_LABELS[node.effort] || node.effort}</span>}
        {node.target_date && (
          <span className={`node-meta${isOverdue(node.target_date) ? ' overdue' : ''}`}>{node.target_date}</span>
        )}
        {isStalled(node) && <span className="node-stalled-badge" title="No updates in 14+ days">stalled</span>}
        {(node.total_logged_minutes ?? 0) > 0 && (
          <span className="node-meta" title="Time logged">⏱ {formatMinutes(node.total_logged_minutes)}</span>
        )}
        {(displayProgress > 0 || hasChildren) && (
          <span className="node-meta">{displayProgress}%{childProgress !== null ? ' ↻' : ''}</span>
        )}
        {(node.tags || []).slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
        {node.status === 'blocked' && (
          <span className="node-blocked-hint">⚠{node.blocked_by_titles?.length ? ` by: ${node.blocked_by_titles[0]}` : ''}</span>
        )}
        {(node.attachment_count ?? 0) > 0 && (
          <span className="node-attachment-badge">📎 {node.attachment_count}</span>
        )}
        <span className={`node-status-badge status-${node.status}`}>{node.status}</span>
        {node.category && <span className="node-category-pill">{node.category}</span>}
        {isTaskLike && node.status !== 'done' && (
          <button
            className="node-quick-done"
            title="Mark done"
            disabled={quickDone.isPending}
            onClick={e => { e.stopPropagation(); quickDone.mutate() }}
          >✓</button>
        )}
        {node.status !== 'done' && (
          <button
            className={`node-focus-btn${isFocused ? ' active' : ''}`}
            title={isFocused ? 'Remove from today\'s focus' : 'Schedule for today'}
            disabled={focusMut.isPending}
            onClick={e => { e.stopPropagation(); focusMut.mutate() }}
          >📅</button>
        )}
      </button>

      {hasChildren && (
        <div className="node-progress-bar" style={{ marginLeft: 16 + depth * 20 + 40 }}>
          <div className="node-progress-fill" style={{ width: `${displayProgress}%` }} />
        </div>
      )}
      {!hasChildren && displayProgress > 0 && (
        <div className="node-progress-bar" style={{ marginLeft: 16 + depth * 20 + 40 }}>
          <div className="node-progress-fill" style={{ width: `${displayProgress}%` }} />
        </div>
      )}

      {expanded && hasChildren && (
        <div className="node-children">
          <NodeList nodes={node.children!} depth={depth + 1} onSelect={onSelect} onQuickDone={onQuickDone} onReorder={onReorder} />
        </div>
      )}
    </div>
  )
}
