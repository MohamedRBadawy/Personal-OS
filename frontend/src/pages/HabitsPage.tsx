/**
 * HabitsPage — dedicated habit tracking with board, metrics, and heatmap.
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { HabitBoard } from '../components/HabitBoard'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { Panel } from '../components/Panel'
import {
  createHabit,
  createHabitLog,
  deleteHabit,
  getHealthToday,
  getHabitHeatmap,
  updateHabitLog,
} from '../lib/api'
import { formatPercent } from '../lib/formatters'
import type { HabitBoardItem, HabitLogPayload } from '../lib/types'
import type { HabitHeatmapPayload } from '../lib/api'

// ── Heatmap component ─────────────────────────────────────────────────────────

function HabitHeatmap({ data }: { data: HabitHeatmapPayload }) {
  if (data.habits.length === 0) {
    return <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>No habits defined yet.</p>
  }

  // Build the 52-week grid (364 days, Mon-Sun columns, weeks as rows-left-to-right)
  const today = new Date()
  // Align to the nearest Sunday (end of last complete week + today)
  const dayOfWeek = today.getDay() // 0=Sun…6=Sat
  // We'll build 53 weeks back so we always have at least 364 days visible
  const gridStart = new Date(today)
  gridStart.setDate(today.getDate() - (52 * 7 + dayOfWeek))

  // Build array of 52*7 date strings
  const cells: string[] = []
  const cursor = new Date(gridStart)
  for (let i = 0; i < 52 * 7; i++) {
    cells.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  const WEEK_COUNT = 52
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="habit-heatmap-section">
      {data.habits.map(habit => {
        const habitGrid = data.grid[habit.id] ?? {}
        // Count completions
        const doneCount = Object.keys(habitGrid).filter(d => habitGrid[d]).length
        return (
          <div key={habit.id} className="habit-heatmap-block">
            <div className="habit-heatmap-label">
              <span className="habit-heatmap-name">{habit.name}</span>
              <span className="habit-heatmap-stat">{doneCount} days in last year</span>
            </div>
            <div className="habit-heatmap-grid-wrap">
              <div className="habit-heatmap-day-labels">
                {DAY_LABELS.map((d, i) => (
                  <div key={i} className="habit-heatmap-day-label">{d}</div>
                ))}
              </div>
              <div
                className="habit-heatmap-grid"
                style={{ gridTemplateColumns: `repeat(${WEEK_COUNT}, 12px)` }}
              >
                {cells.map((dateStr) => {
                  const done = habitGrid[dateStr]
                  const future = dateStr > today.toISOString().slice(0, 10)
                  return (
                    <div
                      key={dateStr}
                      title={`${dateStr}: ${future ? '—' : done ? 'Done' : 'Missed'}`}
                      className={`habit-heatmap-cell${done ? ' done' : ''}${future ? ' future' : ''}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HabitsPage() {
  const queryClient = useQueryClient()

  // ── Add habit form state ─────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitTarget, setNewHabitTarget] = useState<'daily' | '3x_week' | 'weekly' | 'custom'>('daily')
  const [newHabitDomain, setNewHabitDomain] = useState<'sleep' | 'movement' | 'nutrition' | 'recovery' | 'mental' | 'general'>('general')

  const todayQuery = useQuery({
    queryKey: ['health-today'],
    queryFn: getHealthToday,
  })

  const heatmapQuery = useQuery({
    queryKey: ['habit-heatmap'],
    queryFn: getHabitHeatmap,
  })

  const habitMutation = useMutation({
    mutationFn: ({ item, done }: { item: HabitBoardItem; done: boolean }) => {
      const payload: HabitLogPayload = {
        habit: item.habit.id,
        date: todayQuery.data?.date ?? new Date().toISOString().slice(0, 10),
        done,
        note: item.today_log?.note ?? '',
      }
      return item.today_log ? updateHabitLog(item.today_log.id, payload) : createHabitLog(payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
        queryClient.invalidateQueries({ queryKey: ['habit-heatmap'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
      ])
    },
  })

  const createHabitMut = useMutation({
    mutationFn: () => createHabit({ name: newHabitName.trim(), target: newHabitTarget, health_domain: newHabitDomain }),
    onSuccess: async () => {
      setNewHabitName('')
      setNewHabitTarget('daily')
      setNewHabitDomain('general')
      setShowAddForm(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
        queryClient.invalidateQueries({ queryKey: ['habit-heatmap'] }),
        queryClient.invalidateQueries({ queryKey: ['health-overview'] }),
      ])
    },
  })

  const deleteHabitMut = useMutation({
    mutationFn: (id: string) => deleteHabit(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
        queryClient.invalidateQueries({ queryKey: ['habit-heatmap'] }),
        queryClient.invalidateQueries({ queryKey: ['health-overview'] }),
      ])
    },
  })

  if (todayQuery.isLoading) {
    return <section className="loading-state">Loading habits...</section>
  }

  if (todayQuery.isError || !todayQuery.data) {
    return <section className="error-state">We could not load habit data.</section>
  }

  const summary = todayQuery.data.summary

  // Domain grouping: compute per-domain completion from today's habit board
  const habitBoard = todayQuery.data.habit_board ?? []
  type HabitDomain = 'sleep' | 'movement' | 'nutrition' | 'recovery' | 'mental' | 'general'
  const DOMAIN_LABELS: Record<HabitDomain, string> = {
    sleep: 'Sleep', movement: 'Movement', nutrition: 'Nutrition',
    recovery: 'Recovery', mental: 'Mental', general: 'General',
  }
  const domainMap = new Map<HabitDomain, { done: number; total: number }>()
  for (const item of habitBoard) {
    const domain = (item.habit.health_domain ?? 'general') as HabitDomain
    if (domain === 'general') continue // skip untagged in pills
    const existing = domainMap.get(domain) ?? { done: 0, total: 0 }
    domainMap.set(domain, {
      done: existing.done + (item.today_log?.done ? 1 : 0),
      total: existing.total + 1,
    })
  }
  const domainPills = Array.from(domainMap.entries())
  const hasTaggedHabits = domainPills.length > 0

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Habits</p>
          <h2>Daily consistency tracker</h2>
          <p>Mark habits done or missed, track streaks and completion rates.</p>
        </div>
        <button className="btn-ghost-sm" onClick={() => setShowAddForm(v => !v)}>
          {showAddForm ? 'Cancel' : '+ Add habit'}
        </button>
      </div>

      {showAddForm && (
        <div className="adp-add-form" style={{ marginBottom: 16 }}>
          <input
            className="adp-add-input"
            placeholder="Habit name (e.g. Evening walk, Read 10 pages)"
            value={newHabitName}
            autoFocus
            onChange={e => setNewHabitName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newHabitName.trim() && createHabitMut.mutate()}
          />
          <div className="adp-add-row">
            <select
              className="adp-duration-select"
              value={newHabitTarget}
              onChange={e => setNewHabitTarget(e.target.value as typeof newHabitTarget)}
            >
              <option value="daily">Daily</option>
              <option value="3x_week">3x per week</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
            <select
              className="adp-duration-select"
              value={newHabitDomain}
              onChange={e => setNewHabitDomain(e.target.value as typeof newHabitDomain)}
            >
              <option value="general">General</option>
              <option value="sleep">Sleep</option>
              <option value="movement">Movement</option>
              <option value="nutrition">Nutrition</option>
              <option value="recovery">Recovery</option>
              <option value="mental">Mental</option>
            </select>
            <button
              className="btn-sm"
              disabled={!newHabitName.trim() || createHabitMut.isPending}
              onClick={() => createHabitMut.mutate()}
            >
              {createHabitMut.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
          {createHabitMut.isError && (
            <p className="error-text">Could not create habit. Please try again.</p>
          )}
        </div>
      )}

      <div className="metric-grid">
        <MetricCard
          label="Habit completion (7d)"
          value={formatPercent(summary.habit_completion_rate_7d ?? 0)}
        />
        <MetricCard
          label="Done today"
          value={`${summary.habits_completed_today}/${summary.active_habits_count}`}
          tone="success"
        />
      </div>

      {/* Domain completion pills */}
      {hasTaggedHabits ? (
        <div className="habit-domains-row">
          {domainPills.map(([domain, { done, total }]) => {
            const pct = Math.round((done / total) * 100)
            const tone = pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'
            return (
              <span
                key={domain}
                className={`habit-domain-pill habit-domain-pill--${tone}`}
                title={`${done}/${total} done today`}
              >
                {DOMAIN_LABELS[domain]}: {pct}%
              </span>
            )
          })}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
          Tip: tag your habits with a health domain (sleep, movement, nutrition…) to see domain-level progress here.
        </p>
      )}

      <Panel
        aside={`${summary.habits_completed_today}/${summary.active_habits_count} done today`}
        title="Habit board"
        description="Mark today's habits done or missed."
      >
        <HabitBoard
          items={todayQuery.data.habit_board}
          pendingHabitId={habitMutation.isPending ? (habitMutation.variables?.item.habit.id ?? null) : null}
          deletingHabitId={deleteHabitMut.isPending ? (deleteHabitMut.variables ?? null) : null}
          onToggle={(item, done) => habitMutation.mutate({ item, done })}
          onDelete={(item) => deleteHabitMut.mutate(item.habit.id)}
        />
        {habitMutation.isError ? <p className="error-text">We could not save that habit update.</p> : null}
      </Panel>

      <CollapsibleSection title="Habit heatmap" storageKey="habits-heatmap" defaultOpen={false}>
        {heatmapQuery.isLoading ? (
          <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>Loading heatmap…</p>
        ) : heatmapQuery.data ? (
          <HabitHeatmap data={heatmapQuery.data} />
        ) : (
          <p className="muted">Could not load heatmap data.</p>
        )}
      </CollapsibleSection>
    </section>
  )
}
