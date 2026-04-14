/**
 * HabitsPage — dedicated habit tracking with board, metrics, and heatmap.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { HabitBoard } from '../components/HabitBoard'
import { Panel } from '../components/Panel'
import {
  createHabitLog,
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

  if (todayQuery.isLoading) {
    return <section className="loading-state">Loading habits...</section>
  }

  if (todayQuery.isError || !todayQuery.data) {
    return <section className="error-state">We could not load habit data.</section>
  }

  const summary = todayQuery.data.summary

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Habits</p>
          <h2>Daily consistency tracker</h2>
          <p>Mark habits done or missed, track streaks and completion rates.</p>
        </div>
      </div>

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

      <Panel
        aside={`${summary.habits_completed_today}/${summary.active_habits_count} done today`}
        title="Habit board"
        description="Mark today's habits done or missed."
      >
        <HabitBoard
          items={todayQuery.data.habit_board}
          pendingHabitId={habitMutation.isPending ? (habitMutation.variables?.item.habit.id ?? null) : null}
          onToggle={(item, done) => habitMutation.mutate({ item, done })}
        />
        {habitMutation.isError ? <p className="error-text">We could not save that habit update.</p> : null}
      </Panel>

      <Panel title="Habit heatmap" description="Last 52 weeks of daily completion per habit.">
        {heatmapQuery.isLoading ? (
          <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>Loading heatmap…</p>
        ) : heatmapQuery.data ? (
          <HabitHeatmap data={heatmapQuery.data} />
        ) : (
          <p className="muted">Could not load heatmap data.</p>
        )}
      </Panel>
    </section>
  )
}
