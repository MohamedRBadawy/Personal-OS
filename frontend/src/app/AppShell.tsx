import { useState, type PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChatPanel } from '../components/chat/ChatPanel'

type NavItem = {
  href: string
  label: string
}

const primaryItems = [
  { href: '/', label: 'Command Center' },
  { href: '/goals', label: 'Goals & Life Plan' },
  { href: '/work', label: 'Work & Career' },
  { href: '/finance', label: 'Finance' },
  { href: '/health', label: 'Health & Body' },
  { href: '/timeline', label: 'Achievements & Timeline' },
  { href: '/ideas', label: 'Ideas & Thinking' },
] satisfies NavItem[]

const secondaryItems = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/habits', label: 'Habits' },
  { href: '/mood', label: 'Mood' },
  { href: '/spiritual', label: 'Spiritual' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/marketing', label: 'Marketing' },
  { href: '/learning', label: 'Learning' },
  { href: '/family', label: 'Family' },
  { href: '/relationships', label: 'Relationships' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/decisions', label: 'Decisions' },
  { href: '/achievements', label: 'Achievements' },
] satisfies NavItem[]

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const activeItem = [...primaryItems, ...secondaryItems].find((item) => item.href === location.pathname)

  return (
    <div className="app-shell">
      <button
        aria-expanded={drawerOpen}
        className="sidebar-toggle"
        type="button"
        onClick={() => setDrawerOpen((current) => !current)}
      >
        {drawerOpen ? 'Close navigation' : 'Open navigation'}
      </button>

      <aside className={drawerOpen ? 'app-sidebar open' : 'app-sidebar'}>
        <div className="sidebar-brand">
          <p className="eyebrow">Personal Life OS</p>
          <h1 className="app-title">Run life from one clear operating surface.</h1>
          <p className="app-subtitle">
            Capture, prioritize, edit, and review from the command center without route-hopping.
          </p>
        </div>

        <nav aria-label="Primary" className="sidebar-nav">
          <div className="nav-group">
            <p className="nav-group-label">Primary</p>
            <div className="nav-group-links">
              {primaryItems.map((item) => (
                <NavLink
                  key={item.href}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  to={item.href}
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <details className="nav-disclosure">
            <summary className="nav-group-label">Secondary Workspaces</summary>
            <div className="nav-group-links nav-group-links-secondary">
              {secondaryItems.map((item) => (
                <NavLink
                  key={item.href}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  to={item.href}
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </details>
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">Home base</p>
            <h2 className="header-title">{activeItem?.label ?? 'Command Center'}</h2>
          </div>
          <p className="header-summary">
            Seven clear workspaces on top, with legacy routes still reachable while the product settles into the PRD structure.
          </p>
        </header>

        <main className="page-grid">{children}</main>
      </div>

      <ChatPanel />
    </div>
  )
}
