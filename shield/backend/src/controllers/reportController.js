/**
 * reportController.js
 *
 * Handles:
 *   POST /api/reports/generate
 *   GET  /api/reports/download/:filename
 *   GET  /api/reports/list
 *
 * Report generation is data-driven.
 *
 * Principles:
 * - Supplies REAL telemetry history and latest sensor values from existing MongoDB RULObservation
 *   and RUL engine state for device CB_001.
 * - Never fabricates telemetry defaults (42.4, 61.8, 1.85, 41.2, etc.).
 * - If no valid telemetry exists, leaves features empty/null so reportService shows DATA UNAVAILABLE.
 * - Filters incidents and vision detections strictly to the requested evaluation window.
 * - Never generates incident timestamps with Date.now(); preserves real stored timestamps and
 *   excludes future incidents relative to report generation time.
 */

import mongoose from 'mongoose'
import { generateReport } from '../services/reportService.js'
import RULObservation from '../models/RULObservation.js'
import { getRULState, getRULHistory } from '../services/rulService.js'
import { generateEngineeringAssessment } from '../services/genaiService.js'

const VALID_FORMATS = new Set(['PDF', 'CSV', 'JSON'])

const VALID_REPORT_TYPES = new Set([
  'Conveyor Performance Report',
  'Damage Detection Report',
  'Sensor Health Report',
  'Alert History Report',
  'Maintenance Report',
])

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  if (typeof value !== 'string') {
    return value
  }
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizeReportType(value) {
  let type = String(value || 'Conveyor Performance Report').trim().replace(/\s+/g, ' ')
  type = type.replace(/\s+Report\s+Report$/i, ' Report')
  if (!/Report$/i.test(type)) {
    type += ' Report'
  }
  return type
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return value < 100000000000 ? value * 1000 : value
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      try {
        const ms = value.toMillis()
        return Number.isFinite(ms) ? ms : null
      } catch {
        return null
      }
    }
    if (typeof value.seconds === 'number') {
      return value.seconds * 1000 + (value.nanoseconds || 0) / 1000000
    }
    if (typeof value._seconds === 'number') {
      return value._seconds * 1000 + (value._nanoseconds || 0) / 1000000
    }
  }

  return null
}

function parseTimeWindowMs(timeWindow) {
  if (!timeWindow || typeof timeWindow !== 'string') {
    return 8 * 3600 * 1000
  }
  const str = timeWindow.toLowerCase()

  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)\b/i)
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 3600 * 1000)
  }

  const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:day|d)\b/i)
  if (dayMatch) {
    return Math.round(parseFloat(dayMatch[1]) * 24 * 3600 * 1000)
  }

  const minMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:minute|min|m)\b/i)
  if (minMatch) {
    return Math.round(parseFloat(minMatch[1]) * 60 * 1000)
  }

  return 8 * 3600 * 1000
}

function hasValidSensorReadings(f) {
  if (!f || typeof f !== 'object' || Array.isArray(f)) return false
  return [f.current_rms, f.temp_belt, f.temp_motor, f.vib_rms].some(
    v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))
  )
}

/**
 * POST /api/reports/generate
 * GET  /api/reports/download/:filename
 */
