/**
 * SpiritualPage — dedicated prayer and spiritual tracking.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { SpiritualLogForm } from '../components/SpiritualLogForm'
import {
  createSpiritualLog,
  getHealthToday,
  updateSpiritualLog,
} from '../lib/api'
import { formatPercent } from '../lib/formatters'
import type { SpiritualLogPayload } from '../lib/types'

export function SpiritualPage() {
  const queryClient = useQueryClient()
  const todayQuery = useQuery({
    queryKey: ['health-today'],
    queryFn: getHealthToday,
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
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
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
    </section>
  )
}
