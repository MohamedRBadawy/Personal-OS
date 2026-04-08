import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { BarChart } from '../components/charts/BarChart'
import { EmptyState } from '../components/EmptyState'
import { PageSkeleton } from '../components/PageSkeleton'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import { getTimelineOverview } from '../lib/api'
import { formatDate } from '../lib/formatters'
import { AnalyticsPage } from './AnalyticsPage'
import { AchievementsPage } from './SimpleWorkspacePages'
import { TimelinePage as TimelineWeekPage } from './TimelinePage'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'review', label: 'Review' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'retrospectives', label: 'Retrospectives' },
] as const

export function AchievementsTimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabs.some((tab) => tab.id === searchParams.get('tab'))
    ? (searchParams.get('tab') as (typeof tabs)[number]['id'])
    : 'overview'

  const overviewQuery = useQuery({
    queryKey: ['timeline-overview'],
    queryFn: getTimelineOverview,
  })

  if (overviewQuery.isLoading) {
    return <PageSkeleton />
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return <section className="error-state">We could not load the timeline workspace.</section>
  }

  const overview = overviewQuery.data

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Achievements & Timeline</p>
          <h2>See history, weekly review, patterns, wins, and retrospectives in one timeline view.</h2>
          <p>The analytics and timeline story is now grouped around progress clarity instead of separate top-level tools.</p>
        </div>
        <WorkspaceTabs
          activeTab={activeTab}
          tabs={tabs as unknown as Array<{ id: string; label: string }>}
          onChange={(tab) => setSearchParams(tab === 'overview' ? {} : { tab })}
        />
      </div>

      {activeTab === 'overview' ? (
        <div className="stack">
          <div className="metric-grid">
            <MetricCard label="Days in strip" value={`${overview.timeline.days.length}`} />
            <MetricCard label="Achievements" value={`${overview.achievements.length}`} tone="success" />
            <MetricCard label="Retrospectives" value={`${overview.retrospectives.length}`} />
            <MetricCard label="Archived goals" value={`${overview.archived_goals.length}`} />
          </div>

          {overview.timeline.days.length > 0 ? (
            <BarChart
              title="Day scores this week (0–100)"
              maxValue={100}
              color="var(--accent)"
              data={overview.timeline.days.map((day) => ({
                label: new Date(`${day.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
                value: day.score,
                color: day.score >= 70 ? 'var(--success)' : day.score >= 40 ? 'var(--warning)' : day.score > 0 ? '#c0392b' : 'rgba(17,50,62,0.15)',
              }))}
            />
          ) : null}

          <div className="two-column">
            <Panel
              title="Weekly review status"
              description="Review stays connected to timeline and retrospectives."
              aside={<button className="button-muted" type="button" onClick={() => window.print()}>Print</button>}
            >
              <div className="summary-strip">
                <div>
                  <strong>{overview.weekly_review.status.review_exists ? 'Saved' : 'Open'}</strong>
                  <p className="muted">Current review</p>
                </div>
                <div>
                  <strong>{formatDate(overview.weekly_review.status.week_end)}</strong>
                  <p className="muted">Week ends</p>
                </div>
              </div>
              <p className="muted">{overview.weekly_review.preview.report}</p>
            </Panel>

            <Panel title="Pattern note" description="The main pattern narrative lives inside this same progress view.">
              <div className="callout">
                <p className="eyebrow">Pattern analysis</p>
                <p>{overview.pattern_analysis}</p>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'retrospectives' ? (
        <Panel title="Project retrospectives" description="Stored retrospectives appear when projects or opportunities close.">
          {overview.retrospectives.length === 0 ? (
            <EmptyState title="No retrospectives yet" body="Closed projects and opportunities will start collecting here." />
          ) : (
            <div className="record-list">
              {overview.retrospectives.map((item) => (
                <article key={item.id} className="record-card">
                  <div className="record-card-header">
                    <div>
                      <h3>{item.title}</h3>
                      <div className="list-inline">
                        <span className="record-meta-chip">{item.source_type}</span>
                        <span className="record-meta-chip">{formatDate(item.closed_at)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="muted">{item.summary || 'No summary captured yet.'}</p>
                  <div className="summary-strip">
                    <div>
                      <strong>What worked</strong>
                      <p className="muted">{item.what_worked || 'Not captured yet.'}</p>
                    </div>
                    <div>
                      <strong>Next time</strong>
                      <p className="muted">{item.next_time || 'Not captured yet.'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {activeTab === 'timeline' ? <TimelineWeekPage /> : null}
      {activeTab === 'review' ? <AnalyticsPage initialTab="review" hideTabs /> : null}
      {activeTab === 'patterns' ? <AnalyticsPage initialTab="patterns" hideTabs /> : null}
      {activeTab === 'achievements' ? <AchievementsPage /> : null}
    </section>
  )
}
