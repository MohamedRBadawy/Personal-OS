import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listTimeLogs, createTimeLog, deleteTimeLog } from '../../lib/api'
import type { Node, TimeLog } from '../../lib/types'
import { formatMinutes, formatElapsed } from './utils'

const TIMER_KEY = (nodeId: string) => `timer_start_${nodeId}`

export function TimerSection({ node }: { node: Node }) {
  const qc = useQueryClient()
  const storageKey = TIMER_KEY(node.id)

  const [running, setRunning] = useState(() => !!localStorage.getItem(storageKey))
  const [elapsed, setElapsed] = useState('0:00')
  const [manualMin, setManualMin] = useState('')
  const [note, setNote] = useState('')
  const [logNote, setLogNote] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: logs = [] } = useQuery<TimeLog[]>({
    queryKey: ['timelogs', node.id],
    queryFn: () => listTimeLogs(node.id),
  })

  const totalMinutes = logs.reduce((sum, l) => sum + l.minutes, 0)

  const createMut = useMutation({
    mutationFn: (p: Parameters<typeof createTimeLog>[0]) => createTimeLog(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timelogs', node.id] }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTimeLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timelogs', node.id] }),
  })

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    const startMs = Number(localStorage.getItem(storageKey))
    intervalRef.current = setInterval(() => {
      setElapsed(formatElapsed(startMs))
    }, 1000)
    setElapsed(formatElapsed(startMs))
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, storageKey])

  function handleStart() {
    localStorage.setItem(storageKey, String(Date.now()))
    setRunning(true)
  }

  function handleStop() {
    const startMs = Number(localStorage.getItem(storageKey))
    const minutes = Math.max(1, Math.round((Date.now() - startMs) / 60000))
    localStorage.removeItem(storageKey)
    setRunning(false)
    setElapsed('0:00')
    createMut.mutate({
      node: node.id,
      started_at: new Date(startMs).toISOString(),
      ended_at: new Date().toISOString(),
      minutes,
      note: logNote,
    })
    setLogNote('')
  }

  function handleManualLog() {
    const min = parseInt(manualMin)
    if (!min || min < 1) return
    createMut.mutate({ node: node.id, minutes: min, note })
    setManualMin('')
    setNote('')
  }

  return (
    <div className="timer-section">
      <div className="timer-header">
        <span className="timer-label">Time Tracker</span>
        <span className="timer-total">{formatMinutes(totalMinutes)} total</span>
      </div>

      <div className="timer-controls">
        {running ? (
          <>
            <span className="timer-elapsed timer-active">{elapsed}</span>
            <input
              className="form-input"
              placeholder="Session note (optional)"
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              style={{ flex: 1, fontSize: 14 }}
            />
            <button className="btn-danger" style={{ fontSize: 14, padding: '4px 10px' }} onClick={handleStop}>
              Stop
            </button>
          </>
        ) : (
          <button className="btn-ghost-sm" onClick={handleStart} style={{ fontSize: 14 }}>
            ▶ Start session
          </button>
        )}
      </div>

      {!running && (
        <div className="timer-manual">
          <input
            className="form-input"
            type="number"
            min={1}
            placeholder="Minutes"
            value={manualMin}
            onChange={e => setManualMin(e.target.value)}
            style={{ width: 80, fontSize: 14 }}
          />
          <input
            className="form-input"
            placeholder="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ flex: 1, fontSize: 14 }}
          />
          <button
            className="btn-ghost-sm"
            style={{ fontSize: 14 }}
            disabled={!manualMin || parseInt(manualMin) < 1}
            onClick={handleManualLog}
          >
            Log
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <ul className="timer-log-list">
          {logs.slice(0, 5).map(l => (
            <li key={l.id} className="timer-log-item">
              <span className="timer-log-time">{formatMinutes(l.minutes)}</span>
              <span className="timer-log-note">{l.note || new Date(l.logged_at).toLocaleDateString()}</span>
              <button className="sp-attachment-delete" onClick={() => deleteMut.mutate(l.id)} title="Remove">✕</button>
            </li>
          ))}
          {logs.length > 5 && (
            <li className="timer-log-more">+{logs.length - 5} more sessions</li>
          )}
        </ul>
      )}
    </div>
  )
}
