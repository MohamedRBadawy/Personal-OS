import { useQuery } from '@tanstack/react-query'
import { getRoutineMetrics } from '../../lib/api'
import type { RoutineMetrics } from '../../lib/types'

function RateDot({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return <span style={{ color, fontWeight: 700 }}>{pct}%</span>
}

export function MetricsPanel() {
  const { data: m } = useQuery<RoutineMetrics>({
    queryKey: ['routine-metrics'],
    queryFn: () => getRoutineMetrics(30),
    staleTime: 5 * 60 * 1000,
  })

  if (!m) return null

  return (
    <div className="routine-metrics">
      <div className="routine-metric-card">
        <span className="routine-metric-icon">🕌</span>
        <div className="routine-metric-body">
          <span className="routine-metric-label">Prayer (30d)</span>
          <span className="routine-metric-value"><RateDot pct={m.prayer_rate} /></span>
        </div>
        {m.prayer_streak > 0 && (
          <span className="routine-metric-streak">🔥 {m.prayer_streak}d</span>
        )}
      </div>
      <div className="routine-metric-card">
        <span className="routine-metric-icon">💪</span>
        <div className="routine-metric-body">
          <span className="routine-metric-label">Exercise (30d)</span>
          <span className="routine-metric-value"><RateDot pct={m.exercise_rate} /></span>
        </div>
        {m.exercise_streak > 0 && (
          <span className="routine-metric-streak">🔥 {m.exercise_streak}d</span>
        )}
      </div>
    </div>
  )
}
