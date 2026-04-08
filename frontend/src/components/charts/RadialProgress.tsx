type RadialProgressProps = {
  /** 0–100 */
  percent: number
  label?: string
  sublabel?: string
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
}

export function RadialProgress({
  percent,
  label,
  sublabel,
  size = 100,
  strokeWidth = 8,
  color = 'var(--accent)',
  trackColor = 'rgba(17,50,62,0.08)',
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPct = Math.max(0, Math.min(100, percent))
  const offset = circumference - (clampedPct / 100) * circumference
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="radial-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="radial-progress__center">
        {label ? <strong className="radial-progress__value">{label}</strong> : null}
        {sublabel ? <span className="radial-progress__sub">{sublabel}</span> : null}
      </div>
    </div>
  )
}
