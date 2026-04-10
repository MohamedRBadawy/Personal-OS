import { useState, useEffect } from 'react'
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

import { todayStr, yesterdayStr, blockHasPassed, getCurrentBlock } from '../components/routine/helpers'
import { AIMorningBriefing }      from '../components/routine/AIMorningBriefing'
import { WeeklyGrid }             from '../components/routine/WeeklyGrid'
import { MetricsPanel }           from '../components/routine/MetricsPanel'
import { BlockRow }               from '../components/routine/BlockRow'
import { BlockEditPanel }         from '../components/routine/BlockEditPanel'
import { RoutineEditor }          from '../components/routine/RoutineEditor'
import { WeekMatrixView }         from '../components/routine/WeekMatrixView'
import { RoutineAnalyticsView }   from '../components/routine/RoutineAnalyticsView'

// ── Main Page ──────────────────────────────────────────────────────────────

export function RoutinePage() {
  const qc = useQueryClient()
  const today = todayStr()
  const yesterday = yesterdayStr()
  const [view, setView] = useState<'today' | 'week' | 'analytics'>('today')
  const [editMode, setEditMode] = useState(false)
  // null = panel closed; number = editing block by id (from timeline view)
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null)

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<RoutineBlock[]>({
    queryKey: ['routine-blocks'],
    queryFn: listRoutineBlocks,
  })

  const { data: logs = [] } = useQuery<RoutineLogEntry[]>({
    queryKey: ['routine-logs', today],
    queryFn: () => getRoutineLogs(today),
  })

  const { data: yesterdayLogs = [] } = useQuery<RoutineLogEntry[]>({
    queryKey: ['routine-logs', yesterday],
    queryFn: () => getRoutineLogs(yesterday),
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
  const yesterdayLogsByTime = Object.fromEntries(yesterdayLogs.map(l => [l.block_time.slice(0, 5), l]))
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
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {view === 'today' && showCloseDay && (
              <button className="btn-ghost-sm" style={{ fontSize: 12 }} onClick={closeDay}>
                ✕ Close day
              </button>
            )}
            {view === 'today' && (
              <button
                className={`btn-ghost-sm ${editMode ? 'active' : ''}`}
                style={{ fontSize: 12 }}
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
          <AIMorningBriefing />
          <WeeklyGrid total={total} />
          <MetricsPanel />

          {/* Timeline */}
          <div className="routine-timeline">
            {blocks.map(block => {
              const yLog = yesterdayLogsByTime[block.time]
              const missedYesterday =
                blockHasPassed(block.time) &&
                (yLog === undefined || yLog.status === 'skipped')
              return (
                <BlockRow
                  key={block.id}
                  block={block}
                  log={logsByTime[block.time]}
                  missedYesterday={missedYesterday}
                  onSave={entry => saveMut.mutate(entry)}
                  onEdit={() => setEditingBlockId(block.id)}
                  streakDots={blockStreakMap[block.id]?.last_7}
                  streak={blockStreakMap[block.id]?.streak}
                  isCurrent={block.id === currentBlockId}
                  defaultExpanded={block.id === currentBlockId}
                />
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
