// [AR] محور الحياة — يعرض الصحة والمالية واليوميات كأقسام متصلة
// [EN] Life hub — health, finance, journal accessible as cross-section tabs
// Connects to: FinanceWorkspacePage (/finance), JournalPage (/journal) via NavLinks

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HubTabBar } from '../components/HubTabBar'
import { HubTabs } from '../components/HubTabs'
import { HealthBodyPage } from './HealthBodyPage'
import { HabitsPage } from './HabitsPage'
import { MoodPage } from './MoodPage'
import { SpiritualPage } from './SpiritualPage'
import { MealsPage } from './MealsPage'

// [AR] تبويبات المستوى الأول — التنقل بين أقسام محور الحياة
// [EN] Top-level Life hub section tabs (cross-route NavLinks)
const LIFE_SECTIONS = [
  { href: '/health',  label: 'Health'  },
  { href: '/finance', label: 'Finance' },
  { href: '/journal', label: 'Journal' },
]

// [AR] تبويبات الصحة الداخلية — تبقى داخل صفحة /health
// [EN] Internal health sub-tabs rendered within /health
const HEALTH_TABS = [
  { id: 'body',      label: 'Body'      },
  { id: 'habits',    label: 'Habits'    },
  { id: 'mood',      label: 'Mood'      },
  { id: 'spiritual', label: 'Spiritual' },
  { id: 'meals',     label: 'Meals'     },
]

export function HealthHubPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'body')
  return (
    <div>
      <HubTabBar tabs={LIFE_SECTIONS} />
      <HubTabs tabs={HEALTH_TABS} active={tab} onChange={setTab} />
      {tab === 'body'      && <HealthBodyPage />}
      {tab === 'habits'    && <HabitsPage />}
      {tab === 'mood'      && <MoodPage />}
      {tab === 'spiritual' && <SpiritualPage />}
      {tab === 'meals'     && <MealsPage />}
    </div>
  )
}
