// [AR] محور الذكاء — يجمع التحليلات والرؤى والإحصاءات وجسر البيانات
// [EN] Intelligence hub — analytics, insights, stats, and data bridge as tabs
// Connects to: DataBridgePage (/data-bridge) via HubTabBar NavLink

import { useState } from 'react'
import { HubTabBar } from '../components/HubTabBar'
import { HubTabs } from '../components/HubTabs'
import { AnalyticsPage } from './AnalyticsPage'
import { GoalInsightsPage } from './GoalInsightsPage'
import { ProfilePage } from './ProfilePage'

// [AR] تبويبات المستوى الأول لمحور الذكاء
// [EN] Top-level Intelligence hub sections (cross-route NavLinks)
const INTELLIGENCE_SECTIONS = [
  { href: '/analytics',   label: 'Analytics'   },
  { href: '/data-bridge', label: 'Data Bridge'  },
]

// [AR] تبويبات داخلية لصفحة /analytics
// [EN] Internal analytics sub-tabs rendered within /analytics
const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'insights', label: 'Insights' },
  { id: 'stats',    label: 'Stats'    },
]

export function AnalyticsHubPage() {
  const [tab, setTab] = useState('overview')
  return (
    <div>
      <HubTabBar tabs={INTELLIGENCE_SECTIONS} />
      <HubTabs tabs={ANALYTICS_TABS} active={tab} onChange={setTab} />
      {tab === 'overview' && <AnalyticsPage />}
      {tab === 'insights' && <GoalInsightsPage />}
      {tab === 'stats'    && <ProfilePage />}
    </div>
  )
}
