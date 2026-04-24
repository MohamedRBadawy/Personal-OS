/**
 * SpiritualPage — dedicated prayer and spiritual tracking with 30-day heatmap.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { Panel } from '../components/Panel'
import { SpiritualLogForm } from '../components/SpiritualLogForm'
import {
  createSpiritualLog,
  getHealthToday,
  getSpiritualHeatmap,
  updateSpiritualLog,
} from '../lib/api'
import { formatPercent } from '../lib/formatters'
import type { SpiritualLogPayload } from '../lib/types'
import type { SpiritualHeatmapPayload } from '../lib/api'

// ── Prayer Heatmap ────────────────────────────────────────────────────────────

const PRAYER_LABELS: { key: string; label: string }[] = [
  { key: 'fajr',    label: 'Fajr' },
  { key: 'dhuhr',   label: 'Dhuhr' },
  { key: 'asr',     label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha',    label: 'Isha' },
]

function PrayerHeatmap({ data }: { data: SpiritualHeatmapPayload }) {
  const { dates, grid, stats } = data
  // Show month label at the start of each new month
  const monthLabels: (string | null)[] = dates.map((d, i) => {
    if (i === 0) return new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    const prev = dates[i - 1]
    if (d.slice(0, 7) !== prev.slice(0, 7)) {
      return new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    }
    return null
  })

  return (
    <div className="prayer-heatmap">
      {/* Column date labels (sparse) */}
      <div className="prayer-heatmap-header">
        <div className="prayer-heatmap-row-label" />
        {dates.map((d, i) => (
          <div key={d} className="prayer-heatmap-col-label" title={d}>
            {monthLabels[i] ? <span>{monthLabels[i]}</span> : null}
          </div>
        ))}
      </div>

      {/* Prayer rows */}
      {PRAYER_LABELS.map(({ key, label }) => {
        const count = stats.prayer_counts[key] ?? 0
        return (
          <div key={key} className="prayer-heatmap-row">
            <div className="prayer-heatmap-row-label" title={`${count}/${data.stats.days_tracked} days`}>
              {label}
            </div>
            {dates.map(d => {
              const day = grid[d]
              const done = day ? Boolean((day as Record<string, boolean>)[key]) : false
              return (
                <div
                  key={d}
                  title={`${label} on ${d}: ${done ? 'Done ✓' : 'Missed'}`}
                  className={`prayer-heatmap-cell${done ? ' done' : ''}`}
                />
              )
            })}
          </div>
        )
      })}

      {/* Stats */}
      <div className="prayer-heatmap-stats">
        <span>All 5 prayers: <strong>{stats.full_prayer_days}/{data.dates.length} days</strong></span>
        {PRAYER_LABELS.map(({ key, label }) => (
          <span key={key}>{label}: <strong>{stats.prayer_counts[key] ?? 0}</strong></span>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SpiritualPage() {
  const queryClient = useQueryClient()
  const todayQuery = useQuery({
    queryKey: ['health-today'],
    queryFn: getHealthToday,
  })

  const heatmapQuery = useQuery({
    queryKey: ['spiritual-heatmap'],
    queryFn: getSpiritualHeatmap,
  })

  const spiritualMutation = useMutation({
    mutationFn: (payload: SpiritualLogPayload) => {
      const existing = todayQuery.data?.spiritual_log
      return existing ? updateSpiritualLog(existing.id, payload) : createSpiritualLog(payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
        queryClient.invalidateQueries({ queryKey: ['spiritual-heatmap'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
        queryClient.invalidateQueries({ queryKey: ['health-overview'] }),
      ])
    },
  })

  if (todayQuery.isLoading) {
    return <section className="loading-state">Loading spiritual data...</section>
  }

  if (todayQuery.isError || !todayQuery.data) {
    return <section className="error-state">We could not load spiritual data.</section>
  }

  const summary = todayQuery.data.summary

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Spiritual</p>
          <h2>Prayer and spiritual consistency</h2>
          <p>Track the five prayers, Quran, and dhikr each day.</p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Prayer completion (7d)"
          value={formatPercent(summary.prayer_completion_rate_7d ?? 0)}
        />
        <MetricCard
          label="Spiritual consistency (7d)"
          value={formatPercent(summary.spiritual_consistency_7d ?? 0)}
        />
        <MetricCard
          label="Full prayer streak"
          value={`${summary.full_prayer_streak} days`}
          tone="success"
        />
        <MetricCard
          label="Prayer gap streak"
          value={`${summary.prayer_gap_streak} days`}
          tone={summary.prayer_gap_streak >= 2 ? 'warning' : 'default'}
        />
      </div>

      <Panel
        title="Today's spiritual log"
        description="Log the five prayers, Quran pages, and dhikr."
        aside={
          <span className={`status-pill ${summary.prayer_gap_streak >= 2 ? 'warning' : 'success'}`}>
            {summary.prayer_gap_streak >= 2 ? `${summary.prayer_gap_streak} days under full prayers` : 'Spiritual anchor active'}
          </span>
        }
      >
        <SpiritualLogForm
          key={todayQuery.data.spiritual_log?.id ?? `spiritual-${todayQuery.data.date}`}
          initialValue={todayQuery.data.spiritual_log}
          isSubmitting={spiritualMutation.isPending}
          today={todayQuery.data.date}
          onSubmit={(payload) => spiritualMutation.mutate(payload)}
        />
        {spiritualMutation.isError ? <p className="error-text">We could not save today's spiritual log.</p> : null}
      </Panel>

      <CollapsibleSection title="30-day prayer grid" storageKey="spiritual-prayer-grid" defaultOpen={false}>
        {heatmapQuery.isLoading ? (
          <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>Loading prayer grid…</p>
        ) : heatmapQuery.data ? (
          <PrayerHeatmap data={heatmapQuery.data} />
        ) : (
          <p className="muted">Could not load prayer data.</p>
        )}
      </CollapsibleSection>
    </section>
  )
}
