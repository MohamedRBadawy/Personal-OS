import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createNode, decomposeNode } from '../../lib/api'
import type { Node, NodeType, DecomposeSubtask } from '../../lib/types'

export function DecomposeSection({ node, onChildrenCreated }: {
  node: Node
  onChildrenCreated: () => void
}) {
  const qc = useQueryClient()
  const [subtasks, setSubtasks] = useState<DecomposeSubtask[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleDecompose() {
    setLoading(true)
    setError('')
    setSubtasks([])
    setSelected(new Set())
    try {
      const result = await decomposeNode(node.id)
      setSubtasks(result.subtasks)
      setSelected(new Set(result.subtasks.map((_, i) => i)))
    } catch {
      setError('AI decomposition failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleItem(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function handleCreateSelected() {
    const toCreate = subtasks.filter((_, i) => selected.has(i))
    if (!toCreate.length) return
    setCreating(true)
    for (const s of toCreate) {
      await createNode({
        title: s.title,
        type: (s.type as NodeType) || 'task',
        effort: s.effort || undefined,
        notes: s.notes || undefined,
        parent: node.id,
        status: 'available',
        priority: node.priority ?? 3,
        category: node.category || 'Work',
      })
    }
    await qc.invalidateQueries({ queryKey: ['nodes'] })
    setSubtasks([])
    setSelected(new Set())
    setCreating(false)
    onChildrenCreated()
  }

  return (
    <div className="decompose-section">
      <div className="decompose-header">
        <span className="decompose-label">AI Decomposition</span>
        <button
          className="btn-ghost-sm"
          onClick={handleDecompose}
          disabled={loading}
          title="Ask AI to suggest child tasks for this node"
        >
          {loading ? '…' : '✦ Break it down'}
        </button>
      </div>

      {error && <p className="decompose-error">{error}</p>}

      {subtasks.length > 0 && (
        <>
          <ul className="decompose-list">
            {subtasks.map((s, i) => (
              <li key={i} className={`decompose-item ${selected.has(i) ? 'selected' : ''}`}>
                <label className="decompose-item-label">
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleItem(i)}
                  />
                  <span className="decompose-item-title">{s.title}</span>
                  <span className="decompose-item-meta">{s.effort}</span>
                </label>
                {s.notes && <p className="decompose-item-notes">{s.notes}</p>}
              </li>
            ))}
          </ul>
          <div className="decompose-actions">
            <button className="btn-ghost-sm" onClick={() => setSubtasks([])}>Dismiss</button>
            <button
              className="btn-primary"
              style={{ fontSize: 14 }}
              disabled={creating || selected.size === 0}
              onClick={handleCreateSelected}
            >
              {creating ? 'Creating…' : `Add ${selected.size} as children`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
