import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from './EmptyState'
import { PageSkeleton } from './PageSkeleton'
import { Panel } from './Panel'
import { StatusPill } from './StatusPill'
import { useConfirm } from '../lib/useConfirm'
import { useToast } from '../lib/useToast'
import type { PaginatedResponse } from '../lib/types'

type FormValue = string | boolean

type FieldOption = {
  value: string
  label: string
}

type WorkspaceField = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'select' | 'checkbox'
  options?: FieldOption[]
  placeholder?: string
  required?: boolean
}

type RecordWorkspaceProps<TItem> = {
  eyebrow: string
  heading: string
  description: string
  itemLabel: string
  queryKey: string[]
  listQuery: () => Promise<PaginatedResponse<TItem>>
  createRecord: (payload: Record<string, unknown>) => Promise<TItem>
  updateRecord: (id: string, payload: Record<string, unknown>) => Promise<TItem>
  deleteRecord: (id: string) => Promise<null>
  fields: WorkspaceField[]
  initialValues: Record<string, FormValue>
  serialize: (values: Record<string, FormValue>) => Record<string, unknown>
  deserialize: (item: TItem) => Record<string, FormValue>
  getId: (item: TItem) => string
  getTitle: (item: TItem) => string
  getMeta: (item: TItem) => string[]
  getBody?: (item: TItem) => string
  getStatusLabel?: (item: TItem) => string | null
  emptyState: {
    title: string
    body: string
  }
  invalidateKeys?: string[][]
}

export function RecordWorkspace<TItem>({
  eyebrow,
  heading,
  description,
  itemLabel,
  queryKey,
  listQuery,
  createRecord,
  updateRecord,
  deleteRecord,
  fields,
  initialValues,
  serialize,
  deserialize,
  getId,
  getTitle,
  getMeta,
  getBody,
  getStatusLabel,
  emptyState,
  invalidateKeys = [],
}: RecordWorkspaceProps<TItem>) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, FormValue>>(initialValues)

  const recordsQuery = useQuery({
    queryKey,
    queryFn: listQuery,
  })

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      ...invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingId ? updateRecord(editingId, payload) : createRecord(payload),
    onSuccess: async () => {
      toast.success(editingId ? `${itemLabel} updated.` : `${itemLabel} saved.`)
      setEditingId(null)
      setValues(initialValues)
      await invalidateAll()
    },
    onError: () => {
      toast.error(`Could not save ${itemLabel.toLowerCase()}.`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: async () => {
      toast.success(`${itemLabel} deleted.`)
      if (editingId) {
        setEditingId(null)
        setValues(initialValues)
      }
      await invalidateAll()
    },
    onError: () => {
      toast.error(`Could not delete ${itemLabel.toLowerCase()}.`)
    },
  })

  if (recordsQuery.isLoading) {
    return <PageSkeleton variant="record" />
  }

  if (recordsQuery.isError || !recordsQuery.data) {
    return <section className="error-state">{`We could not load ${itemLabel.toLowerCase()} data.`}</section>
  }

  const records = recordsQuery.data.results

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{heading}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="two-column">
        <Panel
          title={editingId ? `Edit ${itemLabel}` : `Add ${itemLabel}`}
          description={editingId ? 'Update the selected record, then save it back into the timeline.' : `Keep ${itemLabel.toLowerCase()} capture lightweight and searchable.`}
          aside={
            editingId ? (
              <button className="button-ghost" type="button" onClick={() => setEditingId(null)}>
                Cancel edit
              </button>
            ) : null
          }
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              saveMutation.mutate(serialize(values))
            }}
          >
            {fields.map((field) => {
              const value = values[field.name]

              if (field.type === 'checkbox') {
                return (
                  <div key={field.name} className="field span-2 checkbox-row">
                    <input
                      checked={Boolean(value)}
                      id={field.name}
                      type="checkbox"
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.checked }))
                      }
                    />
                    <label htmlFor={field.name}>{field.label}</label>
                  </div>
                )
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.name} className="field span-2">
                    <label htmlFor={field.name}>{field.label}</label>
                    <textarea
                      id={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      value={String(value ?? '')}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    />
                  </div>
                )
              }

              if (field.type === 'select') {
                return (
                  <div key={field.name} className="field">
                    <label htmlFor={field.name}>{field.label}</label>
                    <select
                      id={field.name}
                      required={field.required}
                      value={String(value ?? '')}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }

              return (
                <div key={field.name} className="field">
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    type={field.type}
                    value={String(value ?? '')}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                </div>
              )
            })}

            <div className="field span-2 form-actions">
              <button disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending
                  ? `Saving ${itemLabel.toLowerCase()}...`
                  : editingId
                    ? `Update ${itemLabel}`
                    : `Add ${itemLabel}`}
              </button>
            </div>
            {saveMutation.isError ? (
              <p className="error-text">We could not save that {itemLabel.toLowerCase()} record.</p>
            ) : null}
          </form>
        </Panel>

        <Panel
          title={`${itemLabel}s`}
          description={`Current ${itemLabel.toLowerCase()} records visible in the app without admin pages.`}
          aside={`${records.length} item${records.length === 1 ? '' : 's'}`}
        >
          {records.length === 0 ? (
            <EmptyState title={emptyState.title} body={emptyState.body} />
          ) : (
            <div className="record-list">
              {records.map((item) => {
                const id = getId(item)
                const status = getStatusLabel?.(item)
                return (
                  <article key={id} className="record-card">
                    <div className="record-card-header">
                      <div>
                        <h3>{getTitle(item)}</h3>
                        <div className="list-inline">
                          {getMeta(item).map((meta) => (
                            <span key={`${id}-${meta}`} className="record-meta-chip">
                              {meta}
                            </span>
                          ))}
                          {status ? <StatusPill label={status} /> : null}
                        </div>
                      </div>
                      <div className="button-row">
                        <button
                          className="button-muted"
                          type="button"
                          onClick={() => {
                            setEditingId(id)
                            setValues(deserialize(item))
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button-ghost"
                          disabled={deleteMutation.isPending}
                          type="button"
                          onClick={async () => {
                            const ok = await confirm('Delete record', `Are you sure you want to delete this ${itemLabel.toLowerCase()}? This cannot be undone.`)
                            if (ok) deleteMutation.mutate(id)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {getBody ? <p className="muted">{getBody(item) || 'No extra notes yet.'}</p> : null}
                  </article>
                )
              })}
            </div>
          )}
          {deleteMutation.isError ? (
            <p className="error-text">We could not delete that {itemLabel.toLowerCase()} record.</p>
          ) : null}
        </Panel>
      </div>
    </section>
  )
}
