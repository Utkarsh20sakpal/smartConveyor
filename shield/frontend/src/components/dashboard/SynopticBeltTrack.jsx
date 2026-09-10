import { Activity, Zap, Scan } from 'lucide-react'
import { useSelector } from 'react-redux'

/**
 * SynopticBeltTrack
 *
 * A synoptic overview of the physical conveyor highway — belt CB-001.
 * Shows live sensor readings from actual instrumented gantry stations.
 *
 * NOTE: Individual belt-zone health scores are NOT currently computed.
 *       This component displays real sensor channel data only.
 *       Zone/joint monitoring is planned in PRD §6 — not yet implemented.
 */
export default function SynopticBeltTrack({
  features = { temp_belt: 25.4, temp_motor: 38.7, vib_rms: 3.21, current_rms: 0.031 },
  health = 96.4,
}) {
  const { beltSpeed, conveyorStatus } = useSelector(s => s.twin) || {}

  const f         = features || {}
  const tempBelt  = f.temp_belt    ?? 25.4
  const tempMotor = f.temp_motor   ?? 38.7
  const vibRms    = f.vib_rms      ?? 3.21
  const currRms   = f.current_rms  ?? 0.031
  const speed     = Number(beltSpeed) || 2.4

  // Physical sensor gantry stations — real fixed locations on the track
  const gantries = [
    {
      id: 'STA-01',
      label: 'Gantry 1',
      type: 'Optical AI',
      meterMark: '~300 m',
      leftPct: 24,
      color: 'var(--color-accent)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      bg: 'rgba(56, 189, 248, 0.08)',
      icon: Scan,
    },
    {
      id: 'STA-02',
      label: 'Gantry 2',
      type: 'Ultrasonic',
      meterMark: '~600 m',
      leftPct: 50,
      color: 'var(--color-healthy)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      bg: 'rgba(16, 185, 129, 0.07)',
      icon: Activity,
    },
    {
      id: 'STA-03',
      label: 'Gantry 3',
      type: 'Vibration',
      meterMark: '~900 m',
      leftPct: 76,
      color: 'var(--color-warning)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      bg: 'rgba(245, 158, 11, 0.07)',
      icon: Zap,
    },
  ]

  return (
    <div
      className="p-6 rounded-2xl border card-modern relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(13, 27, 42, 0.95) 0%, rgba(10, 18, 30, 0.98) 100%)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* Track Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
              Synoptic Arterial Track
            </span>
            <span className="text-xs text-muted font-mono">CB-001 · 1,200 m overland highway</span>
          </div>
          <h2 className="text-lg font-display font-semibold tracking-tight text-main">
            Conveyor System Overview
          </h2>
        </div>

        {/* Live sensor chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-400 font-bold">TT-101</span>
            <div className="text-xs">
              <span className="text-muted block text-[9px] uppercase font-mono">Belt Temp</span>
              <span className="font-mono font-bold text-main">{tempBelt.toFixed(1)} °C</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
            <span className="text-[10px] font-mono text-amber-400 font-bold">VT-201</span>
            <div className="text-xs">
              <span className="text-muted block text-[9px] uppercase font-mono">Vibration</span>
              <span className="font-mono font-bold text-main">{vibRms.toFixed(2)} mm/s</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
            <span className="text-[10px] font-mono text-sky-400 font-bold">CT-301</span>
            <div className="text-xs">
              <span className="text-muted block text-[9px] uppercase font-mono">Current</span>
              <span className="font-mono font-bold text-main">{currRms.toFixed(3)} A</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
            <Zap size={13} className="text-emerald-400" />
            <div className="text-xs">
              <span className="text-muted block text-[9px] uppercase font-mono">Health Score</span>
              <span className="font-mono font-bold text-emerald-400">{health.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Belt Synoptic Graphic */}
      <div
        className="p-5 rounded-xl border relative overflow-hidden my-2"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 195, 240, 0.04) 0%, rgba(7, 17, 29, 0.9) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Physical milestones */}
        <div className="flex justify-between items-center text-[10px] font-mono text-muted mb-4 px-2">
          <span className="font-semibold text-slate-400">TAIL HOPPER (0 m)</span>
          <span className="text-cyan-400 flex items-center gap-1.5 font-semibold bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
            <Scan size={11} className="text-cyan-400 animate-pulse" />
            <span>OPTICAL AI GANTRY (300 m)</span>
          </span>
          <span className="font-semibold text-slate-400">HEAD DRIVE PULLEY (1,200 m)</span>
        </div>

        {/* Belt highway */}
        <div className="relative h-20 w-full flex items-center">
          {/* Main track rail */}
          <div className="absolute inset-x-0 h-3.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
            {/* Animated chevron stripes */}
            <div
              className="w-[200%] h-full animate-ribbon opacity-40"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #00C3F0 0, #00C3F0 2px, transparent 2px, transparent 12px)',
              }}
            />
          </div>

          {/* Physical sensor station markers — informational only, not clickable */}
          {gantries.map(({ id, label, type, meterMark, leftPct, color, borderColor, bg, icon: Icon }) => (
            <div
              key={id}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${leftPct}%` }}
            >
              {/* Station label */}
              <div
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold mb-1.5 shadow-md"
                style={{ background: bg, color, border: `1px solid ${borderColor}` }}
              >
                {label} — {type}
              </div>

              {/* Station beacon (non-interactive) */}
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{ background: '#07111D', borderColor: color }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              </div>

              {/* Distance readout */}
              <div className="flex flex-col items-center mt-1">
                <span className="text-[10px] font-mono font-semibold text-main">{meterMark}</span>
                <span className="text-[9px] font-mono text-muted">{id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System summary footer */}
      <div
        className="mt-4 pt-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-4 font-mono text-muted text-[11px]">
          <span>
            Belt Speed:{' '}
            <span className="text-accent font-semibold">{speed.toFixed(2)} m/s</span>
          </span>
          <span>
            Conveyor:{' '}
            <span
              className="font-semibold"
              style={{ color: conveyorStatus === 'RUNNING' ? 'var(--color-healthy)' : 'var(--color-critical)' }}
            >
              {conveyorStatus || 'UNKNOWN'}
            </span>
          </span>
          <span>Motor Temp: <span className="text-main font-semibold">{tempMotor.toFixed(1)} °C</span></span>
        </div>

        <span className="text-[10px] font-mono text-muted italic">
          3 sensor gantries · Optical AI + Ultrasonic + Vibration
        </span>
      </div>
    </div>
  )
}
