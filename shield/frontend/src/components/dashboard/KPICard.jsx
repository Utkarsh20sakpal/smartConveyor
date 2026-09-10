import { cn } from '../../lib/utils'

export default function KPICard({ 
  icon: Icon, 
  title, 
  value, 
  unit, 
  status, 
  trend, 
  subtitle, 
  className,
  accentColor 
}) {
  const statusColor =
    status === 'CRITICAL' ? 'var(--color-critical)' :
    status === 'WARNING'  ? 'var(--color-warning)'  :
    status === 'HEALTHY' || status === 'RUNNING' || status === 'ONLINE' ? 'var(--color-healthy)' :
    'var(--color-text-muted)'

  const statusBg =
    status === 'CRITICAL' ? 'var(--color-critical-dim)' :
    status === 'WARNING'  ? 'var(--color-warning-dim)'  :
    status === 'HEALTHY' || status === 'RUNNING' || status === 'ONLINE' ? 'var(--color-healthy-dim)' :
    'rgba(255, 255, 255, 0.04)'

  const statusBorder =
    status === 'CRITICAL' ? 'var(--color-critical-border)' :
    status === 'WARNING'  ? 'var(--color-warning-border)'  :
    status === 'HEALTHY' || status === 'RUNNING' || status === 'ONLINE' ? 'var(--color-healthy-border)' :
    'var(--color-border-subtle)'

  return (
    <div
      className={cn(
        "flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 card-modern",
        className
      )}
      style={{ 
        background: 'var(--color-surface)', 
        borderColor: 'var(--color-border)',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.25)'
      }}
    >
      <div className="flex items-center justify-between">
        <span 
          className="text-xs font-medium text-muted tracking-tight"
        >
          {title}
        </span>
        {Icon && (
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform"
            style={{ 
              background: accentColor ? `${accentColor}15` : 'rgba(255, 255, 255, 0.04)', 
              border: `1px solid ${accentColor ? `${accentColor}30` : 'var(--color-border-subtle)'}`,
              color: accentColor || 'var(--color-accent)' 
            }}
          >
            <Icon size={15} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 my-3">
        <span 
          className="text-3xl font-mono font-bold tracking-tight leading-none text-main" 
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono font-medium text-muted">
            {unit}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
        {status ? (
          <div 
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium"
            style={{ background: statusBg, border: `1px solid ${statusBorder}`, color: statusColor }}
          >
            <div 
              className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", status === 'CRITICAL' ? 'animate-pulse' : '')}
              style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}` }} 
            />
            <span>{status}</span>
          </div>
        ) : (
          <span className="text-xs text-dim">—</span>
        )}
        
        {subtitle && (
          <span className="text-[11px] text-muted truncate max-w-[150px]">
            {subtitle}
          </span>
        )}
        {trend && (
          <span className="text-xs font-mono font-medium text-muted ml-auto">
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}
