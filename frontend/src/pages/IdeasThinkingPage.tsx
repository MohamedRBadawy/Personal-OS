import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { PageSkeleton } from '../components/PageSkeleton'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import { convertIdeaToNode, getIdeasOverview, sendChatMessage } from '../lib/api'
import type { Idea } from '../lib/types'
import { DecisionsPage, IdeasPage, LearningPage } from './SimpleWorkspacePages'

// ── Convert button per idea ────────────────────────────────────────────────────

const NODE_TYPES = [
  { value: 'goal', label: 'Goal' },
  { value: 'project', label: 'Project' },
  { value: 'task', label: 'Task' },
]

function ConvertButton({ idea }: { idea: Idea }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('project')
  const [converted, setConverted] = useState<{ node_id: string; node_title: string } | null>(null)
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => convertIdeaToNode(idea.id, { type }),
    onSuccess: (res) => {
      setConverted(res)
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['ideas-overview'] })
      qc.invalidateQueries({ queryKey: ['nodes-v2'] })
    },
  })

  if (converted) {
    return (
      <Link to={`/goals?node=${converted.node_id}`} className="idea-converted-link">
        ✓ View in Goals →
      </Link>
    )
  }
  if (idea.linked_goal) {
    return <span className="idea-linked-badge">→ Linked to goal</span>
  }

  if (!open) {
    return (
      <button className="idea-convert-btn" onClick={() => setOpen(true)}>
        → Convert
      </button>
    )
  }

  return (
    <div className="idea-convert-form" onClick={e => e.stopPropagation()}>
      <select className="form-input idea-convert-select" value={type} onChange={e => setType(e.target.value)}>
        {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <button className="btn-primary idea-convert-confirm" disabled={mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? '…' : 'Create'}
      </button>
      <button className="btn-ghost idea-convert-cancel" onClick={() => setOpen(false)}>✕</button>
    </div>
  )
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'learning', label: 'Learning' },
  { id: 'thinking', label: 'Thinking' },
] as const

export function IdeasThinkingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabs.some((tab) => tab.id === searchParams.get('tab'))
    ? (searchParams.get('tab') as (typeof tabs)[number]['id'])
    : 'overview'

  const overviewQuery = useQuery({
    queryKey: ['ideas-overview'],
    queryFn: getIdeasOverview,
  })
  const [thinkingPrompt, setThinkingPrompt] = useState('')
  const [thinkingReply, setThinkingReply] = useState<string | null>(null)

  const thinkingMutation = useMutation({
    mutationFn: (prompt: string) =>
      sendChatMessage([{ role: 'user', content: prompt }], { mode: 'task_thinking', surface: 'ideas_thinking' }),
    onSuccess: (result) => setThinkingReply(result.reply),
  })

  if (overviewQuery.isLoading) {
    return <PageSkeleton />
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return <section className="error-state">We could not load the ideas workspace.</section>
  }

  const overview = overviewQuery.data

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Ideas & Thinking</p>
          <h2>Keep raw ideas, decisions, learning, and structured thinking in one place.</h2>
          <p>This view groups concept capture with actual reasoning work so the app is easier to understand and use.</p>
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
            <MetricCard label="Raw ideas" value={`${overview.summary.raw_ideas}`} />
            <MetricCard label="Validated ideas" value={`${overview.summary.validated_ideas}`} tone="success" />
            <MetricCard label="Decisions logged" value={`${overview.summary.decisions}`} />
            <MetricCard label="Learning items" value={`${overview.summary.learning_items}`} />
          </div>

          <div className="three-column">
            <Panel title="Latest ideas" description="Recent inbox and concept items.">
              {overview.ideas.length === 0 ? (
                <EmptyState title="No ideas yet" body="Ideas captured anywhere in the app will appear here." />
              ) : (
                <ul className="plain-list">
                  {overview.ideas.slice(0, 5).map((idea) => (
                    <li key={idea.id} className="context-item idea-overview-item">
                      <div className="idea-overview-row">
                        <div>
                          <strong>{idea.title}</strong>
                          <p className="muted">{idea.status}</p>
                        </div>
                        <ConvertButton idea={idea} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Latest decisions" description="Reasoning that should stay visible.">
              {overview.decisions.length === 0 ? (
                <EmptyState title="No decisions yet" body="Meaningful decisions will appear here." />
              ) : (
                <ul className="plain-list">
                  {overview.decisions.slice(0, 5).map((decision) => (
                    <li key={decision.id} className="context-item">
                      <strong>{decision.decision}</strong>
                      <p className="muted">{decision.date}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Latest learning" description="Track what is being absorbed into the system.">
              {overview.learning.length === 0 ? (
                <EmptyState title="No learning yet" body="Learning items will appear here once captured." />
              ) : (
                <ul className="plain-list">
                  {overview.learning.slice(0, 5).map((item) => (
                    <li key={item.id} className="context-item">
                      <strong>{item.topic}</strong>
                      <p className="muted">{item.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'thinking' ? (
        <Panel title="Structured thinking workspace" description="Open a deliberate AI thinking session without leaving the ideas surface.">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              if (thinkingPrompt.trim()) {
                thinkingMutation.mutate(thinkingPrompt.trim())
              }
            }}
          >
            <div className="field">
              <label htmlFor="thinking-prompt">Prompt</label>
              <textarea id="thinking-prompt" value={thinkingPrompt} onChange={(event) => setThinkingPrompt(event.target.value)} />
            </div>
            <div className="button-row">
              <button disabled={thinkingMutation.isPending || !thinkingPrompt.trim()} type="submit">
                {thinkingMutation.isPending ? 'Thinking...' : 'Start thinking session'}
              </button>
            </div>
          </form>
          {thinkingReply ? (
            <div className="callout">
              <p className="eyebrow">Thinking session</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{thinkingReply}</p>
            </div>
          ) : (
            <EmptyState title="No thinking session yet" body="Use this when an idea needs structured reasoning before you decide what to do with it." />
          )}
        </Panel>
      ) : null}

      {activeTab === 'ideas' ? <IdeasPage /> : null}
      {activeTab === 'decisions' ? <DecisionsPage /> : null}
      {activeTab === 'learning' ? <LearningPage /> : null}
    </section>
  )
}
