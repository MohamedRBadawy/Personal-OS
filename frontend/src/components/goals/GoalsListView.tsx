import { useMemo, useState } from 'react'
import type { Node } from '../../lib/types'
import { NodeList } from './NodeList'
import type { NodeWithChildren } from './NodeRow'

export function GoalsListView({ nodes, onSelect, onQuickDone, onReorder }: {
  nodes: NodeWithChildren[]
  onSelect: (n: Node) => void
  onQuickDone: () => void
  onReorder: (items: { id: string; order: number }[]) => void
}) {
  if (nodes.length === 0) {
    return <div className="empty-hint" style={{ padding: 24 }}>No nodes match this filter.</div>
  }
  return (
    <div className="node-tree">
      <NodeList nodes={nodes} depth={0} onSelect={onSelect} onQuickDone={onQuickDone} onReorder={onReorder} />
    </div>
  )
}

export function GroupedListView({ nodes, groupBy, onSelect, onQuickDone, onReorder }: {
  nodes: Node[]
  groupBy: 'category' | 'type' | 'status'
  onSelect: (n: Node) => void
  onQuickDone: () => void
  onReorder: (items: { id: string; order: number }[]) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const map = new Map<string, Node[]>()
    nodes.forEach(n => {
      const key = groupBy === 'category' ? (n.category || 'Uncategorised')
        : groupBy === 'type' ? n.type : n.status
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    })
    return [...map.entries()].map(([label, items]) => ({ label, nodes: items }))
  }, [nodes, groupBy])

  if (nodes.length === 0) {
    return <div className="empty-hint" style={{ padding: 24 }}>No nodes match this filter.</div>
  }

  return (
    <div className="node-tree">
      {groups.map(g => {
        const isCollapsed = collapsed.has(g.label)
        return (
          <div key={g.label} className="list-group">
            <button
              className="list-group-header"
              onClick={() => setCollapsed(prev => {
                const next = new Set(prev)
                next.has(g.label) ? next.delete(g.label) : next.add(g.label)
                return next
              })}
            >
              <span className="list-group-chevron">{isCollapsed ? '▸' : '▾'}</span>
              <span className="list-group-label">{g.label}</span>
              <span className="list-group-count">{g.nodes.length}</span>
            </button>
            {!isCollapsed && (
              <div className="list-group-body">
                <NodeList
                  nodes={g.nodes.map(n => ({ ...n, children: [] as Node[] }))}
                  depth={0}
                  onSelect={onSelect}
                  onQuickDone={onQuickDone}
                  onReorder={onReorder}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
