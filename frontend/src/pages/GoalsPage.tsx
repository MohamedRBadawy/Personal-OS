import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { GoalMap } from '../components/GoalMap'
import { GoalNodeForm } from '../components/GoalNodeForm'
import { GoalTree } from '../components/GoalTree'
import { Panel } from '../components/Panel'
import { StatusPill } from '../components/StatusPill'
import {
  createGoalNode,
  deleteGoalNode,
  getGoalContext,
  getGoalMap,
  getGoalTree,
  updateGoalNode,
} from '../lib/api'
import { titleCase } from '../lib/formatters'
import type { GoalNodeCreatePayload, GoalNodeUpdatePayload } from '../lib/types'

const GOAL_QUERY_KEYS = ['goal-tree', 'goal-map', 'dashboard', 'command-center']

export function GoalsPage() {
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [view, setView] = useState<'tree' | 'map'>('tree')
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view')

  const treeQuery = useQuery({
    queryKey: ['goal-tree'],
    queryFn: getGoalTree,
  })
  const mapQuery = useQuery({
    queryKey: ['goal-map'],
    queryFn: getGoalMap,
  })

  const activeNodeId = selectedNodeId ?? treeQuery.data?.[0]?.id ?? mapQuery.data?.nodes[0]?.id ?? null

  const contextQuery = useQuery({
    queryKey: ['goal-context', activeNodeId],
    queryFn: () => getGoalContext(activeNodeId!),
    enabled: Boolean(activeNodeId),
  })

  function invalidateGoals() {
    return Promise.all([
      ...GOAL_QUERY_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      activeNodeId
        ? queryClient.invalidateQueries({ queryKey: ['goal-context', activeNodeId] })
        : Promise.resolve(),
    ])
  }

  const createMutation = useMutation({
    mutationFn: (payload: GoalNodeCreatePayload) => createGoalNode(payload),
    onSuccess: async () => {
      await invalidateGoals()
      setMode('view')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GoalNodeUpdatePayload }) =>
      updateGoalNode(id, payload),
    onSuccess: async () => {
      await invalidateGoals()
      setMode('view')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoalNode(id),
    onSuccess: async () => {
      setSelectedNodeId(null)
      setMode('view')
      await invalidateGoals()
    },
  })

  if (treeQuery.isLoading || mapQuery.isLoading) {
    return <section className="loading-state">Loading goal views...</section>
  }

  if (treeQuery.isError || mapQuery.isError || !treeQuery.data || !mapQuery.data) {
    return <section className="error-state">We could not load the goal views.</section>
  }

  const parentOptions = mapQuery.data.nodes
    .filter((n) => ['goal', 'project'].includes(n.type))
    .map((n) => ({ id: n.id, title: n.title }))

  const node = contextQuery.data?.node
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Goals</p>
          <h2>Dependency-aware map</h2>
          <p>Switch between the tree and the relationship map without losing context.</p>
        </div>
        <div className="button-row">
          <button
            className={view === 'tree' ? 'button-muted active' : 'button-muted'}
            type="button"
            onClick={() => setView('tree')}
          >
            Tree
          </button>
          <button
            className={view === 'map' ? 'button-muted active' : 'button-muted'}
            type="button"
            onClick={() => setView('map')}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('add')
              setSelectedNodeId(null)
            }}
          >
            + Add node
          </button>
        </div>
      </div>

      <div className="two-column">
        <Panel
          title={view === 'tree' ? 'Goal tree' : 'Goal map'}
          description={
            view === 'tree'
              ? 'Browse the hierarchy from goals down to tasks.'
              : 'See goal-project-task relationships and dependency arrows in one surface.'
          }
        >
          {view === 'tree' ? (
            treeQuery.data.length === 0 ? (
              <EmptyState title="No nodes yet" body="Add a goal to get started." />
            ) : (
              <GoalTree
                nodes={treeQuery.data}
                selectedId={activeNodeId}
                onSelect={(id) => {
                  setSelectedNodeId(id)
                  setMode('view')
                }}
              />
            )
          ) : mapQuery.data.nodes.length === 0 ? (
            <EmptyState title="No nodes yet" body="Add a goal to get started." />
          ) : (
            <GoalMap
              payload={mapQuery.data}
              selectedId={activeNodeId}
              onSelect={(id) => {
                setSelectedNodeId(id)
                setMode('view')
              }}
            />
          )}
        </Panel>

        <Panel
          title={
            mode === 'add' ? 'New node' : mode === 'edit' ? 'Edit node' : 'Selected node context'
          }
          description={
            mode === 'add'
              ? 'Fill in the details for the new node.'
              : mode === 'edit'
                ? 'Update the node fields below.'
                : 'Ancestry, dependents, and direct-child progress for the chosen node.'
          }
          aside={
            mode === 'view' && view === 'map'
              ? `${mapQuery.data.summary.blocked_count} blocked node${mapQuery.data.summary.blocked_count === 1 ? '' : 's'}`
              : null
          }
        >
          {mode === 'add' && (
            <GoalNodeForm
              isSubmitting={isSubmitting}
              parentOptions={parentOptions}
              onCancel={() => setMode('view')}
              onSubmit={(payload) => createMutation.mutate(payload)}
            />
          )}

          {mode === 'edit' && node && (
            <GoalNodeForm
              initialValues={{
                title: node.title,
                type: node.type,
                category: node.category,
                status: node.status,
                parent: node.parent,
                notes: node.notes,
              }}
              isSubmitting={isSubmitting}
              parentOptions={parentOptions.filter((p) => p.id !== node.id)}
              onCancel={() => setMode('view')}
              onSubmit={(payload) =>
                updateMutation.mutate({ id: node.id, payload })
              }
            />
          )}

          {mode === 'view' && (
            <>
              {contextQuery.isLoading ? (
                <div className="loading-state">Loading node context...</div>
              ) : contextQuery.data ? (
                <div className="stack">
                  <div>
                    <h3>{contextQuery.data.node.title}</h3>
                    <div className="priority-meta">
                      <StatusPill label={contextQuery.data.node.status} />
                      <span>{titleCase(contextQuery.data.node.type)}</span>
                      <span>{contextQuery.data.progress_pct}% progress</span>
                    </div>
                  </div>
                  <div className="button-row">
                    <button
                      className="button-muted"
                      type="button"
                      onClick={() => setMode('edit')}
                    >
                      Edit
                    </button>
                    <button
                      className="button-ghost"
                      disabled={deleteMutation.isPending}
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${contextQuery.data!.node.title}"?`)) {
                          deleteMutation.mutate(contextQuery.data!.node.id)
                        }
                      }}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <div className="summary-strip">
                    <div>
                      <strong>{contextQuery.data.ancestors.length}</strong>
                      <p className="muted">Ancestors</p>
                    </div>
                    <div>
                      <strong>{contextQuery.data.dependents.length}</strong>
                      <p className="muted">Dependents</p>
                    </div>
                  </div>
                  <div>
                    <p className="muted">Notes</p>
                    <p>{contextQuery.data.node.notes || 'No notes captured yet.'}</p>
                  </div>
                  <div>
                    <p className="muted">Ancestors</p>
                    <ul className="context-list">
                      {contextQuery.data.ancestors.length === 0 ? (
                        <li className="context-item">This node has no ancestors.</li>
                      ) : (
                        contextQuery.data.ancestors.map((ancestor) => (
                          <li key={ancestor.id} className="context-item">
                            {ancestor.title}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="muted">Dependents</p>
                    <ul className="context-list">
                      {contextQuery.data.dependents.length === 0 ? (
                        <li className="context-item">Nothing depends on this node yet.</li>
                      ) : (
                        contextQuery.data.dependents.map((dependent) => (
                          <li key={dependent.id} className="context-item">
                            {dependent.title}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Pick a node"
                  body="Select an item from the tree or map to inspect its context."
                />
              )}
            </>
          )}
        </Panel>
      </div>
    </section>
  )
}
