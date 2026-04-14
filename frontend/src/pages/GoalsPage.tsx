import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { listNodes, reorderNodes, getPrioritizedNodes } from '../lib/api'
import type { Node, NodePriorityEntry } from '../lib/types'

import { VIEWS, ExpandAllContext, IsFilteringContext } from '../components/goals/constants'
import type { ViewMode, SortKey } from '../components/goals/constants'
import { makeSorter, buildTree } from '../components/goals/utils'
import { NodeSidePanel } from '../components/goals/NodeSidePanel'
import { AddNodeModal } from '../components/goals/AddNodeModal'
import { GoalsListView, GroupedListView } from '../components/goals/GoalsListView'
import { GoalsKanbanView } from '../components/goals/KanbanView'
import { GoalsBoardView } from '../components/goals/BoardView'
import { TodayFocusPanel } from '../components/goals/TodayFocusPanel'
import { GoalsFilters } from '../components/goals/GoalsFilters'
import { TYPE_ICONS } from '../components/goals/constants'

// ── Priority View ────────────────────────────────────────────────────────────

const MAX_SCORE = 14 // theoretical max for visual bar scaling

function PriorityView({ entries, loading, onSelect }: {
  entries: NodePriorityEntry[]
  loading: boolean
  onSelect: (id: string) => void
}) {
  if (loading) return <PageSkeleton />
  if (!entries.length) return <p style={{ padding: 24, color: 'var(--text-muted)' }}>No nodes here yet. Press <kbd style={{ fontSize: 13, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-alt)' }}>N</kbd> to add your first goal.</p>
  const maxScore = Math.max(...entries.map(e => e.leverage_score), MAX_SCORE)
  return (
    <div className="priority-view">
      {entries.map((e, i) => (
        <div key={e.id} className="priority-row" onClick={() => onSelect(e.id)}>
          <span className="priority-rank">#{i + 1}</span>
          <span className="priority-icon">{TYPE_ICONS[e.type] || '·'}</span>
          <div className="priority-info">
            <span className="priority-title">{e.title}</span>
            <div className="priority-meta">
              {e.dependent_count > 0 && <span className="priority-badge badge-enables">⚡ enables {e.dependent_count}</span>}
              {e.blocked_by_count > 0 && <span className="priority-badge badge-blocked">⊘ blocked by {e.blocked_by_count}</span>}
              <span className={`priority-badge badge-status-${e.status}`}>{e.status}</span>
              {e.effort && <span className="priority-badge badge-effort">{e.effort}</span>}
            </div>
          </div>
          <div className="priority-score-col">
            <div className="priority-bar-wrap">
              <div className="priority-bar-fill" style={{ width: `${Math.max(4, (e.leverage_score / maxScore) * 100)}%` }} />
            </div>
            <span className="priority-score-val">{e.leverage_score}</span>
          </div>
        </div>
      ))}
    </div>
  )
}


export function GoalsPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Node | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterContext, setFilterContext] = useState('')
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
  const { data: prioritized = [], isLoading: priorityLoading } = useQuery<NodePriorityEntry[]>({
    queryKey: ['nodes-priority'],
    queryFn: getPrioritizedNodes,
    enabled: view === 'priority',
    staleTime: 60_000,
  })
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

  // Keyboard shortcut: press N to open add-node modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'n' || e.key === 'N') {
        const tag = (e.target as Element).tagName
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
        setShowAdd(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    if (filterContext) list = list.filter(n => n.business_context === filterContext)
    return [...list].sort(makeSorter(sortBy))
  }, [nodes, search, filterStatus, filterCategory, filterType, filterContext, chipFilter, sortBy])

  const isFiltering = !!(search || filterStatus || filterCategory || filterType || filterContext || chipFilter)
  const tree = (isFiltering || sortBy !== 'manual')
    ? filtered.map(n => ({ ...n, children: [] as Node[] }))
    : buildTree(filtered)

  function clearFilters() {
    setSearch('')
    setFilterStatus('')
    setFilterCategory('')
    setFilterType('')
    setFilterContext('')
    setChipFilter('')
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="goals-page">
      <WorkspaceTabs tabs={[...VIEWS]} activeTab={view} onChange={v => setView(v as ViewMode)} />

      <CollapsibleSection title="Filters" storageKey="goals-filters" defaultOpen={false}>
        <GoalsFilters
          view={view}
          search={search}
          filterStatus={filterStatus}
          filterCategory={filterCategory}
          filterType={filterType}
          filterContext={filterContext}
          sortBy={sortBy}
          listGroupBy={listGroupBy}
          chipFilter={chipFilter}
          isFiltering={isFiltering}
          statusCounts={statusCounts}
          expandAll={expandAll}
          onSearchChange={setSearch}
          onFilterStatusChange={setFilterStatus}
          onFilterCategoryChange={setFilterCategory}
          onFilterTypeChange={setFilterType}
          onFilterContextChange={setFilterContext}
          onSortByChange={setSortBy}
          onListGroupByChange={setListGroupBy}
          onChipFilterChange={setChipFilter}
          onClearFilters={clearFilters}
          onAddNode={() => setShowAdd(true)}
          onToggleExpandAll={() => setExpandAll(p => !p)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Today's Focus" storageKey="goals-focus" defaultOpen={true}>
        <TodayFocusPanel nodes={nodes} onUpdate={invalidate} />
      </CollapsibleSection>

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
      {view === 'priority' && (
        <PriorityView entries={prioritized} loading={priorityLoading} onSelect={id => {
          const n = nodes.find(n => n.id === id)
          if (n) setSelected(n)
        }} />
      )}

      {selected && createPortal(
        <NodeSidePanel node={selected} allNodes={nodes} onClose={() => setSelected(null)}
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
