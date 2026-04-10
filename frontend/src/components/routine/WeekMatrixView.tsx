import type { RoutineBlock } from '../../lib/types'
import { TYPE_INFO, DAY_DIGITS, DAY_SHORT } from './constants'
import { fmtDuration } from './helpers'

export function WeekMatrixView({ blocks, onEdit }: { blocks: RoutineBlock[]; onEdit: (id: number) => void }) {
  // Compute total scheduled minutes per day-of-week
  const dayTotals = DAY_DIGITS.map(d => {
    return blocks.filter(b => b.days_of_week === '' || b.days_of_week.includes(d))
                 .reduce((s, b) => s + b.duration_minutes, 0)
  })

  return (
    <div className="week-matrix">
      {/* Header */}
      <div className="week-matrix-header">
        <span />
        <span className="week-matrix-time-col" />
        {DAY_SHORT.map(d => (
          <span key={d} className="week-matrix-day-col">{d}</span>
        ))}
        <span className="week-matrix-dur-col">Dur</span>
      </div>

      {/* Rows */}
      {blocks.map(block => {
        const info = TYPE_INFO[block.type] ?? { color: '#6b7280' }
        const active = block.days_of_week === '' ? '1234567' : block.days_of_week
        return (
          <div key={block.id} className="week-matrix-row" onClick={() => onEdit(block.id)}>
            <span className="routine-dot" style={{ background: info.color, flexShrink: 0 }} />
            <span className="week-matrix-time">{block.time_str || block.time.slice(0, 5)}</span>
            <span className="week-matrix-label-cell">{block.label}</span>
            {DAY_DIGITS.map(d => (
              <span
                key={d}
                className={`week-matrix-cell${active.includes(d) ? ' week-cell-on' : ''}`}
                style={active.includes(d) ? { background: info.color + '22', borderColor: info.color + '66' } : {}}
              >
                {active.includes(d) && <span className="week-cell-dot" style={{ background: info.color }} />}
              </span>
            ))}
            <span className="week-matrix-dur">{fmtDuration(block.duration_minutes)}</span>
          </div>
        )
      })}

      {/* Footer: daily load */}
      <div className="week-matrix-footer">
        <span style={{ gridColumn: '1 / 3' }}>Daily load</span>
        {dayTotals.map((mins, i) => (
          <span key={i} className="week-matrix-day-load">{fmtDuration(mins)}</span>
        ))}
        <span />
      </div>
    </div>
  )
}
