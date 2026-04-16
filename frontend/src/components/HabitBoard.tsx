import { titleCase } from '../lib/formatters'
import type { HabitBoardItem } from '../lib/types'

type HabitBoardProps = {
  items: HabitBoardItem[]
  pendingHabitId?: string | null
  onToggle: (item: HabitBoardItem, done: boolean) => void
  onDelete?: (item: HabitBoardItem) => void
  deletingHabitId?: string | null
}

function describeTarget(item: HabitBoardItem) {
  if (item.habit.target === 'custom') {
    return `${item.habit.custom_days ?? 1}x/week`
  }
  return titleCase(item.habit.target).replace('3x Week', '3x/week')
}

export function HabitBoard({ items, pendingHabitId, onToggle, onDelete, deletingHabitId }: HabitBoardProps) {
  if (items.length === 0) {
    return <p className="muted">No habits are defined yet.</p>
  }

  return (
    <div className="habit-board">
      {items.map((item) => {
        const isPending = pendingHabitId === item.habit.id
        const todayState = item.today_log == null ? 'Pending' : item.today_log.done ? 'Done' : 'Missed'

        return (
          <article key={item.habit.id} className="habit-card">
            <div className="habit-card-header">
              <div>
                <h3>{item.habit.name}</h3>
                <p className="muted">{describeTarget(item)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`status-pill ${item.today_log?.done ? 'success' : item.today_log ? 'warning' : ''}`}>
                  {todayState}
                </span>
                {onDelete && (
                  <button
                    className="btn-ghost-sm"
                    disabled={deletingHabitId === item.habit.id}
                    title="Delete habit"
                    onClick={() => {
                      if (window.confirm(`Delete habit "${item.habit.name}"? This cannot be undone.`)) {
                        onDelete(item)
                      }
                    }}
                    style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                  >
                    {deletingHabitId === item.habit.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            </div>

            <div className="summary-strip">
              <div>
                <strong>{item.completion_rate_7d ?? 0}%</strong>
                <p className="muted">7d completion</p>
              </div>
              <div>
                <strong>{item.completion_rate_30d ?? 0}%</strong>
                <p className="muted">30d completion</p>
              </div>
              <div>
                <strong>{item.current_streak} days</strong>
                <p className="muted">Current streak</p>
              </div>
            </div>

            <div className="button-row">
              <button
                className={item.today_log?.done ? 'button-muted active' : 'button-muted'}
                disabled={isPending}
                type="button"
                onClick={() => onToggle(item, true)}
              >
                {isPending && item.today_log?.done ? 'Saving...' : 'Done'}
              </button>
              <button
                className={item.today_log && !item.today_log.done ? 'button-muted active' : 'button-muted'}
                disabled={isPending}
                type="button"
                onClick={() => onToggle(item, false)}
              >
                {isPending && item.today_log && !item.today_log.done ? 'Saving...' : 'Missed'}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
