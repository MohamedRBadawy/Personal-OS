import { useEffect, useState, type PropsWithChildren } from 'react'
import { pingSystemHealth } from '../lib/api'

type BackendWakeGateProps = PropsWithChildren

type BackendStatus = 'checking' | 'ready' | 'waiting'

const RETRY_INTERVAL_MS = 3000

export function BackendWakeGate({ children }: BackendWakeGateProps) {
  const [status, setStatus] = useState<BackendStatus>('checking')
  const [attempts, setAttempts] = useState(0)
  const [lastMessage, setLastMessage] = useState('Waking the backend for the first request.')

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    async function checkBackend() {
      if (cancelled) return

      try {
        await pingSystemHealth()
        if (!cancelled) {
          setStatus('ready')
        }
        return
      } catch (error) {
        if (cancelled) return

        setAttempts((value) => value + 1)
        setStatus('waiting')
        setLastMessage(
          error instanceof Error && error.message
            ? error.message
            : 'The backend is still starting up.',
        )
        timer = window.setTimeout(checkBackend, RETRY_INTERVAL_MS)
      }
    }

    void checkBackend()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  if (status === 'ready') {
    return <>{children}</>
  }

  return (
    <div className="backend-wake-screen">
      <div className="backend-wake-card">
        <p className="eyebrow">Backend Status</p>
        <h1 className="backend-wake-title">Starting Personal OS</h1>
        <p className="backend-wake-copy">
          Render free services sleep when idle. We are waking the API before loading your dashboard so the app feels stable.
        </p>
        <div className="backend-wake-progress" aria-hidden="true">
          <span className="backend-wake-progress__bar" />
        </div>
        <p className="backend-wake-meta">
          {attempts > 0 ? `Retry ${attempts}. ` : ''}
          {lastMessage}
        </p>
      </div>
    </div>
  )
}
