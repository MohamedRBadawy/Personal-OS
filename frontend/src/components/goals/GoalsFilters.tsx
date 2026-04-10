import type { Node } from '../../lib/types'
import { STATUSES, CATEGORIES, NODE_TYPES } from './constants'
import type { SortKey } from './constants'

interface GoalsFiltersProps {
  view: string
  search: string
  filterStatus: string
  filterCategory: string
  filterType: string
  filterContext: string
  sortBy: SortKey
  listGroupBy: '' | 'category' | 'type' | 'status'
  chipFilter: string
  isFiltering: boolean
  statusCounts: Record<string, number>
  expandAll: boolean
  onSearchChange: (v: string) => void
  onFilterStatusChange: (v: string) => void
  onFilterCategoryChange: (v: string) => void
  onFilterTypeChange: (v: string) => void
  onFilterContextChange: (v: string) => void
  onSortByChange: (v: SortKey) => void
  onListGroupByChange: (v: '' | 'category' | 'type' | 'status') => void
  onChipFilterChange: (v: string) => void
  onClearFilters: () => void
  onAddNode: () => void
  onToggleExpandAll: () => void
}

export function GoalsFilters({
  view, search, filterStatus, filterCategory, filterType, filterContext,
  sortBy, listGroupBy, chipFilter, isFiltering, statusCounts, expandAll,
  onSearchChange, onFilterStatusChange, onFilterCategoryChange, onFilterTypeChange,
  onFilterContextChange, onSortByChange, onListGroupByChange, onChipFilterChange,
  onClearFilters, onAddNode, onToggleExpandAll,
}: GoalsFiltersProps) {
  return (
    <>
      <div className="goals-filters">
        <input
          className="form-input goals-search"
          placeholder="Search…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        {view !== 'kanban' && (
          <select className="form-input goals-select" value={filterStatus} onChange={e => onFilterStatusChange(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select className="form-input goals-select" value={filterCategory} onChange={e => onFilterCategoryChange(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input goals-select" value={filterType} onChange={e => onFilterTypeChange(e.target.value)}>
          <option value="">All types</option>
          {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-input goals-select" value={filterContext} onChange={e => onFilterContextChange(e.target.value)}>
          <option value="">All contexts</option>
          <option value="k_line">K Line Europe</option>
          <option value="freelance">Freelance client</option>
          <option value="own_business">Own business</option>
          <option value="idea">Business idea</option>
        </select>
        {view === 'list' && (
          <select className="form-input goals-select" value={sortBy}
            onChange={e => onSortByChange(e.target.value as SortKey)}>
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
            onChange={e => onListGroupByChange(e.target.value as typeof listGroupBy)}>
            <option value="">Group: None</option>
            <option value="category">Group: Category</option>
            <option value="type">Group: Type</option>
            <option value="status">Group: Status</option>
          </select>
        )}
        {isFiltering && (
          <button className="goals-clear-btn" onClick={onClearFilters}>✕ Clear</button>
        )}
      </div>

      {view !== 'kanban' && (
        <div className="goals-chips">
          {STATUSES.map(s => (
            <button key={s} className={`status-chip chip-${s}${chipFilter === s ? ' active' : ''}`}
              onClick={() => onChipFilterChange(chipFilter === s ? '' : s)}>
              {s}: {statusCounts[s] || 0}
            </button>
          ))}
          <button className="btn-ghost-sm" onClick={onAddNode}>+ Add node <kbd style={{ fontSize: 10, opacity: 0.6, fontFamily: 'inherit' }}>N</kbd></button>
          {view === 'list' && (
            <button className="btn-ghost-sm goals-expand-toggle" onClick={onToggleExpandAll}>
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>
      )}

      {view === 'kanban' && (
        <div className="goals-chips" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-ghost-sm" onClick={onAddNode}>+ Add node <kbd style={{ fontSize: 10, opacity: 0.6, fontFamily: 'inherit' }}>N</kbd></button>
        </div>
      )}
    </>
  )
}
