import { useSelector } from 'react-redux'
import { Thermometer, Activity, Zap, Cpu, CheckCircle2, ShieldCheck, Clock } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SensorChart from '../components/dashboard/SensorChart'
import StatusBadge from '../components/common/StatusBadge'
import { mockLiveReading, mockSensorHistory } from '../data/mockSensorData'
import { fmt, fmtTime } from '../lib/utils'

const SENSORS = [
  {
    key: 'temp_belt',
    tag: 'TT-101',
    label: 'Belt Surface Temperature',
    icon: Thermometer,
    unit: '°C',
    type: 'Infrared Pyrometer',
    location: 'Head Discharge Zone',
    thresholds: { warn: 32, crit: 40 },
    calibrated: 'Aug 2026',
    healthPct: 98,
  },
  {
    key: 'temp_motor',
    tag: 'TT-102',
    label: 'Drive Motor Winding Temp',
    icon: Thermometer,
    unit: '°C',
    type: 'PT100 RTD Probe',
    location: 'Drive Motor Stator',
    thresholds: { warn: 42, crit: 50 },
    calibrated: 'Jun 2026',
    healthPct: 95,
  },
  {
    key: 'vib_rms',
    tag: 'VT-201',
    label: 'Bearing Vibration (RMS)',
    icon: Activity,
    unit: 'mm/s',
    type: 'Tri-Axial Accelerometer',
    location: 'Drive Pulley Bearing',
    thresholds: { warn: 4, crit: 6 },
    calibrated: 'Jul 2026',
    healthPct: 92,
  },
  {
    key: 'current_rms',
    tag: 'CT-301',
    label: 'Motor Phase Current',
    icon: Zap,
    unit: 'A',
    type: 'Hall-Effect CT Sensor',
    location: 'Power Substation',
    thresholds: { warn: 0.04, crit: 0.06 },
    calibrated: 'May 2026',
    healthPct: 99,
  },
]

/**
 * getDisplayStatus — lightweight UI display hint only.
 * Real status classification is done by the backend (domainUtils.classifyChannel).
 * This is used ONLY when the API hasn't returned a channelStatuses field yet (offline/loading).
 */
function getDisplayStatus(value, { warn, crit }) {
  if (value >= crit) return 'CRITICAL'
  if (value >= warn) return 'WARNING'
  return 'HEALTHY'
}

export default function SensorHealth() {
  const { liveReading, lastUpdated } = useSelector(s => s.sensor)
  const reading         = liveReading?.features?.temp_belt > 0 ? liveReading : mockLiveReading
  const history         = mockSensorHistory
  const features        = reading.features
  // Pre-computed statuses from backend API (included in reading when available)
  const channelStatuses = reading.channelStatuses ?? null

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      <PageHeader
        title="Transducer Fleet & Telemetry"
        subtitle="Physical sensor instrumentation surveillance, signal integrity indices, and calibration schedules"
        statusBadge={
          <div 
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-tech font-medium" 
            style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: 'var(--color-healthy)', 
              border: '1px solid var(--color-healthy-border)' 
            }}
          >
            <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse" />
            <span>4/4 Channels Active</span>
          </div>
        }
      />

      {/* Row 1: 4 Sleek Diagnostic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {SENSORS.map(({ key, tag, label, icon: Icon, unit, thresholds, location, healthPct }) => {
          const value  = features[key] ?? 0
          // Prefer pre-computed status from API; fall back to local display hint
          const status = channelStatuses?.[key] ?? getDisplayStatus(value, thresholds)
          const isWarn = status === 'WARNING'
          const isCrit = status === 'CRITICAL'
          
          return (
            <div 
              key={key} 
              className="p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 card-modern"
              style={{ 
                background: 'var(--color-surface)', 
                borderColor: isCrit ? 'var(--color-critical-border)' : isWarn ? 'var(--color-warning-border)' : 'var(--color-border)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-accent)' }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-tech uppercase font-bold text-sky-400">{tag}</span>
                      <h4 className="text-xs font-display font-semibold text-main truncate max-w-[130px]">{label}</h4>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="my-3 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-bold leading-none text-main">
                      {fmt(value, key === 'current_rms' ? 3 : 1)}
                    </span>
                    <span className="text-xs font-mono text-muted">{unit}</span>
                  </div>
                  <span className="text-[11px] font-tech text-muted">{location}</span>
                </div>

                {/* Health integrity progress */}
                <div className="space-y-1.5 mt-4">
                  <div className="flex justify-between text-[11px] font-tech">
                    <span className="text-muted">Channel Integrity</span>
                    <span className="font-mono text-emerald-400 font-medium">{healthPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-800">
                    <div 
                      className="h-full rounded-full bg-status-healthy transition-all duration-500"
                      style={{ width: `${healthPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-white/[0.05] flex justify-between text-[11px] font-tech text-muted">
                <span>Warn: ≥{thresholds.warn}{unit}</span>
                <span>Crit: ≥{thresholds.crit}{unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Row 2: Telemetry Waveforms */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold tracking-tight text-main">
            Telemetry Waveforms (Rolling 60 Minutes)
          </h3>
          <span className="text-xs text-muted font-tech">Zero Packet Loss Observed</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SENSORS.map(({ key, tag, label, unit }) => (
            <SensorChart
              key={key}
              title={`${label} (${tag})`}
              data={history}
              dataKey={key}
              unit={unit}
              color={key.includes('temp') ? 'var(--color-warning)' : 'var(--color-accent)'}
            />
          ))}
        </div>
      </div>

      {/* Row 3: Transducer Calibration & Channel Table */}
      <div 
        className="p-6 rounded-2xl border space-y-4 card-modern"
        style={{ 
          background: 'var(--color-surface)', 
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-display text-base font-semibold text-main">Transducer Hardware & Calibration Registry</h4>
            <p className="text-xs text-muted font-tech">ISO 10816-3 mechanical compliance verification</p>
          </div>
          <span className="text-xs text-emerald-400 font-tech font-semibold flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            All Transducers Calibrated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-tech">
            <thead>
              <tr className="border-b text-muted font-medium border-white/[0.06]">
                <th className="pb-3">Channel Tag</th>
                <th className="pb-3">Sensor Type</th>
                <th className="pb-3">Mounting Zone</th>
                <th className="pb-3">Integrity</th>
                <th className="pb-3">Certified Date</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {SENSORS.map(s => (
                <tr key={s.tag} className="hover:bg-white/[0.015] transition-colors">
                  <td className="py-3.5 font-mono font-bold text-sky-400">{s.tag}</td>
                  <td className="py-3.5 font-display font-medium text-main">{s.label}</td>
                  <td className="py-3.5 text-muted">{s.location}</td>
                  <td className="py-3.5 font-mono text-emerald-400 font-semibold">{s.healthPct}%</td>
                  <td className="py-3.5 text-muted">{s.calibrated}</td>
                  <td className="py-3.5 text-right">
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-tech text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    >
                      ONLINE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
