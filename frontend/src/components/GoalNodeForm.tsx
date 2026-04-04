/**
 * GoalNodeForm — create or edit a goal node.
 *
 * Renders a form with title, type, category, status, parent selector,
 * and notes. Supports both create (no initialValues) and edit mode.
 */

import { useState } from 'react'
import type { GoalNodeCreatePayload, GoalNodeStatus, GoalNodeType } from '../lib/types'

const NODE_TYPES: GoalNodeType[] = ['goal', 'project', 'task', 'sub_task', 'idea', 'burden']
const CATEGORIES = ['Career', 'Finance', 'Health', 'Spiritual', 'Family', 'Learning', 'Personal', 'Life']
const STATUSES: GoalNodeStatus[] = ['active', 'available', 'blocked', 'done']

type ParentOption = { id: string; title: string }

type GoalNodeFormProps = {
  onSubmit: (payload: GoalNodeCreatePayload) => void
  onCancel: () => void
  isSubmitting: boolean
  parentOptions: ParentOption[]
  initialValues?: Partial<GoalNodeCreatePayload>
}

export function GoalNodeForm({
  onSubmit,
  onCancel,
  isSubmitting,
  parentOptions,
  initialValues,
}: GoalNodeFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [type, setType] = useState<GoalNodeType>(initialValues?.type ?? 'task')
  const [category, setCategory] = useState(initialValues?.category ?? '')
  const [status, setStatus] = useState<GoalNodeStatus>(initialValues?.status ?? 'available')
  const [parent, setParent] = useState(initialValues?.parent ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  const isEdit = Boolean(initialValues)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      title: title.trim(),
      type,
      category: category || null,
      status,
      parent: parent || null,
      notes,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field span-2">
        <label htmlFor="node-title">Title</label>
        <input
          autoFocus
          id="node-title"
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="node-type">Type</label>
        <select id="node-type" value={type} onChange={(e) => setType(e.target.value as GoalNodeType)}>
          {NODE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="node-category">Category</label>
        <select id="node-category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">None</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="node-status">Status</label>
        <select
          id="node-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as GoalNodeStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="node-parent">Parent</label>
        <select id="node-parent" value={parent} onChange={(e) => setParent(e.target.value)}>
          <option value="">No parent (root)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title.length > 40 ? p.title.slice(0, 40) + '...' : p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="field span-2">
        <label htmlFor="node-notes">Notes</label>
        <textarea
          id="node-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="field span-2 form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : isEdit ? 'Update node' : 'Create node'}
        </button>
        <button className="button-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
