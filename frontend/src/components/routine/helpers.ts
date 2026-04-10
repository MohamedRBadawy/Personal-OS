// ── Helpers ───────────────────────────────────────────────────────────────

import type { RoutineBlock } from '../../lib/types'

export function getCairoMinutes(): number {
  const cairoTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
  const [h, m] = cairoTime.split(':').map(Number)
  return h * 60 + m
}

export function getCurrentBlock(blocks: RoutineBlock[]): RoutineBlock | null {
  const nowMin = getCairoMinutes()
  for (const b of blocks) {
    const timeStr = b.time_str || b.time.slice(0, 5)
    const [bH, bM] = timeStr.split(':').map(Number)
    const startMin = bH * 60 + bM
    const endMin = startMin + (b.duration_minutes || 30)
    if (nowMin >= startMin && nowMin < endMin) return b
  }
  return null
}

export function blockEndTime(block: RoutineBlock): string {
  const timeStr = block.time_str || block.time.slice(0, 5)
  const [bH, bM] = timeStr.split(':').map(Number)
  const endMin = bH * 60 + bM + (block.duration_minutes || 30)
  const eh = Math.floor(endMin / 60) % 24
  const em = endMin % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

export function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

export function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA')
}

export function fmtDuration(mins: number): string {
  if (mins <= 0) return '—'
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60}m`
  return `${mins}m`
}

export function blockHasPassed(blockTime: string): boolean {
  const [h, m] = blockTime.split(':').map(Number)
  const cairoTime = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const [nowH, nowM] = cairoTime.split(':').map(Number)
  return nowH * 60 + nowM > h * 60 + m
}

export function toggleDay(prev: string, digit: string): string {
  return prev.includes(digit)
    ? prev.split('').filter(d => d !== digit).sort().join('')
    : [...prev.split(''), digit].sort().join('')
}

export function heatLevel(pct: number): '0' | '1' | '2' | '3' {
  if (pct === 0) return '0'
  if (pct < 50)  return '1'
  if (pct < 80)  return '2'
  return '3'
}
