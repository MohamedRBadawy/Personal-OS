// [AR] قشرة التطبيق الرئيسية — الشريط الجانبي بالمحاور السبعة والمحتوى الرئيسي
// [EN] Main app shell — 7-hub sidebar with icons + grouped nav + main content wrapper
// Connects to: AppRoutes (renders children), QuickCaptureModal, BottomNav, ChatPanel

import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  Hammer,
  Heart,
  Menu,
  Target,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { AlertPanel } from '../components/AlertPanel'
import { BottomNav } from '../components/BottomNav'
import { CommandPalette } from '../components/CommandPalette'
import { ExportButton } from '../components/ExportButton'
import { QuickCaptureModal } from '../components/QuickCaptureModal'
import { ThemeToggle } from '../components/ThemeToggle'
import { ChatPanel } from '../components/chat/ChatPanel'
import { getFinanceOverview, getHealthOverview } from '../lib/api'

// [AR] طبقات التنقل الثلاث: تنفيذ / وعي / توجيه
// [EN] Three navigation layers driving hub organisation
type HubLayer = 'execution' | 'awareness' | 'direction'

type Hub = {
  id: string
  label: string
  layer: HubLayer
  color: string
  href: string
  subRoutes: string[]
  icon: LucideIcon
}

// [AR] المحاور السبعة — مرتبة بحسب مبدأ الطبقات الثلاث، كل محور بأيقونة ولون مميز
// [EN] Seven hubs — ordered by layer (execution → awareness → direction), each with an icon and accent color
const HUBS: Hub[] = [
  // execution — active work
  { id: 'now',          label: 'Now',          layer: 'execution', color: 'var(--color-hub-now)',          href: '/',         subRoutes: ['/', '/focus', '/daily', '/schedule'], icon: Zap },
  { id: 'build',        label: 'Build',        layer: 'execution', color: 'var(--color-hub-build)',        href: '/business',  subRoutes: ['/business'],                         icon: Hammer },
  // awareness — monitoring
  { id: 'life',         label: 'Life',         layer: 'awareness', color: 'var(--color-hub-life)',         href: '/health',    subRoutes: ['/health', '/finance', '/journal'],    icon: Heart },
  {
    id: 'intelligence',
    label: 'Intelligence',
    layer: 'awareness',
    color: 'var(--color-hub-intelligence)',
    href: '/analytics',
    subRoutes: ['/analytics', '/data-bridge'],
    icon: BarChart3,
  },
  // direction — planning
  { id: 'goals',        label: 'Goals',        layer: 'direction', color: 'var(--color-hub-goals)',        href: '/goals',     subRoutes: ['/goals'],                            icon: Target },
  { id: 'learn',        label: 'Learn',        layer: 'direction', color: 'var(--color-hub-learn)',        href: '/learn',     subRoutes: ['/learn'],                            icon: BookOpen },
  { id: 'profile',      label: 'Profile',      layer: 'direction', color: 'var(--color-hub-profile)',      href: '/profile',   subRoutes: ['/profile', '/contacts'],             icon: User },
]

// [AR] جلب مسبق للصفحات الثقيلة عند تحريك المؤشر
// [EN] Prefetch heavy pages on hub hover to reduce perceived latency
const PREFETCH_FN: Partial<Record<string, () => Promise<unknown>>> = {
  '/finance': getFinanceOverview,
  '/health': getHealthOverview,
}

const PREFETCH_KEYS: Partial<Record<string, string[]>> = {
  '/finance': ['finance-overview'],
  '/health': ['health-overview'],
}

// [AR] تسميات الطبقات — مختصرة للشريط الجانبي، كاملة لرأس الصفحة
// [EN] Layer labels — short for nav groups, long for page header eyebrow
const LAYER_SHORT: Record<HubLayer, string> = {
  execution: 'DO',
  awareness: 'SEE',
  direction: 'PLAN',
}

const LAYER_LONG: Record<HubLayer, string> = {
  execution: 'Active Work',
  awareness: 'Awareness',
  direction: 'Direction',
}

const LAYER_ORDER: HubLayer[] = ['execution', 'awareness', 'direction']

const HUB_GROUPS = LAYER_ORDER.map((layer) => ({
  layer,
  label: LAYER_SHORT[layer],
  hubs: HUBS.filter((h) => h.layer === layer),
}))

