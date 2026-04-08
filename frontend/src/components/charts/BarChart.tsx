import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type BarDataPoint = {
  label: string
  value: number
  color?: string
}

type BarChartProps = {
  data: BarDataPoint[]
  title: string
  formatValue?: (value: number) => string
  maxValue?: number
  height?: number
  color?: string
}

export function BarChart({
  data,
  title,
  formatValue = (v) => String(v),
  maxValue,
  height = 140,
  color = 'var(--accent)',
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        <p>No data yet</p>
      </div>
    )
  }

  return (
    <div className="chart-wrap">
      <p className="chart-label">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,50,62,0.07)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--mono)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={maxValue ? [0, maxValue] : undefined}
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
            formatter={(value) => [typeof value === 'number' ? formatValue(value) : String(value), title]}
            cursor={{ fill: 'rgba(17,50,62,0.04)' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color ?? color} fillOpacity={0.85} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
