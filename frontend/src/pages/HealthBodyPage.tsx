import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import { getHealthOverview } from '../lib/api'
import { formatPercent } from '../lib/formatters'
import { HabitsPage } from './HabitsPage'
import { HealthPage as BodyPage } from './HealthPage'
import { MoodPage } from './MoodPage'
import { SpiritualPage } from './SpiritualPage'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'body', label: 'Body' },
  { id: 'habits', label: 'Habits' },
  { id: 'mood', label: 'Mood' },
  { id: 'spiritual', label: 'Spiritual' },
] as const

export function HealthBodyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabs.some((tab) => tab.id === searchParams.get('tab'))
    ? (searchParams.get('tab') as (typeof tabs)[number]['id'])
    : 'overview'

  const overviewQuery = useQuery({
    queryKey: ['health-overview'],
    queryFn: getHealthOverview,
  })

  if (overviewQuery.isLoading) {
    return <section className="loading-state">Loading health workspace...</section>
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return <section className="error-state">We could not load the health workspace.</section>
  }

  const overview = overviewQuery.data

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Health & Body</p>
          <h2>See capacity, body state, mood, habits, and spiritual anchor together.</h2>
          <p>The health view now groups the full daily capacity picture instead of splitting it into competing top-level pages.</p>
        </div>
        <WorkspaceTabs
          activeTab={activeTab}
          tabs={tabs as unknown as Array<{ id: string; label: string }>}
          onChange={(tab) => setSearchParams(tab === 'overview' ? {} : { tab })}
        />
      </div>

      <div className="metric-grid">
        <MetricCard label="Avg sleep (7d)" value={`${overview.summary.avg_sleep_7d ?? 0} h`} />
        <MetricCard label="Avg mood (7d)" value={`${overview.summary.avg_mood_7d ?? 0} / 5`} />
        <MetricCard label="Habit completion" value={formatPercent(overview.summary.habit_completion_rate_7d ?? 0)} />
        <MetricCard label="Prayer completion" value={formatPercent(overview.summary.prayer_completion_rate_7d ?? 0)} />
        <MetricCard label="Exercise streak" value={`${overview.summary.exercise_streak} days`} tone="success" />
        <MetricCard label="Habits done today" value={`${overview.summary.habits_completed_today}/${overview.summary.active_habits_count}`} />
      </div>

      <div className="two-column">
        <Panel title="Capacity signals" description="The main page can now prioritize using actual body and mood context.">
          <ul className="plain-list">
            {overview.capacity_signals.map((signal) => (
              <li key={signal} className="context-item">{signal}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Today's logging state" description="Stay honest about what has been captured already.">
          <div className="summary-strip">
            <div>
              <strong>{overview.summary.health_logged_today ? 'Yes' : 'No'}</strong>
              <p className="muted">Body logged</p>
            </div>
            <div>
              <strong>{overview.summary.mood_logged_today ? 'Yes' : 'No'}</strong>
              <p className="muted">Mood logged</p>
            </div>
            <div>
              <strong>{overview.summary.spiritual_logged_today ? 'Yes' : 'No'}</strong>
              <p className="muted">Spiritual logged</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="three-column">
        <Panel title="Recent body logs" description="Latest body entries.">
          <ul className="plain-list">
            {overview.recent_health_logs.map((log) => (
              <li key={log.id} className="context-item">
                <strong>{log.date}</strong>
                <p className="muted">Sleep {log.sleep_hours}h - Energy {log.energy_level}/5</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent mood logs" description="Latest mood entries.">
          <ul className="plain-list">
            {overview.recent_mood_logs.map((log) => (
              <li key={log.id} className="context-item">
                <strong>{log.date}</strong>
                <p className="muted">Mood {log.mood_score}/5 {log.notes ? `- ${log.notes}` : ''}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent spiritual logs" description="Latest prayer and Quran entries.">
          <ul className="plain-list">
            {overview.recent_spiritual_logs.map((log) => (
              <li key={log.id} className="context-item">
                <strong>{log.date}</strong>
                <p className="muted">{log.prayers_count}/5 prayers - Quran {log.quran_pages}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {activeTab === 'body' ? <BodyPage /> : null}
      {activeTab === 'habits' ? <HabitsPage /> : null}
      {activeTab === 'mood' ? <MoodPage /> : null}
      {activeTab === 'spiritual' ? <SpiritualPage /> : null}
    </section>
  )
}
