import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { PipelineOpportunityForm } from '../components/PipelineOpportunityForm'
import { StatusPill } from '../components/StatusPill'
import {
  createOpportunity,
  getPipelineWorkspace,
  updateMarketingAction,
  updateOpportunity,
} from '../lib/api'
import { formatDate } from '../lib/formatters'
import type { Opportunity, OpportunityPayload, PipelineWorkspaceOpportunity } from '../lib/types'

// ── Kanban column statuses ─────────────────────────────────────────────────────
const KANBAN_COLS: { status: Opportunity['status']; label: string; color: string }[] = [
  { status: 'new',       label: '🔍 New',       color: '#6366f1' },
  { status: 'reviewing', label: '👁 Reviewing',  color: '#f59e0b' },
  { status: 'applied',   label: '📤 Applied',    color: '#3b82f6' },
  { status: 'won',       label: '🏆 Won',        color: '#16a34a' },
  { status: 'lost',      label: '❌ Lost',       color: '#dc2626' },
]

export function PipelinePage() {
  const queryClient = useQueryClient()
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null)
  const draggingId = useRef<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const workspaceQuery = useQuery({
    queryKey: ['pipeline-workspace'],
    queryFn: getPipelineWorkspace,
  })

  async function invalidatePipeline() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pipeline-workspace'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['command-center'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: (payload: OpportunityPayload) =>
      editingOpportunity
        ? updateOpportunity(editingOpportunity.id, payload)
        : createOpportunity(payload),
    onSuccess: async () => {
      setEditingOpportunity(null)
      await invalidatePipeline()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Opportunity['status'] }) =>
      updateOpportunity(id, { status }),
    onSuccess: invalidatePipeline,
  })

  const followUpMutation = useMutation({
    mutationFn: (payload: { id: string }) =>
      updateMarketingAction(payload.id, { follow_up_done: true }),
    onSuccess: invalidatePipeline,
  })

  if (workspaceQuery.isLoading) {
    return <section className="loading-state">Loading pipeline workspace...</section>
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return <section className="error-state">We could not load the pipeline workspace.</section>
  }

  const workspace = workspaceQuery.data

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h2>Opportunities, follow-ups, and outcomes</h2>
          <p>Keep client pursuit visible without leaving the main app shell.</p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="New / reviewing" value={`${workspace.summary.new_or_reviewing_count}`} />
        <MetricCard label="Applied" value={`${workspace.summary.applied_count}`} />
        <MetricCard label="Won" value={`${workspace.summary.won_count}`} tone="success" />
        <MetricCard label="Due follow-ups" value={`${workspace.summary.due_follow_ups_count}`} tone="warning" />
      </div>

      <div className="two-column">
        <Panel
          title={editingOpportunity ? 'Edit opportunity' : 'Add opportunity'}
          description="Capture leads and keep their lifecycle current."
          aside={
            editingOpportunity ? (
              <button className="button-ghost" type="button" onClick={() => setEditingOpportunity(null)}>
                Cancel edit
              </button>
            ) : null
          }
        >
          <PipelineOpportunityForm
            initialValue={editingOpportunity}
            isSubmitting={saveMutation.isPending}
            onSubmit={(payload) => saveMutation.mutate(payload)}
          />
          {saveMutation.isError ? <p className="error-text">We could not save that opportunity.</p> : null}
        </Panel>

        <Panel title="Due follow-ups" description="Marketing actions that need attention now.">
          {workspace.due_follow_ups.length === 0 ? (
            <EmptyState
              title="No follow-ups due"
              body="As follow-up dates land in marketing, the pressure list will appear here."
            />
          ) : (
            <div className="record-list">
              {workspace.due_follow_ups.map((action) => (
                <article key={action.id} className="record-card">
                  <div className="record-card-header">
                    <div>
                      <h3>{action.action}</h3>
                      <div className="list-inline">
                        <span className="record-meta-chip">{action.platform}</span>
                        <span className="record-meta-chip">
                          Due {action.follow_up_date ? formatDate(action.follow_up_date) : 'now'}
                        </span>
                      </div>
                    </div>
                    <StatusPill label={action.follow_up_done ? 'done' : 'active'} />
                  </div>
                  <p className="muted">{action.result || 'No result logged yet.'}</p>
                  {!action.follow_up_done ? (
                    <div className="button-row">
                      <button
                        disabled={followUpMutation.isPending}
                        type="button"
                        onClick={() => followUpMutation.mutate({ id: action.id })}
                      >
                        {followUpMutation.isPending && followUpMutation.variables?.id === action.id
                          ? 'Saving...'
                          : 'Mark follow-up done'}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Kanban board ─────────────────────────────────────────────────── */}
      <Panel title="Pipeline board" description="Drag cards between columns to advance stage. Click Edit to open the full form.">
        {workspace.active_opportunities.length === 0 ? (
          <EmptyState title="No active opportunities" body="Add a lead and the board will populate here." />
        ) : (
          <div className="kanban-board">
            {KANBAN_COLS.filter(col =>
              col.status === 'won' || col.status === 'lost'
                ? workspace.active_opportunities.some(o => o.status === col.status)
                : true
            ).map(col => {
              const colOps = workspace.active_opportunities.filter(o => o.status === col.status)
              const isDragOver = dragOverStatus === col.status
              return (
                <div
                  key={col.status}
                  className={`kanban-col${isDragOver ? ' kanban-col-dragover' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOverStatus(col.status) }}
                  onDragLeave={() => setDragOverStatus(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverStatus(null)
                    const id = draggingId.current
                    if (id) statusMutation.mutate({ id, status: col.status })
                    draggingId.current = null
                  }}
                >
                  <div className="kanban-col-header" style={{ borderColor: col.color }}>
                    <span>{col.label}</span>
                    <span className="kanban-col-count">{colOps.length}</span>
                  </div>
                  <div className="kanban-col-body">
                    {colOps.length === 0 ? (
                      <p className="kanban-empty-hint">Drop here</p>
                    ) : colOps.map(opportunity => (
                      <article
                        key={opportunity.id}
                        className="kanban-card"
                        draggable
                        onDragStart={() => { draggingId.current = opportunity.id }}
                        onDragEnd={() => { draggingId.current = null; setDragOverStatus(null) }}
                      >
                        <p className="kanban-card-name">{opportunity.name}</p>
                        <div className="list-inline" style={{ marginBottom: 6 }}>
                          <span className="record-meta-chip">{opportunity.platform}</span>
                          {opportunity.budget && <span className="record-meta-chip">{opportunity.budget}</span>}
                        </div>
                        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                          {opportunity.fit_reasoning
                            ? opportunity.fit_reasoning.slice(0, 80) + (opportunity.fit_reasoning.length > 80 ? '…' : '')
                            : opportunity.description?.slice(0, 80) ?? ''}
                        </p>
                        <div className="button-row" style={{ marginTop: 8 }}>
                          <button
                            className="button-muted"
                            style={{ fontSize: 12, padding: '2px 8px' }}
                            type="button"
                            onClick={() =>
                              setEditingOpportunity({
                                id: opportunity.id,
                                name: opportunity.name,
                                platform: opportunity.platform,
                                description: opportunity.description ?? '',
                                budget: opportunity.budget,
                                status: opportunity.status,
                                fit_score: opportunity.fit_score,
                                fit_reasoning: opportunity.fit_reasoning ?? '',
                                date_found: opportunity.date_found,
                                date_applied: opportunity.date_applied,
                                date_closed: opportunity.date_closed ?? null,
                                proposal_draft: opportunity.proposal_draft ?? '',
                                outcome_notes: opportunity.outcome_notes,
                                created_at: '',
                                updated_at: '',
                              })
                            }
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <div className="two-column">
        <Panel title="Recent outcomes" description="Wins, losses, and recent closed loops.">
            {workspace.recent_outcomes.length === 0 ? (
              <EmptyState title="No outcomes yet" body="Closed opportunities will show up here." />
            ) : (
              <div className="record-list">
                {workspace.recent_outcomes.map((opportunity: PipelineWorkspaceOpportunity) => (
                  <article key={opportunity.id} className="record-card">
                    <div className="record-card-header">
                      <div>
                        <h3>{opportunity.name}</h3>
                        <div className="list-inline">
                          <span className="record-meta-chip">{opportunity.platform}</span>
                          <StatusPill label={opportunity.status} />
                        </div>
                      </div>
                    </div>
                    <p className="muted">{opportunity.outcome_notes || 'No outcome notes recorded.'}</p>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent clients" description="Clients automatically created from won opportunities.">
            {workspace.recent_clients.length === 0 ? (
              <EmptyState title="No clients yet" body="Winning opportunities will populate this list." />
            ) : (
              <ul className="plain-list">
                {workspace.recent_clients.map((client) => (
                  <li key={client.id} className="context-item">
                    <strong>{client.name}</strong>
                    <p className="muted">
                      {client.source_platform}
                      {client.notes ? ` - ${client.notes}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
      </div>
    </section>
  )
}
