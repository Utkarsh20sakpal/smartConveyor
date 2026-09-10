import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import {
  Activity,
  Camera,
  Box,
  Bell,
  BarChart2,
  Settings as SettingsIcon,
  Cpu,
  ArrowRight,
  Shield,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Radio,
  Gauge,
  Thermometer,
  Zap,
  ScanSearch,
  Server,
  Clock3,
} from 'lucide-react'
import { fmtDateTime } from '../lib/utils'

export default function Home() {
  const { systemStatus, globalRUL } = useSelector(s => s.ui)
  const { alerts } = useSelector(s => s.alert)
  const { liveReading, connectionStatus } = useSelector(s => s.sensor)
  const { latestSnapshot } = useSelector(s => s.detection)
  const rul = useSelector(s => s.rul)

  const activeAlerts = (alerts || []).filter(
    a => a.status === 'ACTIVE'
  )

  const criticalAlerts = activeAlerts.filter(
    a => a.severity === 'CRITICAL'
  )

  const activeCount = activeAlerts.length
  const hasCritical = criticalAlerts.length > 0

  const isOnline = connectionStatus === 'ONLINE'

  const features = liveReading?.features || {}

  const beltTemp = features.temp_belt ?? 25.4
  const vibration = features.vib_rms ?? 3.21
  const motorCurrent = features.current_rms ?? 0.031

  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined) return '—'
    return Number(value).toFixed(decimals)
  }

  // ------------------------------------------------------------
  // CONSOLE CARDS
  // ------------------------------------------------------------

  const CONSOLE_CARDS = [
    {
      id: 'dashboard',
      icon: Activity,
      title: 'Condition Dashboard',
      to: '/dashboard',
      tag: 'LIVE TELEMETRY',
      desc:
        'Multi-sensor stream fusion, anomaly scoring, and real-time equipment health surveillance.',
      primaryMetric: rul.currentRULHours !== null
        ? `RUL: ${rul.currentRULHours.toFixed(1)} Hours`
        : rul.status === 'INSUFFICIENT_DATA'
          ? 'RUL: Accumulating data…'
          : `RUL: ${rul.status}`,
      metricSub: 'Normal degradation curve',
      accent: 'cyan',
      isAnomalous: false,
    },

    {
      id: 'twin',
      icon: Box,
      title: '3D Digital Twin',
      to: '/digital-twin',
      tag: 'KINEMATIC 3D',
      desc:
        'Physics-driven conveyor model with live belt kinematics, equipment geometry and telemetry context.',
      primaryMetric: '60 FPS Procedural Mesh',
      metricSub: '1,200 m geometry aligned',
      accent: 'blue',
      isAnomalous: false,
    },

    {
      id: 'vision',
      icon: Camera,
      title: 'Vision Inspection',
      to: '/vision-monitoring',
      tag: 'OPTICAL AI',
      desc:
        'Line-scan camera analysis with automated surface-defect detection and visual inspection.',
      primaryMetric: '1 Active Surface Anomaly',
      metricSub: 'Surface Delamination · 94%',
      accent: 'red',
      isAnomalous: true,
      alertSeverity: 'CRITICAL',
    },

    {
      id: 'sensors',
      icon: Cpu,
      title: 'Transducer Fleet',
      to: '/sensor-health',
      tag: 'SENSOR FLEET',
      desc:
        'Health and connectivity monitoring across temperature, vibration and motor-current transmitters.',
      primaryMetric: '4 / 4 Transmitters Online',
      metricSub: 'TT-101 · TT-102 · VT-201 · CT-301',
      accent: 'green',
      isAnomalous: false,
    },

    {
      id: 'alerts',
      icon: Bell,
      title: 'Incident Queue',
      to: '/alerts',
      tag: 'SAFETY INTERLOCKS',
      desc:
        'Automated anomaly triage, safety interlocks and emergency-stop coordination.',
      primaryMetric: `${activeCount} Active ${activeCount === 1 ? 'Alarm' : 'Alarms'
        }`,
      metricSub: hasCritical
        ? `${criticalAlerts.length} Critical Interlock${criticalAlerts.length === 1 ? '' : 's'
        } Pending`
        : 'All systems within envelope',
      accent: hasCritical ? 'red' : 'amber',
      isAnomalous: activeCount > 0,
      alertSeverity: hasCritical ? 'CRITICAL' : 'WARNING',
    },

    {
      id: 'reports',
      icon: BarChart2,
      title: 'Compliance Reports',
      to: '/reports',
      tag: 'AUDIT LOGS',
      desc:
        'Shift summaries, maintenance records, safety documentation and historical data exports.',
      primaryMetric: 'ISO 5048 / DIN 22101',
      metricSub: 'Shift log ready for export',
      accent: 'purple',
      isAnomalous: false,
    },
  ]

  const accentMap = {
    cyan: {
      color: 'var(--color-accent)',
      bg: 'rgba(56, 189, 248, 0.10)',
      border: 'rgba(56, 189, 248, 0.22)',
      glow: 'rgba(56, 189, 248, 0.10)',
    },

    blue: {
      color: '#60A5FA',
      bg: 'rgba(96, 165, 250, 0.10)',
      border: 'rgba(96, 165, 250, 0.20)',
      glow: 'rgba(96, 165, 250, 0.08)',
    },

    green: {
      color: '#34D399',
      bg: 'rgba(52, 211, 153, 0.10)',
      border: 'rgba(52, 211, 153, 0.20)',
      glow: 'rgba(52, 211, 153, 0.08)',
    },

    red: {
      color: 'var(--color-critical)',
      bg: 'rgba(244, 63, 94, 0.10)',
      border: 'rgba(244, 63, 94, 0.24)',
      glow: 'rgba(244, 63, 94, 0.10)',
    },

    amber: {
      color: 'var(--color-warning)',
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.22)',
      glow: 'rgba(245, 158, 11, 0.08)',
    },

    purple: {
      color: '#A78BFA',
      bg: 'rgba(167, 139, 250, 0.10)',
      border: 'rgba(167, 139, 250, 0.20)',
      glow: 'rgba(167, 139, 250, 0.08)',
    },
  }

  // ------------------------------------------------------------
  // HERO TELEMETRY
  // ------------------------------------------------------------

  const telemetryStats = [
    {
      label: 'BELT SURFACE',
      value: `${formatNumber(beltTemp, 1)} °C`,
      source: 'TT-101 · PYROMETER',
      icon: Thermometer,
      status:
        beltTemp > 35
          ? 'WARNING'
          : 'NORMAL',
      color:
        beltTemp > 35
          ? 'var(--color-warning)'
          : 'var(--color-accent)',
    },

    {
      label: 'VIBRATION RMS',
      value: `${formatNumber(vibration, 2)} mm/s`,
      source: 'VT-201 · ACCELEROMETER',
      icon: Activity,
      status:
        vibration > 4.5
          ? 'WARNING'
          : 'NORMAL',
      color:
        vibration > 4.5
          ? 'var(--color-warning)'
          : 'var(--color-accent)',
    },

    {
      label: 'MOTOR CURRENT',
      value: `${formatNumber(motorCurrent, 3)} A`,
      source: 'CT-301 · TRANSDUCER',
      icon: Zap,
      status:
        motorCurrent > 0.05
          ? 'WARNING'
          : 'NORMAL',
      color:
        motorCurrent > 0.05
          ? 'var(--color-warning)'
          : 'var(--color-accent)',
    },

    {
      label: 'ACTIVE ANOMALIES',
      value: String(activeCount),
      source:
        activeCount === 0
          ? 'NORMAL ENVELOPE'
          : 'OPERATOR ATTENTION',
      icon: AlertTriangle,
      status:
        hasCritical
          ? 'CRITICAL'
          : activeCount > 0
            ? 'WARNING'
            : 'NORMAL',
      color:
        hasCritical
          ? 'var(--color-critical)'
          : activeCount > 0
            ? 'var(--color-warning)'
            : 'var(--color-healthy)',
    },
  ]

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">

      {/* ========================================================
          PAGE HEADER
      ========================================================= */}

      <PageHeader
        title="Operations Command Launchpad"
        subtitle="Predictive health surveillance and belt tear prevention for heavy-duty overland conveyors"
        statusBadge={
          <StatusBadge
            status={systemStatus || 'ONLINE'}
          />
        }
        actions={
          <Link
            to="/dashboard"
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-tech font-semibold tracking-wide transition-all"
            style={{
              background:
                'linear-gradient(135deg, #22D3EE 0%, #0284C7 100%)',
              color: '#06131F',
              boxShadow:
                '0 6px 22px rgba(0, 195, 240, 0.20)',
            }}
          >
            <Activity size={14} />
            <span>Open Telemetry Console</span>
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        }
      />

      {/* ========================================================
          HERO / COMMAND STATUS
      ========================================================= */}

      <section
        className="relative overflow-hidden rounded-2xl border"
        style={{
          background:
            'linear-gradient(135deg, rgba(12, 28, 44, 0.98) 0%, rgba(10, 23, 37, 0.96) 55%, rgba(7, 18, 29, 0.98) 100%)',
          borderColor: 'var(--color-border)',
          boxShadow:
            '0 20px 55px rgba(0, 0, 0, 0.25)',
        }}
      >

        {/* Background technical grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56,189,248,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.035) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Right-side glow */}
        <div
          className="absolute -right-32 -top-32 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 68%)',
          }}
        />

        <div className="relative z-10 p-6 lg:p-7">

          {/* Top identification row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-tech font-semibold tracking-wider"
                style={{
                  color: 'var(--color-accent)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border:
                    '1px solid rgba(56, 189, 248, 0.18)',
                }}
              >
                PRIMARY OVERLAND CORRIDOR · CB-001
              </span>

              <span className="text-xs text-muted font-tech">
                Kiriburu Mining Complex
              </span>
            </div>

            {/* System posture */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-tech font-semibold tracking-wide self-start lg:self-auto"
              style={{
                background: hasCritical
                  ? 'rgba(244,63,94,0.07)'
                  : 'rgba(52,211,153,0.07)',
                borderColor: hasCritical
                  ? 'rgba(244,63,94,0.20)'
                  : 'rgba(52,211,153,0.18)',
                color: hasCritical
                  ? 'var(--color-critical)'
                  : 'var(--color-healthy)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: hasCritical
                    ? 'var(--color-critical)'
                    : 'var(--color-healthy)',
                  boxShadow: hasCritical
                    ? '0 0 8px rgba(244,63,94,0.7)'
                    : '0 0 8px rgba(52,211,153,0.7)',
                }}
              />

              {hasCritical
                ? 'OPERATOR ATTENTION REQUIRED'
                : 'SYSTEM POSTURE · NOMINAL'}
            </div>
          </div>

          {/* Main heading */}
          <div className="mt-5 max-w-4xl">
            <h1
              className="font-display text-2xl lg:text-[32px] font-bold tracking-tight text-main leading-tight"
            >
              Belt Integrity Monitoring
              <span className="text-muted mx-2">
                &
              </span>
              Predictive Maintenance
            </h1>

            <p className="mt-2.5 text-xs lg:text-sm text-muted max-w-3xl leading-relaxed">
              Continuous multi-sensor telemetry fusion and
              optical computer vision for early detection of
              conveyor degradation, anomalies and belt-surface
              defects.
            </p>
          </div>

          {/* Conveyor status line */}
          <div className="mt-6 flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{
                background:
                  'linear-gradient(90deg, rgba(56,189,248,0.35), rgba(56,189,248,0.03))',
              }}
            />

            <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
              <span className="text-accent">
                CB-001
              </span>

              <span>──────────────</span>

              <span className="text-main">
                1.2 KM OVERLAND LINE
              </span>

              <span>──────────────</span>

              <span className="text-emerald-400">
                {isOnline ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <div
              className="flex-1 h-px"
              style={{
                background:
                  'linear-gradient(90deg, rgba(56,189,248,0.03), rgba(56,189,248,0.35))',
              }}
            />
          </div>

          {/* ====================================================
              TELEMETRY CARDS
          ==================================================== */}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {telemetryStats.map(stat => {
              const Icon = stat.icon

              const isAlert =
                stat.status === 'WARNING' ||
                stat.status === 'CRITICAL'

              return (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-xl border p-4 transition-all duration-200"
                  style={{
                    background:
                      'rgba(255,255,255,0.018)',
                    borderColor: isAlert
                      ? stat.status === 'CRITICAL'
                        ? 'var(--color-critical-border)'
                        : 'var(--color-warning-border)'
                      : 'var(--color-border-subtle)',
                  }}
                >

                  {/* top accent */}
                  <div
                    className="absolute left-0 top-0 h-px w-full"
                    style={{
                      background: stat.color,
                      opacity: 0.55,
                    }}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-tech font-semibold tracking-widest text-muted">
                      {stat.label}
                    </span>

                    <Icon
                      size={14}
                      style={{
                        color: stat.color,
                      }}
                    />
                  </div>

                  <div
                    className="mt-2 text-xl font-mono font-bold tracking-tight"
                    style={{
                      color: isAlert
                        ? stat.color
                        : 'var(--color-text-main)',
                    }}
                  >
                    {stat.value}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-muted font-tech truncate">
                      {stat.source}
                    </span>

                    <span
                      className="text-[8px] font-tech font-semibold ml-2"
                      style={{
                        color: stat.color,
                      }}
                    >
                      {stat.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ====================================================
              SYSTEM CONNECTION STRIP
          ==================================================== */}

          <div
            className="mt-5 pt-4 border-t flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
            style={{
              borderColor:
                'var(--color-border-subtle)',
            }}
          >

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-tech">

              <span className="flex items-center gap-1.5">
                <Radio
                  size={13}
                  className="text-emerald-400"
                />

                <span className="text-muted">
                  TELEMETRY
                </span>

                <span className="text-emerald-400 font-mono font-semibold">
                  {isOnline
                    ? 'ONLINE'
                    : 'OFFLINE'}
                </span>
              </span>

              <span className="hidden sm:block text-white/10">
                |
              </span>

              <span className="flex items-center gap-1.5">
                <Shield
                  size={12}
                  className="text-cyan-400"
                />

                <span className="text-muted">
                  PLC INTERLOCK
                </span>

                <span className="text-main font-mono">
                  ARMED
                </span>
              </span>

              <span className="hidden sm:block text-white/10">
                |
              </span>

              <span className="flex items-center gap-1.5">
                <Server
                  size={12}
                  className="text-slate-400"
                />

                <span className="text-muted">
                  EDGE INFERENCE
                </span>

                <span className="text-emerald-400 font-mono">
                  READY
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted font-mono">
              <Clock3 size={12} />

              Last heartbeat:
              <span className="text-main">
                {fmtDateTime(new Date())}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          MISSION CONTROL HEADER
      ========================================================= */}

      <section className="space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold tracking-tight text-main">
                Mission Control
              </h2>

              <span
                className="px-2 py-0.5 rounded-md text-[9px] font-tech font-semibold"
                style={{
                  color: 'var(--color-accent)',
                  background:
                    'rgba(56,189,248,0.07)',
                  border:
                    '1px solid rgba(56,189,248,0.14)',
                }}
              >
                06 MODULES
              </span>
            </div>

            <p className="text-xs text-muted font-tech mt-1">
              Specialized environments for monitoring,
              diagnostics and operational control
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              style={{
                boxShadow:
                  '0 0 7px rgba(52,211,153,0.6)',
              }}
            />

            {activeCount === 0
              ? 'NO ACTIVE INCIDENTS'
              : `${activeCount} ACTIVE INCIDENT${activeCount === 1 ? '' : 'S'
              }`}
          </div>
        </div>

        {/* ======================================================
            CONSOLE GRID
        ======================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {CONSOLE_CARDS.map(
            ({
              id,
              icon: Icon,
              title,
              to,
              tag,
              desc,
              primaryMetric,
              metricSub,
              accent,
              isAnomalous,
              alertSeverity,
            }) => {
              const theme =
                accentMap[accent] || accentMap.cyan

              const isCritical =
                isAnomalous &&
                alertSeverity === 'CRITICAL'

              return (
                <Link
                  key={id}
                  to={to}
                  className="group relative rounded-2xl border p-5 flex flex-col min-h-[245px] overflow-hidden transition-all duration-200"
                  style={{
                    background:
                      'linear-gradient(145deg, rgba(19,29,43,0.96), rgba(13,22,34,0.96))',
                    borderColor: isCritical
                      ? 'rgba(244,63,94,0.30)'
                      : 'var(--color-border)',
                    boxShadow: isCritical
                      ? '0 0 26px rgba(244,63,94,0.07)'
                      : 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform =
                      'translateY(-3px)'

                    e.currentTarget.style.borderColor =
                      isCritical
                        ? 'var(--color-critical)'
                        : theme.color

                    e.currentTarget.style.boxShadow =
                      `0 14px 34px rgba(0,0,0,0.30), 0 0 22px ${theme.glow}`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform =
                      'translateY(0)'

                    e.currentTarget.style.borderColor =
                      isCritical
                        ? 'rgba(244,63,94,0.30)'
                        : 'var(--color-border)'

                    e.currentTarget.style.boxShadow =
                      isCritical
                        ? '0 0 26px rgba(244,63,94,0.07)'
                        : 'none'
                  }}
                >

                  {/* Subtle top line */}
                  <div
                    className="absolute left-0 top-0 w-full h-px opacity-60"
                    style={{
                      background:
                        isCritical
                          ? 'var(--color-critical)'
                          : theme.color,
                    }}
                  />

                  {/* Card content */}
                  <div className="flex-1">

                    {/* Header */}
                    <div className="flex items-center justify-between">

                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 group-hover:scale-105"
                        style={{
                          background:
                            isCritical
                              ? 'rgba(244,63,94,0.11)'
                              : theme.bg,
                          borderColor:
                            isCritical
                              ? 'rgba(244,63,94,0.24)'
                              : theme.border,
                          color:
                            isCritical
                              ? 'var(--color-critical)'
                              : theme.color,
                        }}
                      >
                        <Icon size={19} />
                      </div>

                      <span
                        className="text-[9px] font-tech font-semibold tracking-widest px-2.5 py-1 rounded-full"
                        style={{
                          color:
                            isCritical
                              ? 'var(--color-critical)'
                              : theme.color,
                          background:
                            isCritical
                              ? 'rgba(244,63,94,0.08)'
                              : theme.bg,
                          border:
                            `1px solid ${isCritical
                              ? 'rgba(244,63,94,0.20)'
                              : theme.border
                            }`,
                        }}
                      >
                        {isAnomalous
                          ? alertSeverity
                          : tag}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="mt-5">
                      <h3 className="font-display text-[15px] font-semibold text-main tracking-tight">
                        {title}
                      </h3>

                      <p className="text-[11px] text-muted mt-1.5 leading-relaxed max-w-[95%]">
                        {desc}
                      </p>
                    </div>

                    {/* Metric */}
                    <div
                      className="mt-5 rounded-xl border p-3.5"
                      style={{
                        background:
                          isCritical
                            ? 'rgba(244,63,94,0.035)'
                            : 'rgba(255,255,255,0.018)',
                        borderColor:
                          isCritical
                            ? 'rgba(244,63,94,0.18)'
                            : 'var(--color-border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">

                        <div
                          className="text-xs font-mono font-bold truncate"
                          style={{
                            color:
                              isCritical
                                ? 'var(--color-critical)'
                                : 'var(--color-text-main)',
                          }}
                        >
                          {primaryMetric}
                        </div>

                        {isCritical && (
                          <AlertTriangle
                            size={13}
                            className="flex-shrink-0"
                            style={{
                              color:
                                'var(--color-critical)',
                            }}
                          />
                        )}
                      </div>

                      <div className="text-[9px] text-muted font-tech mt-1 truncate">
                        {metricSub}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    className="mt-5 pt-3.5 border-t flex items-center justify-between"
                    style={{
                      borderColor:
                        'var(--color-border-subtle)',
                    }}
                  >
                    <span className="text-[9px] uppercase tracking-wider text-muted font-tech">
                      Operational Console
                    </span>

                    <div
                      className="flex items-center gap-1.5 text-[11px] font-tech font-semibold transition-all"
                      style={{
                        color: theme.color,
                      }}
                    >
                      <span>
                        Open
                      </span>

                      <ChevronRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </Link>
              )
            }
          )}
        </div>
      </section>

      {/* ========================================================
          OPERATIONAL HEALTH STRIP
      ========================================================= */}

      <section
        className="rounded-xl border px-4 py-3.5"
        style={{
          background:
            'linear-gradient(90deg, rgba(52,211,153,0.035), rgba(255,255,255,0.012))',
          borderColor:
            hasCritical
              ? 'rgba(244,63,94,0.18)'
              : 'var(--color-border-subtle)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

          <div className="flex items-center gap-3">

            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: hasCritical
                  ? 'rgba(244,63,94,0.08)'
                  : 'rgba(52,211,153,0.08)',
                color: hasCritical
                  ? 'var(--color-critical)'
                  : 'var(--color-healthy)',
              }}
            >
              {hasCritical ? (
                <AlertTriangle size={15} />
              ) : (
                <CheckCircle2 size={15} />
              )}
            </div>

            <div>
              <div className="text-[11px] font-tech font-semibold text-main">
                {hasCritical
                  ? 'Operational attention required'
                  : 'Plant baseline nominal'}
              </div>

              <div className="text-[10px] text-muted font-tech mt-0.5">
                {hasCritical
                  ? `${criticalAlerts.length} critical condition${criticalAlerts.length === 1
                    ? ''
                    : 's'
                  } currently require operator review`
                  : 'Edge sensors, telemetry gateway and monitoring subsystems are operating within the configured envelope'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono">

            <div className="flex items-center gap-1.5">
              <span className="text-muted">
                RUL
              </span>

              <span className="text-main font-semibold">
                {rul.currentRULHours !== null
                  ? `${rul.currentRULHours.toFixed(1)} h`
                  : '—'}
              </span>
            </div>

            <div
              className="w-px h-4"
              style={{
                background:
                  'var(--color-border)',
              }}
            />

            <div className="flex items-center gap-1.5">
              <span className="text-muted">
                FEED
              </span>

              <span
                className={
                  isOnline
                    ? 'text-emerald-400 font-semibold'
                    : 'text-red-400 font-semibold'
                }
              >
                {isOnline
                  ? 'ONLINE'
                  : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SYSTEM FOOTER
      ========================================================= */}

      <div
        className="rounded-xl border px-4 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{
          background:
            'rgba(255,255,255,0.012)',
          borderColor:
            'var(--color-border-subtle)',
        }}
      >

        <div className="flex items-center gap-2.5">

          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background:
                'rgba(52,211,153,0.08)',
              color:
                'var(--color-healthy)',
            }}
          >
            <CheckCircle2 size={13} />
          </div>

          <div>
            <span className="text-[10px] font-tech font-semibold text-main">
              Command environment ready
            </span>

            <span className="text-[10px] text-muted font-tech ml-2">
              Monitoring, telemetry, vision and diagnostic
              consoles available
            </span>
          </div>
        </div>

        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-[10px] font-tech font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <SettingsIcon size={12} />
          <span>
            System Parameters
          </span>
          <ArrowRight size={11} />
        </Link>
      </div>

    </div>
  )
}