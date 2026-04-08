type DayScoreBadgeProps = {
  score: number
  /** Show a small label below the score */
  showLabel?: boolean
}

function scoreColor(score: number): string {
  if (score === 0) return 'var(--text-muted)'
  if (score >= 70) return 'var(--success)'
  if (score >= 40) return 'var(--warning)'
  return '#c0392b'
}

function scoreLabel(score: number): string {
  if (score === 0) return '–'
  if (score >= 70) return 'Great'
  if (score >= 40) return 'OK'
  return 'Low'
}

export function DayScoreBadge({ score, showLabel = false }: DayScoreBadgeProps) {
  const color = scoreColor(score)
  return (
    <span className="day-score-badge" style={{ '--score-color': color } as React.CSSProperties}>
      <span className="day-score-badge__value">{score > 0 ? score : '–'}</span>
      {showLabel ? <span className="day-score-badge__label">{scoreLabel(score)}</span> : null}
    </span>
  )
}
