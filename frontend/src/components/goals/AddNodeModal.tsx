import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createNode } from '../../lib/api'
import type { Node, NodeType, NodeStatus, NodeCreatePayload } from '../../lib/types'
import { TYPE_ICONS, NODE_TYPES, CATEGORIES, STATUSES } from './constants'

export function AddNodeModal({ onClose, onSaved, allNodes }: {
  onClose: () => void
  onSaved: () => void
  allNodes: Node[]
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<NodeType>('task')
  const [category, setCategory] = useState('Work')
  const [bizContext, setBizContext] = useState('')
  const [status, setStatus] = useState<NodeStatus>('available')
  const [priority, setPriority] = useState('2')
  const [parentId, setParentId] = useState('')
  const [notes, setNotes] = useState('')

  const mut = useMutation({
    mutationFn: (p: NodeCreatePayload) => createNode(p),
    onSuccess: () => { onSaved(); onClose() },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    mut.mutate({
      title, type, category,
      business_context: bizContext as import('../../lib/types').BusinessContext || undefined,
      status, priority: parseInt(priority),
      parent: parentId || null, notes,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Add node</h3>
        <form onSubmit={handleSubmit} className="modal-form">
          <input autoFocus className="form-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="form-input" value={type} onChange={e => setType(e.target.value as NodeType)}>
              {NODE_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
            </select>
            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value as NodeStatus)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-input" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="1">P1</option><option value="2">P2</option><option value="3">P3</option><option value="4">P4</option>
            </select>
          </div>
          <select className="form-input" value={bizContext} onChange={e => setBizContext(e.target.value)}>
            <option value="">Personal / Life OS</option>
            <option value="k_line">K Line Europe</option>
            <option value="freelance">Freelance client</option>
            <option value="own_business">Own business</option>
            <option value="idea">Business idea</option>
          </select>
          <select className="form-input" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">— no parent —</option>
            {allNodes.map(n => <option key={n.id} value={n.id}>{TYPE_ICONS[n.type]} {n.title}</option>)}
          </select>
          <textarea className="form-input" placeholder="Notes (optional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Add node'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
