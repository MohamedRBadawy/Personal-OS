import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageSkeleton } from '../components/PageSkeleton'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import { PriorityRow } from '../components/command-center/PriorityRow'
import { getWorkOverview, sendChatMessage, updateGoalNode } from '../lib/api'
import { titleCase } from '../lib/formatters'
import { MarketingPage } from './SimpleWorkspacePages'
import { PipelinePage } from './PipelinePage'
import { SchedulePage } from './SchedulePage'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Task Board' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'proposals', label: 'Proposals' },
  { id: 'schedule', label: 'Execution' },
] as const

export function WorkCareerPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabs.some((tab) => tab.id === searchParams.get('tab'))
    ? (searchParams.get('tab') as (typeof tabs)[number]['id'])
    : 'overview'

  const overviewQuery = useQuery({
    queryKey: ['work-overview'],
    queryFn: getWorkOverview,
  })
  const [thinkingReply, setThinkingReply] = useState<string | null>(null)
  const [thinkingTarget, setThinkingTarget] = useState<string | null>(null)
  const [proposalReply, setProposalReply] = useState<string | null>(null)
  const [proposalTarget, setProposalTarget] = useState<string | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [expandedDeadlineId, setExpandedDeadlineId] = useState<string | null>(null)

  const taskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateGoalNode>[1] }) => updateGoalNode(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['goal-map'] }),
        queryClient.invalidateQueries({ queryKey: ['goal-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
      ])
    },
  })

  const thinkingMutation = useMutation({
    mutationFn: ({ id, prompt }: { id: string; prompt: string }) =>
      sendChatMessage([{ role: 'user', content: prompt }], { mode: 'task_thinking', task_id: id }),
    onSuccess: (result, variables) => {
      setThinkingTarget(variables.id)
      setThinkingReply(result.reply)
    },
  })

  const proposalMutation = useMutation({
    mutationFn: ({ id, prompt }: { id: string; prompt: string }) =>
      sendChatMessage([{ role: 'user', content: prompt }], { mode: 'proposal_draft', opportunity_id: id }),
    onSuccess: (result, variables) => {
      setProposalTarget(variables.id)
      setProposalReply(result.reply)
    },
  })

  if (overviewQuery.isLoading) {
    return <PageSkeleton />
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return <section className="error-state">We could not load the work workspace.</section>
  }

  const overview = overviewQuery.data

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Work & Career</p>
          <h2>Run tasks, deadlines, pipeline, marketing, and proposals from one work surface.</h2>
          <p>The work view now groups execution and client pursuit instead of splitting them across separate top-level pages.</p>
        </div>
        <WorkspaceTabs
          activeTab={activeTab}
          tabs={tabs as unknown as Array<{ id: string; label: string }>}
          onChange={(tab) => setSearchParams(tab === 'overview' ? {} : { tab })}
        />
      </div>

      {activeTab === 'overview' ? (
        <div className="stack">
          <div className="metric-grid">
            <MetricCard label="Active work items" value={`${overview.summary.active_task_count}`} />
            <MetricCard label="Blocked work items" value={`${overview.summary.blocked_task_count}`} tone="warning" />
            <MetricCard label="Deadlines" value={`${overview.summary.deadline_count}`} />
            <MetricCard label="Proposal drafts" value={`${overview.summary.proposal_draft_count}`} />
            <MetricCard label="Due follow-ups" value={`${overview.summary.due_follow_ups_count}`} />
            <MetricCard label="Active opportunities" value={`${overview.summary.active_opportunity_count}`} />
          </div>

          <div className="two-column">
            <div className="cc-section">
              <div className="cc-section-header">
                <span className="cc-section-label">Deadline Pressure</span>
              </div>
              {overview.deadlines.length === 0 ? (
                <EmptyState title="No deadline pressure" body="Add due dates to tasks and they will surface here." />
              ) : (
                overview.deadlines.map((item, i) => (
                  <PriorityRow
                    key={item.id}
                    priority={item}
                    isFirst={i === 0}
                    isExpanded={expandedDeadlineId === item.id}
                    onToggle={() => setExpandedDeadlineId((id) => id === item.id ? null : item.id)}
                    isSaving={taskMutation.isPending && taskMutation.variables?.id === item.id}
                    onSave={(payload) => taskMutation.mutate({ id: item.id, payload: { title: payload.title, notes: payload.notes, status: payload.status, due_date: payload.dueDate, manual_priority: payload.manualPriority } })}
                    onMarkDone={() => taskMutation.mutate({ id: item.id, payload: { status: 'done' } })}
                  />
                ))
              )}
            </div>

            <div className="cc-section">
              <div className="cc-section-header">
                <span className="cc-section-label">Pipeline Urgency</span>
              </div>
              {overview.proposal_drafts.length === 0 ? (
                <EmptyState title="No proposal drafts" body="When AI enriches opportunities, proposal drafts will appear here." />
              ) : (
                overview.proposal_drafts.slice(0, 3).map((opportunity) => (
                  <div key={opportunity.id} className="row-item">
                    <div className="row-item__head">
                      <div className="row-item__body">
                        <strong style={{ fontSize: '0.9rem' }}>{opportunity.name}</strong>
                        <div className="row-item__sub">
                          <span className="record-meta-chip">{opportunity.platform}</span>
                          <span className="record-meta-chip">{titleCase(opportunity.status)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      {opportunity.fit_reasoning || opportunity.description || 'No fit reasoning yet.'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'board' ? (
        <div className="stack">
          <div className="cc-section">
            <div className="cc-section-header">
              <span className="cc-section-label">Task Board</span>
            </div>
            {overview.task_board.length === 0 ? (
              <EmptyState title="No active work items" body="Activate a project or task and it will appear here." />
            ) : (
              overview.task_board.map((priority, i) => (
                <div key={priority.id}>
                  <PriorityRow
                    priority={priority}
                    isFirst={i === 0}
                    isExpanded={expandedTaskId === priority.id}
                    onToggle={() => setExpandedTaskId((id) => id === priority.id ? null : priority.id)}
                    isSaving={taskMutation.isPending && taskMutation.variables?.id === priority.id}
                    onSave={(payload) => taskMutation.mutate({
                      id: priority.id,
                      payload: { title: payload.title, notes: payload.notes, status: payload.status, due_date: payload.dueDate, manual_priority: payload.manualPriority },
                    })}
                    onMarkDone={() => taskMutation.mutate({ id: priority.id, payload: { status: 'done' } })}
                    onOpenChat={() => thinkingMutation.mutate({
                      id: priority.id,
                      prompt: `Think through this task and give me the clearest next move.\nTask: ${priority.title}\nType: ${priority.type}\nNotes: ${priority.notes}\nTool recommendation: ${priority.recommended_tool}\nBlocked by: ${priority.blocked_by_titles.join(', ') || 'Nothing currently blocking it.'}`,
                    })}
                  />
                  {thinkingReply && thinkingTarget === priority.id ? (
                    <div className="command-inline-note">
                      <strong>Thinking session</strong>
                      <p>{thinkingReply}</p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'proposals' ? (
        <Panel title="Proposal drafts" description="Proposal drafting is surfaced directly in work instead of hiding inside backend enrichment.">
          {overview.proposal_drafts.length === 0 ? (
            <EmptyState title="No proposal drafts yet" body="Create or enrich an opportunity and the draft will appear here." />
          ) : (
            <div className="record-list">
              {overview.proposal_drafts.map((opportunity) => (
                <article key={opportunity.id} className="record-card">
                  <div className="record-card-header">
                    <div>
                      <h3>{opportunity.name}</h3>
                      <div className="list-inline">
                        <span className="record-meta-chip">{opportunity.platform}</span>
                        <span className="record-meta-chip">{titleCase(opportunity.status)}</span>
                      </div>
                    </div>
                    <button
                      className="button-muted"
                      disabled={proposalMutation.isPending}
                      type="button"
                      onClick={() =>
                        proposalMutation.mutate({
                          id: opportunity.id,
                          prompt: `Refresh this proposal draft with a tighter, more compelling version.\nOpportunity: ${opportunity.name}\nPlatform: ${opportunity.platform}\nDescription: ${opportunity.description ?? ''}\nCurrent fit reasoning: ${opportunity.fit_reasoning ?? ''}\nCurrent draft: ${opportunity.proposal_draft ?? ''}`,
                        })
                      }
                    >
                      {proposalMutation.isPending && proposalMutation.variables?.id === opportunity.id ? 'Refreshing...' : 'Refresh draft'}
                    </button>
                  </div>
                  <pre className="report-block">{proposalTarget === opportunity.id && proposalReply ? proposalReply : opportunity.proposal_draft}</pre>
                </article>
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {activeTab === 'pipeline' ? <PipelinePage /> : null}
      {activeTab === 'marketing' ? <MarketingPage /> : null}
      {activeTab === 'schedule' ? <SchedulePage /> : null}
    </section>
  )
}
