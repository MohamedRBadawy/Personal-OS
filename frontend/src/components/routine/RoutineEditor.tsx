import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteRoutineBlock, reorderRoutineBlocks, listNodes } from '../../lib/api'
import type { RoutineBlock, Node } from '../../lib/types'
import { TYPE_COLORS } from './constants'
import type { EditorRow } from './constants'
import { BlockEditPanel } from './BlockEditPanel'

export function RoutineEditor({ blocks, onDone }: { blocks: RoutineBlock[]; onDone: () => void }) {
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
