/**
 * MoodPage — dedicated mood tracking with form, history, and metrics.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { MoodLogForm } from '../components/MoodLogForm'
import { Panel } from '../components/Panel'
import {
  createMoodLog,
  getHealthToday,
  listMoodLogs,
  updateMoodLog,
} from '../lib/api'
import { formatDate } from '../lib/formatters'
import type { MoodLogPayload } from '../lib/types'

export function MoodPage() {
  const queryClient = useQueryClient()
  const todayQuery = useQuery({
    queryKey: ['health-today'],
    queryFn: getHealthToday,
  })
  const moodLogsQuery = useQuery({
    queryKey: ['health-moods'],
    queryFn: listMoodLogs,
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
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
        queryClient.invalidateQueries({ queryKey: ['health-overview'] }),
      ])
    },
  })

  if (todayQuery.isLoading || moodLogsQuery.isLoading) {
    return <section className="loading-state">Loading mood data...</section>
  }

  if (todayQuery.isError || moodLogsQuery.isError || !todayQuery.data || !moodLogsQuery.data) {
    return <section className="error-state">We could not load mood data.</section>
  }

  const summary = todayQuery.data.summary

  // Mood trend: compare 7-day average to 30-day baseline
  const mood7d = summary.avg_mood_7d ?? 0
  const mood30d = summary.avg_mood_30d ?? 0
  const hasMoodTrend = mood7d > 0 && mood30d > 0
  const moodTrendDir = hasMoodTrend
    ? mood7d > mood30d + 0.2
      ? 'better'
      : mood7d < mood30d - 0.3
      ? 'lower'
      : 'stable'
    : null

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Mood</p>
          <h2>Mood and mental state</h2>
          <p>Track how you feel each day, spot patterns over time.</p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="Avg mood (7d)" value={`${summary.avg_mood_7d ?? 0} / 5`} />
        <MetricCard label="Avg mood (30d)" value={`${summary.avg_mood_30d ?? 0} / 5`} />
        <MetricCard
          label="Low mood streak"
          value={`${summary.low_mood_streak} days`}
          tone={summary.low_mood_streak >= 1 ? 'warning' : 'default'}
        />
      </div>

      <div className="two-column">
        <Panel
          title="Log today's mood"
          description="Quick capture so patterns become visible."
          aside={
            <span className={`status-pill ${summary.low_mood_streak >= 1 ? 'warning' : 'success'}`}>
              {summary.low_mood_streak >= 1 ? `${summary.low_mood_streak}-day low-mood streak` : 'Mood steady'}
            </span>
          }
        >
          <MoodLogForm
            key={todayQuery.data.mood_log?.id ?? `mood-${todayQuery.data.date}`}
            initialValue={todayQuery.data.mood_log}
            isSubmitting={moodMutation.isPending}
            today={todayQuery.data.date}
            onSubmit={(payload) => moodMutation.mutate(payload)}
          />
          {moodMutation.isError ? <p className="error-text">We could not save today's mood log.</p> : null}
        </Panel>

        <Panel title="Recent mood history" description="Last entries for quick review.">
          {hasMoodTrend && (
            <div className="mood-trend-note">
              <span className={`mood-trend-indicator mood-trend-indicator--${moodTrendDir}`}>
                {moodTrendDir === 'better' ? '↑' : moodTrendDir === 'lower' ? '↓' : '→'}
              </span>
              <p className="mood-trend-text">
                {moodTrendDir === 'better'
                  ? `This week (${mood7d}/5) is above your 30-day average (${mood30d}/5) — trending better.`
                  : moodTrendDir === 'lower'
                  ? `This week (${mood7d}/5) is below your 30-day average (${mood30d}/5) — notice what's different.`
                  : `This week (${mood7d}/5) is in line with your 30-day average (${mood30d}/5) — mood is stable.`}
              </p>
            </div>
          )}
          {moodLogsQuery.data.results.length === 0 ? (
            <p className="muted">No mood history yet.</p>
          ) : (
            <ul className="plain-list">
              {moodLogsQuery.data.results.slice(0, 10).map((log) => (
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
        </Panel>
      </div>
    </section>
  )
}
