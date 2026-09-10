import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { fmtTime } from '../../lib/utils'
import StatusBadge from '../common/StatusBadge'

const SEV_STYLE = {
  CRITICAL: { bg: 'var(--color-critical-dim)', border: 'var(--color-critical-border)', text: 'var(--color-critical)' },
  WARNING:  { bg: 'var(--color-warning-dim)', border: 'var(--color-warning-border)', text: 'var(--color-warning)' },
  NORMAL:   { bg: 'var(--color-healthy-dim)', border: 'var(--color-healthy-border)', text: 'var(--color-healthy)' },
}

export default function RecentAlerts({ alerts = [] }) {
  return (
    <div 
      className="p-6 rounded-2xl border space-y-4 card-modern"
      style={{ 
        background: 'var(--color-surface)', 
        borderColor: 'var(--color-border)',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.25)'
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-main">
            Recent Operational Alerts
          </h4>
          <p className="text-xs text-muted">Latest threshold excursions and anomaly events</p>
        </div>
        <Link 
          to="/alerts" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
          style={{ 
            background: 'rgba(56, 189, 248, 0.08)', 
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent-border)'
          }}
        >
          <span>View All Alerts</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted border border-dashed rounded-xl" style={{ borderColor: 'var(--color-border-subtle)' }}>
          All systems nominal — zero active alerts.
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.slice(0, 4).map(alert => {
            const sev = SEV_STYLE[alert.severity] || SEV_STYLE.NORMAL
            return (
              <div 
                key={alert.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all hover:border-accent/30"
                style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
                  >
                    <AlertTriangle size={14} style={{ color: sev.text }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-main truncate">
                        {alert.type}
                      </span>
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full font-medium uppercase"
                        style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <div className="text-xs text-muted truncate mt-0.5">
                      {alert.message || alert.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono flex-shrink-0">
                  <span className="text-muted">
                    {fmtTime(new Date(alert.timestamp))}
                  </span>
                  <StatusBadge status={alert.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
