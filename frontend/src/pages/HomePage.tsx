import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckInForm } from '../components/CheckInForm'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { StatusPill } from '../components/StatusPill'
import { getDashboard, submitCheckIn } from '../lib/api'
import { formatCurrency, formatDate, formatPercent, formatTime, titleCase } from '../lib/formatters'

function greetingForNow() {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

export function HomePage() {
  const queryClient = useQueryClient()
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const checkInMutation = useMutation({
    mutationFn: submitCheckIn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['health-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['health-today'] }),
      ])
    },
  })

  if (dashboardQuery.isLoading) {
    return <section className="loading-state">Loading dashboard...</section>
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <section className="error-state">We could not load the dashboard right now.</section>
  }

  const dashboard = dashboardQuery.data
  const briefing = checkInMutation.data?.briefing ?? dashboard.briefing
  const displayName = dashboard.profile?.full_name?.split(' ')[0] ?? 'Mohamed'

  return (
    <section className="page">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Today</p>
          <h2>
            {greetingForNow()}, {displayName}.
          </h2>
          <p className="hero-summary">
            {briefing.briefing_text}
          </p>
          <p className="muted">
            Updated for {formatDate(dashboard.date)}. {briefing.encouragement}
          </p>
        </div>
        <div className="hero-status">
          <StatusPill label={dashboard.overwhelm.reduced_mode ? 'Reduced mode' : 'Full mode'} />
          <div className="hero-kyrgyzstan">
            <p className="eyebrow">Kyrgyzstan trigger</p>
            <strong>{formatPercent(dashboard.finance_summary.kyrgyzstan_progress_pct)}</strong>
            <p className="muted">
              {formatCurrency(dashboard.finance_summary.independent_income_eur)} independent income of{' '}
              {formatCurrency(dashboard.finance_summary.target_eur)}
            </p>
          </div>
        </div>
      </div>

      <div className="glance-strip">
        <div className="glance-card">
          <strong>{dashboard.today_snapshot.sleep_hours_today ?? '-'}</strong>
          <p className="muted">Sleep hours</p>
        </div>
        <div className="glance-card">
          <strong>{dashboard.today_snapshot.mood_score_today ?? '-'}/5</strong>
          <p className="muted">Mood</p>
        </div>
        <div className="glance-card">
          <strong>
            {dashboard.today_snapshot.completed_habits_today}/{dashboard.today_snapshot.total_habits}
          </strong>
          <p className="muted">Habits</p>
        </div>
        <div className="glance-card">
          <strong>{dashboard.today_snapshot.prayers_count_today}/5</strong>
          <p className="muted">Prayers</p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Active projects"
          value={`${dashboard.today_snapshot.active_project_count}`}
          hint={`${dashboard.today_snapshot.available_task_count} available tasks`}
        />
        <MetricCard
          label="Finance snapshot"
          value={formatCurrency(dashboard.finance_summary.net_eur)}
          hint={`${dashboard.today_snapshot.active_leads_count} active leads`}
          tone="success"
        />
        <MetricCard
          label="Energy signal"
          value={`${dashboard.today_snapshot.energy_level_today ?? '-'} / 5`}
          hint={dashboard.health_summary.low_energy_today ? 'Low energy is active today' : 'Energy signal is steady'}
          tone={dashboard.health_summary.low_energy_today ? 'warning' : 'default'}
        />
        <MetricCard
          label="Follow-up pressure"
          value={`${dashboard.schedule_snapshot.due_follow_ups_count}`}
          hint={`${dashboard.today_snapshot.marketing_actions_this_month} marketing actions this month`}
        />
      </div>

      <div className="dashboard-grid">
        <div className="stack">
          <Panel title="Today at a glance" description="Cross-domain signals that should shape the next move.">
            <div className="summary-strip">
              <div>
                <strong>{dashboard.today_snapshot.available_task_count}</strong>
                <p className="muted">Tasks ready now</p>
              </div>
              <div>
                <strong>{dashboard.today_snapshot.blocked_goal_count}</strong>
                <p className="muted">Blocked goals</p>
              </div>
              <div>
                <strong>{dashboard.schedule_snapshot.pending_count}</strong>
                <p className="muted">Schedule slots pending</p>
              </div>
              <div>
                <strong>{dashboard.today_snapshot.active_leads_count}</strong>
                <p className="muted">Active leads</p>
              </div>
            </div>
            <ul className="signal-list">
              {dashboard.key_signals.map((signal) => (
                <li key={signal} className="signal-item">
                  {signal}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Top priorities" description="Short on purpose so the day stays directive.">
            {dashboard.top_priorities.length === 0 ? (
              <EmptyState
                title="No active priorities"
                body="Seed the data or activate a node to let the dashboard surface the next move."
              />
            ) : (
              <ul className="priority-list">
                {dashboard.top_priorities.map((priority) => (
                  <li key={priority.id} className="priority-item">
                    <strong>{priority.title}</strong>
                    <div className="priority-meta">
                      <StatusPill label={priority.status} />
                      <span>{titleCase(priority.type)}</span>
                      <span>{priority.progress_pct}% progress</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Schedule preview" description="Embedded from the daily operating loop.">
            {dashboard.schedule_snapshot.blocks.length === 0 ? (
              <EmptyState
                title="No schedule blocks"
                body="Activate a schedule template to turn this into a real day plan."
              />
            ) : (
              <div className="record-list">
                {dashboard.schedule_snapshot.blocks.map((block) => (
                  <article key={block.id} className="record-card">
                    <div className="record-card-header">
                      <div>
                        <h3>{block.label}</h3>
                        <div className="list-inline">
                          <span className="record-meta-chip">{formatTime(block.time)}</span>
                          <span className="record-meta-chip">{titleCase(block.type)}</span>
                          <StatusPill label={block.status} />
                        </div>
                      </div>
                    </div>
                    <p className="muted">
                      {block.suggestion_label
                        ? `${titleCase(block.suggestion_kind ?? 'suggestion')}: ${block.suggestion_label}`
                        : 'No specific suggestion is attached to this block yet.'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Weekly loop" description="Keep the review rhythm and suggestion pressure visible.">
            <div className="summary-strip">
              <div>
                <strong>{dashboard.review_status.review_exists ? 'Saved' : 'Ready'}</strong>
                <p className="muted">Current week review</p>
              </div>
              <div>
                <strong>{dashboard.suggestions_summary.pending_count}</strong>
                <p className="muted">Pending suggestions</p>
              </div>
              <div>
                <strong>{formatDate(dashboard.review_status.week_end)}</strong>
                <p className="muted">Week closes</p>
              </div>
            </div>
            <p className="muted">
              {dashboard.review_status.review_exists
                ? 'This week already has a saved review. Use Analytics to update notes or resolve any pending suggestions.'
                : 'This week is ready to close. Use Analytics to generate the weekly review and resolve the current nudges.'}
            </p>
            <Link className="button-link" to="/analytics">
              Open Analytics Review
            </Link>
          </Panel>

          <Panel title="Finance and review" description="Keep the relocation trigger and review context visible.">
            <div className="summary-strip">
              <div>
                <strong>{formatCurrency(dashboard.finance_summary.independent_income_eur)}</strong>
                <p className="muted">Independent income</p>
              </div>
              <div>
                <strong>{formatCurrency(dashboard.finance_summary.net_eur)}</strong>
                <p className="muted">Net this month</p>
              </div>
              <div>
                <strong>{dashboard.finance_summary.months_to_target ?? '-'}</strong>
                <p className="muted">Months to target</p>
              </div>
            </div>
            <p>{dashboard.weekly_review_preview.snippet}</p>
          </Panel>

          <Panel
            title="Morning check-in"
            description="Log health, money deltas, inbox capture, and blockers in one pass."
            aside={dashboard.latest_checkin ? `Last check-in: ${formatDate(dashboard.latest_checkin.date)}` : 'No check-in yet'}
          >
            <CheckInForm
              isSubmitting={checkInMutation.isPending}
              onSubmit={(payload) => checkInMutation.mutate(payload)}
            />
            {checkInMutation.isError ? <p className="error-text">We could not submit the morning check-in.</p> : null}
          </Panel>
        </div>
      </div>
    </section>
  )
}
