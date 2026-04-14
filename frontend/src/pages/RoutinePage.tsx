import { useState, useEffect, useMemo, Fragment } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getBlockStreaks,
  getRoutineLogs,
  getRoutineStreak,
  saveRoutineLog,
  listRoutineBlocks,
  listNodes,
} from '../lib/api'
import type { BlockStreaksPayload, RoutineBlock, RoutineLogEntry, Node } from '../lib/types'

import { todayStr, getCurrentBlock } from '../components/routine/helpers'
import { CollapsibleSection }      from '../components/CollapsibleSection'
import { AIMorningBriefing }      from '../components/routine/AIMorningBriefing'
import { WeeklyGrid }             from '../components/routine/WeeklyGrid'
import { MetricsPanel }           from '../components/routine/MetricsPanel'
import { BlockRow }               from '../components/routine/BlockRow'
import { BlockEditPanel }         from '../components/routine/BlockEditPanel'
import { RoutineEditor }          from '../components/routine/RoutineEditor'
import { WeekMatrixView }         from '../components/routine/WeekMatrixView'
import { RoutineAnalyticsView }   from '../components/routine/RoutineAnalyticsView'

// ── Helpers ───────────────────────────────────────────────────────────────

function timeToMin(timeStr: string): number {
  const s = timeStr.slice(0, 5)
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

// ── GapRow ────────────────────────────────────────────────────────────────

function GapRow({ minutes }: { minutes: number }) {
  const label = minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}m` : ''} free`.trim()
    : `${minutes} min free`
  return (
    <div className="routine-gap-row">
      <div className="routine-gap-line" />
      <span className="routine-gap-label">{label}</span>
      <div className="routine-gap-line" />
    </div>
  )
}


// ── Main Page ──────────────────────────────────────────────────────────────

