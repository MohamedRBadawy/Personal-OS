import type { Node } from '../../lib/types'
import type { SortKey } from './constants'

export function bySortKey(a: Node, b: Node): number {
  if (a.order !== b.order) return a.order - b.order
  return (a.priority ?? 99) - (b.priority ?? 99)
}

export function makeSorter(sortBy: SortKey): (a: Node, b: Node) => number {
  switch (sortBy) {
    case 'name':     return (a, b) => a.title.localeCompare(b.title)
    case 'due':      return (a, b) => {
      if (!a.target_date && !b.target_date) return 0
      if (!a.target_date) return 1
      if (!b.target_date) return -1
      return a.target_date.localeCompare(b.target_date)
    }
    case 'updated':  return (a, b) => b.updated_at.localeCompare(a.updated_at)
    case 'priority': return (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
    case 'progress': return (a, b) => b.progress - a.progress
    case 'time':     return (a, b) => (b.total_logged_minutes ?? 0) - (a.total_logged_minutes ?? 0)
    default:         return bySortKey
  }
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

export function isStalled(node: Node): boolean {
  if (node.status === 'done' || node.status === 'deferred') return false
  return (Date.now() - new Date(node.updated_at).getTime()) > 14 * 24 * 60 * 60 * 1000
}

export function buildTree(nodes: Node[]): (Node & { children: Node[] })[] {
  const map = new Map<string, Node & { children: Node[] }>()
  nodes.forEach(n => map.set(n.id, { ...n, children: [] }))
  const roots: (Node & { children: Node[] })[] = []
  map.forEach(n => {
    if (n.parent && map.has(n.parent)) {
      map.get(n.parent)!.children.push(n)
    } else {
      roots.push(n)
    }
  })
  map.forEach(n => n.children.sort(bySortKey))
  roots.sort(bySortKey)
  return roots
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatElapsed(startMs: number): string {
  const elapsed = Math.floor((Date.now() - startMs) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
