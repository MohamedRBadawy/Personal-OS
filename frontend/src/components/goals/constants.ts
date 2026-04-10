import { createContext } from 'react'
import type { NodeStatus, NodeType } from '../../lib/types'

// ── Type constants ─────────────────────────────────────────────────────────

export const TYPE_ICONS: Record<string, string> = {
  goal: '◎', project: '⬡', task: '◻', sub_task: '·', subtask: '·', idea: '✦', burden: '⚠',
}

export const TYPE_LABELS: Record<string, string> = {
  goal: 'Goal', project: 'Project', task: 'Task',
  sub_task: 'Subtask', subtask: 'Subtask', idea: 'Idea', burden: 'Burden',
}

export const EFFORT_LABELS: Record<string, string> = {
  '15min': '15m', '30min': '30m', '1h': '1h', '2h': '2h',
  '4h': '4h', '1day': '1d', '2days': '2d', '1week': '1w', 'ongoing': '∞',
}

export const CATEGORIES = ['Life', 'Work', 'Finance', 'Health', 'Spiritual', 'Family', 'Learning', 'Ideas']
export const STATUSES: NodeStatus[] = ['active', 'available', 'blocked', 'done', 'deferred']
export const NODE_TYPES: NodeType[] = ['goal', 'project', 'task', 'subtask', 'idea', 'burden']
export const EFFORTS = ['15min', '30min', '1h', '2h', '4h', '1day', '2days', '1week', 'ongoing']

export const KANBAN_STATUSES: NodeStatus[] = ['active', 'available', 'blocked', 'done', 'deferred']
export const COLLAPSED_BY_DEFAULT: NodeStatus[] = ['done', 'deferred']

export const VIEWS = [
  { id: 'list',     label: '☰ List' },
  { id: 'kanban',   label: '⬡ Kanban' },
  { id: 'board',    label: '⊞ Board' },
  { id: 'priority', label: '⚡ Priority' },
] as const

export type ViewMode = (typeof VIEWS)[number]['id']
export type SortKey = 'manual' | 'name' | 'due' | 'updated' | 'priority' | 'progress' | 'time'

// ── Contexts ──────────────────────────────────────────────────────────────
export const ExpandAllContext   = createContext<boolean>(true)
export const IsFilteringContext = createContext<boolean>(false)