export async function handleGenerateReport(req, res, next) {
  try {
    const data = req.method === 'GET' ? req.query : req.body
    const filenameParam = req.params?.filename

    let {
      reportId,
      reportType,
      format,
      timeWindow,
      features,
      telemetryReadings,
      readings,
      incidents,
      alerts,
      detections,
      equipment,
      dataSource,
      rul,
      anomaly,
    } = data || {}

    /* --- FILENAME COMPATIBILITY --- */
    if (filenameParam) {
      const extMatch = filenameParam.match(/\.(pdf|csv|json)$/i)
      if (extMatch && !format) {
        format = extMatch[1].toUpperCase()
      }

      const rawBase = filenameParam.replace(/\.(pdf|csv|json)$/i, '')
      const parts = rawBase.split('_')
      if (!reportId && parts.length > 1) {
        reportId = parts[parts.length - 1]
        if (!reportType) {
          reportType = parts.slice(0, -1).join(' ')
        }
      }
    }

    /* --- NORMALIZE PARAMS --- */
    reportId = String(reportId || `RPT-${Date.now()}`).trim()
    reportType = normalizeReportType(reportType)
    format = String(format || 'PDF').toUpperCase()

    // Respect caller-supplied timeWindow parameter without silently overriding it
    timeWindow = String(timeWindow || 'Current Active Shift (8 Hours)').trim()

    if (!VALID_FORMATS.has(format)) {
      return res.status(400).json({
        error: `Invalid format "${format}". Must be one of: PDF, CSV, JSON.`,
      })
    }

    if (!VALID_REPORT_TYPES.has(reportType)) {
      return res.status(400).json({
        error: `Invalid report type "${reportType}".`,
        allowedTypes: [...VALID_REPORT_TYPES],
      })
    }

    /* --- PARSE INPUT ARRAYS / OBJECTS --- */
    features = parseJson(features, null)
    telemetryReadings = parseJson(telemetryReadings ?? readings, [])
    incidents = parseJson(incidents ?? alerts, [])
    detections = parseJson(detections, [])
    equipment = parseJson(equipment, {})
    rul = parseJson(rul, null)
    anomaly = parseJson(anomaly, null)

    const now = Date.now()
    const windowMs = parseTimeWindowMs(timeWindow)
    const windowStart = now - windowMs

    /* --- 1. TELEMETRY: RETRIEVE REAL SENSOR TELEMETRY & HISTORY --- */
    let finalFeatures = null
    let finalTelemetryReadings = []

    // Strategy A: Query persisted RULObservation records from MongoDB for CB_001 if connected
    if (mongoose.connection?.readyState === 1) {
      try {
        const query = {
          device_id: 'CB_001',
          timestamp: { $gte: windowStart, $lte: now },
        }

        const observations = await RULObservation.find(query)
          .sort({ timestamp: 1 })
          .lean()

        if (Array.isArray(observations) && observations.length > 0) {
          finalTelemetryReadings = observations.map(obs => ({
            timestamp: obs.timestamp,
            features: {
              current_rms: finiteNumber(obs.features?.current_rms),
              temp_belt: finiteNumber(obs.features?.temp_belt),
              temp_motor: finiteNumber(obs.features?.temp_motor),
              vib_rms: finiteNumber(obs.features?.vib_rms),
            },
            device_id: obs.device_id,
          }))

          const latestObs = observations[observations.length - 1]
          if (latestObs?.features) {
            finalFeatures = {
              current_rms: finiteNumber(latestObs.features.current_rms),
              temp_belt: finiteNumber(latestObs.features.temp_belt),
              temp_motor: finiteNumber(latestObs.features.temp_motor),
              vib_rms: finiteNumber(latestObs.features.vib_rms),
            }
          }

          if (!rul && latestObs && Number.isFinite(latestObs.rulHours)) {
            rul = {
              hours: latestObs.rulHours,
              confidence: latestObs.trendConfidence,
            }
          }
        }
      } catch (err) {
        console.warn('[ReportController] Error reading RULObservation from MongoDB:', err.message)
      }
    }

    // Strategy B: If MongoDB returned 0 records for window, check in-memory RUL history
    if (finalTelemetryReadings.length === 0) {
      try {
        // Only call getRULHistory if DB is connected or will quickly return in-memory
        let history = []
        if (mongoose.connection?.readyState === 1) {
          history = await getRULHistory(100)
        }
        const inWindow = Array.isArray(history)
          ? history.filter(h => h.timestamp >= windowStart && h.timestamp <= now)
          : []

        if (inWindow.length > 0) {
          inWindow.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
          finalTelemetryReadings = inWindow.map(obs => ({
            timestamp: obs.timestamp,
            features: {
              current_rms: finiteNumber(obs.features?.current_rms),
              temp_belt: finiteNumber(obs.features?.temp_belt),
              temp_motor: finiteNumber(obs.features?.temp_motor),
              vib_rms: finiteNumber(obs.features?.vib_rms),
            },
            device_id: obs.device_id || 'CB_001',
          }))

          const latestObs = inWindow[inWindow.length - 1]
          if (latestObs?.features) {
            finalFeatures = {
              current_rms: finiteNumber(latestObs.features.current_rms),
              temp_belt: finiteNumber(latestObs.features.temp_belt),
              temp_motor: finiteNumber(latestObs.features.temp_motor),
              vib_rms: finiteNumber(latestObs.features.vib_rms),
            }
          }
        }
      } catch (err) {
        console.warn('[ReportController] Error reading in-memory RUL history:', err.message)
      }
    }

    // Strategy C: If caller supplied historical telemetryReadings in payload
    if (finalTelemetryReadings.length === 0 && Array.isArray(telemetryReadings) && telemetryReadings.length > 0) {
      const validCallerReadings = telemetryReadings
        .map(r => {
          const ts = parseTimestamp(r.timestamp ?? r.time ?? r.ts)
          const f = r.features || r
          if (!hasValidSensorReadings(f)) return null
          return {
            timestamp: ts,
            features: {
              current_rms: finiteNumber(f.current_rms),
              temp_belt: finiteNumber(f.temp_belt),
              temp_motor: finiteNumber(f.temp_motor),
              vib_rms: finiteNumber(f.vib_rms),
            },
          }
        })
        .filter(Boolean)

      const inWindow = validCallerReadings.filter(
        r => r.timestamp === null || (r.timestamp >= windowStart && r.timestamp <= now)
      )

      if (inWindow.length > 0) {
        finalTelemetryReadings = inWindow
        const latest = inWindow[inWindow.length - 1]
        finalFeatures = latest.features
      }
    }

    // Strategy D: If caller supplied live snapshot features in request
    if (finalTelemetryReadings.length === 0 && hasValidSensorReadings(features)) {
      finalFeatures = {
        current_rms: finiteNumber(features.current_rms),
        temp_belt: finiteNumber(features.temp_belt),
        temp_motor: finiteNumber(features.temp_motor),
        vib_rms: finiteNumber(features.vib_rms),
      }

      // Preserve actual reading timestamp if supplied; do not invent Date.now()
      const readingTs = parseTimestamp(data.timestamp ?? data.reading?.timestamp ?? features.timestamp)
      finalTelemetryReadings = [
        {
          timestamp: readingTs,
          features: finalFeatures,
        },
      ]
    }

    // If still no valid telemetry found, keep features empty/null
    // reportService.js will cleanly report "DATA UNAVAILABLE" and SAMPLES: 0

    // Retrieve authoritative RUL engine state
    let rulState = null
    try {
      rulState = getRULState()
    } catch (err) {
      console.warn('[ReportController] Unable to retrieve RULState:', err.message)
    }

    if (!rul && rulState && Number.isFinite(rulState.rulHours)) {
      rul = {
        hours: rulState.rulHours,
        confidence: rulState.trendConfidence,
      }
    }

    /* --- 2. INCIDENTS: FILTER & PRESERVE REAL TIMESTAMPS --- */
    const filteredIncidents = []
    if (Array.isArray(incidents)) {
      for (const inc of incidents) {
        if (!inc || typeof inc !== 'object') continue
        const rawTs = inc.timestamp ?? inc.time ?? inc.ts ?? inc.createdAt ?? inc.date
        const ts = parseTimestamp(rawTs)

        // Exclude future incidents relative to report generation time
        if (ts !== null && ts > now) {
          continue
        }

        // Exclude incidents outside the requested evaluation window
        if (ts !== null && ts < windowStart) {
          continue
        }

        // Do NOT replace missing timestamp with report generation time;
        // pass actual ts (or null) so reportService displays "—"
        filteredIncidents.push({
          ...inc,
          timestamp: ts,
        })
      }
    }

    /* --- 3. VISION DETECTIONS: FILTER STRICTLY TO EVALUATION WINDOW --- */
    const filteredDetections = []
    if (Array.isArray(detections)) {
      for (const det of detections) {
        if (!det || typeof det !== 'object') continue
        const rawTs = det.timestamp ?? det.time ?? det.ts ?? det.createdAt
        const ts = parseTimestamp(rawTs)

        if (ts !== null && ts > now) {
          continue
        }
        if (ts !== null && ts < windowStart) {
          continue
        }

        filteredDetections.push({
          ...det,
          timestamp: ts,
        })
      }
    }

    /* --- 4. BUILD GENAI CONTEXT FROM ACTUAL REAL DATA --- */
    const equipmentData = {
      deviceId: equipment?.deviceId || equipment?.id || 'CB_001',
      name: equipment?.name || 'Main Overland Conveyor Belt',
      facility: equipment?.facility || 'Primary Overland Route',
    }

    const rulData = {
      healthIndex: finiteNumber(rulState?.healthIndex ?? rul?.healthIndex),
      rulMinutes: finiteNumber(rulState?.rulMinutes ?? rul?.minutes ?? rul?.rulMinutes),
      rulHours: finiteNumber(rulState?.rulHours ?? rul?.hours ?? rul?.rulHours),
      status: rulState?.status ?? rul?.status ?? null,
      reason: rulState?.reason ?? rul?.reason ?? null,
      degradationRatePerMin: finiteNumber(rulState?.degradationRatePerMin),
      regressionSlope: finiteNumber(rulState?.regressionSlope),
      regressionIntercept: finiteNumber(rulState?.regressionIntercept),
      rSquared: finiteNumber(rulState?.rSquared),
      trendConfidence: rulState?.trendConfidence ?? rul?.confidence ?? null,
      weightingMethod: rulState?.weightingMethod ?? null,
      asiT: finiteNumber(rulState?.asiT),
      asi5min: finiteNumber(rulState?.asi5min),
      dSensor: finiteNumber(rulState?.dSensor),
      dT: finiteNumber(rulState?.dT),
    }

    const anomalyData = {
      detected: anomaly?.detected !== undefined
        ? Boolean(anomaly.detected)
        : (rulState?.asiT !== null && rulState?.asiT !== undefined ? rulState.asiT >= 0.70 : false),
      asi: finiteNumber(anomaly?.asi ?? rulState?.asiT),
      score: finiteNumber(anomaly?.score ?? rulState?.asiT),
    }

    const genAIContext = {
      equipment: equipmentData,
      timeWindow: {
        requested: timeWindow,
        startMs: windowStart,
        endMs: now,
        startTime: new Date(windowStart).toISOString(),
        endTime: new Date(now).toISOString(),
      },
      telemetry: {
        latest: finalFeatures ? {
          ...finalFeatures,
          timestamp: finalTelemetryReadings.length > 0
            ? finalTelemetryReadings[finalTelemetryReadings.length - 1].timestamp
            : null,
          device_id: equipmentData.deviceId,
        } : null,
        history: finalTelemetryReadings.map(r => ({
          timestamp: r.timestamp ?? null,
          current_rms: finiteNumber(r.features?.current_rms),
          temp_belt: finiteNumber(r.features?.temp_belt),
          temp_motor: finiteNumber(r.features?.temp_motor),
          vib_rms: finiteNumber(r.features?.vib_rms),
          device_id: r.device_id || equipmentData.deviceId,
        })),
      },
      anomaly: anomalyData,
      rul: rulData,
      incidents: filteredIncidents.map(inc => ({
        id: inc.id || inc._id || null,
        timestamp: inc.timestamp ?? null,
        severity: inc.severity || null,
        source: inc.source || null,
        description: inc.description || inc.title || null,
        status: inc.status || null,
      })),
      visionDetections: filteredDetections.map(det => ({
        class: det.class || det.label || null,
        confidence: finiteNumber(det.confidence),
        timestamp: det.timestamp ?? null,
        location: det.location || null,
        status: det.status || null,
      })),
    }

    console.log('[GenAI] Preparing engineering context', {
      reportId,
      reportType,
      telemetryAvailable: Boolean(finalFeatures),
      telemetrySampleCount: finalTelemetryReadings.length,
      incidentCount: filteredIncidents.length,
      detectionCount: filteredDetections.length,
      rulAvailable: rulData.rulHours !== null || rulData.healthIndex !== null,
    })

    /* --- 5. INVOKE GENAI REASONING LAYER (SAFE EXECUTION) --- */
    let aiAssessment
    try {
      aiAssessment = await generateEngineeringAssessment(genAIContext)
    } catch (err) {
      console.error('[ReportController] Unexpected error in GenAI assessment:', err.message)
      aiAssessment = {
        available: false,
        reason: 'GenAI assessment execution failed',
      }
    }

    /* --- 6. CALL REPORT SERVICE GENERATOR --- */
    return generateReport({
      res,
      reportId,
      reportType,
      format,
      timeWindow,
      features: finalFeatures,
      telemetryReadings: finalTelemetryReadings,
      incidents: filteredIncidents,
      detections: filteredDetections,
      equipment,
      dataSource: dataSource || 'Live Conveyor Telemetry (CB_001)',
      rul,
      anomaly,
      aiAssessment,
    })
  } catch (error) {
    console.error('[ReportController] Report generation failed:', error)
    next(error)
  }
}

/**
 * GET /api/reports/list
 *
 * Registry of generated reports.
 */
export function handleListReports(_req, res) {
  res.json({
    reports: [
      {
        id: 'RPT-001',
        type: 'Conveyor Performance Report',
        date: '2026-09-08',
        status: 'READY',
        size: '—',
      },
      {
        id: 'RPT-002',
        type: 'Damage Detection Report',
        date: '2026-09-07',
        status: 'READY',
        size: '—',
      },
      {
        id: 'RPT-003',
        type: 'Sensor Health Report',
        date: '2026-09-07',
        status: 'READY',
        size: '—',
      },
      {
        id: 'RPT-004',
        type: 'Alert History Report',
        date: '2026-09-06',
        status: 'READY',
        size: '—',
      },
      {
        id: 'RPT-005',
        type: 'Maintenance Report',
        date: '2026-09-05',
        status: 'READY',
        size: '—',
      },
      {
        id: 'RPT-006',
        type: 'Conveyor Performance Report',
        date: '2026-09-01',
        status: 'ARCHIVED',
        size: '—',
      },
    ],
  })
}