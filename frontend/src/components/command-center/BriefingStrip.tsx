import { useState } from 'react'
import { StatusPill } from '../StatusPill'
import { formatCurrency, formatPercent } from '../../lib/formatters'

type BriefingStripProps = {
  briefingText: string
  keySignals: string[]
  encouragement: string
  reducedMode: boolean
  kyrgyzstanPct: number
  independentIncome: number
  target: number | string
}

export function BriefingStrip({
  briefingText,
  keySignals,
  encouragement,
  reducedMode,
  kyrgyzstanPct,
  independentIncome,
  target,
}: BriefingStripProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="briefing-strip">
      <p>{briefingText}</p>
      <div className="briefing-strip__meta">
        {reducedMode ? <StatusPill label="Reduced mode" /> : null}
        <span className="briefing-strip__northstar">
          {formatCurrency(independentIncome)} <span className="briefing-strip__northstar-sep">/</span> {formatCurrency(Number(target))}
          <span className="briefing-strip__northstar-pct"> · {formatPercent(kyrgyzstanPct)}</span>
        </span>
        <button
          className="button-ghost briefing-strip__toggle"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Less' : 'Signals ↓'}
        </button>
      </div>
      {expanded ? (
        <ul className="briefing-strip__signals">
          {keySignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
          {encouragement ? <li className="briefing-strip__encouragement">{encouragement}</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
