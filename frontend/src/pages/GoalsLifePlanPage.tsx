import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import {
  createGoalAttachmentProfile,
  getGoalContext,
  getGoalMap,
  listFamilyGoals,
  listRelationships,
  updateGoalAttachmentProfile,
} from '../lib/api'
import { GoalsPage as GoalMapPage } from './GoalsPage'
import { FamilyPage, RelationshipsPage } from './SimpleWorkspacePages'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'map', label: 'Goal Map' },
  { id: 'family', label: 'Family' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'attachments', label: 'Attachments' },
] as const

function toCsv(values: string[]) {
  return values.join(', ')
}

function fromCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function GoalsLifePlanPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabs.some((tab) => tab.id === searchParams.get('tab'))
    ? (searchParams.get('tab') as (typeof tabs)[number]['id'])
    : 'overview'

  const mapQuery = useQuery({
    queryKey: ['goal-map'],
    queryFn: getGoalMap,
  })
  const familyQuery = useQuery({
    queryKey: ['family-goals'],
    queryFn: listFamilyGoals,
  })
  const relationshipsQuery = useQuery({
    queryKey: ['relationships'],
    queryFn: listRelationships,
  })

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [habits, setHabits] = useState('')
  const [marketingActions, setMarketingActions] = useState('')
  const [tools, setTools] = useState('')
  const [learningPath, setLearningPath] = useState('')
  const [supportingPeople, setSupportingPeople] = useState('')
  const [processNotes, setProcessNotes] = useState('')

  useEffect(() => {
    if (!selectedNodeId && mapQuery.data?.nodes[0]?.id) {
      setSelectedNodeId(mapQuery.data.nodes[0].id)
    }
  }, [mapQuery.data, selectedNodeId])

  const contextQuery = useQuery({
    queryKey: ['goal-context', selectedNodeId],
    queryFn: () => getGoalContext(selectedNodeId!),
    enabled: Boolean(selectedNodeId),
  })

  useEffect(() => {
    const profile = contextQuery.data?.attachment_profile
    setHabits(toCsv(profile?.habits ?? []))
    setMarketingActions(toCsv(profile?.marketing_actions ?? []))
    setTools(toCsv(profile?.tools ?? []))
    setLearningPath(toCsv(profile?.learning_path ?? []))
    setSupportingPeople(toCsv(profile?.supporting_people ?? []))
    setProcessNotes(profile?.process_notes ?? '')
  }, [contextQuery.data])

  const saveAttachmentMutation = useMutation({
    mutationFn: () => {
      if (!selectedNodeId) throw new Error('No node selected')
      const payload = {
        node: selectedNodeId,
        recommended_layers: (contextQuery.data?.attachment_suggestions ?? []).map((item) => item.key),
        habits: fromCsv(habits),
        marketing_actions: fromCsv(marketingActions),
        process_notes: processNotes,
        tools: fromCsv(tools),
        learning_path: fromCsv(learningPath),
        supporting_people: fromCsv(supportingPeople),
      }
      const profile = contextQuery.data?.attachment_profile
      return profile
        ? updateGoalAttachmentProfile(profile.id, payload)
        : createGoalAttachmentProfile(payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-context', selectedNodeId] }),
        queryClient.invalidateQueries({ queryKey: ['goal-map'] }),
      ])
    },
  })

  const goalCount = mapQuery.data?.summary.goal_count ?? 0
  const projectCount = mapQuery.data?.summary.project_count ?? 0
  const taskCount = mapQuery.data?.summary.task_count ?? 0
  const blockedCount = mapQuery.data?.summary.blocked_count ?? 0
  const familyCount = familyQuery.data?.results.length ?? 0
  const relationshipCount = relationshipsQuery.data?.results.length ?? 0

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Goals & Life Plan</p>
          <h2>Map the structure, then support it with people and systems.</h2>
          <p>The PRD life plan now groups the goal graph, family direction, relationships, and support-layer attachments.</p>
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
            <MetricCard label="Goals" value={`${goalCount}`} />
            <MetricCard label="Projects" value={`${projectCount}`} />
            <MetricCard label="Tasks" value={`${taskCount}`} />
            <MetricCard label="Blocked" value={`${blockedCount}`} tone="warning" />
            <MetricCard label="Family goals" value={`${familyCount}`} />
            <MetricCard label="Relationships" value={`${relationshipCount}`} />
          </div>

          <div className="two-column">
            <Panel title="Life-plan structure" description="The graph remains the core planning surface for dependencies and blockers.">
              <ul className="plain-list">
                <li className="context-item">Use the map tab to restructure goals, projects, tasks, and burdens.</li>
                <li className="context-item">Use attachments to add habits, marketing actions, process notes, tools, and learning support.</li>
                <li className="context-item">Family and relationship records now sit inside this same life-plan view instead of living as separate top-level worlds.</li>
              </ul>
            </Panel>

            <Panel title="Next cleanup" description="The main usability gain here is fewer competing top-level pages.">
              <div className="summary-strip">
                <div>
                  <strong>{blockedCount}</strong>
                  <p className="muted">Blocked nodes to inspect</p>
                </div>
                <div>
                  <strong>{familyCount}</strong>
                  <p className="muted">Family goals tracked</p>
                </div>
                <div>
                  <strong>{relationshipCount}</strong>
                  <p className="muted">People kept visible</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'map' ? <GoalMapPage /> : null}
      {activeTab === 'family' ? <FamilyPage /> : null}
      {activeTab === 'relationships' ? <RelationshipsPage /> : null}

      {activeTab === 'attachments' ? (
        <div className="two-column">
          <Panel title="Select a node" description="Attachments are suggested per goal-like node and saved with confirmation.">
            {!mapQuery.data ? (
              <EmptyState title="Loading nodes" body="The goal graph is still loading." />
            ) : (
              <div className="stack">
                <div className="field">
                  <label htmlFor="attachment-node">Node</label>
                  <select
                    id="attachment-node"
                    value={selectedNodeId ?? ''}
                    onChange={(event) => setSelectedNodeId(event.target.value)}
                  >
                    {mapQuery.data.nodes
                      .filter((node) => !['idea', 'burden'].includes(node.type))
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                  </select>
                </div>

                {contextQuery.data ? (
                  <>
                    <div className="callout">
                      <p className="eyebrow">Selected node</p>
                      <h3>{contextQuery.data.node.title}</h3>
                      <p>{contextQuery.data.node.notes || 'No notes captured yet.'}</p>
                    </div>
                    <div className="record-list">
                      {(contextQuery.data.attachment_suggestions ?? []).map((suggestion) => (
                        <article key={suggestion.key} className="record-card">
                          <div className="record-card-header">
                            <div>
                              <h3>{suggestion.label}</h3>
                              <div className="list-inline">
                                <span className="record-meta-chip">{suggestion.key}</span>
                              </div>
                            </div>
                          </div>
                          <p className="muted">{suggestion.reason}</p>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState title="Pick a node" body="Choose a goal or project to see its suggested support layers." />
                )}
              </div>
            )}
          </Panel>

          <Panel title="Attachment profile" description="Confirm and edit the support layers that make the node easier to execute.">
            {!selectedNodeId ? (
              <EmptyState title="No node selected" body="Choose a node first." />
            ) : (
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault()
                  saveAttachmentMutation.mutate()
                }}
              >
                <div className="field span-2">
                  <label htmlFor="goal-process-notes">Process notes</label>
                  <textarea id="goal-process-notes" value={processNotes} onChange={(event) => setProcessNotes(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="goal-habits">Habits</label>
                  <input id="goal-habits" value={habits} onChange={(event) => setHabits(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="goal-marketing-actions">Marketing actions</label>
                  <input id="goal-marketing-actions" value={marketingActions} onChange={(event) => setMarketingActions(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="goal-tools">Tools</label>
                  <input id="goal-tools" value={tools} onChange={(event) => setTools(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="goal-learning-path">Learning path</label>
                  <input id="goal-learning-path" value={learningPath} onChange={(event) => setLearningPath(event.target.value)} />
                </div>
                <div className="field span-2">
                  <label htmlFor="goal-supporting-people">Supporting people</label>
                  <input id="goal-supporting-people" value={supportingPeople} onChange={(event) => setSupportingPeople(event.target.value)} />
                </div>
                <div className="field span-2 form-actions">
                  <button disabled={saveAttachmentMutation.isPending} type="submit">
                    {saveAttachmentMutation.isPending ? 'Saving attachments...' : 'Save attachment profile'}
                  </button>
                </div>
              </form>
            )}
          </Panel>
        </div>
      ) : null}
    </section>
  )
}
