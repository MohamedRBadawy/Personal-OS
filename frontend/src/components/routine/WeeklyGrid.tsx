import { useQueries } from '@tanstack/react-query'
import { getRoutineLogs } from '../../lib/api'
import { todayStr } from './helpers'

export function WeeklyGrid({ total }: { total: number }) {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA')
  })

  const results = useQueries({
    queries: dates.map(date => ({
      queryKey: ['routine-logs', date],
      queryFn: () => getRoutineLogs(date),
    })),
  })

  const blockTotal = total > 0 ? total : 20

  return (
    <div className="weekly-grid">
      {dates.map((date, i) => {
        const logs = results[i].data || []
        const done = logs.filter(l => l.status === 'done' || l.status === 'partial').length
        const pct = Math.round((done / blockTotal) * 100)
        const d = new Date(date + 'T00:00:00')
        const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' })
        const isToday = date === todayStr()
        return (
          <div key={date} className={`weekly-cell ${isToday ? 'weekly-cell-today' : ''}`}>
            <span className="weekly-day">{dayName}</span>
            <div className="weekly-bar-wrap">
              <div
                className="weekly-bar-fill"
                style={{
                  height: `${pct}%`,
                  background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#e5e7eb',
                }}
              />
            </div>
            <span className="weekly-pct">{pct > 0 ? `${pct}%` : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}
