import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type TrendDataPoint = {
  date: string
  value: number
}

type TrendChartProps = {
  data: TrendDataPoint[]
  label: string
  color?: string
  domain?: [number, number]
  formatValue?: (value: number) => string
  height?: number
}

export function TrendChart({
  data,
  label,
  color = 'var(--accent)',
  domain,
  formatValue = (v) => String(v),
  height = 120,
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        <p>No data yet</p>
      </div>
    )
  }

  // Shorten dates for display (e.g. "Apr 2")
  const displayData = data.map((point) => ({
    ...point,
    displayDate: new Date(`${point.date}T12:00:00`).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <div className="chart-wrap">
      <p className="chart-label">{label}</p>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={displayData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,50,62,0.07)" vertical={false} />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--mono)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--mono)' }}
            tickLine={false}
            axisLine={false}
            tickCount={4}
            tickFormatter={formatValue}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 12,
              fontFamily: 'var(--sans)',
              boxShadow: 'var(--shadow)',
            }}
            formatter={(value) => [typeof value === 'number' ? formatValue(value) : String(value), label]}
            labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${label})`}
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
