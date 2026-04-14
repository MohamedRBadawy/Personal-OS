import { useState } from 'react'
import { HubTabs } from '../components/HubTabs'
import { AnalyticsPage } from './AnalyticsPage'
import { GoalInsightsPage } from './GoalInsightsPage'
import { ProfilePage } from './ProfilePage'

const TABS = [
  { id: 'overview', label: 'Overview'  },
  { id: 'insights', label: 'Insights'  },
  { id: 'stats',    label: 'Stats'     },
]

export function AnalyticsHubPage() {
  const [tab, setTab] = useState('overview')
  return (
    <div>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'overview' && <AnalyticsPage />}
      {tab === 'insights' && <GoalInsightsPage />}
      {tab === 'stats'    && <ProfilePage />}
    </div>
  )
}
