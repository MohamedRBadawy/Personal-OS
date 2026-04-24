/**
 * MoodPage — dedicated mood tracking with form, history, and metrics.
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { MoodLogForm } from '../components/MoodLogForm'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { Panel } from '../components/Panel'
import {
  createMoodLog,
  getHealthToday,
  listMoodLogs,
  updateMoodLog,
} from '../lib/api'
import { formatDate } from '../lib/formatters'
import type { MoodLog, MoodLogPayload } from '../lib/types'

// [AR] صف سجل المزاج — يتوسع لإظهار الملاحظات عند النقر
// [EN] Mood entry row — expands in-place to show notes on click
function MoodEntryRow({ log }: { log: MoodLog }) {
  const [open, setOpen] = useState(false)
  return (
    <li
      className={`mood-entry-row${open ? ' open' : ''}`}
      onClick={() => setOpen(p => !p)}
    >
      <div className="mood-entry-header">
        <strong className="mood-entry-date">{formatDate(log.date)}</strong>
        <span className="mood-entry-score">{log.mood_score} / 5</span>
        {log.notes && <span className="mood-entry-chevron">{open ? '▴' : '▾'}</span>}
      </div>
      {open && log.notes && (
        <p className="mood-entry-notes">{log.notes}</p>
      )}
    </li>
  )
}

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

      <CollapsibleSection title="Recent mood history" storageKey="mood-history" defaultOpen={false}>
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
          <ul className="mood-history-list">
            {moodLogsQuery.data.results.slice(0, 10).map((log) => (
              <MoodEntryRow key={log.id} log={log} />
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </section>
  )
}
