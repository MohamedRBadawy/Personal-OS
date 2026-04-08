import type { HabitBoardItem, HealthSummary, TodaySchedulePayload } from '../../lib/types'

type TodayProgressStripProps = {
  schedule: TodaySchedulePayload
  healthSummary: HealthSummary
  habitBoard: HabitBoardItem[]
  onChipClick: (sectionId: string, tab?: string) => void
}

type ChipState = 'done' | 'pending' | 'empty'

function Chip({
  label,
  state,
  count,
  total,
  onClick,
}: {
  label: string
  state: ChipState
  count?: number
  total?: number
  onClick: () => void
}) {
  return (
    <button
      className={`progress-chip progress-chip--${state}`}
      type="button"
      onClick={onClick}
    >
      <span className="progress-chip__dot" />
      {label}
      {count !== undefined && total !== undefined ? (
        <span className="progress-chip__count">{count}/{total}</span>
      ) : null}
    </button>
  )
}

export function TodayProgressStrip({
  schedule,
  healthSummary,
  habitBoard,
  onChipClick,
}: TodayProgressStripProps) {
  const blocks = schedule.blocks

  // Morning / Fajr — first block
  const morningDone = blocks[0]?.log?.status === 'done'
  // Walk — second block
  const walkDone = blocks[1]?.log?.status === 'done'
  // Health
  const healthLogged = healthSummary.health_logged_today
  // Habits
  const habitsCompleted = healthSummary.habits_completed_today
  const activeHabits = Math.max(habitBoard.length, healthSummary.active_habits_count)
  const habitsDone = activeHabits > 0 && habitsCompleted >= activeHabits
  // Spiritual / Prayers
  const prayersLogged = healthSummary.spiritual_logged_today
  // Schedule
  const scheduleDone = blocks.length > 0 && schedule.summary.done_count >= blocks.length
  const scheduleDoneCount = schedule.summary.done_count

  return (
    <div className="progress-strip" role="group" aria-label="Today's progress">
      {blocks.length > 0 ? (
        <Chip
          label="🕌 Morning"
          state={morningDone ? 'done' : 'pending'}
          onClick={() => onChipClick('schedule')}
        />
      ) : null}
      {blocks.length > 1 ? (
        <Chip
          label="🏃 Walk"
          state={walkDone ? 'done' : 'pending'}
          onClick={() => onChipClick('schedule')}
        />
      ) : null}
      <Chip
        label="💊 Health"
        state={healthLogged ? 'done' : blocks.length > 0 ? 'pending' : 'empty'}
        onClick={() => onChipClick('daily-log', 'health')}
      />
      <Chip
        label="✅ Habits"
        state={activeHabits === 0 ? 'empty' : habitsDone ? 'done' : 'pending'}
        count={habitsCompleted}
        total={activeHabits}
        onClick={() => onChipClick('daily-log', 'habits')}
      />
      <Chip
        label="🤲 Prayers"
        state={prayersLogged ? 'done' : 'pending'}
        onClick={() => onChipClick('daily-log', 'prayers')}
      />
      {blocks.length > 0 ? (
        <Chip
          label="📅 Schedule"
          state={scheduleDone ? 'done' : 'pending'}
          count={scheduleDoneCount}
          total={blocks.length}
          onClick={() => onChipClick('schedule')}
        />
      ) : null}
    </div>
  )
}
