import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtTime } from '../../lib/utils'

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-2 py-1.5 rounded text-xs"
      style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }}>
      <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="font-mono">{payload[0].value?.toFixed(3)} {unit}</div>
    </div>
  )
}

/**
 * SensorChart — Recharts area chart for a single sensor value over time.
 * dataKey maps to a field from the features object.
 */
export default function SensorChart({ title, data = [], dataKey, unit, color }) {
  const chartColor = color || 'var(--color-accent)'

  // Format data for recharts: { time, value }
  const chartData = data.map(d => ({
    time: d.timestamp ? fmtTime(new Date(d.timestamp)) : '—',
    value: d.features?.[dataKey] ?? 0,
  }))

  return (
    <div className="p-3 rounded-md border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-main)' }}>{title}</span>
        {chartData.length > 0 && (
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {chartData[chartData.length - 1]?.value?.toFixed(3)} {unit}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gridline)" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Area
            type="monotone" dataKey="value"
            stroke={chartColor} strokeWidth={1.5}
            fill={`url(#grad-${dataKey})`}
            dot={false} activeDot={{ r: 3, fill: chartColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
