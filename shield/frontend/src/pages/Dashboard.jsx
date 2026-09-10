import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

import {
  Activity,
  Thermometer,
  Zap,
  Gauge,
  HeartPulse,
  Radio,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  Camera,
  Server,
  Bell,
} from 'lucide-react'

import PageHeader from '../components/common/PageHeader'
import HealthGauge from '../components/dashboard/HealthGauge'
import RecentAlerts from '../components/dashboard/RecentAlerts'
import StatusBadge from '../components/common/StatusBadge'
import { fmtTime } from '../lib/utils'


// ================================================================
// CONFIGURATION
// ================================================================

/*
 * Telemetry is considered stale when no fresh reading has been
 * received for this amount of time.
 */
const STALE_AFTER_MS = 60 * 1000


/*
 * Browser storage key for preserving the last valid reading.
 */
const LAST_READING_KEY = 'cb001_last_known_telemetry'


/*
 * ---------------------------------------------------------------
 * SENSOR THRESHOLDS
 * ---------------------------------------------------------------
 *
 * These are DEMO / application thresholds.
 *
 * They should eventually be replaced with thresholds supplied
 * by the actual conveyor equipment specification.
 *
 * The previous dashboard used:
 *
 *     Motor Current > 0.05 A = WARNING
 *
 * That is clearly inconsistent with your current simulator,
 * which produces readings around 1–2 A.
 *
 * For the current demo we use:
 *
 *     < 2.5 A  = NORMAL
 *     > 2.5 A  = WARNING
 *     > 3.5 A  = CRITICAL
 *
 * Change these later if your actual motor specification
 * requires different limits.
 */
const MOTOR_CURRENT_WARNING_A = 2.5
const MOTOR_CURRENT_CRITICAL_A = 3.5


// ================================================================
// TIMESTAMP HELPER
// ================================================================

function getTimestampMs(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return null
  }


  // --------------------------------------------------------------
  // Native Date
  // --------------------------------------------------------------

  if (value instanceof Date) {

    const timestamp =
      value.getTime()

    return Number.isFinite(timestamp)
      ? timestamp
      : null
  }


  // --------------------------------------------------------------
  // Number
  // --------------------------------------------------------------

  if (typeof value === 'number') {

    if (!Number.isFinite(value)) {
      return null
    }


    /*
     * Unix seconds:
     *
     * 1760000000
     *
     * Unix milliseconds:
     *
     * 1760000000000
     */
    if (value < 100000000000) {
      return value * 1000
    }


    return value
  }


  // --------------------------------------------------------------
  // String
  // --------------------------------------------------------------

  if (typeof value === 'string') {

    const timestamp =
      Date.parse(value)

    return Number.isFinite(timestamp)
      ? timestamp
      : null
  }


  // --------------------------------------------------------------
  // Firestore Timestamp
  // --------------------------------------------------------------

  if (
    typeof value === 'object' &&
    typeof value.toMillis === 'function'
  ) {

    try {

      const timestamp =
        value.toMillis()

      return Number.isFinite(timestamp)
        ? timestamp
        : null

    } catch {

      return null
    }
  }


  // --------------------------------------------------------------
  // Firestore serialized Timestamp
  // --------------------------------------------------------------

  if (
    typeof value === 'object' &&
    typeof value.seconds === 'number'
  ) {

    const nanoseconds =
      typeof value.nanoseconds === 'number'
        ? value.nanoseconds
        : 0


    return (
      value.seconds * 1000
    ) + (
        nanoseconds / 1000000
      )
  }


  // --------------------------------------------------------------
  // Alternative serialized Timestamp
  // --------------------------------------------------------------

  if (
    typeof value === 'object' &&
    typeof value._seconds === 'number'
  ) {

    const nanoseconds =
      typeof value._nanoseconds === 'number'
        ? value._nanoseconds
        : 0


    return (
      value._seconds * 1000
    ) + (
        nanoseconds / 1000000
      )
  }


  return null
}


// ================================================================
// SENSOR STATUS HELPERS
// ================================================================

function getTemperatureStatus(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return 'NO DATA'
  }


  if (value > 65) {
    return 'CRITICAL'
  }


  if (value > 48) {
    return 'WARNING'
  }


  return 'NORMAL'
}


function getVibrationStatus(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return 'NO DATA'
  }


  if (value > 7.1) {
    return 'CRITICAL'
  }


  if (value > 4.5) {
    return 'WARNING'
  }


  return 'NORMAL'
}


function getCurrentStatus(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return 'NO DATA'
  }


  if (value > MOTOR_CURRENT_CRITICAL_A) {
    return 'CRITICAL'
  }


  if (value > MOTOR_CURRENT_WARNING_A) {
    return 'WARNING'
  }


  return 'NORMAL'
}


function getMotorTemperatureStatus(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return 'NO DATA'
  }


  if (value > 80) {
    return 'CRITICAL'
  }


  if (value > 65) {
    return 'WARNING'
  }


  return 'NORMAL'
}


// ================================================================
// STATUS COLOR
// ================================================================

function getStatusColor(status) {

  if (status === 'CRITICAL') {
    return 'var(--color-critical)'
  }


  if (status === 'WARNING') {
    return 'var(--color-warning)'
  }


  if (status === 'NORMAL') {
    return 'var(--color-healthy)'
  }


  return 'var(--color-text-muted)'
}


// ================================================================
// VALUE FORMATTER
// ================================================================

function formatValue(
  value,
  decimals = 1
) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—'
  }


  return Number(value).toFixed(decimals)
}


// ================================================================
// MAIN DASHBOARD
// ================================================================

