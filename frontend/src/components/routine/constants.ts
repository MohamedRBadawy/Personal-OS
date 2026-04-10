import type { RoutineBlock } from '../../lib/types'

// ── Types ──────────────────────────────────────────────────────────────────

export type BlockType = RoutineBlock['type']

export type NoteEntry = { date: string; status: string; actual_time: string | null; note: string }

export type EditorRow = {
  _id: number
  time: string
  label: string
  type: BlockType
  duration_minutes: number
  is_fixed: boolean
  order: number
  linked_node: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────

export const TYPE_COLORS: Record<BlockType, string> = {
  spiritual: '#7c3aed',
  health:    '#16a34a',
  work:      '#2563eb',
  personal:  '#6b7280',
  family:    '#db2777',
}

export const STATUS_LABELS = [
  { value: 'done',    label: '✓ Done' },
  { value: 'partial', label: '~ Partial' },
  { value: 'late',    label: '⏰ Late' },
  { value: 'skipped', label: '✕ Skipped' },
]

export const DAYS = [
  { digit: '1', label: 'Mon' },
  { digit: '2', label: 'Tue' },
  { digit: '3', label: 'Wed' },
  { digit: '4', label: 'Thu' },
  { digit: '5', label: 'Fri' },
  { digit: '6', label: 'Sat' },
  { digit: '7', label: 'Sun' },
]

export const TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  spiritual: { label: 'Spiritual', icon: '🕌', color: '#7c3aed' },
  health:    { label: 'Health',    icon: '💪', color: '#16a34a' },
  work:      { label: 'Work',      icon: '💼', color: '#2563eb' },
  personal:  { label: 'Personal',  icon: '🧘', color: '#6b7280' },
  family:    { label: 'Family',    icon: '👨‍👩‍👧', color: '#db2777' },
}

export const DAY_DIGITS = ['1', '2', '3', '4', '5', '6', '7']
export const DAY_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
