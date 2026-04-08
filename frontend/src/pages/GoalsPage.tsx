import { useState, useMemo, useEffect, useRef, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import { listNodes, createNode, updateNode, deleteNode, reorderNodes, listAttachments, createAttachment, deleteAttachment, decomposeNode, listTimeLogs, createTimeLog, deleteTimeLog, listRoutineBlocksForNode, listHabitsForNode, listContactsForNode, listLearningItemsForNode, listMarketingActionsForNode } from '../lib/api'
import type { Node, NodeCreatePayload, NodeUpdatePayload, NodeStatus, NodeType, Attachment, DecomposeSubtask, TimeLog } from '../lib/types'

// ── Constants ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  goal: '◎', project: '⬡', task: '◻', sub_task: '·', subtask: '·', idea: '✦', burden: '⚠',
}

const TYPE_LABELS: Record<string, string> = {
  goal: 'Goal', project: 'Project', task: 'Task',
  sub_task: 'Subtask', subtask: 'Subtask', idea: 'Idea', burden: 'Burden',
}

const EFFORT_LABELS: Record<string, string> = {
  '15min': '15m', '30min': '30m', '1h': '1h', '2h': '2h',
  '4h': '4h', '1day': '1d', '2days': '2d', '1week': '1w', 'ongoing': '∞',
}

const CATEGORIES = ['Life', 'Work', 'Finance', 'Health', 'Spiritual', 'Family', 'Learning', 'Ideas']
const STATUSES: NodeStatus[] = ['active', 'available', 'blocked', 'done', 'deferred']
const NODE_TYPES: NodeType[] = ['goal', 'project', 'task', 'subtask', 'idea', 'burden']
const EFFORTS = ['15min', '30min', '1h', '2h', '4h', '1day', '2days', '1week', 'ongoing']

const KANBAN_STATUSES: NodeStatus[] = ['active', 'available', 'blocked', 'done', 'deferred']
const COLLAPSED_BY_DEFAULT: NodeStatus[] = ['done', 'deferred']

const VIEWS = [
  { id: 'list',   label: '☰ List' },
  { id: 'kanban', label: '⬡ Kanban' },
  { id: 'board',  label: '⊞ Board' },
] as const
type ViewMode = (typeof VIEWS)[number]['id']

function bySortKey(a: Node, b: Node): number {
  if (a.order !== b.order) return a.order - b.order
  return (a.priority ?? 99) - (b.priority ?? 99)
}

type SortKey = 'manual' | 'name' | 'due' | 'updated' | 'priority' | 'progress' | 'time'

