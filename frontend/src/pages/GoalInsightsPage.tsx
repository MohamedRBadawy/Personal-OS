/**
 * GoalInsightsPage — Node velocity, leverage audit, and execution funnel.
 */

import { useQuery } from '@tanstack/react-query'
import { Panel } from '../components/Panel'
import { getNodeVelocity, getGoalFunnel, getPrioritizedNodes } from '../lib/api'

// ── Velocity Chart ────────────────────────────────────────────────────────────

function VelocityChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['node-velocity'],
    queryFn: getNodeVelocity,
  })

  if (isLoading) return <p className="muted">Loading velocity…</p>
  if (!data) return null

  const maxCount = Math.max(...data.weeks.map(w => w.completed_count), 1)

  return (
    <div className="insights-velocity">
      <div className="insights-velocity-header">
        <span>
          <strong>{data.total_12w}</strong> nodes completed in 12 weeks
        </span>
        <span className={`insights-trend-chip ${data.trend}`}>
          {data.trend === 'up' ? '↑ Trending up' : '↓ Trending down'}
        </span>
      </div>
      <div className="insights-velocity-bars">
        {data.weeks.map(week => {
          const pct = (week.completed_count / maxCount) * 100
          const date = new Date(week.week_start).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          return (
            <div key={week.week_start} className="insights-velocity-bar-col" title={`${date}: ${week.completed_count}`}>
              <div className="insights-velocity-bar-track">
                <div
                  className="insights-velocity-bar-fill"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="insights-velocity-bar-label">{date.split(' ')[0]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Execution Funnel ──────────────────────────────────────────────────────────

function ExecutionFunnel() {
  const { data, isLoading } = useQuery({
    queryKey: ['goal-funnel'],
    queryFn: getGoalFunnel,
  })

  if (isLoading) return <p className="muted">Loading funnel…</p>
  if (!data) return null

  const maxCount = Math.max(...data.stages.map(s => s.count), 1)

  return (
    <div className="insights-funnel">
      {data.stages.map(stage => {
        const widthPct = Math.max((stage.count / maxCount) * 100, 4)
        return (
          <div key={stage.stage} className="insights-funnel-stage">
            <div className="insights-funnel-label">
              <span>{stage.label}</span>
              {stage.conversion_from_prev !== null && (
                <span className="insights-funnel-conv">{stage.conversion_from_prev}%</span>
              )}
            </div>
            <div className="insights-funnel-track">
              <div
                className={`insights-funnel-bar insights-funnel-${stage.stage}`}
                style={{ width: `${widthPct}%` }}
              >
                <span className="insights-funnel-count">{stage.count}</span>
              </div>
            </div>
          </div>
        )
      })}
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
        {data.total_active} active nodes · {data.total_all} total
      </p>
    </div>
  )
}

// ── Leverage Audit ────────────────────────────────────────────────────────────

function LeverageAudit() {
  const { data: prioritized, isLoading: prioLoading } = useQuery({
    queryKey: ['nodes-prioritized'],
    queryFn: getPrioritizedNodes,
  })

  if (prioLoading) return <p className="muted">Loading audit…</p>

  const top10 = (prioritized ?? []).slice(0, 10)

  return (
    <div className="insights-audit">
      <table className="insights-audit-table">
        <thead>
          <tr>
            <th>Node</th>
            <th>Type</th>
            <th>Unlocks</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {top10.map((node, i) => (
            <tr key={node.id}>
              <td>
                <span className="insights-audit-rank">{i + 1}</span>
                {node.title}
              </td>
              <td><span className="record-meta-chip">{node.type}</span></td>
              <td><strong>{node.dependent_count}</strong></td>
              <td><span className="insights-score-chip">{node.leverage_score}</span></td>
            </tr>
          ))}
          {top10.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No active nodes found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function GoalInsightsPage() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Goal Insights</p>
          <h2>Velocity, leverage, and execution funnel</h2>
          <p>Where is the system working? Where is it stuck?</p>
        </div>
      </div>

      <Panel title="Completion velocity" description="Nodes completed per week — last 12 weeks.">
        <VelocityChart />
      </Panel>

      <Panel title="Execution funnel" description="How ideas move from raw to done.">
        <ExecutionFunnel />
      </Panel>

      <Panel title="Leverage audit" description="Top 10 highest-leverage unblocked nodes — ranked by (dependencies × priority) / effort.">
        <LeverageAudit />
      </Panel>
    </section>
  )
}
