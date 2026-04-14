import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDashboardV2 } from '../lib/api'

// ── Static pages ──────────────────────────────────────────────────────────────

const PAGES = [
  { id: 'page-home',      label: 'Command Center',  href: '/',          icon: '⚡' },
  { id: 'page-goals',     label: 'Goals',            href: '/goals',     icon: '🎯' },
  { id: 'page-routine',   label: 'Daily Routine',    href: '/routine',   icon: '⏰' },
  { id: 'page-finance',   label: 'Finance',          href: '/finance',   icon: '💰' },
  { id: 'page-health',    label: 'Health',           href: '/health',    icon: '💪' },
  { id: 'page-analytics', label: 'Analytics',        href: '/analytics', icon: '📊' },
  { id: 'page-contacts',  label: 'Contacts',         href: '/contacts',  icon: '🤝' },
  { id: 'page-journal',   label: 'Journal',          href: '/journal',   icon: '📓' },
  { id: 'page-learning',  label: 'Learning',         href: '/learning',  icon: '📚' },
  { id: 'page-profile',   label: 'Life Stats',       href: '/profile',   icon: '🧬' },
  { id: 'page-bridge',   label: 'AI Data Bridge',   href: '/data-bridge', icon: '🔁' },
]

type PaletteItem = {
  id: string
  label: string
  sub?: string
  icon: string
  href?: string
  action?: () => void
}

// ── Fuzzy match ───────────────────────────────────────────────────────────────

function matches(item: PaletteItem, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    item.label.toLowerCase().includes(q) ||
    (item.sub?.toLowerCase().includes(q) ?? false)
  )
}

// ── Palette UI ────────────────────────────────────────────────────────────────

type CommandPaletteProps = {
  onClose: () => void
}

function CommandPaletteInner({ onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Prefetch top priorities from dashboard for node search
  const { data: dashData } = useQuery({
    queryKey: ['dashboard-v2'],
    queryFn: getDashboardV2,
    staleTime: 60_000,
  })

  // Build item list — top tasks from dashboard
  const nodeItems: PaletteItem[] = (dashData?.top_tasks ?? []).map((node: { id: string; title: string; status?: string }) => ({
    id: `node-${node.id}`,
    label: node.title,
    sub: node.status ? `${node.status} · task` : 'task',
    icon: '📌',
    href: `/goals?node=${node.id}`,
  }))

  const allItems: PaletteItem[] = [
    ...PAGES,
    ...(nodeItems.length > 0 ? nodeItems : []),
  ]

  const filtered = allItems.filter(item => matches(item, query))

  // Reset active index when filter changes
  useEffect(() => { setActiveIdx(0) }, [query])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[activeIdx]
      if (item) selectItem(item)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  function selectItem(item: PaletteItem) {
    onClose()
    if (item.href) navigate(item.href)
    else item.action?.()
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <span className="cmd-search-icon">⌘</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, nodes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Command palette search"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="cmd-clear-btn" onClick={() => setQuery('')} tabIndex={-1}>✕</button>
          )}
        </div>

        {filtered.length > 0 ? (
          <ul ref={listRef} className="cmd-list" role="listbox">
            {filtered.map((item, i) => (
              <li
                key={item.id}
                className={`cmd-item${i === activeIdx ? ' cmd-item-active' : ''}`}
                role="option"
                aria-selected={i === activeIdx}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="cmd-item-icon">{item.icon}</span>
                <span className="cmd-item-label">{item.label}</span>
                {item.sub && <span className="cmd-item-sub">{item.sub}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="cmd-empty">No results for "{query}"</p>
        )}

        <div className="cmd-footer">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}

// ── Exported wrapper ──────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!open) return null

  return createPortal(
    <CommandPaletteInner onClose={() => setOpen(false)} />,
    document.body,
  )
}
