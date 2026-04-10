import { useState } from 'react'
import { getRoutineBriefing } from '../../lib/api'
import { todayStr } from './helpers'

export function AIMorningBriefing() {
  const today = todayStr()
  const cacheKey = `routine-briefing-${today}`

  const [open, setOpen] = useState(false)
  const [briefing, setBriefing] = useState<string | null>(() => {
    try { return localStorage.getItem(cacheKey) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [isFallback, setIsFallback] = useState(false)

  async function fetchBriefing() {
    if (briefing) { setOpen(true); return }
    setLoading(true)
    try {
      const result = await getRoutineBriefing()
      setBriefing(result.briefing)
      setIsFallback(result.fallback)
      try { localStorage.setItem(cacheKey, result.briefing) } catch { /* storage full */ }
      setOpen(true)
    } catch {
      setBriefing('Could not load briefing — check your AI configuration.')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  function refresh() {
    setBriefing(null)
    try { localStorage.removeItem(cacheKey) } catch { /* ignore */ }
    setLoading(true)
    setOpen(true)
    getRoutineBriefing().then(r => {
      setBriefing(r.briefing)
      setIsFallback(r.fallback)
      try { localStorage.setItem(cacheKey, r.briefing) } catch { /* ignore */ }
    }).catch(() => {
      setBriefing('Could not load briefing.')
    }).finally(() => setLoading(false))
  }

  const bullets = briefing?.split('\n').filter(l => l.trim()) ?? []

  return (
    <div className={`ra-briefing-card${open ? ' open' : ''}`}>
      <div className="ra-briefing-header" onClick={() => open ? setOpen(false) : fetchBriefing()}>
        <span className="ra-briefing-icon">✨</span>
        <span className="ra-briefing-title">Today's focus</span>
        {briefing && !loading && (
          <button
            className="ra-briefing-refresh"
            onClick={e => { e.stopPropagation(); refresh() }}
            title="Regenerate"
          >↻</button>
        )}
        {isFallback && briefing && <span className="ra-briefing-fallback-tag">offline</span>}
        <span className="ra-briefing-chevron">{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="ra-briefing-body">
          {loading ? (
            <p className="ra-briefing-loading">Generating…</p>
          ) : (
            <ul className="ra-briefing-bullets">
              {bullets.map((line, i) => (
                <li key={i} className="ra-briefing-bullet">
                  {line.replace(/^[•\-]\s*/, '')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
