import { cn } from '../../lib/utils'
import { Activity, Gauge, Zap, CheckCircle2 } from 'lucide-react'

export default function ConveyorOverview({ data }) {
  const { conveyor_id, status, speed_ms, load_pct, health_pct, condition } = data

  const isRunning = status === 'RUNNING'
  const statusColor = isRunning ? 'var(--color-healthy)' : 'var(--color-critical)'

  return (
    <div 
      className="p-6 rounded-2xl border h-full flex flex-col justify-between card-modern"
      style={{ 
        background: 'var(--color-surface)', 
        borderColor: 'var(--color-border)',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.25)'
      }}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold tracking-tight text-main">
                Conveyor {conveyor_id}
              </h3>
              <div 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium"
                style={{ 
                  background: isRunning ? 'var(--color-healthy-dim)' : 'var(--color-critical-dim)',
                  border: `1px solid ${isRunning ? 'var(--color-healthy-border)' : 'var(--color-critical-border)'}`,
                  color: statusColor 
                }}
              >
                <div 
                  className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isRunning ? 'animate-pulse' : '')}
                  style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}` }} 
                />
                <span>{status}</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Primary Overland Ore Transport
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span 
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{
                background: condition === 'NORMAL' ? 'var(--color-healthy-dim)' : 'var(--color-warning-dim)',
                border: `1px solid ${condition === 'NORMAL' ? 'var(--color-healthy-border)' : 'var(--color-warning-border)'}`,
                color: condition === 'NORMAL' ? 'var(--color-healthy)' : 'var(--color-warning)',
              }}
            >
              Condition: {condition}
            </span>
          </div>
        </div>

        {/* Primary Telemetry Triad — Sleek, Soft Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Surface Velocity', value: speed_ms?.toFixed(1), unit: 'm/s', icon: Gauge, color: 'var(--color-accent)' },
            { label: 'Dynamic Load',     value: load_pct?.toFixed(0),  unit: '%',   icon: Activity, color: 'var(--color-warning)' },
            { label: 'Aggregate Health', value: health_pct?.toFixed(1),unit: '%',   icon: Zap, color: 'var(--color-healthy)' },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <div 
              key={label} 
              className="p-4 rounded-xl border"
              style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border-subtle)' }}
            >
              <div className="flex items-center justify-between text-xs mb-2 text-muted">
                <span>{label}</span>
                <Icon size={14} style={{ color }} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-bold leading-none text-main">
                  {value}
                </span>
                <span className="text-xs font-mono text-muted">
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean Auxiliary Status Row */}
      <div 
        className="pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-muted">Belt Specification:</span>
          <span className="font-medium text-main">Steel Cord ST-3150 (1,200 m)</span>
        </div>
        <div className="flex items-center gap-4 text-muted">
          <span>Drive Motor: <span className="text-main font-medium">450 kW ABB</span></span>
          <span>Camera Stream: <span className="text-healthy font-medium">30 FPS Active</span></span>
        </div>
      </div>
    </div>
  )
}
