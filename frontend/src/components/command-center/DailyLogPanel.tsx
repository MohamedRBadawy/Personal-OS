import { useEffect, useState } from 'react'
import { HabitBoard } from '../HabitBoard'
import { HealthLogForm } from '../HealthLogForm'
import { MoodLogForm } from '../MoodLogForm'
import { SpiritualLogForm } from '../SpiritualLogForm'
import type { HabitBoardItem, HealthLogPayload, HealthTodayPayload, MoodLogPayload, SpiritualLogPayload } from '../../lib/types'

type Tab = 'health' | 'habits' | 'prayers' | 'mood'

type DailyLogPanelProps = {
  healthToday: HealthTodayPayload
  initialTab?: Tab
  isSubmittingHealth: boolean
  onSubmitHealth: (payload: HealthLogPayload & { id?: string | null }) => void
  isSubmittingMood: boolean
  onSubmitMood: (payload: MoodLogPayload & { id?: string | null }) => void
  isSubmittingSpiritual: boolean
  onSubmitSpiritual: (payload: SpiritualLogPayload & { id?: string | null }) => void
  pendingHabitId: string | null
  onToggleHabit: (item: HabitBoardItem, done: boolean) => void
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'health', label: 'Health' },
  { id: 'habits', label: 'Habits' },
  { id: 'prayers', label: 'Prayers' },
  { id: 'mood', label: 'Mood' },
]

export function DailyLogPanel({
  healthToday,
  initialTab,
  isSubmittingHealth,
  onSubmitHealth,
  isSubmittingMood,
  onSubmitMood,
  isSubmittingSpiritual,
  onSubmitSpiritual,
  pendingHabitId,
  onToggleHabit,
}: DailyLogPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('health')

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab])

  const { summary, health_log, mood_log, spiritual_log, habit_board, date } = healthToday

  function getTabBadge(tab: Tab): string {
    switch (tab) {
      case 'health':
        return summary.health_logged_today ? '✓' : '○'
      case 'habits':
        return `${summary.habits_completed_today}/${summary.active_habits_count}`
      case 'prayers':
        return summary.spiritual_logged_today ? '✓' : '○'
      case 'mood':
        return summary.mood_logged_today ? '✓' : '○'
    }
  }

  return (
    <div className="daily-log-panel">
      <div className="daily-log-tabs" role="tablist">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`daily-log-panel-${id}`}
            className={`daily-log-tab${activeTab === id ? ' active' : ''}`}
            type="button"
            onClick={() => setActiveTab(id)}
          >
            {label}
            <span className="daily-log-tab__badge">{getTabBadge(id)}</span>
          </button>
        ))}
      </div>
      <div className="daily-log-tab-content" id={`daily-log-panel-${activeTab}`} role="tabpanel">
        {activeTab === 'health' ? (
          <HealthLogForm
            key={health_log?.id ?? `health-${date}`}
            initialValue={health_log}
            isSubmitting={isSubmittingHealth}
            today={date}
            onSubmit={(payload) => onSubmitHealth({ ...payload, id: health_log?.id })}
          />
        ) : null}
        {activeTab === 'habits' ? (
          <HabitBoard
            items={habit_board}
            pendingHabitId={pendingHabitId}
            onToggle={onToggleHabit}
          />
        ) : null}
        {activeTab === 'prayers' ? (
          <SpiritualLogForm
            key={spiritual_log?.id ?? `spiritual-${date}`}
            initialValue={spiritual_log}
            isSubmitting={isSubmittingSpiritual}
            today={date}
            onSubmit={(payload) => onSubmitSpiritual({ ...payload, id: spiritual_log?.id })}
          />
        ) : null}
        {activeTab === 'mood' ? (
          <MoodLogForm
            key={mood_log?.id ?? `mood-${date}`}
            initialValue={mood_log}
            isSubmitting={isSubmittingMood}
            today={date}
            onSubmit={(payload) => onSubmitMood({ ...payload, id: mood_log?.id })}
          />
        ) : null}
      </div>
    </div>
  )
}
