import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import {
  AlertTriangle, CheckCircle, Search, Filter, OctagonAlert,
  ShieldAlert, BellRing, Eye, Check, X, ShieldX, Info
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import { mockAlerts } from '../data/mockAlertData'
import { setAlerts, acknowledgeAlert } from '../store/slices/alertSlice'
import { fmtDateTime } from '../lib/utils'

// Emergency Stop Modal
function EmergencyStopDialog({ open, onClose, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-overlay)', backdropFilter: 'blur(8px)' }}>
      <div
        className="p-7 rounded-2xl border max-w-md w-full space-y-4 shadow-2xl relative card-elevated"
        style={{ background: '#141A28', borderColor: 'var(--color-critical-border)' }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-critical-dim)', border: '1px solid var(--color-critical-border)' }}>
            <OctagonAlert size={26} color="var(--color-critical)" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold tracking-tight text-critical">
              Emergency Conveyor Halt
            </h3>
            <span className="text-xs text-muted font-tech">Safety Interlock Protocol · Line CB-001</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted font-tech">
          This command immediately disengages the primary 450 kW drive motor breaker and engages the mechanical caliper disc brakes.
        </p>

        <div className="p-3.5 rounded-xl border text-xs font-mono" style={{ background: 'var(--color-critical-dim)', borderColor: 'var(--color-critical-border)', color: 'var(--color-critical)' }}>
          WARNING: Restart requires on-site physical lock-out inspection at drive station.
        </div>

        <div className="flex gap-3 justify-end pt-2 font-tech">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs border font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg hover:opacity-90"
            style={{ background: 'var(--color-critical)', color: '#fff', boxShadow: '0 0 16px rgba(244, 63, 94, 0.4)' }}
          >
            Confirm E-Stop
          </button>
        </div>
      </div>
    </div>
  )
}

