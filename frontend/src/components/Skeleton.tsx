type SkeletonProps = {
  width?: string
  height?: string
  className?: string
}

export function Skeleton({ width = '100%', height = '1em', className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={{ width, height }} />
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="0.9em" />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton height="0.7em" width="40%" />
      <Skeleton height="1.6em" width="60%" />
    </div>
  )
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="metric-grid">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
