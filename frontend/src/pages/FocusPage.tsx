import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getFocusContext } from '../lib/api'
import '../styles/focus.css'

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function Pomodoro() {
  const WORK_SECS = 25 * 60
  const BREAK_SECS = 5 * 60
  const [phase, setPhase] = useState<'work' | 'break'>('work')
  const [remaining, setRemaining] = useState(WORK_SECS)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id)
          setRunning(false)
          const next = phase === 'work' ? 'break' : 'work'
          setPhase(next)
          setRemaining(next === 'work' ? WORK_SECS : BREAK_SECS)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, phase])

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')
  const total = phase === 'work' ? WORK_SECS : BREAK_SECS
  const progress = ((total - remaining) / total) * 100

  function reset() {
    setRunning(false)
    setPhase('work')
    setRemaining(WORK_SECS)
  }

  return (
    <div className="focus-pomodoro">
      <div className="focus-pomodoro-phase">{phase === 'work' ? '🔥 Focus' : '☕ Break'}</div>
      <div className="focus-pomodoro-progress-bar">
        <div className="focus-pomodoro-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="focus-pomodoro-time">{mins}:{secs}</div>
      <div className="focus-pomodoro-controls">
        {running ? (
          <button type="button" className="button-ghost" onClick={() => setRunning(false)}>Pause</button>
        ) : (
          <button type="button" onClick={() => setRunning(true)}>
            {remaining === (phase === 'work' ? WORK_SECS : BREAK_SECS) ? 'Start' : 'Resume'}
          </button>
        )}
        <button type="button" className="button-ghost" onClick={reset}>Reset</button>
      </div>
    </div>
  )
}

export function FocusPage() {
  const now = useLiveClock()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['focus-context'],
    queryFn: getFocusContext,
    refetchInterval: 60_000,
  })

  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  if (isLoading) {
    return (
      <div className="focus-page">
        <div className="focus-loading">Loading your focus context…</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="focus-page">
        <div className="focus-loading">Could not load focus context. <button type="button" onClick={() => refetch()}>Retry</button></div>
      </div>
    )
  }

  const prayerChip = data.next_prayer && data.minutes_to_prayer !== null
    ? `${data.next_prayer} in ${data.minutes_to_prayer} min`
    : null

  return (
    <div className="focus-page">
      {/* ── Back link ── */}
      <Link to="/" className="focus-back">← Back</Link>

      {/* ── Clock ── */}
      <div className="focus-clock">{timeStr}</div>
      <div className="focus-date">{dateStr}</div>

      {/* ── Current block ── */}
      {data.current_block ? (
        <div className="focus-block-badge focus-block-now">
          ● NOW — {data.current_block.label}
        </div>
      ) : data.next_block ? (
        <div className="focus-block-badge focus-block-next">
          Next — {data.next_block.label} at {data.next_block.time}
        </div>
      ) : null}

      {/* ── The ONE thing ── */}
      {data.top_node ? (
        <div className="focus-action-card">
          <p className="focus-action-label">DO THIS NOW</p>
          <p className="focus-action-title">{data.top_node.title}</p>
          {data.top_node.dependent_count > 0 && (
            <p className="focus-action-why">
              Completing this unblocks {data.top_node.dependent_count} other item{data.top_node.dependent_count !== 1 ? 's' : ''}.
            </p>
          )}
          {data.instruction && (
            <p className="focus-instruction">{data.instruction}</p>
          )}
        </div>
      ) : (
        <div className="focus-action-card">
          <p className="focus-action-label">ALL CLEAR</p>
          <p className="focus-action-title">No active tasks found.</p>
          <p className="focus-action-why">Add goals to your pipeline to see what to work on here.</p>
        </div>
      )}

      {/* ── Pomodoro ── */}
      <Pomodoro />

      {/* ── Status chips ── */}
      <div className="focus-status-row">
        <span className={`focus-status-chip${data.morning_done ? ' done' : ''}`}>
          {data.morning_done ? '✓' : '○'} Morning check-in
        </span>
        <span className={`focus-status-chip${data.evening_done ? ' done' : ''}`}>
          {data.evening_done ? '✓' : '○'} Evening check-in
        </span>
        {prayerChip && (
          <span className="focus-status-chip focus-prayer-chip">
            🕌 {prayerChip}
          </span>
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="focus-quick-links">
        <Link to="/checkin" className="focus-quick-link">Check-in</Link>
        <Link to="/goals" className="focus-quick-link">Goals</Link>
        <Link to="/pipeline" className="focus-quick-link">Pipeline</Link>
        <Link to="/schedule" className="focus-quick-link">Schedule</Link>
      </div>
    </div>
  )
}
