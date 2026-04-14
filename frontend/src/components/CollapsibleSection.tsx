import { useState, useEffect } from 'react'

interface CollapsibleSectionProps {
  title: string
  storageKey: string
  defaultOpen?: boolean
  badge?: string
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = true,
  badge,
  children,
}: CollapsibleSectionProps) {
  const lsKey = `collapsed:${storageKey}`

  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(lsKey)
      return stored === null ? defaultOpen : stored === 'true'
    } catch {
      return defaultOpen
    }
  })

  useEffect(() => {
    try { localStorage.setItem(lsKey, String(open)) } catch { /* ignore */ }
  }, [open, lsKey])

  return (
    <div className="cs-wrapper">
      <button className="cs-header" onClick={() => setOpen(p => !p)}>
        <span className={`cs-chevron ${open ? 'cs-chevron--open' : 'cs-chevron--closed'}`}>▾</span>
        <span className="cs-title">{title}</span>
        {badge && <span className="cs-badge">{badge}</span>}
      </button>
      <div className={open ? 'cs-body' : 'cs-body cs-body--closed'}>
        {children}
      </div>
    </div>
  )
}
