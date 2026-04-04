import { useState, type PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChatPanel } from '../components/chat/ChatPanel'

type NavItem = {
  href: string
  label: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups = [
  {
    label: 'Core',
    items: [
      { href: '/', label: 'Today' },
      { href: '/timeline', label: 'Timeline' },
      { href: '/analytics', label: 'Analytics' },
    ],
  },
  {
    label: 'Life',
    items: [
      { href: '/goals', label: 'Goals' },
      { href: '/family', label: 'Family' },
      { href: '/relationships', label: 'Relationships' },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/schedule', label: 'Schedule' },
      { href: '/finance', label: 'Finance' },
      { href: '/pipeline', label: 'Pipeline' },
      { href: '/marketing', label: 'Marketing' },
      { href: '/learning', label: 'Learning' },
    ],
  },
  {
    label: 'Health',
    items: [
      { href: '/health', label: 'Health' },
      { href: '/habits', label: 'Habits' },
      { href: '/mood', label: 'Mood' },
      { href: '/spiritual', label: 'Spiritual' },
    ],
  },
  {
    label: 'Reflection',
    items: [
      { href: '/ideas', label: 'Ideas' },
      { href: '/decisions', label: 'Decisions' },
      { href: '/achievements', label: 'Achievements' },
    ],
  },
] satisfies NavGroup[]

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const activeItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.href === location.pathname)

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
          <h1 className="app-title">Run life like a coherent system.</h1>
          <p className="app-subtitle">
            One operating surface for today, goals, work, health, and reflection.
          </p>
        </div>

        <nav aria-label="Primary" className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-group-label">{group.label}</p>
              <div className="nav-group-links">
                {group.items.map((item) => (
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
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">Command center</p>
            <h2 className="header-title">{activeItem?.label ?? 'Today'}</h2>
          </div>
          <p className="header-summary">
            Structured summaries first, deterministic AI second, admin pages never.
          </p>
        </header>

        <main className="page-grid">{children}</main>
      </div>

      {/* Floating AI chat — accessible from every page */}
      <ChatPanel />
    </div>
  )
}
