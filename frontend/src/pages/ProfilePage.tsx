import { useQuery } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { getAnalyticsOverview, getRoutineMetrics, getRoutineStreak } from '../lib/api'
import { formatPercent } from '../lib/formatters'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'success' | 'warn' | 'muted'
}) {
  const valueColor =
    tone === 'success' ? 'var(--success, #16a34a)' :
    tone === 'warn' ? '#f59e0b' :
    tone === 'muted' ? 'var(--text-muted)' :
    'var(--text)'
  return (
    <div className="profile-stat-card">
      <p className="profile-stat-label">{label}</p>
      <p className="profile-stat-value" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="profile-stat-sub">{sub}</p>}
    </div>
  )
}

// ── Domain section ────────────────────────────────────────────────────────────

function DomainRow({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="profile-domain-row">
      <div className="profile-domain-header">
        <span className="profile-domain-emoji">{emoji}</span>
        <h3 className="profile-domain-title">{title}</h3>
      </div>
      <div className="profile-stat-grid">
        {children}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const overviewQuery = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: getAnalyticsOverview,
  })
  const streakQuery = useQuery({
    queryKey: ['routine-streak'],
    queryFn: getRoutineStreak,
  })
  const metricsQuery = useQuery({
    queryKey: ['routine-metrics'],
    queryFn: () => getRoutineMetrics(90),
  })

  if (overviewQuery.isLoading || streakQuery.isLoading || metricsQuery.isLoading) {
    return <PageSkeleton />
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return <section className="error-state">Could not load life stats.</section>
  }

  const ov = overviewQuery.data
  const streak = streakQuery.data
  const metrics = metricsQuery.data
  const c = ov.counts
  const h = ov.health
  const f = ov.finance
  const p = ov.pipeline

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Life stats</p>
          <h2>Your OS at a glance</h2>
          <p className="muted">Read-only snapshot across all domains. Updated live.</p>
        </div>
      </div>

      <div className="stack">
        {/* Goals & Work */}
        <DomainRow emoji="🎯" title="Goals & Work">
          <StatCard label="Ideas captured" value={c.ideas} />
          <StatCard label="Achievements" value={c.achievements} tone="success" />
          <StatCard label="Decisions logged" value={c.decisions} />
          <StatCard label="Marketing actions" value={c.marketing_actions} />
        </DomainRow>

        {/* Health */}
        <DomainRow emoji="💪" title="Health (7-day)">
          <StatCard
            label="Avg sleep"
            value={h.avg_sleep_7d != null ? `${h.avg_sleep_7d.toFixed(1)}h` : '—'}
            sub="7-day average"
            tone={h.avg_sleep_7d != null && h.avg_sleep_7d < 6 ? 'warn' : undefined}
          />
          <StatCard
            label="Avg mood"
            value={h.avg_mood_7d != null ? `${h.avg_mood_7d.toFixed(1)}/5` : '—'}
            sub="7-day average"
            tone={h.low_mood_today ? 'warn' : undefined}
          />
          <StatCard
            label="Habit completion"
            value={h.habit_completion_rate_7d != null ? formatPercent(h.habit_completion_rate_7d) : '—'}
            sub="7-day average"
          />
          <StatCard
            label="Prayer completion"
            value={h.prayer_completion_rate_7d != null ? formatPercent(h.prayer_completion_rate_7d) : '—'}
            sub="7-day average"
            tone={h.prayer_completion_rate_7d != null && h.prayer_completion_rate_7d >= 90 ? 'success' : undefined}
          />
        </DomainRow>

        {/* Finance */}
        <DomainRow emoji="💰" title="Finance">
          <StatCard
            label="Independent income"
            value={`€${Math.round(f.independent_income_eur)}/mo`}
            sub="freelance + passive"
          />
          <StatCard
            label="Net this month"
            value={`€${Math.round(f.net_eur)}`}
            tone={f.net_eur >= 0 ? 'success' : 'warn'}
          />
          <StatCard
            label="Kyrgyzstan goal"
            value={formatPercent(f.kyrgyzstan_progress_pct)}
            sub="income trigger"
            tone={f.kyrgyzstan_progress_pct >= 100 ? 'success' : undefined}
          />
        </DomainRow>

        {/* Routine */}
        <DomainRow emoji="⏰" title="Routine">
          <StatCard
            label="Current streak"
            value={streak?.streak != null ? `${streak.streak} days` : '—'}
            tone={streak?.streak != null && streak.streak >= 7 ? 'success' : undefined}
          />
          {metrics && (
            <>
              <StatCard
                label="Prayer rate (90d)"
                value={formatPercent(metrics.prayer_rate)}
                tone={metrics.prayer_rate >= 80 ? 'success' : metrics.prayer_rate < 50 ? 'warn' : undefined}
              />
              <StatCard
                label="Exercise rate (90d)"
                value={formatPercent(metrics.exercise_rate)}
                tone={metrics.exercise_rate >= 70 ? 'success' : metrics.exercise_rate < 40 ? 'warn' : undefined}
              />
              <StatCard
                label="Prayer streak"
                value={`${metrics.prayer_streak} days`}
                tone={metrics.prayer_streak >= 7 ? 'success' : undefined}
              />
            </>
          )}
        </DomainRow>

        {/* Pipeline */}
        <DomainRow emoji="🚀" title="Pipeline">
          <StatCard label="Won / closed" value={p.won_count} tone={p.won_count > 0 ? 'success' : 'muted'} />
          <StatCard label="Applied" value={p.applied_count} />
          <StatCard label="In review" value={p.new_or_reviewing_count} />
          <StatCard
            label="Follow-ups due"
            value={p.due_follow_ups_count}
            tone={p.due_follow_ups_count > 0 ? 'warn' : 'muted'}
          />
        </DomainRow>
      </div>
    </section>
  )
}