export default function Dashboard() {

  // ==============================================================
  // REDUX
  // ==============================================================

  const {
    liveReading,
    lastUpdated,
    connectionStatus,
  } = useSelector(
    state => state.sensor
  )


  const {
    globalRUL,
  } = useSelector(
    state => state.ui
  )

  // rul slice — authoritative backend RUL state
  const rul = useSelector(state => state.rul)


  const {
    alerts: reduxAlerts,
  } = useSelector(
    state => state.alert
  )


  // ==============================================================
  // LAST KNOWN READING
  // ==============================================================

  const [
    lastKnownReading,
    setLastKnownReading,
  ] = useState(() => {

    try {

      const stored =
        localStorage.getItem(
          LAST_READING_KEY
        )


      if (!stored) {
        return null
      }


      const parsed =
        JSON.parse(stored)


      /*
       * Make sure the stored object actually contains
       * the expected telemetry structure.
       */
      if (
        !parsed ||
        !parsed.features
      ) {
        return null
      }


      return parsed

    } catch (error) {

      console.warn(
        '[Dashboard] Unable to restore last known telemetry:',
        error
      )

      return null
    }
  })


  // ==============================================================
  // CURRENT TIME
  // ==============================================================

  /*
   * We update this every 5 seconds so the dashboard can
   * automatically transition:
   *
   * LIVE → STALE
   *
   * without requiring another Firestore event.
   */
  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    Date.now()
  )


  useEffect(() => {

    const interval =
      setInterval(() => {

        setCurrentTime(
          Date.now()
        )

      }, 5000)


    return () => {

      clearInterval(interval)

    }

  }, [])


  // ==============================================================
  // SAVE VALID LIVE READING
  // ==============================================================

  useEffect(() => {

    if (!liveReading) {
      return
    }


    const features =
      liveReading.features


    if (
      !features ||
      typeof features !== 'object'
    ) {
      return
    }


    /*
     * Only persist a reading that has an actual timestamp.
     *
     * We do NOT use Date.now() as a fallback here because doing so
     * would make an old reading look like a newly received reading.
     */
    const readingTimestamp =
      getTimestampMs(
        liveReading.timestamp
      )


    if (readingTimestamp === null) {
      return
    }


    const snapshot = {

      ...liveReading,

      _lastKnownAt:
        readingTimestamp,

    }


    try {

      localStorage.setItem(
        LAST_READING_KEY,
        JSON.stringify(snapshot)
      )


      setLastKnownReading(
        snapshot
      )

    } catch (error) {

      console.warn(
        '[Dashboard] Unable to save last known telemetry:',
        error
      )
    }

  }, [
    liveReading,
  ])


  // ==============================================================
  // LIVE READING TIMESTAMP
  // ==============================================================

  const liveReadingTimestamp =
    getTimestampMs(
      liveReading?.timestamp
    )


  // ==============================================================
  // LIVE READING AGE
  // ==============================================================

  const liveReadingAge =
    liveReadingTimestamp !== null
      ? Math.max(
        0,
        currentTime -
        liveReadingTimestamp
      )
      : null


  // ==============================================================
  // LIVE READING VALIDITY
  // ==============================================================

  /*
   * A reading is considered live ONLY when:
   *
   * 1. It exists.
   * 2. It contains features.
   * 3. It has a valid timestamp.
   * 4. The timestamp is not older than STALE_AFTER_MS.
   *
   * This is intentionally stricter than the previous implementation.
   */
  const hasLiveFeatures =
    Boolean(
      liveReading &&
      liveReading.features &&
      typeof liveReading.features === 'object'
    )


  const hasFreshReading =
    hasLiveFeatures &&
    liveReadingTimestamp !== null &&
    liveReadingAge !== null &&
    liveReadingAge <= STALE_AFTER_MS


  // ==============================================================
  // CLOUD CONNECTION
  // ==============================================================

  const cloudOffline =
    connectionStatus === 'OFFLINE' ||
    connectionStatus === 'DISCONNECTED' ||
    connectionStatus === 'ERROR'


  // ==============================================================
  // SELECT DISPLAY DATA
  // ==============================================================

  /*
   * Fresh Firestore reading:
   *
   *     use liveReading
   *
   * Otherwise:
   *
   *     use last known reading
   *
   * We NEVER create fake sensor values here.
   */
  const displayReading =
    hasFreshReading
      ? liveReading
      : lastKnownReading


  const features =
    displayReading?.features || {}


  // ==============================================================
  // SENSOR VALUES
  // ==============================================================

  const tempBelt =
    features.temp_belt ?? null


  const vibration =
    features.vib_rms ?? null


  const motorCurrent =
    features.current_rms ?? null


  const motorTemp =
    features.temp_motor ?? null


  const health =
    displayReading?.edge_health ?? null


  // ==============================================================
  // TELEMETRY STATE
  // ==============================================================

  let telemetryState =
    'NO_DATA'


  if (hasFreshReading) {

    telemetryState =
      'LIVE'

  } else if (
    cloudOffline &&
    lastKnownReading
  ) {

    telemetryState =
      'CLOUD_OFFLINE'

  } else if (
    lastKnownReading
  ) {

    telemetryState =
      'STALE'
  }


  // ==============================================================
  // TELEMETRY STATUS CONFIG
  // ==============================================================

  const telemetryStatusMap = {

    LIVE: {

      label:
        'LIVE TELEMETRY',

      color:
        'var(--color-healthy)',

      background:
        'rgba(52,211,153,0.045)',

      border:
        'rgba(52,211,153,0.16)',

      message:
        'Firestore telemetry is updating normally.',

      icon:
        Radio,

    },


    CLOUD_OFFLINE: {

      label:
        'CLOUD TELEMETRY OFFLINE',

      color:
        'var(--color-critical)',

      background:
        'rgba(244,63,94,0.055)',

      border:
        'rgba(244,63,94,0.22)',

      message:
        'Cloud telemetry is unavailable. Showing the last known sensor readings.',

      icon:
        AlertTriangle,

    },


    STALE: {

      label:
        'TELEMETRY STALE',

      color:
        'var(--color-warning)',

      background:
        'rgba(245,158,11,0.055)',

      border:
        'rgba(245,158,11,0.20)',

      message:
        'No new telemetry has been received recently. Showing the last known sensor readings.',

      icon:
        Clock3,

    },


    NO_DATA: {

      label:
        'NO TELEMETRY DATA',

      color:
        'var(--color-text-muted)',

      background:
        'rgba(255,255,255,0.02)',

      border:
        'var(--color-border)',

      message:
        'No telemetry reading has been received from the conveyor.',

      icon:
        Clock3,

    },

  }


  const telemetryStatus =
    telemetryStatusMap[
    telemetryState
    ]


  const TelemetryStatusIcon =
    telemetryStatus.icon


  // ==============================================================
  // ALERTS
  // ==============================================================

  const alerts =
    Array.isArray(reduxAlerts)
      ? reduxAlerts
      : []


  const activeAlerts =
    alerts.filter(
      alert =>
        alert.status === 'ACTIVE'
    )


  const criticalAlerts =
    activeAlerts.filter(
      alert =>
        alert.severity === 'CRITICAL'
    )


  const activeAlertsCount =
    activeAlerts.length


  const criticalCount =
    criticalAlerts.length


  // ==============================================================
  // CONNECTION
  // ==============================================================

  const isLoading =
    connectionStatus === 'LOADING'


  // ==============================================================
  // SENSOR STATUS
  // ==============================================================

  const tempStatus =
    getTemperatureStatus(
      tempBelt
    )


  const vibrationStatus =
    getVibrationStatus(
      vibration
    )


  const currentStatus =
    getCurrentStatus(
      motorCurrent
    )


  const motorTempStatus =
    getMotorTemperatureStatus(
      motorTemp
    )


  // ==============================================================
  // HEALTH DISPLAY
  // ==============================================================

  const healthDisplay =
    health !== null &&
      health !== undefined &&
      Number.isFinite(Number(health))
      ? `${Number(health).toFixed(1)}%`
      : '—'


  // RUL display values from the authoritative rulSlice
  const rulHoursDisplay = rul.currentRULHours !== null
    ? `${rul.currentRULHours.toFixed(1)} h`
    : null

  const rulMinutesRemainder = rul.currentRULMinutes !== null
    ? Math.round(rul.currentRULMinutes % 60)
    : null

  const rulHoursWhole = rul.currentRULHours !== null
    ? Math.floor(rul.currentRULHours)
    : null

  const rulDisplay = rulHoursDisplay ?? '—'

  const hiDisplay = rul.healthIndex !== null
    ? `${rul.healthIndex.toFixed(1)}`
    : '—'

  // For backward-compat: globalRUL still exists in uiSlice,
  // but we no longer rely on the hardcoded 147 default.
  const rulDisplay_legacy = globalRUL !== null &&
    globalRUL !== undefined &&
    Number.isFinite(Number(globalRUL))
    ? `${globalRUL} h`
    : null

  // Trend chart data — map history to Recharts format
  const rulChartData = Array.isArray(rul.history)
    ? rul.history
      .filter(obs => obs.rulHours !== null && obs.timestamp)
      .slice(-60)   // last 60 valid estimates
      .reverse()    // history is newest-first from backend
      .map(obs => ({
        time: new Date(obs.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        rulHours: obs.rulHours,
        healthIndex: obs.healthIndex,
      }))
    : []


  // ==============================================================
  // LAST KNOWN TIMESTAMP
  // ==============================================================

  const lastKnownTimestamp =
    lastKnownReading?._lastKnownAt
      ? getTimestampMs(
        lastKnownReading._lastKnownAt
      )
      : null


  const lastKnownTimeText =
    lastKnownTimestamp !== null
      ? fmtTime(
        new Date(
          lastKnownTimestamp
        )
      )
      : lastUpdated
        ? fmtTime(
          new Date(
            lastUpdated
          )
        )
        : 'Previously received'


  // ==============================================================
  // TELEMETRY CARDS
  // ==============================================================

  const telemetryCards = [

    {
      id:
        'belt-temperature',

      sensor:
        'TT-101',

      label:
        'Belt Surface Temperature',

      value:
        formatValue(
          tempBelt,
          1
        ),

      unit:
        '°C',

      icon:
        Thermometer,

      status:
        tempStatus,

      normal:
        '< 48 °C',
    },


    {
      id:
        'vibration',

      sensor:
        'VT-301',

      label:
        'Vibration RMS',

      value:
        formatValue(
          vibration,
          2
        ),

      unit:
        'mm/s',

      icon:
        Activity,

      status:
        vibrationStatus,

      normal:
        '< 4.5 mm/s',
    },


    {
      id:
        'motor-current',

      sensor:
        'CT-401',

      label:
        'Motor Current',

      value:
        formatValue(
          motorCurrent,
          3
        ),

      unit:
        'A',

      icon:
        Zap,

      status:
        currentStatus,

      normal:
        `< ${MOTOR_CURRENT_WARNING_A.toFixed(1)} A`,
    },


    {
      id:
        'motor-temperature',

      sensor:
        'TT-201',

      label:
        'Motor Temperature',

      value:
        formatValue(
          motorTemp,
          1
        ),

      unit:
        '°C',

      icon:
        Cpu,

      status:
        motorTempStatus,

      normal:
        '< 65 °C',
    },

  ]


  // ==============================================================
  // MONITORING COVERAGE
  // ==============================================================

  const coverageItems = [

    {
      label:
        'Temperature Monitoring',

      sensor:
        'TT-101 / TT-201',

      icon:
        Thermometer,

      status:
        tempBelt !== null ||
          motorTemp !== null
          ? 'ACTIVE'
          : 'NO DATA',
    },


    {
      label:
        'Vibration Monitoring',

      sensor:
        'VT-301',

      icon:
        Activity,

      status:
        vibration !== null
          ? 'ACTIVE'
          : 'NO DATA',
    },


    {
      label:
        'Motor Current',

      sensor:
        'CT-401',

      icon:
        Zap,

      status:
        motorCurrent !== null
          ? 'ACTIVE'
          : 'NO DATA',
    },


    {
      label:
        'Visual Inspection',

      sensor:
        'Vision subsystem',

      icon:
        Camera,

      status:
        'AVAILABLE',
    },

  ]


  // ==============================================================
  // RENDER
  // ==============================================================

  return (

    <div
      className="
        space-y-7
        pb-12
        max-w-7xl
        mx-auto
      "
    >

      {/* ========================================================
          PAGE HEADER
      ========================================================= */}

      <PageHeader

        title="Telemetry Command Deck"

        subtitle="
          Live conveyor condition monitoring, sensor health
          surveillance and predictive maintenance intelligence
        "

        statusBadge={

          <StatusBadge
            status={
              telemetryState === 'LIVE'
                ? 'ONLINE'
                : telemetryState === 'CLOUD_OFFLINE'
                  ? 'OFFLINE'
                  : telemetryState === 'STALE'
                    ? 'WARNING'
                    : 'OFFLINE'
            }
          />

        }

        actions={

          <div className="flex items-center gap-3">

            {lastUpdated && (

              <div
                className="
                  hidden
                  sm:flex
                  items-center
                  gap-1.5
                  text-xs
                  font-mono
                  text-muted
                "
              >

                <Clock3
                  size={12}
                />

                <span>
                  Last sync
                </span>

                <span
                  className="text-main"
                >
                  {fmtTime(
                    new Date(
                      lastUpdated
                    )
                  )}
                </span>

              </div>

            )}


            <div
              className="
                flex
                items-center
                gap-2
                px-3
                py-1.5
                rounded-full
                text-[10px]
                font-tech
                font-semibold
              "
              style={{

                background:
                  telemetryState === 'LIVE'
                    ? 'rgba(52,211,153,0.08)'
                    : telemetryState === 'CLOUD_OFFLINE'
                      ? 'rgba(244,63,94,0.08)'
                      : 'rgba(245,158,11,0.08)',

                color:
                  telemetryStatus.color,

                border:
                  `1px solid ${telemetryStatus.border}`,

              }}
            >

              <span
                className="
                  w-1.5
                  h-1.5
                  rounded-full
                "
                style={{

                  background:
                    telemetryStatus.color,

                  boxShadow:
                    telemetryState === 'LIVE'
                      ? `0 0 8px ${telemetryStatus.color}`
                      : 'none',

                }}
              />

              {telemetryState === 'LIVE'
                ? 'STREAM ONLINE'
                : telemetryState === 'CLOUD_OFFLINE'
                  ? 'CLOUD OFFLINE'
                  : telemetryState === 'STALE'
                    ? 'DATA STALE'
                    : isLoading
                      ? 'CONNECTING'
                      : 'NO DATA'}

            </div>

          </div>

        }

      />


      {/* ========================================================
          TELEMETRY STATUS
      ========================================================= */}

      <section
        className="
          rounded-xl
          border
          px-4
          py-3.5
        "
        style={{

          background:
            telemetryStatus.background,

          borderColor:
            telemetryStatus.border,

        }}
      >

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                flex-shrink-0
              "
              style={{

                background:
                  `${telemetryStatus.color}12`,

                color:
                  telemetryStatus.color,

              }}
            >

              <TelemetryStatusIcon
                size={15}
              />

            </div>


            <div>

              <div
                className="
                  text-[10px]
                  font-tech
                  font-semibold
                  tracking-wide
                "
                style={{
                  color:
                    telemetryStatus.color,
                }}
              >
                {telemetryStatus.label}
              </div>


              <div
                className="
                  text-[10px]
                  text-muted
                  font-tech
                  mt-0.5
                "
              >
                {telemetryStatus.message}
              </div>

            </div>

          </div>


          {lastKnownReading &&
            telemetryState !== 'LIVE' && (

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-[9px]
                  font-mono
                  text-muted
                  flex-shrink-0
                "
              >

                <span>
                  LAST KNOWN
                </span>

                <span
                  className="
                    px-2
                    py-1
                    rounded-md
                    border
                    text-main
                  "
                  style={{
                    borderColor:
                      'var(--color-border)',
                  }}
                >
                  {lastKnownTimeText}
                </span>

              </div>

            )}

        </div>

      </section>


      {/* ========================================================
          CONVEYOR CONDITION OVERVIEW
      ========================================================= */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
        "
        style={{

          background:
            'linear-gradient(135deg, rgba(12,29,45,0.98), rgba(8,20,32,0.98))',

          borderColor:
            criticalCount > 0
              ? 'rgba(244,63,94,0.25)'
              : 'var(--color-border)',

          boxShadow:
            '0 18px 45px rgba(0,0,0,0.18)',

        }}
      >

        {/* Technical background */}

        <div
          className="
            absolute
            inset-0
            opacity-20
            pointer-events-none
          "
          style={{

            backgroundImage:
              'linear-gradient(rgba(56,189,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.05) 1px, transparent 1px)',

            backgroundSize:
              '32px 32px',

          }}
        />


        <div
          className="
            relative
            p-6
          "
        >

          {/* Asset identity */}

          <div
            className="
              flex
              flex-col
              lg:flex-row
              lg:items-center
              lg:justify-between
              gap-4
            "
          >

            <div>

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2.5
                  mb-2
                "
              >

                <span
                  className="
                    px-2.5
                    py-1
                    rounded-full
                    text-[9px]
                    font-tech
                    font-semibold
                    tracking-wider
                  "
                  style={{

                    color:
                      'var(--color-accent)',

                    background:
                      'rgba(56,189,248,0.08)',

                    border:
                      '1px solid rgba(56,189,248,0.18)',

                  }}
                >
                  CONVEYOR CB-001
                </span>


                <span
                  className="
                    text-[10px]
                    text-muted
                    font-mono
                  "
                >
                  OVERLAND LINE · 1.2 KM
                </span>

              </div>


              <h2
                className="
                  font-display
                  text-xl
                  lg:text-2xl
                  font-bold
                  text-main
                  tracking-tight
                "
              >
                Conveyor Condition Overview
              </h2>


              <p
                className="
                  text-xs
                  text-muted
                  font-tech
                  mt-1.5
                  max-w-2xl
                "
              >
                Current operating condition derived from
                connected telemetry channels and system
                health state.
              </p>

            </div>


            {/* Operating posture */}

            <div
              className="
                flex
                items-center
                gap-3
                px-4
                py-3
                rounded-xl
                border
                self-start
                lg:self-auto
              "
              style={{

                background:
                  criticalCount > 0
                    ? 'rgba(244,63,94,0.06)'
                    : activeAlertsCount > 0
                      ? 'rgba(245,158,11,0.06)'
                      : 'rgba(52,211,153,0.05)',

                borderColor:
                  criticalCount > 0
                    ? 'rgba(244,63,94,0.20)'
                    : activeAlertsCount > 0
                      ? 'rgba(245,158,11,0.20)'
                      : 'rgba(52,211,153,0.16)',

              }}
            >

              {criticalCount > 0 ? (

                <AlertTriangle
                  size={18}
                  style={{
                    color:
                      'var(--color-critical)',
                  }}
                />

              ) : activeAlertsCount > 0 ? (

                <AlertTriangle
                  size={18}
                  style={{
                    color:
                      'var(--color-warning)',
                  }}
                />

              ) : (

                <ShieldCheck
                  size={18}
                  style={{
                    color:
                      'var(--color-healthy)',
                  }}
                />

              )}


              <div>

                <div
                  className="
                    text-[9px]
                    font-tech
                    uppercase
                    tracking-wider
                    text-muted
                  "
                >
                  Operating Posture
                </div>


                <div
                  className="
                    text-xs
                    font-semibold
                    font-tech
                    mt-0.5
                  "
                  style={{

                    color:
                      criticalCount > 0
                        ? 'var(--color-critical)'
                        : activeAlertsCount > 0
                          ? 'var(--color-warning)'
                          : 'var(--color-healthy)',

                  }}
                >
                  {criticalCount > 0
                    ? 'ATTENTION REQUIRED'
                    : activeAlertsCount > 0
                      ? 'MONITOR CONDITIONS'
                      : 'NOMINAL'}
                </div>

              </div>

            </div>

          </div>


          {/* ====================================================
              PRIMARY TELEMETRY
          ==================================================== */}

          <div
            className="
              grid
              grid-cols-2
              lg:grid-cols-4
              gap-3
              mt-6
            "
          >

            {telemetryCards.map(card => {

              const Icon =
                card.icon


              const color =
                getStatusColor(
                  card.status
                )


              return (

                <div
                  key={card.id}
                  className="
                    relative
                    rounded-xl
                    border
                    p-4
                    overflow-hidden
                  "
                  style={{

                    background:
                      'rgba(255,255,255,0.018)',

                    borderColor:
                      card.status === 'CRITICAL'
                        ? 'var(--color-critical-border)'
                        : card.status === 'WARNING'
                          ? 'var(--color-warning-border)'
                          : 'var(--color-border-subtle)',

                  }}
                >

                  <div
                    className="
                      absolute
                      top-0
                      left-0
                      right-0
                      h-px
                    "
                    style={{
                      background:
                        color,
                      opacity:
                        0.65,
                    }}
                  />


                  <div
                    className="
                      flex
                      items-center
                      justify-between
                    "
                  >

                    <span
                      className="
                        text-[9px]
                        font-mono
                        font-bold
                        text-muted
                      "
                    >
                      {card.sensor}
                    </span>


                    <Icon
                      size={14}
                      style={{
                        color,
                      }}
                    />

                  </div>


                  <div
                    className="
                      text-[10px]
                      font-tech
                      text-muted
                      mt-3
                    "
                  >
                    {card.label}
                  </div>


                  <div
                    className="
                      flex
                      items-baseline
                      gap-1
                      mt-1
                    "
                  >

                    <span
                      className="
                        text-xl
                        font-mono
                        font-bold
                      "
                      style={{

                        color:
                          card.status === 'CRITICAL'
                            ? 'var(--color-critical)'
                            : card.status === 'WARNING'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-main)',

                      }}
                    >
                      {card.value}
                    </span>


                    <span
                      className="
                        text-[10px]
                        font-mono
                        text-muted
                      "
                    >
                      {card.unit}
                    </span>

                  </div>


                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      mt-2
                    "
                  >

                    <span
                      className="
                        text-[9px]
                        font-mono
                        text-muted
                      "
                    >
                      Normal {card.normal}
                    </span>


                    <span
                      className="
                        text-[8px]
                        font-tech
                        font-semibold
                      "
                      style={{
                        color,
                      }}
                    >
                      {card.status}
                    </span>

                  </div>

                </div>

              )

            })}

          </div>

        </div>

      </section>


      {/* ========================================================
          HEALTH + LIVE SENSOR ARRAY
      ========================================================= */}

      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-12
          gap-5
        "
      >

        {/* ======================================================
            EQUIPMENT RELIABILITY
        ====================================================== */}

        <section
          className="
            lg:col-span-5
            rounded-2xl
            border
            p-5
          "
          style={{

            background:
              'var(--color-surface)',

            borderColor:
              'var(--color-border)',

          }}
        >

          <div
            className="
              flex
              items-center
              justify-between
              mb-5
            "
          >

            <div>

              <h3
                className="
                  text-base
                  font-display
                  font-semibold
                  text-main
                "
              >
                Equipment Reliability
              </h3>


              <p
                className="
                  text-[10px]
                  text-muted
                  font-tech
                  mt-1
                "
              >
                Health and remaining-life indicators
              </p>

            </div>


            <Gauge
              size={18}
              className="text-cyan-400"
            />

          </div>


          {/* Health gauge */}

          <div
            className="
              rounded-xl
              border
              p-5
            "
            style={{

              background:
                'rgba(2,8,16,0.35)',

              borderColor:
                'var(--color-border-subtle)',

            }}
          >

            <div
              className="
                flex
                items-center
                justify-center
              "
            >
              {rul.healthIndex !== null ? (

                <HealthGauge
                  value={rul.healthIndex}
                  label="HEALTH INDEX"
                />

              ) : (

                <div
                  className="
                    w-32
                    h-32
                    rounded-full
                    border
                    flex
                    flex-col
                    items-center
                    justify-center
                  "
                  style={{
                    borderColor:
                      'var(--color-border)',
                  }}
                >

                  <span
                    className="
                      text-2xl
                      font-mono
                      font-bold
                      text-muted
                    "
                  >
                    —
                  </span>

                  <span
                    className="
                      text-[9px]
                      font-tech
                      text-muted
                    "
                  >
                    NO DATA
                  </span>

                </div>

              )}

            </div>


            {/* Health / RUL mini cards */}

            <div
              className="
                  grid
                  grid-cols-2
                  gap-3
                  mt-5
                "
            >

              {/* Health Index (from HI pipeline) */}
              <div
                className="
                    rounded-xl
                    border
                    p-3
                  "
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  background: 'rgba(255,255,255,0.015)',
                }}
              >
                <div
                  className="
                      text-[9px]
                      text-muted
                      font-tech
                      uppercase
                    "
                >
                  {rul.healthIndex !== null ? 'HI (Pipeline)' : 'Health Score'}
                </div>

                <div
                  className="
                      text-lg
                      font-mono
                      font-bold
                      mt-1
                    "
                  style={{
                    color: rul.healthIndex !== null
                      ? rul.healthIndex > 60
                        ? 'var(--color-healthy)'
                        : rul.healthIndex > 30
                          ? 'var(--color-warning)'
                          : 'var(--color-critical)'
                      : 'var(--color-text-main)',
                  }}
                >
                  {rul.healthIndex !== null ? hiDisplay : healthDisplay}
                </div>
              </div>


              {/* Estimated RUL */}
              <div
                className="
                    rounded-xl
                    border
                    p-3
                  "
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  background: 'rgba(255,255,255,0.015)',
                }}
              >
                <div
                  className="
                      text-[9px]
                      text-muted
                      font-tech
                      uppercase
                    "
                >
                  Estimated RUL
                </div>

                <div
                  className="
                      text-lg
                      font-mono
                      font-bold
                      text-cyan-400
                      mt-1
                    "
                >
                  {rulDisplay}
                </div>
              </div>

            </div>


          </div>


          {/* RUL progress */}

          <div className="mt-5">

            <div
              className="
                flex
                items-center
                justify-between
                mb-2
              "
            >

              <span
                className="
                  text-[10px]
                  font-tech
                  text-muted
                  uppercase
                "
              >
                Reliability Horizon
              </span>


              <span
                className="
                  text-[10px]
                  font-mono
                  text-muted
                "
              >
                {rul.status === 'ESTIMATING' && rul.currentRULHours !== null
                  ? `${rul.currentRULHours.toFixed(1)} hours`
                  : rul.status === 'INSUFFICIENT_DATA'
                    ? 'Accumulating data…'
                    : rul.status === 'STABLE — RUL NOT ESTIMABLE'
                      ? 'Stable — not estimable'
                      : rul.status === 'CRITICAL / FAILURE REGION'
                        ? 'CRITICAL'
                        : 'No prediction'}
              </span>

            </div>


            <div
              className="
                h-2
                rounded-full
                overflow-hidden
              "
              style={{
                background: 'rgba(255,255,255,0.06)',
              }}
            >

              <div
                className="
                  h-full
                  rounded-full
                  transition-all
                  duration-500
                "
                style={{
                  width:
                    rul.currentRULHours !== null
                      ? `${Math.min(100, Math.max(0, (rul.currentRULHours / 720) * 100))}%`
                      : '0%',
                  background:
                    rul.status === 'CRITICAL / FAILURE REGION'
                      ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                      : 'linear-gradient(90deg, #22C55E, #F59E0B)',
                }}
              />

            </div>


            <div
              className="
                flex
                justify-between
                text-[8px]
                font-mono
                text-muted
                mt-1
              "
            >

              <span>
                0 h
              </span>

              <span>
                720 h reference
              </span>

            </div>

          </div>


          {/* RUL Status + Disclaimer */}
          {(rul.status || rul.disclaimer) && (
            <div
              className="
                mt-4
                px-3
                py-2
                rounded-lg
                text-[9px]
                font-tech
                leading-relaxed
              "
              style={{
                background: 'rgba(99,179,237,0.06)',
                border: '1px solid rgba(99,179,237,0.18)',
                color: 'rgba(147,197,253,0.85)',
              }}
            >
              {rul.disclaimer && (
                <div className="font-bold uppercase tracking-widest mb-0.5">
                  {rul.disclaimer}
                </div>
              )}
              {rul.reason && (
                <div className="opacity-75">{rul.reason}</div>
              )}
              {rul.trendConfidence && (
                <div className="mt-1">
                  Trend confidence: <strong>{rul.trendConfidence}</strong>
                  {rul.rSquared !== null && ` (R²=${rul.rSquared.toFixed(2)})`}
                </div>
              )}
              {rul.samplesNeededToTrain && rul.samplesNeededToTrain > 0 && (
                <div>
                  {rul.samplesNeededToTrain} more samples needed to train anomaly model.
                </div>
              )}
            </div>
          )}



          {/* Reliability status */}

          <div
            className="
              mt-5
              pt-4
              border-t
              flex
              items-center
              gap-2
            "
            style={{
              borderColor:
                'var(--color-border-subtle)',
            }}
          >

            {criticalCount > 0 ? (

              <AlertTriangle
                size={14}
                className="text-rose-400"
              />

            ) : (

              <CheckCircle2
                size={14}
                className="text-emerald-400"
              />

            )}


            <span
              className="
                text-[10px]
                font-tech
                text-muted
              "
            >

              {criticalCount > 0
                ? `${criticalCount} critical condition${criticalCount === 1
                  ? ''
                  : 's'
                } detected`

                : activeAlertsCount > 0
                  ? `${activeAlertsCount} active event${activeAlertsCount === 1
                    ? ''
                    : 's'
                  } under monitoring`

                  : 'No active critical conditions'}

            </span>

          </div>

        </section>


        {/* ======================================================
            LIVE TRANSDUCER ARRAY
        ====================================================== */}

        <section
          className="
            lg:col-span-7
            rounded-2xl
            border
            p-5
          "
          style={{

            background:
              'var(--color-surface)',

            borderColor:
              'var(--color-border)',

          }}
        >

          <div
            className="
              flex
              items-center
              justify-between
              mb-5
            "
          >

            <div>

              <h3
                className="
                  text-base
                  font-display
                  font-semibold
                  text-main
                "
              >
                Live Transducer Array
              </h3>


              <p
                className="
                  text-[10px]
                  text-muted
                  font-tech
                  mt-1
                "
              >
                Current readings from connected conveyor channels
              </p>

            </div>


            <div
              className="
                flex
                items-center
                gap-1.5
                text-[9px]
                font-mono
                text-muted
              "
            >

              <Radio
                size={12}
                style={{
                  color:
                    telemetryState === 'LIVE'
                      ? 'var(--color-healthy)'
                      : telemetryStatus.color,
                }}
              />


              {telemetryState === 'LIVE'
                ? 'STREAMING'
                : telemetryState === 'CLOUD_OFFLINE'
                  ? 'CLOUD OFFLINE'
                  : telemetryState === 'STALE'
                    ? 'LAST KNOWN DATA'
                    : 'NO LIVE FEED'}

            </div>

          </div>


          {/* Sensor rows */}

          <div
            className="
              space-y-2.5
            "
          >

            {telemetryCards.map(card => {

              const Icon =
                card.icon


              const color =
                getStatusColor(
                  card.status
                )


              return (

                <div
                  key={card.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-xl
                    border
                    p-3.5
                  "
                  style={{

                    background:
                      'rgba(255,255,255,0.015)',

                    borderColor:
                      'var(--color-border-subtle)',

                  }}
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      min-w-0
                    "
                  >

                    <div
                      className="
                        w-9
                        h-9
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        flex-shrink-0
                      "
                      style={{

                        background:
                          'rgba(56,189,248,0.06)',

                        color:
                          'var(--color-accent)',

                      }}
                    >

                      <Icon
                        size={16}
                      />

                    </div>


                    <div
                      className="min-w-0"
                    >

                      <div
                        className="
                          text-[11px]
                          font-display
                          font-medium
                          text-main
                          truncate
                        "
                      >
                        {card.label}
                      </div>


                      <div
                        className="
                          text-[9px]
                          font-mono
                          text-muted
                          mt-0.5
                        "
                      >
                        {card.sensor}
                      </div>

                    </div>

                  </div>


                  <div
                    className="
                      flex
                      items-center
                      gap-4
                      flex-shrink-0
                    "
                  >

                    <div
                      className="
                        hidden
                        sm:block
                        text-right
                      "
                    >

                      <div
                        className="
                          text-[9px]
                          font-tech
                          text-muted
                        "
                      >
                        NORMAL RANGE
                      </div>


                      <div
                        className="
                          text-[9px]
                          font-mono
                          text-muted
                        "
                      >
                        {card.normal}
                      </div>

                    </div>


                    <div
                      className="text-right"
                    >

                      <div
                        className="
                          font-mono
                          font-bold
                          text-sm
                          text-main
                        "
                      >

                        {card.value}

                        <span
                          className="
                            text-[9px]
                            text-muted
                            ml-1
                          "
                        >
                          {card.unit}
                        </span>

                      </div>


                      <div
                        className="
                          text-[8px]
                          font-tech
                          font-semibold
                          mt-0.5
                        "
                        style={{
                          color,
                        }}
                      >
                        {card.status}
                      </div>

                    </div>


                    <span
                      className="
                        w-2
                        h-2
                        rounded-full
                        flex-shrink-0
                      "
                      style={{

                        background:
                          color,

                        boxShadow:
                          card.status === 'NO DATA'
                            ? 'none'
                            : `0 0 7px ${color}`,

                      }}
                    />

                  </div>

                </div>

              )

            })}

          </div>


          {/* Sensor gateway */}

          <div
            className="
              mt-4
              pt-4
              border-t
              flex
              items-center
              justify-between
            "
            style={{
              borderColor:
                'var(--color-border-subtle)',
            }}
          >

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <Server
                size={13}
                className="text-slate-400"
              />


              <span
                className="
                  text-[9px]
                  font-tech
                  text-muted
                "
              >
                Sensor gateway
              </span>


              <span
                className="
                  text-[9px]
                  font-mono
                  font-semibold
                "
                style={{

                  color:
                    telemetryState === 'LIVE'
                      ? 'var(--color-healthy)'
                      : telemetryStatus.color,

                }}
              >
                {telemetryState === 'LIVE'
                  ? 'CONNECTED'
                  : telemetryState === 'CLOUD_OFFLINE'
                    ? 'CLOUD OFFLINE'
                    : telemetryState === 'STALE'
                      ? 'LAST KNOWN'
                      : 'WAITING'}
              </span>

            </div>


            <span
              className="
                text-[9px]
                font-mono
                text-muted
              "
            >

              {telemetryState === 'LIVE'
                ? lastUpdated
                  ? fmtTime(
                    new Date(
                      lastUpdated
                    )
                  )
                  : 'Live'
                : lastKnownTimeText}

            </span>

          </div>

        </section>

      </div>


      {/* ========================================================
          MONITORING COVERAGE
      ========================================================= */}

      <section>

        <div
          className="
            flex
            items-end
            justify-between
            mb-4
          "
        >

          <div>

            <h3
              className="
                text-base
                font-display
                font-semibold
                text-main
              "
            >
              Monitoring Coverage
            </h3>


            <p
              className="
                text-[10px]
                text-muted
                font-tech
                mt-1
              "
            >
              Active condition-monitoring capabilities available to operators
            </p>

          </div>


          <span
            className="
              text-[9px]
              font-mono
              text-muted
            "
          >
            CB-001
          </span>

        </div>


        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-4
            gap-3
          "
        >

          {coverageItems.map(item => {

            const Icon =
              item.icon


            const active =
              item.status === 'ACTIVE' ||
              item.status === 'AVAILABLE'


            return (

              <div
                key={item.label}
                className="
                  rounded-xl
                  border
                  p-4
                "
                style={{

                  background:
                    'var(--color-surface)',

                  borderColor:
                    'var(--color-border)',

                }}
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >

                  <div
                    className="
                      w-8
                      h-8
                      rounded-lg
                      flex
                      items-center
                      justify-center
                    "
                    style={{

                      background:
                        active
                          ? 'rgba(56,189,248,0.07)'
                          : 'rgba(255,255,255,0.03)',

                      color:
                        active
                          ? 'var(--color-accent)'
                          : 'var(--color-text-muted)',

                    }}
                  >

                    <Icon
                      size={15}
                    />

                  </div>


                  <span
                    className="
                      text-[8px]
                      font-tech
                      font-semibold
                    "
                    style={{

                      color:
                        active
                          ? 'var(--color-healthy)'
                          : 'var(--color-text-muted)',

                    }}
                  >
                    {item.status}
                  </span>

                </div>


                <div
                  className="
                    text-[11px]
                    font-display
                    font-medium
                    text-main
                    mt-3
                  "
                >
                  {item.label}
                </div>


                <div
                  className="
                    text-[9px]
                    font-mono
                    text-muted
                    mt-1
                  "
                >
                  {item.sensor}
                </div>

              </div>

            )

          })}

        </div>

      </section>


      {/* ========================================================
          INCIDENT ACTIVITY
      ========================================================= */}

      <section>

        <div
          className="
            flex
            items-center
            justify-between
            mb-4
          "
        >

          <div>

            <h3
              className="
                text-base
                font-display
                font-semibold
                text-main
              "
            >
              Recent Incident Activity
            </h3>


            <p
              className="
                text-[10px]
                text-muted
                font-tech
                mt-1
              "
            >
              Active and recent operational events
            </p>

          </div>


          <div
            className="
              flex
              items-center
              gap-1.5
              px-2.5
              py-1
              rounded-full
              border
              text-[9px]
              font-mono
            "
            style={{

              background:
                activeAlertsCount > 0
                  ? 'rgba(245,158,11,0.06)'
                  : 'rgba(52,211,153,0.05)',

              borderColor:
                activeAlertsCount > 0
                  ? 'rgba(245,158,11,0.16)'
                  : 'rgba(52,211,153,0.14)',

              color:
                activeAlertsCount > 0
                  ? 'var(--color-warning)'
                  : 'var(--color-healthy)',

            }}
          >

            <Bell
              size={11}
            />

            {activeAlertsCount}{' '}
            ACTIVE

          </div>

        </div>


        <RecentAlerts
          alerts={alerts}
        />

      </section>


      {/* ========================================================
          FOOTER STATUS
      ========================================================= */}

      <div
        className="
          rounded-xl
          border
          px-4
          py-3.5
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
          gap-3
        "
        style={{

          background:
            'rgba(255,255,255,0.012)',

          borderColor:
            'var(--color-border-subtle)',

        }}
      >

        <div
          className="
            flex
            items-center
            gap-2.5
          "
        >

          {telemetryState === 'LIVE' ? (

            <CheckCircle2
              size={14}
              className="text-emerald-400"
            />

          ) : telemetryState === 'CLOUD_OFFLINE' ? (

            <AlertTriangle
              size={14}
              className="text-rose-400"
            />

          ) : (

            <Clock3
              size={14}
              className="text-amber-400"
            />

          )}


          <span
            className="
              text-[10px]
              font-tech
              font-semibold
              text-main
            "
          >
            Monitoring status
          </span>


          <span
            className="
              text-[10px]
              text-muted
              font-tech
            "
          >

            {telemetryState === 'LIVE'

              ? 'Live telemetry connection established'

              : telemetryState === 'CLOUD_OFFLINE'

                ? 'Cloud unavailable · last known readings retained'

                : telemetryState === 'STALE'

                  ? 'Telemetry feed has stopped updating · last known readings retained'

                  : 'Waiting for telemetry connection'}

          </span>

        </div>


        <div
          className="
            flex
            items-center
            gap-4
            text-[9px]
            font-mono
            text-muted
          "
        >

          <span>
            CHANNELS:{' '}
            <span className="text-main">
              4
            </span>
          </span>


          <span>
            ACTIVE ALERTS:{' '}
            <span
              style={{
                color:
                  activeAlertsCount > 0
                    ? 'var(--color-warning)'
                    : 'var(--color-healthy)',
              }}
            >
              {activeAlertsCount}
            </span>
          </span>



          <span>
            DATA:{' '}
            <span
              style={{
                color:
                  telemetryStatus.color,
              }}
            >
              {telemetryState}
            </span>
          </span>

        </div>

      </div>


      {/* ============================================================
          RUL TREND GRAPH
      ============================================================ */}

      <section
        id="rul-trend-graph"
        className="
          rounded-2xl
          border
          p-5
        "
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >

        {/* Header */}
        <div
          className="
            flex
            items-center
            justify-between
            mb-5
          "
        >

          <div>
            <h3
              className="
                text-base
                font-display
                font-semibold
                text-main
              "
            >
              RUL Trend &amp; Health Index
            </h3>

            <p
              className="
                text-[10px]
                text-muted
                font-tech
                mt-1
              "
            >
              Authoritative backend trend — OLS regression on 15-min HI window
            </p>
          </div>


          {/* Status chip */}
          <div
            className="
              flex
              items-center
              gap-1.5
              px-3
              py-1
              rounded-full
              text-[9px]
              font-tech
              font-bold
              uppercase
              tracking-widest
            "
            style={{
              background: rul.status === 'ESTIMATING'
                ? 'rgba(34,197,94,0.12)'
                : rul.status === 'CRITICAL / FAILURE REGION'
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(99,179,237,0.10)',
              color: rul.status === 'ESTIMATING'
                ? 'var(--color-healthy)'
                : rul.status === 'CRITICAL / FAILURE REGION'
                  ? 'var(--color-critical)'
                  : 'var(--color-text-muted)',
              border: rul.status === 'ESTIMATING'
                ? '1px solid rgba(34,197,94,0.25)'
                : rul.status === 'CRITICAL / FAILURE REGION'
                  ? '1px solid rgba(239,68,68,0.25)'
                  : '1px solid rgba(99,179,237,0.18)',
            }}
          >
            <span>{rul.status}</span>
          </div>

        </div>


        {/* Chart body */}
        {rulChartData.length >= 2 ? (

          <ResponsiveContainer
            width="100%"
            height={220}
          >
            <AreaChart
              data={rulChartData}
              margin={{ top: 5, right: 20, bottom: 0, left: 0 }}
            >

              <defs>
                <linearGradient id="rulGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="hiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />

              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                yAxisId="rul"
                orientation="left"
                tick={{ fontSize: 9, fill: '#22D3EE', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}h`}
                width={40}
              />

              <YAxis
                yAxisId="hi"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: '#A78BFA', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}`}
                width={32}
              />

              <Tooltip
                contentStyle={{
                  background: 'rgba(2,8,16,0.92)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: 'var(--color-text-main)',
                }}
                labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}
                formatter={(value, name) => {
                  if (name === 'rulHours') return [`${Number(value).toFixed(1)} h`, 'Est. RUL'];
                  if (name === 'healthIndex') return [`${Number(value).toFixed(1)}`, 'Health Index'];
                  return [value, name];
                }}
              />

              <Area
                yAxisId="rul"
                type="monotone"
                dataKey="rulHours"
                stroke="#22D3EE"
                strokeWidth={2}
                fill="url(#rulGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#22D3EE', stroke: 'rgba(34,211,238,0.4)', strokeWidth: 3 }}
              />

              <Area
                yAxisId="hi"
                type="monotone"
                dataKey="healthIndex"
                stroke="#A78BFA"
                strokeWidth={1.5}
                fill="url(#hiGradient)"
                dot={false}
                activeDot={{ r: 3, fill: '#A78BFA' }}
              />

            </AreaChart>
          </ResponsiveContainer>

        ) : (

          // Empty state
          <div
            className="
              flex
              flex-col
              items-center
              justify-center
              h-52
              rounded-xl
              border
              text-center
            "
            style={{
              background: 'rgba(255,255,255,0.015)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >

            <HeartPulse
              size={32}
              className="text-muted mb-3"
              style={{ opacity: 0.4 }}
            />

            <p
              className="
                text-[11px]
                font-tech
                text-muted
                mb-1
              "
            >
              Insufficient data for RUL trend
            </p>

            <p
              className="
                text-[9px]
                font-mono
                text-muted
              "
              style={{ opacity: 0.6 }}
            >
              {rul.status === 'INSUFFICIENT_DATA'
                ? rul.reason ?? 'Awaiting 15 min of telemetry history'
                : rul.status}
            </p>

          </div>

        )}


        {/* Legend */}
        <div
          className="
            flex
            items-center
            gap-5
            mt-4
            text-[9px]
            font-mono
            text-muted
          "
        >

          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-0.5"
              style={{ background: '#22D3EE' }}
            />
            <span>Est. RUL (hours)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-0.5"
              style={{ background: '#A78BFA' }}
            />
            <span>Health Index (HI)</span>
          </div>

          <div
            className="ml-auto"
            style={{ opacity: 0.5 }}
          >
            METHOD: UNSUPERVISED_TREND_OLS_v1
          </div>

        </div>

      </section>


    </div>

  )
}