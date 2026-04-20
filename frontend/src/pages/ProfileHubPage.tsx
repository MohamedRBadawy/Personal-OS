// [AR] محور الملف الشخصي — يجمع الملف الشخصي وخريطة الحياة وجهات الاتصال
// [EN] Profile hub — About Me, Life Map, and Contacts as cross-section tabs
// Connects to: ContactsPage (/contacts) via HubTabBar NavLink

import { useState } from 'react'
import { HubTabBar } from '../components/HubTabBar'
import { HubTabs } from '../components/HubTabs'
import { AboutPage } from './AboutPage'
import { GoalsLifePlanPage } from './GoalsLifePlanPage'

// [AR] تبويبات المستوى الأول لمحور الملف الشخصي
// [EN] Top-level Profile hub sections (cross-route NavLinks)
const PROFILE_SECTIONS = [
  { href: '/profile',  label: 'Profile'  },
  { href: '/contacts', label: 'Contacts' },
]

// [AR] تبويبات داخلية لصفحة /profile
// [EN] Internal profile sub-tabs rendered within /profile
const PROFILE_TABS = [
  { id: 'about',    label: 'About Me' },
  { id: 'life-map', label: 'Life Map' },
]

export function ProfileHubPage() {
  const [tab, setTab] = useState('about')
  return (
    <div>
      <HubTabBar tabs={PROFILE_SECTIONS} />
      <HubTabs tabs={PROFILE_TABS} active={tab} onChange={setTab} />
      {tab === 'about'    && <AboutPage />}
      {tab === 'life-map' && <GoalsLifePlanPage />}
    </div>
  )
}