// Acknowledge Alert Dialog
function AcknowledgeDialog({ open, alert, onClose, onConfirm }) {
  if (!open || !alert) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-overlay)', backdropFilter: 'blur(8px)' }}>
      <div
        className="p-6 rounded-2xl border max-w-md w-full space-y-4 shadow-2xl card-elevated"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--color-accent-border)' }}>
            <BellRing size={20} color="var(--color-accent)" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-main">
              Acknowledge Incident Alert
            </h3>
            <span className="text-xs text-muted font-mono">{alert.id}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border space-y-1.5 text-xs font-tech" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border-subtle)' }}>
          <div className="flex justify-between">
            <span className="text-muted">Incident Type:</span>
            <span className="font-semibold text-main font-display">{alert.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Source Channel:</span>
            <span className="font-mono text-sky-400 font-bold">{alert.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Severity:</span>
            <StatusBadge status={alert.severity} />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted font-tech">
          Acknowledging logs operator credential and disarms audible sirens. Incident remains queued until resolved.
        </p>

        <div className="flex gap-2.5 justify-end pt-2 font-tech">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            Dismiss
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow"
            style={{ background: 'var(--color-accent)', color: '#0C1019' }}
          >
            Confirm Acknowledgment
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Alerts() {
  const dispatch = useDispatch()
  const alerts = useSelector(state => state.alert.alerts)

  const [filterSeverity, setFilterSeverity] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [ackDialog, setAckDialog] = useState({ open: false, alert: null })
  const [stopDialog, setStopDialog] = useState(false)

  // Preserve the existing demo incidents only when Redux has no alerts yet.
  // Real YOLO/sensor alerts added later remain in Redux.
  useEffect(() => {
    if (alerts.length === 0 && Array.isArray(mockAlerts) && mockAlerts.length > 0) {
      dispatch(setAlerts(mockAlerts))
    }
  }, [alerts.length, dispatch])

  const filtered = alerts.filter(a => {
    const sevOk = filterSeverity === 'ALL' || a.severity === filterSeverity
    const statOk = filterStatus === 'ALL' || a.status === filterStatus
    const srchOk = !search ||
      a.type.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.source.toLowerCase().includes(search.toLowerCase())
    return sevOk && statOk && srchOk
  })

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'CRITICAL').length,
    warning: alerts.filter(a => a.severity === 'WARNING').length,
    active: alerts.filter(a => a.status === 'ACTIVE').length,
    acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
  }

  const handleAcknowledge = () => {
    dispatch(acknowledgeAlert(ackDialog.alert.id))
    toast.success(`Alert "${ackDialog.alert.type}" marked as Acknowledged by Operator`)
    setAckDialog({ open: false, alert: null })
  }

  const handleEmergencyStop = () => {
    toast.error('EMERGENCY STOP EXECUTED: All drive motors disengaged!', { duration: 8000 })
    setStopDialog(false)
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      <PageHeader
        title="Incident Alarms & Interlocks"
        subtitle="Multi-modal anomaly dispatch, safety interlock triage, and emergency line controls"
        actions={
          <button
            id="emergency-stop-btn"
            onClick={() => setStopDialog(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-tech font-bold tracking-wider transition-all shadow-md hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(244, 63, 94, 0.35)',
            }}
          >
            <OctagonAlert size={15} />
            <span>EMERGENCY STOP</span>
          </button>
        }
      />

      {/* Row 1: 4 Rich KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Total Incidents',
            value: stats.total,
            sub: 'Shift 24h Log',
            icon: BellRing,
            color: 'var(--color-text-main)',
            bg: 'rgba(255, 255, 255, 0.03)'
          },
          {
            label: 'Critical Faults',
            value: stats.critical,
            sub: 'Immediate Action Required',
            icon: OctagonAlert,
            color: 'var(--color-critical)',
            bg: 'var(--color-critical-dim)',
            border: 'var(--color-critical-border)'
          },
          {
            label: 'Active Warnings',
            value: stats.warning,
            sub: 'Threshold Exceeded',
            icon: AlertTriangle,
            color: 'var(--color-warning)',
            bg: 'var(--color-warning-dim)',
            border: 'var(--color-warning-border)'
          },
          {
            label: 'Active Queue',
            value: stats.active,
            sub: `${stats.acknowledged} Acknowledged`,
            icon: ShieldAlert,
            color: stats.active > 0 ? 'var(--color-warning)' : 'var(--color-healthy)',
            bg: 'rgba(56, 189, 248, 0.08)',
            border: 'var(--color-accent-border)'
          },
        ].map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className="p-5 rounded-2xl border flex items-center justify-between transition-all card-modern"
            style={{
              background: 'var(--color-surface)',
              borderColor: border || 'var(--color-border)',
            }}
          >
            <div>
              <span className="text-xs font-tech font-medium text-muted block mb-1">
                {label}
              </span>
              <div className="text-3xl font-mono font-bold leading-none" style={{ color }}>
                {String(value).padStart(2, '0')}
              </div>
              <span className="text-[11px] font-tech text-muted mt-1.5 block">
                {sub}
              </span>
            </div>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: bg, color }}
            >
              <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Search & Filter Toolbar */}
      <div
        className="p-6 rounded-2xl border space-y-4 card-modern"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border flex-1 max-w-md bg-slate-950/40 border-white/[0.06]"
          >
            <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by defect type, sensor ID, or location..."
              className="flex-1 bg-transparent text-xs outline-none text-main font-tech placeholder:text-muted"
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: 'var(--color-text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 font-tech">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Filter size={14} />
              <span>Filters:</span>
            </div>

            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="text-xs px-3.5 py-2 rounded-xl border outline-none cursor-pointer bg-slate-950/40 border-white/[0.06] text-main"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
              <option value="NORMAL">Normal / Info</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs px-3.5 py-2 rounded-xl border outline-none cursor-pointer bg-slate-950/40 border-white/[0.06] text-main"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Alarms</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 font-tech">
          <span className="text-xs text-muted mr-1">Quick Views:</span>
          {[
            { label: 'All Incidents', sev: 'ALL', stat: 'ALL' },
            { label: 'Active Criticals', sev: 'CRITICAL', stat: 'ACTIVE' },
            { label: 'Active Warnings', sev: 'WARNING', stat: 'ACTIVE' },
            { label: 'Resolved Logs', sev: 'ALL', stat: 'RESOLVED' },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => { setFilterSeverity(preset.sev); setFilterStatus(preset.stat); }}
              className="text-xs px-3 py-1 rounded-full border transition-all"
              style={{
                background: filterSeverity === preset.sev && filterStatus === preset.stat ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                borderColor: filterSeverity === preset.sev && filterStatus === preset.stat ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                color: filterSeverity === preset.sev && filterStatus === preset.stat ? 'var(--color-accent)' : 'var(--color-text-muted)'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Incidents Table in Container */}
      <div
        className="rounded-2xl border overflow-hidden card-modern"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="p-5 border-b flex items-center justify-between border-white/[0.06]">
          <div>
            <h4 className="font-display text-base font-semibold tracking-tight text-main">
              Telemetry & Vision Incident Log
            </h4>
            <span className="text-xs text-muted font-tech">Showing {filtered.length} active triage records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-tech">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255, 255, 255, 0.01)' }}>
                {['Timestamp', 'Incident', 'Source', 'Severity', 'State', 'Operational Diagnosis', 'Triage Action'].map(h => (
                  <th key={h} className="px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <Info size={24} className="mx-auto mb-2 text-sky-400" />
                    <p className="font-display font-medium text-sm text-main">No Incidents Match Filters</p>
                    <p className="text-xs mt-1 text-muted">Reset search query or severity filters above.</p>
                  </td>
                </tr>
              ) : filtered.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-white/[0.015] transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-muted whitespace-nowrap">
                    {fmtDateTime(new Date(alert.timestamp))}
                  </td>
                  <td className="px-5 py-4 font-display font-semibold text-main">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: alert.severity === 'CRITICAL' ? 'var(--color-critical)' : 'var(--color-warning)' }} />
                      <span>{alert.type}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-sky-400 font-medium">
                    {alert.source}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={alert.severity} />
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-tech text-[10px] font-semibold"
                      style={{
                        background: alert.status === 'ACTIVE' ? 'var(--color-warning-dim)' : 'var(--color-healthy-dim)',
                        color: alert.status === 'ACTIVE' ? 'var(--color-warning)' : 'var(--color-healthy)',
                        border: `1px solid ${alert.status === 'ACTIVE' ? 'var(--color-warning-border)' : 'var(--color-healthy-border)'}`
                      }}
                    >
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted max-w-xs truncate font-tech">
                    {alert.description}
                  </td>
                  <td className="px-5 py-4">
                    {alert.status === 'ACTIVE' ? (
                      <button
                        onClick={() => setAckDialog({ open: true, alert })}
                        className="px-3 py-1.5 rounded-xl text-xs font-tech font-semibold transition-all hover:opacity-85"
                        style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)' }}
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-muted text-xs font-tech">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <EmergencyStopDialog
        open={stopDialog}
        onClose={() => setStopDialog(false)}
        onConfirm={handleEmergencyStop}
      />
      <AcknowledgeDialog
        open={ackDialog.open}
        alert={ackDialog.alert}
        onClose={() => setAckDialog({ open: false, alert: null })}
        onConfirm={handleAcknowledge}
      />
    </div>
  )
}