function makeSorter(sortBy: SortKey): (a: Node, b: Node) => number {
  switch (sortBy) {
    case 'name':     return (a, b) => a.title.localeCompare(b.title)
    case 'due':      return (a, b) => {
      if (!a.target_date && !b.target_date) return 0
      if (!a.target_date) return 1
      if (!b.target_date) return -1
      return a.target_date.localeCompare(b.target_date)
    }
    case 'updated':  return (a, b) => b.updated_at.localeCompare(a.updated_at)
    case 'priority': return (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
    case 'progress': return (a, b) => b.progress - a.progress
    case 'time':     return (a, b) => (b.total_logged_minutes ?? 0) - (a.total_logged_minutes ?? 0)
    default:         return bySortKey
  }
}

// ── Contexts ──────────────────────────────────────────────────────────────
const ExpandAllContext   = createContext<boolean>(true)
const IsFilteringContext = createContext<boolean>(false)

// ── Helpers ───────────────────────────────────────────────────────────────

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

function isStalled(node: Node): boolean {
  if (node.status === 'done' || node.status === 'deferred') return false
  return (Date.now() - new Date(node.updated_at).getTime()) > 14 * 24 * 60 * 60 * 1000
}

function buildTree(nodes: Node[]): (Node & { children: Node[] })[] {
  const map = new Map<string, Node & { children: Node[] }>()
  nodes.forEach(n => map.set(n.id, { ...n, children: [] }))
  const roots: (Node & { children: Node[] })[] = []
  map.forEach(n => {
    if (n.parent && map.has(n.parent)) {
      map.get(n.parent)!.children.push(n)
    } else {
      roots.push(n)
    }
  })
  // Sort each level by manual order first, then priority
  map.forEach(n => n.children.sort(bySortKey))
  roots.sort(bySortKey)
  return roots
}

// ── Node List (drag-to-reorder wrapper) ────────────────────────────────────

type NodeWithChildren = Node & { children?: Node[] }

function NodeList({ nodes, depth, onSelect, onQuickDone, onReorder }: {
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

// ── Attachments Section ───────────────────────────────────────────────────

const ATTACH_ICONS: Record<Attachment['type'], string> = {
  url: '🔗',
  file: '📎',
  snippet: '📝',
}

function AttachmentsSection({ nodeId }: { nodeId: string }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [aType, setAType] = useState<Attachment['type']>('url')
  const [aTitle, setATitle] = useState('')
  const [aUrl, setAUrl] = useState('')
  const [aContent, setAContent] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ['attachments', nodeId],
    queryFn: () => listAttachments(Number(nodeId)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAttachment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', nodeId] }),
  })

  async function handleAdd() {
    if (!aTitle.trim()) return
    setSaving(true)
    await createAttachment({
      node: Number(nodeId),
      type: aType,
      title: aTitle.trim(),
      url: aUrl.trim(),
      content: aContent.trim(),
    })
    await qc.invalidateQueries({ queryKey: ['attachments', nodeId] })
    setATitle('')
    setAUrl('')
    setAContent('')
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="sp-attachments">
      <p className="sp-attachments-title">Attachments</p>

      {attachments.length > 0 && (
        <ul className="sp-attachment-list">
          {attachments.map(a => (
            <li key={a.id} className="sp-attachment-item">
              <span className="sp-attachment-icon">{ATTACH_ICONS[a.type]}</span>
              {a.type === 'url' ? (
                <a className="sp-attachment-link" href={a.url} target="_blank" rel="noreferrer" title={a.url}>
                  {a.title}
                </a>
              ) : (
                <span className="sp-attachment-link" title={a.content}>{a.title}</span>
              )}
              <button
                className="sp-attachment-delete"
                onClick={() => deleteMut.mutate(a.id)}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="sp-add-attachment-form">
          <div className="sp-attachment-type-row">
            {(['url', 'file', 'snippet'] as Attachment['type'][]).map(t => (
              <button
                key={t}
                className={`sp-attachment-type-btn ${aType === t ? 'active' : ''}`}
                onClick={() => setAType(t)}
              >
                {ATTACH_ICONS[t]} {t}
              </button>
            ))}
          </div>

          <input
            className="form-input"
            placeholder="Title"
            value={aTitle}
            onChange={e => setATitle(e.target.value)}
          />

          {aType === 'url' && (
            <input
              className="form-input"
              placeholder="https://…"
              value={aUrl}
              onChange={e => setAUrl(e.target.value)}
            />
          )}

          {aType === 'snippet' && (
            <textarea
              className="form-input"
              rows={3}
              placeholder="Text snippet…"
              value={aContent}
              onChange={e => setAContent(e.target.value)}
            />
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary" style={{ fontSize: 12 }} disabled={saving || !aTitle.trim()} onClick={handleAdd}>
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost-sm" style={{ fontSize: 12 }} onClick={() => setShowForm(true)}>
          + Add attachment
        </button>
      )}
    </div>
  )
}

// ── Timer Section ─────────────────────────────────────────────────────────────

const TIMER_KEY = (nodeId: string) => `timer_start_${nodeId}`

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatElapsed(startMs: number): string {
  const elapsed = Math.floor((Date.now() - startMs) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function TimerSection({ node }: { node: Node }) {
  const qc = useQueryClient()
  const storageKey = TIMER_KEY(node.id)

  const [running, setRunning] = useState(() => !!localStorage.getItem(storageKey))
  const [elapsed, setElapsed] = useState('0:00')
  const [manualMin, setManualMin] = useState('')
  const [note, setNote] = useState('')
  const [logNote, setLogNote] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: logs = [] } = useQuery<TimeLog[]>({
    queryKey: ['timelogs', node.id],
    queryFn: () => listTimeLogs(node.id),
  })

  const totalMinutes = logs.reduce((sum, l) => sum + l.minutes, 0)

  const createMut = useMutation({
    mutationFn: (p: Parameters<typeof createTimeLog>[0]) => createTimeLog(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timelogs', node.id] }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTimeLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timelogs', node.id] }),
  })

  // Tick timer if running
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    const startMs = Number(localStorage.getItem(storageKey))
    intervalRef.current = setInterval(() => {
      setElapsed(formatElapsed(startMs))
    }, 1000)
    setElapsed(formatElapsed(startMs))
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, storageKey])

  function handleStart() {
    localStorage.setItem(storageKey, String(Date.now()))
    setRunning(true)
  }

  function handleStop() {
    const startMs = Number(localStorage.getItem(storageKey))
    const minutes = Math.max(1, Math.round((Date.now() - startMs) / 60000))
    localStorage.removeItem(storageKey)
    setRunning(false)
    setElapsed('0:00')
    createMut.mutate({
      node: node.id,
      started_at: new Date(startMs).toISOString(),
      ended_at: new Date().toISOString(),
      minutes,
      note: logNote,
    })
    setLogNote('')
  }

  function handleManualLog() {
    const min = parseInt(manualMin)
    if (!min || min < 1) return
    createMut.mutate({ node: node.id, minutes: min, note })
    setManualMin('')
    setNote('')
  }

  return (
    <div className="timer-section">
      <div className="timer-header">
        <span className="timer-label">Time Tracker</span>
        <span className="timer-total">{formatMinutes(totalMinutes)} total</span>
      </div>

      {/* Active timer */}
      <div className="timer-controls">
        {running ? (
          <>
            <span className="timer-elapsed timer-active">{elapsed}</span>
            <input
              className="form-input"
              placeholder="Session note (optional)"
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={handleStop}>
              Stop
            </button>
          </>
        ) : (
          <button className="btn-ghost-sm" onClick={handleStart} style={{ fontSize: 12 }}>
            ▶ Start session
          </button>
        )}
      </div>

      {/* Manual log */}
      {!running && (
        <div className="timer-manual">
          <input
            className="form-input"
            type="number"
            min={1}
            placeholder="Minutes"
            value={manualMin}
            onChange={e => setManualMin(e.target.value)}
            style={{ width: 80, fontSize: 12 }}
          />
          <input
            className="form-input"
            placeholder="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button
            className="btn-ghost-sm"
            style={{ fontSize: 12 }}
            disabled={!manualMin || parseInt(manualMin) < 1}
            onClick={handleManualLog}
          >
            Log
          </button>
        </div>
      )}

      {/* Log list */}
      {logs.length > 0 && (
        <ul className="timer-log-list">
          {logs.slice(0, 5).map(l => (
            <li key={l.id} className="timer-log-item">
              <span className="timer-log-time">{formatMinutes(l.minutes)}</span>
              <span className="timer-log-note">{l.note || new Date(l.logged_at).toLocaleDateString()}</span>
              <button className="sp-attachment-delete" onClick={() => deleteMut.mutate(l.id)} title="Remove">✕</button>
            </li>
          ))}
          {logs.length > 5 && (
            <li className="timer-log-more">+{logs.length - 5} more sessions</li>
          )}
        </ul>
      )}
    </div>
  )
}


// ── Decompose Section ─────────────────────────────────────────────────────────

function DecomposeSection({ node, onChildrenCreated }: {
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
              style={{ fontSize: 12 }}
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


// ── Connections Section ────────────────────────────────────────────────────

function ConnectionsSection({ node }: { node: Node }) {
  const [open, setOpen] = useState(false)

  const routineQ   = useQuery({ queryKey: ['node-routine-blocks', node.id], queryFn: () => listRoutineBlocksForNode(node.id), enabled: open })
  const habitsQ    = useQuery({ queryKey: ['node-habits', node.id],         queryFn: () => listHabitsForNode(node.id).then(r => r.results),        enabled: open })
  const contactsQ  = useQuery({ queryKey: ['node-contacts', node.id],       queryFn: () => listContactsForNode(node.id).then(r => r.results),      enabled: open })
  const learningQ  = useQuery({ queryKey: ['node-learning', node.id],       queryFn: () => listLearningItemsForNode(node.id).then(r => r.results), enabled: open })
  const marketingQ = useQuery({ queryKey: ['node-marketing', node.id],      queryFn: () => listMarketingActionsForNode(node.id).then(r => r.results), enabled: open })

  const isLoading = routineQ.isLoading || habitsQ.isLoading || contactsQ.isLoading || learningQ.isLoading || marketingQ.isLoading
  const allEmpty = open && !isLoading
    && (routineQ.data?.length ?? 0) === 0
    && (habitsQ.data?.length ?? 0) === 0
    && (contactsQ.data?.length ?? 0) === 0
    && (learningQ.data?.length ?? 0) === 0
    && (marketingQ.data?.length ?? 0) === 0

  return (
    <div className="sp-connections">
      <button className="sp-connections-toggle" onClick={() => setOpen(o => !o)}>
        Connections {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="sp-connections-body">
          {isLoading && <p className="sp-conn-empty">Loading…</p>}
          {(routineQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Routine blocks</p>
              {routineQ.data!.map(b => (
                <div key={b.id} className="sp-conn-item">
                  <span>🕐</span><span>{b.label}</span>
                  <span className="sp-conn-meta">{b.time_str} · {b.duration_minutes}m</span>
                </div>
              ))}
            </div>
          )}
          {(habitsQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Supporting habits</p>
              {habitsQ.data!.map(h => (
                <div key={h.id} className="sp-conn-item">
                  <span>🔄</span><span>{h.name}</span>
                  <span className="sp-conn-meta">{h.target}</span>
                </div>
              ))}
            </div>
          )}
          {(contactsQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Linked contacts</p>
              {contactsQ.data!.map(c => (
                <div key={c.id} className="sp-conn-item">
                  <span>👤</span><span>{c.name}</span>
                  <span className="sp-conn-meta">{c.relation}</span>
                </div>
              ))}
            </div>
          )}
          {(learningQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Learning resources</p>
              {learningQ.data!.map(l => (
                <div key={l.id} className="sp-conn-item">
                  <span>📚</span><span>{l.title}</span>
                  <span className="sp-conn-meta">{l.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
          {(marketingQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Marketing actions</p>
              {marketingQ.data!.map(m => (
                <div key={m.id} className="sp-conn-item">
                  <span>📣</span><span>{m.action}</span>
                  <span className="sp-conn-meta">{m.platform}</span>
                </div>
              ))}
            </div>
          )}
          {allEmpty && <p className="sp-conn-empty">No connections found.</p>}
        </div>
      )}
    </div>
  )
}


// ── Side Panel ─────────────────────────────────────────────────────────────

function SidePanel({
  node, allNodes, onClose, onSaved, onDeleted,
}: {
  node: Node; allNodes: Node[]; onClose: () => void; onSaved: () => void; onDeleted: () => void
}) {
  const [title, setTitle] = useState(node.title)
  const [status, setStatus] = useState<NodeStatus>(node.status)
  const [category, setCategory] = useState(node.category || '')
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

// ── Add Node Modal ─────────────────────────────────────────────────────────

function AddNodeModal({ onClose, onSaved, allNodes }: { onClose: () => void; onSaved: () => void; allNodes: Node[] }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<NodeType>('task')
  const [category, setCategory] = useState('Work')
  const [status, setStatus] = useState<NodeStatus>('available')
  const [priority, setPriority] = useState('2')
  const [parentId, setParentId] = useState('')
  const [notes, setNotes] = useState('')

  const mut = useMutation({
    mutationFn: (p: NodeCreatePayload) => createNode(p),
    onSuccess: () => { onSaved(); onClose() },
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Add node</h3>
        <form onSubmit={e => { e.preventDefault(); if (title.trim()) mut.mutate({ title, type, category, status, priority: parseInt(priority), parent: parentId || null, notes }) }} className="modal-form">
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

// ── Node Row ───────────────────────────────────────────────────────────────

function NodeRow({ node, depth, onSelect, onQuickDone, onReorder, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }: {
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

  // Auto-compute progress from children when they exist
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

// ── Goals List View ───────────────────────────────────────────────────────

function GoalsListView({ nodes, onSelect, onQuickDone, onReorder }: {
  nodes: (Node & { children?: Node[] })[]
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

// ── Today's Focus Panel ───────────────────────────────────────────────────

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

function TodayFocusPanel({ nodes, onUpdate }: { nodes: Node[]; onUpdate: () => void }) {
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
        <span style={{ marginLeft: 'auto', fontSize: 11 }}>{collapsed ? '▸' : '▾'}</span>
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

// ── Grouped List View ─────────────────────────────────────────────────────

function GroupedListView({ nodes, groupBy, onSelect, onQuickDone, onReorder }: {
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

// ── Kanban View ───────────────────────────────────────────────────────────

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

const STATUS_COL_COLOR: Record<NodeStatus, string> = {
  active: '#22c55e', available: '#3b82f6', blocked: '#ef4444', done: '#6b7280', deferred: '#9ca3af',
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

function GoalsKanbanView({ nodes, onSelect, onUpdated }: {
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

// ── Board View ────────────────────────────────────────────────────────────

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

function GoalsBoardView({ nodes, onSelect, onUpdated }: {
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

// ── Main Page ──────────────────────────────────────────────────────────────

export function GoalsPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Node | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [chipFilter, setChipFilter] = useState(() => searchParams.get('status') ?? '')
  const [sortBy, setSortBy]           = useState<SortKey>('manual')
  const [listGroupBy, setListGroupBy] = useState<'' | 'category' | 'type' | 'status'>('')
  const [expandAll, setExpandAll]     = useState(true)

  const nodeParam = searchParams.get('node')
  const viewParam = searchParams.get('view') as ViewMode | null
  const view: ViewMode = VIEWS.some(v => v.id === viewParam) ? viewParam! : 'list'

  function setView(v: ViewMode) {
    const next = new URLSearchParams(searchParams)
    if (v === 'list') next.delete('view')
    else next.set('view', v)
    setSearchParams(next)
  }

  const { data: nodes = [], isLoading } = useQuery<Node[]>({ queryKey: ['nodes-v2'], queryFn: listNodes })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['nodes-v2'] })

  const reorderMut = useMutation({
    mutationFn: reorderNodes,
    onSuccess: invalidate,
  })

  // Auto-open side panel when navigating here with ?node=<id>
  useEffect(() => {
    if (nodeParam && nodes.length > 0 && !selected) {
      const target = nodes.find(n => n.id === nodeParam)
      if (target) setSelected(target)
    }
  }, [nodes, nodeParam])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    nodes.forEach(n => { c[n.status] = (c[n.status] || 0) + 1 })
    return c
  }, [nodes])

  const filtered = useMemo(() => {
    let list = nodes
    const q = search.toLowerCase()
    if (q) list = list.filter(n =>
      n.title.toLowerCase().includes(q)
      || (n.tags || []).some(t => t.toLowerCase().includes(q))
      || (n.notes || '').toLowerCase().includes(q)
    )
    const s = chipFilter || filterStatus
    if (s) list = list.filter(n => n.status === s)
    if (filterCategory) list = list.filter(n => n.category === filterCategory)
    if (filterType) list = list.filter(n => n.type === filterType)
    return [...list].sort(makeSorter(sortBy))
  }, [nodes, search, filterStatus, filterCategory, filterType, chipFilter, sortBy])

  const isFiltering = !!(search || filterStatus || filterCategory || filterType || chipFilter)
  const tree = (isFiltering || sortBy !== 'manual')
    ? filtered.map(n => ({ ...n, children: [] as Node[] }))
    : buildTree(filtered)

  if (isLoading) return <PageSkeleton />

  return (
    <div className="goals-page">
      <WorkspaceTabs tabs={[...VIEWS]} activeTab={view} onChange={v => setView(v as ViewMode)} />

      <div className="goals-filters">
        <input className="form-input goals-search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        {view !== 'kanban' && (
          <select className="form-input goals-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select className="form-input goals-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input goals-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {view === 'list' && (
          <select className="form-input goals-select" value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}>
            <option value="manual">Sort: Manual</option>
            <option value="name">Sort: Name A→Z</option>
            <option value="due">Sort: Due date</option>
            <option value="updated">Sort: Updated</option>
            <option value="priority">Sort: Priority</option>
            <option value="progress">Sort: Progress</option>
            <option value="time">Sort: Time invested</option>
          </select>
        )}
        {view === 'list' && (
          <select className="form-input goals-select" value={listGroupBy}
            onChange={e => setListGroupBy(e.target.value as typeof listGroupBy)}>
            <option value="">Group: None</option>
            <option value="category">Group: Category</option>
            <option value="type">Group: Type</option>
            <option value="status">Group: Status</option>
          </select>
        )}
        {isFiltering && (
          <button className="goals-clear-btn" onClick={() => {
            setSearch(''); setFilterStatus(''); setFilterCategory(''); setFilterType(''); setChipFilter('')
          }}>✕ Clear</button>
        )}
      </div>

      {view !== 'kanban' && (
        <div className="goals-chips">
          {STATUSES.map(s => (
            <button key={s} className={`status-chip chip-${s}${chipFilter === s ? ' active' : ''}`}
              onClick={() => setChipFilter(p => p === s ? '' : s)}>
              {s}: {statusCounts[s] || 0}
            </button>
          ))}
          <button className="btn-ghost-sm" onClick={() => setShowAdd(true)}>+ Add node</button>
          {view === 'list' && (
            <button className="btn-ghost-sm goals-expand-toggle"
              onClick={() => setExpandAll(p => !p)}>
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>
      )}

      {view === 'kanban' && (
        <div className="goals-chips" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-ghost-sm" onClick={() => setShowAdd(true)}>+ Add node</button>
        </div>
      )}

      <TodayFocusPanel nodes={nodes} onUpdate={invalidate} />

      {view === 'list' && (
        <IsFilteringContext.Provider value={isFiltering}>
          <ExpandAllContext.Provider value={expandAll}>
            {listGroupBy ? (
              <GroupedListView
                nodes={filtered}
                groupBy={listGroupBy}
                onSelect={setSelected}
                onQuickDone={invalidate}
                onReorder={items => reorderMut.mutate(items)}
              />
            ) : (
              <GoalsListView
                nodes={tree}
                onSelect={setSelected}
                onQuickDone={invalidate}
                onReorder={items => reorderMut.mutate(items)}
              />
            )}
          </ExpandAllContext.Provider>
        </IsFilteringContext.Provider>
      )}
      {view === 'kanban' && (
        <GoalsKanbanView nodes={filtered} onSelect={setSelected} onUpdated={invalidate} />
      )}
      {view === 'board' && (
        <GoalsBoardView nodes={filtered} onSelect={setSelected} onUpdated={invalidate} />
      )}

      {selected && createPortal(
        <SidePanel node={selected} allNodes={nodes} onClose={() => setSelected(null)}
          onSaved={invalidate} onDeleted={invalidate} />,
        document.body
      )}
      {showAdd && createPortal(
        <AddNodeModal allNodes={nodes} onClose={() => setShowAdd(false)} onSaved={invalidate} />,
        document.body
      )}
    </div>
  )
}
