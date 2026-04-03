type SparkBarsProps = {
  values: number[]
  suffix?: string
}

export function SparkBars({ values, suffix = '' }: SparkBarsProps) {
  const max = Math.max(...values, 1)

  return (
    <div className="sparkbars" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="sparkbar"
          style={{ height: `${Math.max((value / max) * 100, 10)}%` }}
          title={`${value}${suffix}`}
        />
      ))}
    </div>
  )
}
