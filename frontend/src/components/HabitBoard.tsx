// [AR] لوحة العادات — صفوف مدمجة مع إحصاءات قابلة للتوسيع
// [EN] Habit board — compact rows with expand-in-place stats
import { useState } from 'react'
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
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (items.length === 0) {
    return <p className="muted">No habits are defined yet.</p>
  }

  return (
    <div className="habit-board">
      {items.map((item) => {
        const isPending = pendingHabitId === item.habit.id
        const isDone = item.today_log?.done === true
        const isMissed = item.today_log != null && !item.today_log.done
        const isExpanded = expandedId === item.habit.id

        return (
          <article key={item.habit.id} className="habit-row-item">
            <div
              className="habit-row-header"
              onClick={() => setExpandedId(p => p === item.habit.id ? null : item.habit.id)}
            >
              <div className="habit-row-main">
                <span className={`habit-row-dot${isDone ? ' done' : isMissed ? ' missed' : ''}`} />
                <span className="habit-row-name">{item.habit.name}</span>
                <span className="habit-row-target">{describeTarget(item)}</span>
              </div>
              <div className="habit-row-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`habit-log-btn${isDone ? ' active-done' : ''}`}
                  disabled={isPending}
                  type="button"
                  title="Done"
                  onClick={() => onToggle(item, true)}
                >
                  {isPending && isDone ? '…' : '✓'}
                </button>
                <button
                  className={`habit-log-btn${isMissed ? ' active-missed' : ''}`}
                  disabled={isPending}
                  type="button"
                  title="Missed"
                  onClick={() => onToggle(item, false)}
                >
                  {isPending && isMissed ? '…' : '✗'}
                </button>
                {onDelete && (
                  <button
                    className="habit-log-btn habit-log-btn--delete"
                    disabled={deletingHabitId === item.habit.id}
                    title="Delete habit"
                    onClick={() => {
                      if (window.confirm(`Delete habit "${item.habit.name}"? This cannot be undone.`)) {
                        onDelete(item)
                      }
                    }}
                  >
                    {deletingHabitId === item.habit.id ? '…' : '·'}
                  </button>
                )}
                <span className="habit-row-chevron">{isExpanded ? '▴' : '▾'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="habit-row-stats">
                <span className="habit-stat-chip">{item.completion_rate_7d ?? 0}% <em>7d</em></span>
                <span className="habit-stat-chip">{item.completion_rate_30d ?? 0}% <em>30d</em></span>
                <span className="habit-stat-chip">{item.current_streak} <em>day streak</em></span>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