export function RoutinePage() {
  const qc = useQueryClient()
  const today = todayStr()
  const [view, setView] = useState<'today' | 'week' | 'analytics'>('today')
  const [editMode, setEditMode] = useState(false)
  // null = panel closed; number = editing block by id (from timeline view)
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null)
  // Schedule drift tracking (minutes behind/ahead of plan)
  const [drift, setDrift] = useState(0)

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<RoutineBlock[]>({
    queryKey: ['routine-blocks'],
    queryFn: listRoutineBlocks,
  })

  const { data: logs = [] } = useQuery<RoutineLogEntry[]>({
    queryKey: ['routine-logs', today],
    queryFn: () => getRoutineLogs(today),
  })

  const { data: streakData } = useQuery({
    queryKey: ['routine-streak'],
    queryFn: getRoutineStreak,
  })

  const { data: blockStreaks } = useQuery<BlockStreaksPayload>({
    queryKey: ['block-streaks'],
    queryFn: getBlockStreaks,
    staleTime: 5 * 60 * 1000,
  })

  const blockStreakMap = Object.fromEntries(
    (blockStreaks?.blocks ?? []).map(b => [b.block_id, b])
  )

  // For page-level BlockEditPanel (opened from timeline BlockRow)
  const { data: allNodes = [] } = useQuery<Node[]>({
    queryKey: ['nodes-v2'],
    queryFn: listNodes,
  })
  const linkableNodes = allNodes.filter(n => n.type === 'goal' || n.type === 'project' || n.type === 'task')

  const saveMut = useMutation({
    mutationFn: (entry: { block_time: string; status: string; actual_time?: string; note?: string }) =>
      saveRoutineLog({ date: today, ...entry }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routine-logs', today] }),
  })

  const logsByTime = Object.fromEntries(logs.map(l => [l.block_time.slice(0, 5), l]))
  const doneCount = logs.filter(l => l.status === 'done' || l.status === 'partial').length
  const total = blocks.length || streakData?.total_blocks || 20
  const pct = Math.round((doneCount / total) * 100)

  // Weighted "core score": must×3 + should×2 + nice×1
  const WEIGHT = { must: 3, should: 2, nice: 1 } as const
  const maxScore = blocks.reduce((s, b) => s + (WEIGHT[b.importance] ?? 2), 0)
  const earnedScore = blocks.reduce((s, b) => {
    const log = logsByTime[b.time_str || b.time.slice(0, 5)]
    return s + (log && (log.status === 'done' || log.status === 'partial') ? (WEIGHT[b.importance] ?? 2) : 0)
  }, 0)
  const coreScore = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0
  const showCoreScore = blocks.some(b => b.importance !== 'should')

  // Recompute drift whenever logs change
  const computedDrift = useMemo(() => {
    let latestDrift = 0
    for (const block of blocks) {
      const key = block.time_str || block.time.slice(0, 5)
      const log = logsByTime[key]
      if (!log?.actual_time) continue
      const planned = timeToMin(key)
      const actual = timeToMin(log.actual_time)
      const delta = actual - planned
      if (Math.abs(delta) > 2) latestDrift = delta
    }
    return latestDrift
  }, [logs, blocks])

  useEffect(() => {
    setDrift(computedDrift)
  }, [computedDrift])

  function closeDay() {
    const unlogged = blocks.filter(b => !logsByTime[b.time])
    unlogged.forEach(b => saveMut.mutate({ block_time: b.time, status: 'skipped' }))
  }

  const showCloseDay = new Date().getHours() >= 21 && doneCount < total

  // Current block — recomputed every minute
  const [currentBlockId, setCurrentBlockId] = useState<number | null>(() => getCurrentBlock(blocks)?.id ?? null)
  useEffect(() => {
    setCurrentBlockId(getCurrentBlock(blocks)?.id ?? null)
    const interval = setInterval(() => setCurrentBlockId(getCurrentBlock(blocks)?.id ?? null), 60_000)
    return () => clearInterval(interval)
  }, [blocks])

  // Auto-scroll to the current block when the timeline first renders
  useEffect(() => {
    if (currentBlockId === null) return
    const el = document.querySelector('.block-current')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentBlockId])

  // Keyboard shortcuts for the current block (Fix 8)
  useEffect(() => {
    if (view !== 'today' || editMode) return
    function onKey(e: KeyboardEvent) {
      // Don't fire if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as Element)?.tagName ?? '')) return
      const currentBlock = blocks.find(b => b.id === currentBlockId)
      if (!currentBlock) return
      const now = new Date().toTimeString().slice(0, 5)
      if (e.code === 'Space' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        saveMut.mutate({ block_time: currentBlock.time, status: 'done', actual_time: now })
      } else if (e.key === 's' || e.key === 'S') {
        saveMut.mutate({ block_time: currentBlock.time, status: 'skipped', actual_time: now })
      } else if (e.key === 'p' || e.key === 'P') {
        saveMut.mutate({ block_time: currentBlock.time, status: 'partial', actual_time: now })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const idx = blocks.findIndex(b => b.id === currentBlockId)
        const next = blocks[idx + 1]
        if (next) {
          const el = document.querySelector(`[data-block-id="${next.id}"]`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = blocks.findIndex(b => b.id === currentBlockId)
        const prev = blocks[idx - 1]
        if (prev) {
          const el = document.querySelector(`[data-block-id="${prev.id}"]`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, editMode, currentBlockId, blocks, saveMut])

  // Unlogged past blocks (Fix 9)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const unloggedPastBlocks = blocks.filter(b => {
    const bMin = timeToMin(b.time_str || b.time)
    return bMin < nowMinutes && !logsByTime[b.time_str || b.time.slice(0, 5)] && b.id !== currentBlockId
  })
  const [showUnlogged, setShowUnlogged] = useState(false)

  if (blocksLoading) {
    return <div className="routine-page"><p style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</p></div>
  }

  return (
    <div className="routine-page">
      {/* Header */}
      <div className="routine-header">
        <div>
          <h1 className="routine-title">Daily Routine</h1>
          <p className="routine-date">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <div className="routine-completion">
          <span className="routine-pct">{pct}%</span>
          <span className="routine-pct-sub">{doneCount}/{total} done</span>
          {showCoreScore && (
            <span className="routine-core-score" title="Weighted core score (must×3 + should×2 + nice×1)">
              core {coreScore}%
            </span>
          )}
          {streakData !== undefined && streakData.streak > 0 && (
            <span className="routine-streak">🔥 {streakData.streak} day streak</span>
          )}
          {drift !== 0 && (
            <div className={`routine-drift-chip ${drift > 0 ? 'drift-late' : 'drift-early'}`}>
              {drift > 0 ? `⚠ ${drift} min behind` : `⚡ ${Math.abs(drift)} min ahead`}
              <button className="routine-drift-reset" onClick={() => setDrift(0)} title="Reset drift">✕</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {view === 'today' && showCloseDay && (
              <button className="btn-ghost-sm" style={{ fontSize: 14 }} onClick={closeDay}>
                ✕ Close day
              </button>
            )}
            {view === 'today' && (
              <button
                className={`btn-ghost-sm ${editMode ? 'active' : ''}`}
                style={{ fontSize: 14 }}
                onClick={() => setEditMode(m => !m)}
                title="Edit schedule"
              >
                ⚙ Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="routine-progress-bar">
        <div className="routine-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* View tabs */}
      <div className="routine-view-tabs">
        <button
          className={`routine-view-tab${view === 'today' ? ' active' : ''}`}
          onClick={() => { setView('today'); setEditMode(false) }}
        >
          ▦ Today
        </button>
        <button
          className={`routine-view-tab${view === 'week' ? ' active' : ''}`}
          onClick={() => { setView('week'); setEditMode(false) }}
        >
          📅 Week
        </button>
        <button
          className={`routine-view-tab${view === 'analytics' ? ' active' : ''}`}
          onClick={() => { setView('analytics'); setEditMode(false) }}
        >
          📊 Analytics
        </button>
      </div>

      {view === 'analytics' ? (
        <RoutineAnalyticsView blocks={blocks} />
      ) : view === 'week' ? (
        <WeekMatrixView blocks={blocks} onEdit={id => setEditingBlockId(id)} />
      ) : editMode ? (
        <RoutineEditor blocks={blocks} onDone={() => setEditMode(false)} />
      ) : (
        <>
          <CollapsibleSection title="AI Morning Brief" storageKey="routine-ai-brief" defaultOpen={false}>
            <AIMorningBriefing />
          </CollapsibleSection>
          <CollapsibleSection title="Weekly Overview" storageKey="routine-weekly" defaultOpen={false}>
            <WeeklyGrid total={total} />
          </CollapsibleSection>
          <CollapsibleSection title="Metrics" storageKey="routine-metrics" defaultOpen={false}>
            <MetricsPanel />
          </CollapsibleSection>

          {/* Unlogged past blocks bar (Fix 9) */}
          {unloggedPastBlocks.length > 0 && (
            <div className="routine-unlogged-bar">
              <div className="routine-unlogged-summary">
                <span className="routine-unlogged-count">
                  ⏰ {unloggedPastBlocks.length} past block{unloggedPastBlocks.length > 1 ? 's' : ''} not logged
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="routine-unlogged-toggle"
                    onClick={() => setShowUnlogged(v => !v)}
                  >
                    {showUnlogged ? 'Hide' : 'Log retroactively'}
                  </button>
                  <button
                    className="routine-unlogged-ignore"
                    onClick={() => {
                      unloggedPastBlocks.forEach(b =>
                        saveMut.mutate({ block_time: b.time, status: 'skipped' })
                      )
                    }}
                  >
                    Mark all skipped
                  </button>
                </div>
              </div>
              {showUnlogged && (
                <div className="routine-unlogged-list">
                  {unloggedPastBlocks.map(b => (
                    <div key={b.id} className="routine-unlogged-item">
                      <span className="routine-unlogged-time">{b.time_str || b.time.slice(0, 5)}</span>
                      <span className="routine-unlogged-label">{b.label}</span>
                      <div className="routine-unlogged-btns">
                        <button onClick={() => saveMut.mutate({ block_time: b.time, status: 'done' })}>✓</button>
                        <button onClick={() => saveMut.mutate({ block_time: b.time, status: 'partial' })}>~</button>
                        <button onClick={() => saveMut.mutate({ block_time: b.time, status: 'skipped' })}>✗</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="routine-timeline">
            {blocks.map((block, i) => {
              const prev = blocks[i - 1]
              const gapMin = prev
                ? timeToMin(block.time_str || block.time) - (timeToMin(prev.time_str || prev.time) + (prev.duration_minutes ?? 30))
                : 0

              return (
                <Fragment key={block.id}>
                  {gapMin > 5 && <GapRow minutes={gapMin} />}
                  <BlockRow
                    block={block}
                    log={logsByTime[block.time_str || block.time.slice(0, 5)]}
                    onSave={entry => saveMut.mutate(entry)}
                    onEdit={() => setEditingBlockId(block.id)}
                    streakDots={blockStreakMap[block.id]?.last_7}
                    streak={blockStreakMap[block.id]?.streak}
                    isCurrent={block.id === currentBlockId}
                    defaultExpanded={block.id === currentBlockId}
                    drift={drift}
                  />
                </Fragment>
              )
            })}
          </div>
        </>
      )}

      {/* Page-level BlockEditPanel — opened from timeline view */}
      {editingBlockId !== null && (
        <BlockEditPanel
          block={blocks.find(b => b.id === editingBlockId) ?? null}
          linkableNodes={linkableNodes}
          onClose={() => setEditingBlockId(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['routine-blocks'] })
            setEditingBlockId(null)
          }}
        />
      )}
    </div>
  )
}
