import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { PageSkeleton } from '../components/PageSkeleton'
import {
  createLearningItem,
  deleteLearningItem,
  getDueLearningReviews,
  listLearningItems,
  markLearningReviewed,
  updateLearningItem,
} from '../lib/api'
import type { LearningItem, LearningItemPayload } from '../lib/types'

const TYPE_ICONS: Record<string, string> = {
  book: '📚', course: '🎓', article: '📄', video: '▶️', podcast: '🎙️', other: '📌',
}

const STATUS_COLS = [
  { status: 'not_started' as const, label: '📋 To read/watch', color: '#6366f1' },
  { status: 'in_progress' as const, label: '▶ In progress',   color: '#f59e0b' },
  { status: 'done'        as const, label: '✅ Done',          color: '#16a34a' },
]

// ── Add / Edit form ───────────────────────────────────────────────────────────

function LearningForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<LearningItemPayload>
  onSave: (p: LearningItemPayload) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [author, setAuthor] = useState(initial?.author ?? '')
  const [type, setType] = useState<LearningItem['type']>(initial?.type ?? 'book')
  const [status, setStatus] = useState<LearningItem['status']>(initial?.status ?? 'not_started')
  const [progress, setProgress] = useState(initial?.progress_pct ?? 0)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="learn-form">
      <div className="learn-form-row">
        <div className="learn-form-field">
          <label className="learn-label">Title</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Book / course / article title" />
        </div>
        <div className="learn-form-field" style={{ maxWidth: 160 }}>
          <label className="learn-label">Type</label>
          <select className="form-input" value={type} onChange={e => setType(e.target.value as LearningItem['type'])}>
            {Object.entries(TYPE_ICONS).map(([t, icon]) => (
              <option key={t} value={t}>{icon} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="learn-form-row">
        <div className="learn-form-field">
          <label className="learn-label">Author / creator</label>
          <input className="form-input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Optional" />
        </div>
        <div className="learn-form-field" style={{ maxWidth: 160 }}>
          <label className="learn-label">Status</label>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value as LearningItem['status'])}>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      {status === 'in_progress' && (
        <div className="learn-form-field">
          <label className="learn-label">Progress — {progress}%</label>
          <input
            type="range" min={0} max={100} value={progress}
            className="learn-progress-slider"
            onChange={e => setProgress(Number(e.target.value))}
          />
        </div>
      )}
      <div className="learn-form-field">
        <label className="learn-label">Notes</label>
        <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key takeaways, chapter, link..." />
      </div>
      <div className="button-row">
        <button
          disabled={!title.trim() || isPending}
          onClick={() => onSave({ title, author, type, status, progress_pct: progress, notes, linked_node: null, started: null, finished: null, review_at: null, is_actionable: false })}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button className="button-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Kanban card ────────────────────────────────────────────────────────────────

function LearningCard({
  item,
  onEdit,
  onMove,
  onDelete,
}: {
  item: LearningItem
  onEdit: (item: LearningItem) => void
  onMove: (id: number, status: LearningItem['status']) => void
  onDelete: (id: number) => void
}) {
  const nextStatus: Record<LearningItem['status'], LearningItem['status'] | null> = {
    not_started: 'in_progress',
    in_progress: 'done',
    done: null,
  }
  const next = nextStatus[item.status]

  return (
    <div className="learn-card">
      <div className="learn-card-header">
        <span className="learn-card-icon">{TYPE_ICONS[item.type] ?? '📌'}</span>
        <div className="learn-card-info">
          <p className="learn-card-title">{item.title}</p>
          {item.author && <p className="learn-card-author">{item.author}</p>}
        </div>
      </div>
      {item.status === 'in_progress' && item.progress_pct > 0 && (
        <div className="learn-progress-bar">
          <div className="learn-progress-fill" style={{ width: `${item.progress_pct}%` }} />
          <span className="learn-progress-pct">{item.progress_pct}%</span>
        </div>
      )}
      {item.notes && <p className="learn-card-notes">{item.notes.slice(0, 100)}{item.notes.length > 100 ? '…' : ''}</p>}
      <div className="learn-card-actions">
        {next && (
          <button className="button-muted" style={{ fontSize: 13, padding: '2px 8px' }} onClick={() => onMove(item.id, next)}>
            → {next === 'in_progress' ? 'Start' : 'Done'}
          </button>
        )}
        <button className="button-ghost" style={{ fontSize: 13, padding: '2px 8px' }} onClick={() => onEdit(item)}>Edit</button>
        <button className="button-ghost" style={{ fontSize: 13, padding: '2px 8px', color: '#dc2626' }} onClick={() => onDelete(item.id)}>✕</button>
      </div>
    </div>
  )
}

// ── Due for Review panel ──────────────────────────────────────────────────────

function DueReviewPanel({ onReviewed }: { onReviewed: () => void }) {
  const { data: dueItems, isLoading } = useQuery({
    queryKey: ['learning-due-review'],
    queryFn: getDueLearningReviews,
  })
  const qc = useQueryClient()

  const reviewMut = useMutation({
    mutationFn: markLearningReviewed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning-due-review'] })
      qc.invalidateQueries({ queryKey: ['learning-items'] })
      onReviewed()
    },
  })

  if (isLoading || !dueItems || dueItems.length === 0) return null

  return (
    <div className="learn-review-panel">
      <div className="learn-review-header">
        <span className="learn-review-badge">{dueItems.length}</span>
        <strong>Due for review</strong>
        <span className="muted" style={{ fontSize: 13 }}>Spaced repetition — mark each as reviewed to reschedule</span>
      </div>
      <div className="learn-review-list">
        {dueItems.map(item => (
          <div key={item.id} className="learn-review-item">
            <span className="learn-card-icon">{TYPE_ICONS[item.type] ?? '📌'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="learn-card-title" style={{ margin: 0 }}>{item.title}</p>
              {item.review_at && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Due: {item.review_at} · Reviewed {item.reviewed_count}× before
                </p>
              )}
            </div>
            <button
              className="button-muted"
              style={{ fontSize: 13, padding: '3px 10px', flexShrink: 0 }}
              disabled={reviewMut.isPending && reviewMut.variables === item.id}
              onClick={() => reviewMut.mutate(item.id)}
            >
              {reviewMut.isPending && reviewMut.variables === item.id ? '…' : '✓ Reviewed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LearningPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<LearningItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['learning-items'],
    queryFn: () => listLearningItems(),
  })
  const items = data?.results ?? []

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['learning-items'] })
    qc.invalidateQueries({ queryKey: ['learning-due-review'] })
  }

  const createMut = useMutation({ mutationFn: createLearningItem, onSuccess: () => { setShowAdd(false); invalidate() } })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<LearningItemPayload> }) =>
      updateLearningItem(id, payload),
    onSuccess: () => { setEditing(null); invalidate() },
  })
  const deleteMut = useMutation({ mutationFn: deleteLearningItem, onSuccess: invalidate })

  if (isLoading) return <PageSkeleton />

  const total = items.length
  const done = items.filter(i => i.status === 'done').length
  const inProgress = items.filter(i => i.status === 'in_progress').length

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Learning</p>
          <h2>Books, courses &amp; resources</h2>
          <p className="muted">{total} tracked · {inProgress} in progress · {done} done</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditing(null) }}>+ Add item</button>
      </div>

      {/* Due for review section */}
      <DueReviewPanel onReviewed={invalidate} />

      {(showAdd || editing) && (
        <div className="panel" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{editing ? 'Edit item' : 'Add new item'}</h3>
          <LearningForm
            initial={editing ?? undefined}
            onSave={payload => editing
              ? updateMut.mutate({ id: editing.id, payload })
              : createMut.mutate(payload)
            }
            onCancel={() => { setShowAdd(false); setEditing(null) }}
            isPending={createMut.isPending || updateMut.isPending}
          />
        </div>
      )}

      <div className="learn-kanban">
        {STATUS_COLS.map(col => {
          const colItems = items.filter(i => i.status === col.status)
          return (
            <div key={col.status} className="learn-col">
              <div className="learn-col-header" style={{ borderColor: col.color }}>
                <span>{col.label}</span>
                <span className="kanban-col-count">{colItems.length}</span>
              </div>
              {colItems.length === 0 ? (
                <EmptyState title="Empty" body="No items here yet." />
              ) : (
                <div className="learn-col-body">
                  {colItems.map(item => (
                    <LearningCard
                      key={item.id}
                      item={item}
                      onEdit={setEditing}
                      onMove={(id, status) => updateMut.mutate({ id, payload: { status } })}
                      onDelete={id => deleteMut.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
