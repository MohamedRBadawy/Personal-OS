/**
 * HabitsPage — dedicated habit tracking with board and metrics.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { HabitBoard } from '../components/HabitBoard'
import { Panel } from '../components/Panel'
import {
  createHabitLog,
  getHealthToday,
  updateHabitLog,
} from '../lib/api'
import { formatPercent } from '../lib/formatters'
import type { HabitBoardItem, HabitLogPayload } from '../lib/types'

export function HabitsPage() {
  const queryClient = useQueryClient()
  const todayQuery = useQuery({
    queryKey: ['health-today'],
    queryFn: getHealthToday,
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
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
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
    </section>
  )
}
