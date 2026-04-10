import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateNode, deleteNode } from '../../lib/api'
import type { Node, NodeStatus, NodeUpdatePayload } from '../../lib/types'
import { TYPE_ICONS, STATUSES, CATEGORIES, EFFORTS, EFFORT_LABELS } from './constants'
import { AttachmentsSection } from './AttachmentsSection'
import { TimerSection } from './TimerSection'
import { DecomposeSection } from './DecomposeSection'
import { ConnectionsSection } from './ConnectionsSection'

export function NodeSidePanel({
  node, allNodes, onClose, onSaved, onDeleted,
}: {
  node: Node; allNodes: Node[]; onClose: () => void; onSaved: () => void; onDeleted: () => void
}) {
  const [title, setTitle] = useState(node.title)
  const [status, setStatus] = useState<NodeStatus>(node.status)
  const [category, setCategory] = useState(node.category || '')
  const [bizContext, setBizContext] = useState(node.business_context || '')
  const [priority, setPriority] = useState(node.priority?.toString() || '')
  const [effort, setEffort] = useState(node.effort || '')
  const [progress, setProgress] = useState(node.progress ?? 0)
  const [targetDate, setTargetDate] = useState(node.target_date || '')
  const [startDate, setStartDate] = useState(node.start_date || '')
  const [tags, setTags] = useState((node.tags || []).join(', '))
  const [notes, setNotes] = useState(node.notes || '')
  const [why, setWhy] = useState(node.why || '')
  const [checklist, setChecklist] = useState<Array<{ text: string; done: boolean }>>(node.checklist || [])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [parent, setParent] = useState(node.parent || '')
  const [deps, setDeps] = useState<string[]>(node.deps || [])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMut = useMutation({
    mutationFn: (p: NodeUpdatePayload) => updateNode(node.id, p),
    onSuccess: () => { onSaved(); onClose() },
  })
  const deleteMut = useMutation({
    mutationFn: () => deleteNode(node.id),
    onSuccess: () => { onDeleted(); onClose() },
  })

  function handleSave() {
    updateMut.mutate({
      title, status, category,
      business_context: bizContext as import('../../lib/types').BusinessContext || undefined,
      priority: priority ? parseInt(priority) : undefined,
      effort: effort || undefined,
      progress,
      target_date: targetDate || undefined,
      start_date: startDate || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      notes,
      why,
      checklist,
      parent: parent || null,
      deps,
    })
  }

  function addCheckItem() {
    const text = newCheckItem.trim()
    if (!text) return
    setChecklist(c => [...c, { text, done: false }])
    setNewCheckItem('')
  }

  function toggleCheckItem(idx: number) {
    setChecklist(c => c.map((item, i) => i === idx ? { ...item, done: !item.done } : item))
  }

  function removeCheckItem(idx: number) {
    setChecklist(c => c.filter((_, i) => i !== idx))
  }

  const others = allNodes.filter(n => n.id !== node.id)
  const hasChildNodes = allNodes.some(n => n.parent === node.id)
  const enabledNodes = allNodes.filter(n => (n.deps || []).includes(node.id))

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={e => e.stopPropagation()}>
        <div className="side-panel-header">
          <span className="side-panel-icon">{TYPE_ICONS[node.type] || '·'}</span>
          <h3 className="side-panel-title">{node.title}</h3>
          <button className="side-panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="side-panel-body">
          <div className="sp-field"><label className="sp-label">Title</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} /></div>

          {(node.type === 'goal' || node.type === 'project') && (
            <div className="sp-field">
              <label className="sp-label">Why (motivation)</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Why does this matter to you?"
                value={why}
                onChange={e => setWhy(e.target.value)}
              />
            </div>
          )}

          <div className="sp-row">
            <div className="sp-field"><label className="sp-label">Status</label>
              <select className="form-input" value={status} onChange={e => setStatus(e.target.value as NodeStatus)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div className="sp-field"><label className="sp-label">Priority</label>
              <select className="form-input" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="">—</option>
                <option value="1">P1 Critical</option><option value="2">P2 Important</option>
                <option value="3">P3 Normal</option><option value="4">P4 Low</option>
              </select></div>
          </div>

          <div className="sp-row">
            <div className="sp-field"><label className="sp-label">Category</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="sp-field"><label className="sp-label">Effort</label>
              <select className="form-input" value={effort} onChange={e => setEffort(e.target.value)}>
                <option value="">—</option>
                {EFFORTS.map(ef => <option key={ef} value={ef}>{EFFORT_LABELS[ef]}</option>)}
              </select></div>
          </div>

          <div className="sp-field"><label className="sp-label">Business context</label>
            <select className="form-input" value={bizContext} onChange={e => setBizContext(e.target.value)}>
              <option value="">Personal / Life OS</option>
              <option value="k_line">K Line Europe</option>
              <option value="freelance">Freelance client</option>
              <option value="own_business">Own business</option>
              <option value="idea">Business idea</option>
            </select>
          </div>

          <div className="sp-field">
            <label className="sp-label">
              Progress — {hasChildNodes
                ? `${Math.round((allNodes.filter(n => n.parent === node.id && n.status === 'done').length / allNodes.filter(n => n.parent === node.id).length) * 100)}% (auto from children)`
                : `${progress}%`
              }
            </label>
            <input type="range" min={0} max={100} step={5} className="sp-slider"
              value={hasChildNodes
                ? Math.round((allNodes.filter(n => n.parent === node.id && n.status === 'done').length / allNodes.filter(n => n.parent === node.id).length) * 100)
                : progress}
              disabled={hasChildNodes}
              onChange={e => setProgress(parseInt(e.target.value))} />
            {hasChildNodes && <p className="sp-hint">Computed from {allNodes.filter(n => n.parent === node.id).length} children</p>}
          </div>

          <div className="sp-row">
            <div className="sp-field"><label className="sp-label">Start date</label>
              <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="sp-field"><label className="sp-label">Target date</label>
              <input className="form-input" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></div>
          </div>

          <div className="sp-field"><label className="sp-label">Tags (comma-separated)</label>
            <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2" /></div>

          <div className="sp-field"><label className="sp-label">Parent</label>
            <select className="form-input" value={parent} onChange={e => setParent(e.target.value)}>
              <option value="">— none —</option>
              {others.map(n => <option key={n.id} value={n.id}>{TYPE_ICONS[n.type]} {n.title}</option>)}
            </select></div>

          <div className="sp-field"><label className="sp-label">Blocked by</label>
            <div className="sp-dep-list">
              {others.map(n => (
                <label key={n.id} className="sp-dep-item">
                  <input type="checkbox" checked={deps.includes(n.id)}
                    onChange={e => setDeps(prev => e.target.checked ? [...prev, n.id] : prev.filter(d => d !== n.id))} />
                  <span>{TYPE_ICONS[n.type]} {n.title}</span>
                </label>
              ))}
            </div></div>

          {enabledNodes.length > 0 && (
            <div className="sp-field">
              <label className="sp-label">Enables / Unlocks ({enabledNodes.length})</label>
              <div className="sp-enables-list">
                {enabledNodes.map(n => (
                  <span key={n.id} className="sp-enables-chip">
                    {TYPE_ICONS[n.type]} {n.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="sp-field"><label className="sp-label">Notes</label>
            <textarea className="form-input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} /></div>

          {/* Checklist */}
          <div className="sp-field">
            <label className="sp-label">Checklist</label>
            {checklist.length > 0 && (
              <ul className="sp-checklist">
                {checklist.map((item, idx) => (
                  <li key={idx} className={`sp-checklist-item ${item.done ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleCheckItem(idx)}
                    />
                    <span className="sp-checklist-text">{item.text}</span>
                    <button className="sp-attachment-delete" onClick={() => removeCheckItem(idx)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="sp-checklist-add">
              <input
                className="form-input"
                placeholder="＋ Add checklist item…"
                value={newCheckItem}
                onChange={e => setNewCheckItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
              />
            </div>
          </div>

          <AttachmentsSection nodeId={node.id} />

          {node.type !== 'idea' && node.type !== 'burden' && (
            <TimerSection node={node} />
          )}

          {(node.type === 'goal' || node.type === 'project' || node.type === 'task') && (
            <DecomposeSection
              node={node}
              onChildrenCreated={onSaved}
            />
          )}

          <ConnectionsSection node={node} />
        </div>

        <div className="side-panel-footer">
          {!confirmDelete ? (
            <>
              <button className="btn-ghost sp-delete" onClick={() => setConfirmDelete(true)}>Delete</button>
              <div style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={updateMut.isPending} onClick={handleSave}>
                {updateMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Delete this node and all children?</span>
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn-danger" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate()}>
                {deleteMut.isPending ? '…' : 'Yes, delete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
