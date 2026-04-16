import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HealthLogForm } from '../components/HealthLogForm'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { SparkBars } from '../components/SparkBars'
import {
  createHealthLog,
  getHealthToday,
  listHealthLogs,
  listMoodLogs,
} from '../lib/api'
import { formatDate, formatPercent } from '../lib/formatters'
import type { HealthLogPayload } from '../lib/types'

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
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
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
          <p>Body metrics and trends. Mood, habits, and spiritual tracking have their own pages.</p>
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
        <Panel title="Related pages" description="Mood, habits, and spiritual tracking are now full pages.">
          <div className="stack">
            <Link className="button-link" to="/health?tab=mood">Mood and mental state</Link>
            <Link className="button-link" to="/health?tab=habits">Habit board</Link>
            <Link className="button-link" to="/health?tab=spiritual">Prayer and spiritual</Link>
          </div>
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
      </div>
    </section>
  )
}