// [AR] مطابقة المحور النشط — يدعم مسارات التفاصيل الفرعية
// [EN] Active hub matching — supports sub-routes like /goals/123 → Goals hub
function resolveActiveHub(pathname: string): Hub | undefined {
  return HUBS.find((hub) =>
    hub.subRoutes.some((route) =>
      route === '/'
        ? pathname === '/'
        : pathname === route || pathname.startsWith(route + '/')
    )
  )
}

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)

  // [AR] المحور النشط — يطابق المسار الكامل بما فيه مسارات التفاصيل الفرعية
  // [EN] Active hub — prefix-matches including detail routes (/goals/123 → Goals)
  const activeHub = resolveActiveHub(location.pathname)

  // [AR] صفحة فرعية — يظهر زر الرجوع عندما يكون المسار أعمق من مستوى واحد
  // [EN] Sub-page — back button shown when path is deeper than one segment (/goals/123, not /goals)
  const isSubPage = location.pathname.split('/').filter(Boolean).length > 1

  // Close drawer when route changes
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault()
        setQuickCaptureOpen((open) => !open)
      }
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('chat:open', {
          detail: {
            mode: 'thinking_companion',
            welcome: "Drop your raw thought here. I'll guide you through it — one question at a time — until we reach a clear decision.",
            placeholder: "Dump your raw thought here — I'll help you figure out what it is and what to do with it.",
          },
        }))
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handlePrefetch = useCallback((href: string) => {
    const queryFn = PREFETCH_FN[href]
    const queryKey = PREFETCH_KEYS[href]
    if (queryFn && queryKey) {
      queryClient.prefetchQuery({ queryKey, queryFn, staleTime: 30_000 })
    }
  }, [queryClient])

  return (
    <div className="app-shell" data-hub={activeHub?.id}>
      <aside className={drawerOpen ? 'app-sidebar open' : 'app-sidebar'}>
        {/* Sidebar brand */}
        <div className="sidebar-brand">
          <p className="eyebrow">Personal OS</p>
          <h1 className="app-title">One clear surface for everything.</h1>
        </div>

        {/* [AR] قائمة التنقل — مجمعة بحسب طبقات DO/SEE/PLAN
            [EN] Nav — grouped by DO/SEE/PLAN layers */}
        <nav aria-label="Primary" className="hub-nav">
          {HUB_GROUPS.map(({ layer, label, hubs }) => (
            <div key={layer} className="nav-group">
              <p className="nav-group-label">{label}</p>
              <div className="nav-group-links">
                {hubs.map((hub) => {
                  const Icon = hub.icon
                  return (
                    <NavLink
                      key={hub.id}
                      className={activeHub?.id === hub.id ? 'hub-item active' : 'hub-item'}
                      data-hub={hub.id}
                      style={{ '--hub-color': hub.color } as React.CSSProperties}
                      to={hub.href}
                      onMouseEnter={() => handlePrefetch(hub.href)}
                    >
                      <Icon
                        className="hub-icon"
                        size={16}
                        color="currentColor"
                        strokeWidth={activeHub?.id === hub.id ? 2.5 : 1.75}
                        aria-hidden="true"
                      />
                      <span className="hub-label">{hub.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="sidebar-footer">
          <ThemeToggle />
          <ExportButton className="sidebar-export-btn" />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          {/* [AR] زر القائمة — يظهر فقط على الشاشات الصغيرة
              [EN] Menu button — mobile only, hidden on desktop */}
          <button
            className="nav-toggle"
            type="button"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {drawerOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>

          <div className="app-header__identity">
            {/* [AR] زر الرجوع — يظهر على الصفحات الفرعية مثل /goals/123
                [EN] Back button — appears on detail pages like /goals/123 */}
            {isSubPage && (
              <button
                className="header-back-btn"
                type="button"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={13} strokeWidth={2.5} aria-hidden="true" />
                Back
              </button>
            )}
            <p className="eyebrow">{activeHub ? LAYER_LONG[activeHub.layer] : 'Dashboard'}</p>
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
        style={{ '--hub-color': activeHub?.color } as React.CSSProperties}
        onClick={() => setQuickCaptureOpen(true)}
      >
        +
      </button>

      {quickCaptureOpen && <QuickCaptureModal onClose={() => setQuickCaptureOpen(false)} />}
    </div>
  )
}
