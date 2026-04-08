import { Skeleton, SkeletonMetricGrid, SkeletonText } from './Skeleton'

type PageSkeletonProps = {
  variant?: 'workspace' | 'record' | 'command'
}

function WorkspaceSkeleton() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <Skeleton width="8em" height="0.7em" />
          <Skeleton width="24em" height="1.4em" className="skeleton-mt" />
          <Skeleton width="32em" height="0.9em" className="skeleton-mt" />
        </div>
      </div>
      <SkeletonMetricGrid count={4} />
      <div className="two-column">
        <div className="panel">
          <Skeleton width="10em" height="1em" />
          <SkeletonText lines={4} />
        </div>
        <div className="panel">
          <Skeleton width="10em" height="1em" />
          <SkeletonText lines={4} />
        </div>
      </div>
    </section>
  )
}

function RecordSkeleton() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <Skeleton width="8em" height="0.7em" />
          <Skeleton width="20em" height="1.4em" className="skeleton-mt" />
        </div>
      </div>
      <div className="panel">
        <Skeleton width="10em" height="1em" />
        <SkeletonText lines={3} />
      </div>
      <div className="record-list">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="panel">
            <Skeleton width="60%" height="1em" />
            <Skeleton width="40%" height="0.8em" className="skeleton-mt" />
          </div>
        ))}
      </div>
    </section>
  )
}

function CommandSkeleton() {
  return (
    <section className="page">
      <div className="panel" style={{ padding: 22 }}>
        <Skeleton width="6em" height="0.7em" />
        <Skeleton width="16em" height="2em" className="skeleton-mt" />
        <SkeletonText lines={2} />
      </div>
      <SkeletonMetricGrid count={5} />
      <div className="two-column">
        <div className="panel">
          <Skeleton width="10em" height="1em" />
          <SkeletonText lines={5} />
        </div>
        <div className="panel">
          <Skeleton width="10em" height="1em" />
          <SkeletonText lines={3} />
        </div>
      </div>
    </section>
  )
}

export function PageSkeleton({ variant = 'workspace' }: PageSkeletonProps) {
  if (variant === 'record') return <RecordSkeleton />
  if (variant === 'command') return <CommandSkeleton />
  return <WorkspaceSkeleton />
}
