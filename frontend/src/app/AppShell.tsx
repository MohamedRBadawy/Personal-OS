// [AR] قشرة التطبيق الرئيسية — الشريط الجانبي بالمحاور السبعة والمحتوى الرئيسي
// [EN] Main app shell — 7-hub flat sidebar + main content wrapper
// Connects to: AppRoutes (renders children), QuickCaptureModal, BottomNav, ChatPanel

import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BottomNav } from '../components/BottomNav'
import { ChatPanel } from '../components/chat/ChatPanel'
import { CommandPalette } from '../components/CommandPalette'
import { AlertPanel } from '../components/AlertPanel'
import { ExportButton } from '../components/ExportButton'
import { QuickCaptureModal } from '../components/QuickCaptureModal'
import { getFinanceOverview, getHealthOverview } from '../lib/api'
import { useTheme } from '../lib/useTheme'

// [AR] طبقات التنقل الثلاث: تنفيذ / وعي / توجيه
// [EN] Three navigation layers driving hub organisation
type HubLayer = 'execution' | 'awareness' | 'direction'

type Hub = {
  id: string
  label: string
  layer: HubLayer
  icon: string
  href: string
  subRoutes: string[]
}

// [AR] المحاور السبعة — مرتبة بحسب مبدأ الطبقات الثلاث
// [EN] Seven flat hubs — ordered by the three-layer principle (do / see / plan)
const HUBS: Hub[] = [
  { id: 'now',          label: 'Now',          layer: 'execution', icon: '⚡', href: '/',          subRoutes: ['/', '/focus', '/daily', '/schedule'] },
  { id: 'goals',        label: 'Goals',        layer: 'direction', icon: '🎯', href: '/goals',      subRoutes: ['/goals'] },
  { id: 'build',        label: 'Build',        layer: 'execution', icon: '🏗',  href: '/business',  subRoutes: ['/business'] },
  { id: 'life',         label: 'Life',         layer: 'awareness', icon: '💚', href: '/health',     subRoutes: ['/health', '/finance', '/journal'] },
  { id: 'learn',        label: 'Learn',        layer: 'direction', icon: '📚', href: '/learn',      subRoutes: ['/learn'] },
  { id: 'intelligence', label: 'Intelligence', layer: 'awareness', icon: '🔍', href: '/analytics',  subRoutes: ['/analytics', '/data-bridge'] },
  { id: 'profile',      label: 'Profile',      layer: 'direction', icon: '👤', href: '/profile',    subRoutes: ['/profile', '/contacts'] },
]

// [AR] جلب مسبق للصفحات الثقيلة عند تحريك المؤشر
// [EN] Prefetch heavy pages on hub hover to reduce perceived latency
const PREFETCH_FN: Partial<Record<string, () => Promise<unknown>>> = {
  '/finance': getFinanceOverview,
  '/health':  getHealthOverview,
}
const PREFETCH_KEYS: Partial<Record<string, string[]>> = {
  '/finance': ['finance-overview'],
  '/health':  ['health-overview'],
}

// [AR] تسميات الطبقات المعروضة بجانب كل محور
// [EN] Short layer labels shown beside each hub item
const LAYER_LABELS: Record<HubLayer, string> = {
  execution: 'do',
  awareness: 'see',
  direction: 'plan',
}

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // [AR] المحور النشط — الذي يحتوي المسار الحالي في قائمة مساراته
  // [EN] Active hub resolved by matching current pathname against each hub's subRoutes
  const activeHub = HUBS.find(h => h.subRoutes.includes(location.pathname))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        setQuickCaptureOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handlePrefetch = useCallback((href: string) => {
    const fn  = PREFETCH_FN[href]
    const key = PREFETCH_KEYS[href]
    if (fn && key) queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: 30_000 })
  }, [queryClient])

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Mobile drawer toggle */}
      <button
        aria-expanded={drawerOpen}
        className="sidebar-toggle"
        type="button"
        onClick={() => setDrawerOpen(c => !c)}
      >
        {drawerOpen ? 'Close navigation' : 'Open navigation'}
      </button>

      <aside className={drawerOpen ? 'app-sidebar open' : 'app-sidebar'}>
        <button
          className="sidebar-collapse-btn"
          type="button"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed(c => !c)}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        {!sidebarCollapsed && (
          <>
            <div className="sidebar-brand">
              <p className="eyebrow">Personal OS</p>
              <h1 className="app-title">One clear surface for everything.</h1>
            </div>

            {/* [AR] قائمة المحاور السبعة المسطحة — بلا مجموعات قابلة للطي
                [EN] Flat 7-hub list — no collapsible groups, no nesting */}
            <nav aria-label="Primary" className="hub-nav">
              {HUBS.map(hub => (
                <NavLink
                  key={hub.id}
                  to={hub.href}
                  className={activeHub?.id === hub.id ? 'hub-item active' : 'hub-item'}
                  data-layer={hub.layer}
                  onClick={() => setDrawerOpen(false)}
                  onMouseEnter={() => handlePrefetch(hub.href)}
                >
                  <span className="hub-icon">{hub.icon}</span>
                  <span className="hub-label">{hub.label}</span>
                  <span className="hub-layer-badge">{LAYER_LABELS[hub.layer]}</span>
                </NavLink>
              ))}
            </nav>

            <div className="sidebar-footer">
              <button className="theme-toggle" type="button" onClick={toggleTheme}>
                {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
              </button>
              <ExportButton />
              <p className="sidebar-shortcut-hint">⌘K · Ctrl+Shift+I capture</p>
            </div>
          </>
        )}
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">{activeHub ? LAYER_LABELS[activeHub.layer] : 'home'}</p>
            <h2 className="header-title">{activeHub?.label ?? 'Home'}</h2>
          </div>
          <AlertPanel />
        </header>
        <main className="page-grid">{children}</main>
      </div>

      <ChatPanel />
      <BottomNav />
      <CommandPalette />

      {/* [AR] زر التقاط الأفكار السريع — موجود في كل الصفحات
          [EN] Quick capture FAB — present on every page, routes automatically */}
      <button
        className="quick-capture-fab"
        title="Capture (Ctrl+Shift+I)"
        onClick={() => setQuickCaptureOpen(true)}
      >
        💡
      </button>

      {quickCaptureOpen && <QuickCaptureModal onClose={() => setQuickCaptureOpen(false)} />}
    </div>
  )
}
