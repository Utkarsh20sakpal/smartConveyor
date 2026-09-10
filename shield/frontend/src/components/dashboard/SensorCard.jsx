import { cn, fmtTime } from '../../lib/utils'

export default function SensorCard({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  status, 
  lastUpdated, 
  trend, 
  className,
  range 
}) {
  const statusColor =
    status === 'CRITICAL' ? 'var(--color-critical)' :
    status === 'WARNING'  ? 'var(--color-warning)'  :
    'var(--color-healthy)'

  const statusBg =
    status === 'CRITICAL' ? 'var(--color-critical-dim)' :
    status === 'WARNING'  ? 'var(--color-warning-dim)'  :
    'var(--color-healthy-dim)'

  const statusBorder =
    status === 'CRITICAL' ? 'var(--color-critical-border)' :
    status === 'WARNING'  ? 'var(--color-warning-border)'  :
    'var(--color-healthy-border)'

  const trendSymbol = trend === 'UP' ? '↗' : trend === 'DOWN' ? '↘' : '→'

  return (
    <div
      className={cn(
        "flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 hover:border-accent/40 card-modern", 
        className
      )}
      style={{ 
        background: 'var(--color-surface)', 
        borderColor: 'var(--color-border)',
        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-accent)' }}
            >
              <Icon size={14} />
            </div>
          )}
          <span className="text-xs font-medium text-main">
            {label}
          </span>
        </div>
        
        <div 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
          style={{ background: statusBg, border: `1px solid ${statusBorder}`, color: statusColor }}
        >
          <div 
            className={cn("w-1.5 h-1.5 rounded-full", status === 'CRITICAL' ? 'animate-pulse' : '')}
            style={{ background: statusColor }} 
          />
          <span>{status}</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between my-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-bold leading-none tracking-tight text-main">
            {value}
          </span>
          <span className="text-xs font-mono text-muted">
            {unit}
          </span>
        </div>
        
        {trend && (
          <div 
            className="flex items-center gap-1 text-xs font-mono font-medium"
            style={{
              color: trend === 'UP' ? 'var(--color-warning)' : trend === 'DOWN' ? 'var(--color-healthy)' : 'var(--color-text-muted)'
            }}
          >
            <span>{trendSymbol}</span>
            <span className="text-[10px]">{trend}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t text-[11px]" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <span className="text-muted">
          {range ? `Normal: ${range}` : 'Continuous Telemetry'}
        </span>
        {lastUpdated && (
          <span className="text-muted font-mono">
            {fmtTime(new Date(lastUpdated))}
          </span>
        )}
      </div>
    </div>
  )
}
