// [AR] شريط تبويبات المحور — يظهر داخل المحاور التي تحتوي صفحات فرعية متعددة
// [EN] Hub tab bar — shown inside hubs that contain multiple sub-pages
// Used by: HealthHubPage (Life hub), ProfileHubPage (Profile hub), AnalyticsHubPage (Intelligence hub)

import { NavLink } from 'react-router-dom'

interface HubTab {
  href: string
  label: string
}

interface Props {
  tabs: HubTab[]
}

export function HubTabBar({ tabs }: Props) {
  return (
    <nav className="hub-tab-bar" aria-label="Hub sections">
      {tabs.map(tab => (
        <NavLink
          key={tab.href}
          to={tab.href}
          className={({ isActive }) => isActive ? 'hub-tab active' : 'hub-tab'}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
