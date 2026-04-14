import { useState } from 'react'
import { HubTabs } from '../components/HubTabs'
import { RoutinePage } from './RoutinePage'
import DaySchedulePage from './DaySchedulePage'

const TABS = [
  { id: 'routine',  label: 'Daily Routine' },
  { id: 'calendar', label: 'Calendar'      },
]

export function ScheduleHubPage() {
  const [tab, setTab] = useState('routine')
  return (
    <div>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'routine'  && <RoutinePage />}
      {tab === 'calendar' && <DaySchedulePage />}
    </div>
  )
}
