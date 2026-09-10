/**
 * HealthGauge — SVG arc gauge showing health % 0–100
 * Color: HEALTHY ≥80, WARNING ≥50, CRITICAL <50
 * Per theme.md: no excessive animation, status colors for real state only.
 */
export default function HealthGauge({ value = 0, label = 'HEALTH' }) {
  const pct    = Math.min(100, Math.max(0, value))
  const status = pct >= 80 ? 'HEALTHY' : pct >= 50 ? 'WARNING' : 'CRITICAL'
  const color  = pct >= 80 ? 'var(--color-healthy)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-critical)'

  // SVG arc parameters
  const R  = 54
  const cx = 70, cy = 70
  const startAngle = -210
  const endAngle   = 30
  const totalDeg   = endAngle - startAngle    // 240°
  const fillDeg    = (pct / 100) * totalDeg

  function polarToXY(deg, r) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function arcPath(startDeg, endDeg, r) {
    const s = polarToXY(startDeg, r)
    const e = polarToXY(endDeg, r)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={140} height={110} viewBox="0 0 140 110">
        {/* Track */}
        <path
          d={arcPath(startAngle, endAngle, R)}
          stroke="var(--color-border)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
        />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={arcPath(startAngle, startAngle + fillDeg, R)}
            stroke={color}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            style={{ transition: 'all 0.5s ease' }}
          />
        )}
        {/* Value text */}
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize={20} fontWeight={600}
          fontFamily="'JetBrains Mono', monospace" fill="var(--color-text-main)">
          {pct.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={9}
          fontFamily="Inter, sans-serif" fill="var(--color-text-muted)">
          {label}
        </text>
      </svg>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-xs font-mono" style={{ color }}>{status}</span>
      </div>
    </div>
  )
}
