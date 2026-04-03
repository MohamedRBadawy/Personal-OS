import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HabitBoard } from '../components/HabitBoard'
import { HealthLogForm } from '../components/HealthLogForm'
import { MetricCard } from '../components/MetricCard'
import { MoodLogForm } from '../components/MoodLogForm'
import { Panel } from '../components/Panel'
import { SparkBars } from '../components/SparkBars'
import { SpiritualLogForm } from '../components/SpiritualLogForm'
import {
  createHabitLog,
  createHealthLog,
  createMoodLog,
  createSpiritualLog,
  getHealthToday,
  listHealthLogs,
  listMoodLogs,
  updateHabitLog,
  updateMoodLog,
  updateSpiritualLog,
} from '../lib/api'
import { formatDate, formatPercent } from '../lib/formatters'
import type {
  HabitBoardItem,
  HabitLogPayload,
  HealthLogPayload,
  MoodLogPayload,
  SpiritualLogPayload,
} from '../lib/types'

export function HealthPage() {
  const queryClient = useQueryClient()
  const todayQuery = useQuery({
    queryKey: ['health-today'],
    queryFn: getHealthToday,
  })
  const logsQuery = useQuery({
    queryKey: ['health-logs'],
    queryFn: listHealthLogs,
  })
  const moodLogsQuery = useQuery({
    queryKey: ['health-moods'],
    queryFn: listMoodLogs,
  })

  const createLogMutation = useMutation({
    mutationFn: (payload: HealthLogPayload) => createHealthLog(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
        queryClient.invalidateQueries({ queryKey: ['health-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })

  const moodMutation = useMutation({
    mutationFn: (payload: MoodLogPayload) => {
      const existing = todayQuery.data?.mood_log
      return existing ? updateMoodLog(existing.id, payload) : createMoodLog(payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
        queryClient.invalidateQueries({ queryKey: ['health-moods'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })

  const spiritualMutation = useMutation({
    mutationFn: (payload: SpiritualLogPayload) => {
      const existing = todayQuery.data?.spiritual_log
      return existing ? updateSpiritualLog(existing.id, payload) : createSpiritualLog(payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
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

  if (todayQuery.isLoading || logsQuery.isLoading || moodLogsQuery.isLoading) {
    return <section className="loading-state">Loading health view...</section>
  }

  if (
    todayQuery.isError
    || logsQuery.isError
    || moodLogsQuery.isError
    || !todayQuery.data
    || !logsQuery.data
    || !moodLogsQuery.data
  ) {
    return <section className="error-state">We could not load health data.</section>
  }

  const summary = todayQuery.data.summary
  const sleepSeries = logsQuery.data.results.slice(0, 7).reverse().map((log) => Number(log.sleep_hours))
  const energySeries = logsQuery.data.results.slice(0, 7).reverse().map((log) => Number(log.energy_level))
  const moodSeries = moodLogsQuery.data.results.slice(0, 7).reverse().map((log) => log.mood_score)

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Health</p>
          <h2>Energy, sleep, and body trends</h2>
          <p>Keep body, mood, habits, and spiritual consistency in one honest workspace.</p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="Avg sleep (7d)" value={`${summary.avg_sleep_7d ?? 0} h`} />
        <MetricCard label="Avg energy (7d)" value={`${summary.avg_energy_7d ?? 0} / 5`} />
        <MetricCard label="Avg mood (7d)" value={`${summary.avg_mood_7d ?? 0} / 5`} />
        <MetricCard label="Prayer completion" value={formatPercent(summary.prayer_completion_rate_7d ?? 0)} />
        <MetricCard label="Habit completion" value={formatPercent(summary.habit_completion_rate_7d ?? 0)} />
        <MetricCard label="Exercise streak" value={`${summary.exercise_streak} days`} tone="success" />
      </div>

      <div className="two-column">
        <Panel title="Trend sparks" description="Simple recent signals to keep the daily loop grounded.">
          <div className="stack">
            <div>
              <strong>Sleep hours</strong>
              <SparkBars suffix="h" values={sleepSeries.length > 0 ? sleepSeries : [0]} />
            </div>
            <div>
              <strong>Energy level</strong>
              <SparkBars values={energySeries.length > 0 ? energySeries : [0]} />
            </div>
            <div>
              <strong>Mood score</strong>
              <SparkBars values={moodSeries.length > 0 ? moodSeries : [0]} />
            </div>
          </div>
        </Panel>

        <Panel
          title={todayQuery.data.health_log ? 'Today is already logged' : "Quick add today's body log"}
          description={
            todayQuery.data.health_log
              ? 'The body log is already captured for today.'
              : 'Capture sleep, energy, and exercise so the rest of the system has fresh capacity data.'
          }
        >
          {todayQuery.data.health_log ? (
            <div className="summary-strip">
              <div>
                <strong>{todayQuery.data.health_log.sleep_hours} h</strong>
                <p className="muted">Sleep</p>
              </div>
              <div>
                <strong>{todayQuery.data.health_log.energy_level} / 5</strong>
                <p className="muted">Energy</p>
              </div>
              <div>
                <strong>{todayQuery.data.health_log.exercise_done ? 'Yes' : 'No'}</strong>
                <p className="muted">Exercise</p>
              </div>
            </div>
          ) : (
            <HealthLogForm
              isSubmitting={createLogMutation.isPending}
              onSubmit={(payload) => createLogMutation.mutate(payload)}
            />
          )}
          {createLogMutation.isError ? <p className="error-text">We could not save the body log.</p> : null}
        </Panel>
      </div>

      <div className="two-column">
        <Panel
          aside={
            <span className={`status-pill ${summary.low_mood_streak >= 1 ? 'warning' : 'success'}`}>
              {summary.low_mood_streak >= 1 ? `${summary.low_mood_streak}-day low-mood streak` : 'Mood steady'}
            </span>
          }
          title="Mood"
          description="Track today quickly, then scan the last few entries for pattern instead of guesswork."
        >
          <div className="summary-strip">
            <div>
              <strong>{summary.avg_mood_7d ?? 0} / 5</strong>
              <p className="muted">7d average</p>
            </div>
            <div>
              <strong>{summary.avg_mood_30d ?? 0} / 5</strong>
              <p className="muted">30d average</p>
            </div>
          </div>

          <MoodLogForm
            key={todayQuery.data.mood_log?.id ?? `mood-${todayQuery.data.date}`}
            initialValue={todayQuery.data.mood_log}
            isSubmitting={moodMutation.isPending}
            today={todayQuery.data.date}
            onSubmit={(payload) => moodMutation.mutate(payload)}
          />
          {moodMutation.isError ? <p className="error-text">We could not save today's mood log.</p> : null}

          <div className="stack">
            <strong>Recent mood history</strong>
            {moodLogsQuery.data.results.length === 0 ? (
              <p className="muted">No mood history yet.</p>
            ) : (
              <ul className="plain-list">
                {moodLogsQuery.data.results.slice(0, 5).map((log) => (
                  <li key={log.id} className="context-item">
                    <strong>{formatDate(log.date)}</strong>
                    <p className="muted">
                      {log.mood_score} / 5
                      {log.notes ? ` - ${log.notes}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel
          aside={
            <span className={`status-pill ${summary.prayer_gap_streak >= 2 ? 'warning' : 'success'}`}>
              {summary.prayer_gap_streak >= 2 ? `${summary.prayer_gap_streak} days under full prayers` : 'Spiritual anchor active'}
            </span>
          }
          title="Spiritual"
          description="Log the five prayers, Quran pages, and dhikr without opening a separate flow."
        >
          <div className="summary-strip">
            <div>
              <strong>{formatPercent(summary.prayer_completion_rate_7d ?? 0)}</strong>
              <p className="muted">Prayer completion (7d)</p>
            </div>
            <div>
              <strong>{formatPercent(summary.spiritual_consistency_7d ?? 0)}</strong>
              <p className="muted">Consistency (7d)</p>
            </div>
            <div>
              <strong>{summary.full_prayer_streak} days</strong>
              <p className="muted">Full prayer streak</p>
            </div>
          </div>

          <SpiritualLogForm
            key={todayQuery.data.spiritual_log?.id ?? `spiritual-${todayQuery.data.date}`}
            initialValue={todayQuery.data.spiritual_log}
            isSubmitting={spiritualMutation.isPending}
            today={todayQuery.data.date}
            onSubmit={(payload) => spiritualMutation.mutate(payload)}
          />
          {spiritualMutation.isError ? <p className="error-text">We could not save today's spiritual log.</p> : null}
        </Panel>
      </div>

      <Panel
        aside={`${summary.habits_completed_today}/${summary.active_habits_count} done today`}
        title="Habit board"
        description="Mark today's habits done or missed without leaving the page."
      >
        <HabitBoard
          items={todayQuery.data.habit_board}
          pendingHabitId={habitMutation.isPending ? (habitMutation.variables?.item.habit.id ?? null) : null}
          onToggle={(item, done) => habitMutation.mutate({ item, done })}
        />
        {habitMutation.isError ? <p className="error-text">We could not save that habit update.</p> : null}
      </Panel>

      <Panel title="Recent health logs" description="Latest seven body logs for quick review.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sleep</th>
                <th>Energy</th>
                <th>Exercise</th>
              </tr>
            </thead>
            <tbody>
              {logsQuery.data.results.slice(0, 7).map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.date)}</td>
                  <td>{log.sleep_hours} h</td>
                  <td>{log.energy_level} / 5</td>
                  <td>{log.exercise_done ? log.exercise_type || 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  )
}
