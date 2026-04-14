import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HubTabs } from '../components/HubTabs'
import { HealthBodyPage } from './HealthBodyPage'
import { HabitsPage } from './HabitsPage'
import { MoodPage } from './MoodPage'
import { SpiritualPage } from './SpiritualPage'
import { MealsPage } from './MealsPage'

const TABS = [
  { id: 'body',     label: 'Body'     },
  { id: 'habits',   label: 'Habits'   },
  { id: 'mood',     label: 'Mood'     },
  { id: 'spiritual',label: 'Spiritual'},
  { id: 'meals',    label: 'Meals'    },
]

export function HealthHubPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'body')
  return (
    <div>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'body'      && <HealthBodyPage />}
      {tab === 'habits'    && <HabitsPage />}
      {tab === 'mood'      && <MoodPage />}
      {tab === 'spiritual' && <SpiritualPage />}
      {tab === 'meals'     && <MealsPage />}
    </div>
  )
}
