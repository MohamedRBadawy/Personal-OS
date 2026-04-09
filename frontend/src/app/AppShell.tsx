import { useCallback, useState, type PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BottomNav } from '../components/BottomNav'
import { ChatPanel } from '../components/chat/ChatPanel'
import { CommandPalette } from '../components/CommandPalette'
import { ExportButton } from '../components/ExportButton'
import {
  getFinanceOverview,
  getHealthOverview,
} from '../lib/api'
import { useTheme } from '../lib/useTheme'

type NavItem = {
  href: string
  label: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Command Center' },
      { href: '/about', label: 'About Me' },
    ],
  },
  {
    label: 'Execute',
    items: [
      { href: '/goals', label: 'Goals' },
      { href: '/routine', label: 'Daily Routine' },
      { href: '/schedule', label: 'Day Schedule' },
    ],
  },
  {
    label: 'Life',
    items: [
      { href: '/finance', label: 'Finance' },
      { href: '/health', label: 'Health' },
      { href: '/journal', label: 'Journal' },
      { href: '/contacts', label: 'Contacts' },
      { href: '/learning', label: 'Learning' },
    ],
  },
  {
    label: 'Review',
    items: [
      { href: '/analytics', label: 'Analytics' },
      { href: '/profile', label: 'Life Stats' },
    ],
  },
]

// Flat list used for active-item lookup and prefetch
const allNavItems = navGroups.flatMap((g) => g.items)

const prefetchMap: Partial<Record<string, () => Promise<unknown>>> = {
  '/finance': getFinanceOverview,
  '/health': getHealthOverview,
}

const prefetchQueryKeys: Partial<Record<string, string[]>> = {
  '/finance': ['finance-overview'],
  '/health': ['health-overview'],
}

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const activeItem = allNavItems.find((item) => item.href === location.pathname)

  // All sections start expanded; clicking the label toggles collapse
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleGroup = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }))

  const handlePrefetch = useCallback((href: string) => {
    const queryFn = prefetchMap[href]
    const queryKey = prefetchQueryKeys[href]
    if (queryFn && queryKey) {
      queryClient.prefetchQuery({ queryKey, queryFn, staleTime: 30_000 })
    }
  }, [queryClient])

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
          {navGroups.map((group) => {
            const isCollapsed = collapsed[group.label] ?? false
            return (
              <div key={group.label} className="nav-group">
                <button
                  type="button"
                  className="nav-group-toggle"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="nav-group-label">{group.label}</span>
                  <span className={`nav-group-chevron${isCollapsed ? ' collapsed' : ''}`}>›</span>
                </button>
                {!isCollapsed && (
                  <div className="nav-group-links">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                        to={item.href}
                        onClick={() => setDrawerOpen(false)}
                        onMouseEnter={() => handlePrefetch(item.href)}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" type="button" onClick={toggleTheme}>
            <span>{theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}</span>
          </button>
          <ExportButton />
          <p className="sidebar-shortcut-hint">⌘K — quick search</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">Home base</p>
            <h2 className="header-title">{activeItem?.label ?? 'Command Center'}</h2>
          </div>
        </header>

        <main className="page-grid">{children}</main>
      </div>

      <ChatPanel />
      <BottomNav />
      <CommandPalette />
    </div>
  )
}
