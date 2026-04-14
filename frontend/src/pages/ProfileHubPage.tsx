import { useState } from 'react'
import { HubTabs } from '../components/HubTabs'
import { AboutPage } from './AboutPage'
import { GoalsLifePlanPage } from './GoalsLifePlanPage'

const TABS = [
  { id: 'about',    label: 'About Me' },
  { id: 'life-map', label: 'Life Map' },
]

export function ProfileHubPage() {
  const [tab, setTab] = useState('about')
  return (
    <div>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'about'    && <AboutPage />}
      {tab === 'life-map' && <GoalsLifePlanPage />}
    </div>
  )
}
