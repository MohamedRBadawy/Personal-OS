import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SystemAlert } from '../lib/api'
import { dismissAlert, getAlertCount, listAlerts, markAlertRead, markAllAlertsRead } from '../lib/api'
import '../styles/alerts.css'

const PRIORITY_CONFIG = {
  critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: '#dc2626', icon: '🚨' },
  warning:  { color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: '#d97706', icon: '⚠️' },
  info:     { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: '#6366f1', icon: 'ℹ️'  },
}

function AlertRow({ alert, onRead, onDismiss }: {
  alert: SystemAlert
  onRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const navigate = useNavigate()
  const cfg = PRIORITY_CONFIG[alert.priority]

  function handleClick() {
    onRead(alert.id)
    if (alert.link_url) navigate(alert.link_url)
  }

  return (
    <div
      className={`alert-row${alert.read ? ' alert-row-read' : ''}`}
      style={{ borderLeftColor: cfg.border, background: alert.read ? undefined : cfg.bg }}
    >
      <button type="button" className="alert-row-body" onClick={handleClick}>
        <span className="alert-row-icon">{cfg.icon}</span>
        <div className="alert-row-text">
          <p className="alert-row-title">{alert.title}</p>
          <p className="alert-row-body-text">{alert.body}</p>
          <p className="alert-row-date">{alert.date}</p>
        </div>
      </button>
      <button
        type="button"
        className="alert-dismiss-btn"
        title="Dismiss"
        onClick={() => onDismiss(alert.id)}
      >✕</button>
    </div>
  )
}

export function AlertPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  // Fast badge count — polls every 60s, doesn't trigger alert generation
  const { data: countData } = useQuery({
    queryKey: ['alert-count'],
    queryFn: getAlertCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  // Full alerts list — only fetched when panel is open (triggers generation)
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts-list'],
    queryFn: listAlerts,
    enabled: open,
    staleTime: 30_000,
  })

  const readMut = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-count'] })
      qc.invalidateQueries({ queryKey: ['alerts-list'] })
    },
  })

  const dismissMut = useMutation({
    mutationFn: dismissAlert,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-count'] })
      qc.invalidateQueries({ queryKey: ['alerts-list'] })
    },
  })

  const readAllMut = useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-count'] })
      qc.invalidateQueries({ queryKey: ['alerts-list'] })
    },
  })

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unread = countData?.unread_count ?? 0
  const critical = countData?.critical_count ?? 0
  const alerts = alertsData?.alerts ?? []

  const grouped = {
    critical: alerts.filter(a => a.priority === 'critical' && !a.dismissed_at),
    warning:  alerts.filter(a => a.priority === 'warning'  && !a.dismissed_at),
    info:     alerts.filter(a => a.priority === 'info'      && !a.dismissed_at),
  }
  const hasAlerts = alerts.filter(a => !a.dismissed_at).length > 0

  return (
    <div className="alert-panel-wrapper" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        className={`alert-bell${critical > 0 ? ' alert-bell-critical' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Alerts"
      >
        🔔
        {unread > 0 && (
          <span className={`alert-badge${critical > 0 ? ' alert-badge-critical' : ''}`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="alert-dropdown">
          <div className="alert-dropdown-header">
            <span className="alert-dropdown-title">Alerts</span>
            {unread > 0 && (
              <button
                type="button"
                className="alert-mark-all-btn"
                onClick={() => readAllMut.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="alert-dropdown-body">
            {isLoading && <p className="alert-empty">Loading…</p>}

            {!isLoading && !hasAlerts && (
              <div className="alert-empty-state">
                <span className="alert-empty-icon">✓</span>
                <p>All clear — no alerts</p>
              </div>
            )}

            {(['critical', 'warning', 'info'] as const).map(priority => {
              const group = grouped[priority]
              if (group.length === 0) return null
              return (
                <div key={priority} className="alert-group">
                  <p className="alert-group-label" style={{ color: PRIORITY_CONFIG[priority].color }}>
                    {PRIORITY_CONFIG[priority].icon} {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </p>
                  {group.map(alert => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onRead={id => readMut.mutate(id)}
                      onDismiss={id => dismissMut.mutate(id)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
