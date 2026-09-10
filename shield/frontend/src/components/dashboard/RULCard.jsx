export default function RULCard({
  hours = null,
  confidence = null,
  maxHours = 720,
}) {
  const hasRUL = Number.isFinite(hours)

  const pct = hasRUL
    ? Math.min(100, Math.max(0, (hours / maxHours) * 100))
    : 0

  const color = !hasRUL
    ? 'var(--color-muted)'
    : hours > 200
      ? 'var(--color-healthy)'
      : hours > 72
        ? 'var(--color-warning)'
        : 'var(--color-critical)'

  return (
    <div
      className="p-5 rounded-2xl border space-y-3 card-modern"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">
          Remaining Useful Life
        </span>

        {confidence !== null && (
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium"
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent-border)',
            }}
          >
            {Math.round(confidence * 100)}% Conf.
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-mono font-bold leading-none text-main">
          {hasRUL ? hours : '—'}
        </span>

        <span className="text-xs font-mono text-muted">
          {hasRUL ? 'HOURS REMAINING' : 'RUL NOT ESTIMABLE'}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted pt-1">
        <span>
          {hasRUL
            ? 'Estimated time to belt maintenance'
            : 'Insufficient trend confidence for estimation'}
        </span>

        {hasRUL && (
          <span className="font-mono">
            ~{(hours / 24).toFixed(1)} Days
          </span>
        )}
      </div>
    </div>
  )
}