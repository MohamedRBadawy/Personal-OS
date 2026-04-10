import { useState, useRef } from 'react'
import type { Node } from '../../lib/types'
import { NodeRow, type NodeWithChildren } from './NodeRow'

export function NodeList({ nodes, depth, onSelect, onQuickDone, onReorder }: {
  nodes: NodeWithChildren[]
  depth: number
  onSelect: (n: Node) => void
  onQuickDone: () => void
  onReorder?: (items: { id: string; order: number }[]) => void
}) {
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragIdRef = useRef<string | null>(null)

  if (!nodes.length) return null

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
    e.stopPropagation()
  }
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragIdRef.current && dragIdRef.current !== id) setDragOverId(id)
  }
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const fromId = dragIdRef.current
    if (!fromId || fromId === targetId || !onReorder) { setDragOverId(null); return }
    const reordered = [...nodes]
    const fromIdx = reordered.findIndex(x => x.id === fromId)
    const toIdx = reordered.findIndex(x => x.id === targetId)
    if (fromIdx < 0 || toIdx < 0) { setDragOverId(null); return }
    reordered.splice(toIdx, 0, reordered.splice(fromIdx, 1)[0])
    onReorder(reordered.map((x, i) => ({ id: x.id, order: i })))
    dragIdRef.current = null
    setDragOverId(null)
  }
  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()
    dragIdRef.current = null
    setDragOverId(null)
  }

  return (
    <>
      {nodes.map(n => (
        <NodeRow
          key={n.id}
          node={n}
          depth={depth}
          onSelect={onSelect}
          onQuickDone={onQuickDone}
          onReorder={onReorder}
          isDragOver={dragOverId === n.id}
          onDragStart={e => handleDragStart(e, n.id)}
          onDragOver={e => handleDragOver(e, n.id)}
          onDrop={e => handleDrop(e, n.id)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </>
  )
}
