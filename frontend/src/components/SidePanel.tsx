/* [AR] لوحة جانبية عامة — تنزلق من اليمين وتُغلق بـ Escape أو النقر على الخلفية */
/* [EN] Generic side panel — slides in from right, closes on Escape or backdrop click */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface SidePanelProps {
  isOpen: boolean
  onClose: () => void
  width?: number
  children: ReactNode
}

export function SidePanel({ isOpen, onClose, width = 440, children }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className="side-panel-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={panelRef}
        className="side-panel"
        style={{ width, maxWidth: '100vw' }}
      >
        <button className="side-panel-close" onClick={onClose} aria-label="Close panel">✕</button>
        {children}
      </div>
    </div>,
    document.body
  )
}
