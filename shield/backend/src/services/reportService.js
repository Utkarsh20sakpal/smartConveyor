/**
 * reportService.js
 *
 * Data-driven SmartConveyor report generator.
 *
 * Supported formats:
 *   PDF
 *   CSV
 *   JSON
 *
 * Principles:
 * - NEVER fabricates telemetry defaults or replacement sensor values.
 * - Missing values are displayed as "—" or "Not available", never converted to 0.
 * - Missing telemetry channels are evaluated as "NO DATA", never "HEALTHY".
 * - When no telemetry is available, Overall Status is "DATA UNAVAILABLE", never "CRITICAL".
 * - Edge health (simulator-generated/random) is removed; only the four physical measured
 *   channels are reported (Belt Surface Temp, Motor Temp, Vibration RMS, Motor Current RMS).
 * - Timestamps are formatted consistently using en-IN conventions without altering source data.
 */

import PDFDocument from 'pdfkit'

/* ================================================================
 * CONSTANTS & COLOR PALETTE
 * ================================================================ */

const COLORS = {
  navy: '#07111D',
  navy2: '#0D1B2A',

  cyan: '#00C3F0',

  white: '#FFFFFF',

  text: '#0F172A',
  textMid: '#334155',
  muted: '#64748B',

  border: '#CBD5E1',
  borderLight: '#E2E8F0',

  tableHead: '#0B3B5B',
  tableAlt: '#F8FAFC',

  healthy: '#15803D',
  healthyBg: '#DCFCE7',

  warning: '#B45309',
  warningBg: '#FEF3C7',

  critical: '#B91C1C',
  criticalBg: '#FEE2E2',

  neutral: '#475569',
  neutralBg: '#F1F5F9',

  infoBg: '#F0F9FF',
  infoBorder: '#BAE6FD',
}

/**
 * Authoritative 4 physical measured telemetry channels.
 * Notice: OPT-401 edge_health has been removed as it is simulator/random.
 */
const CHANNELS = [
  {
    id: 'TT-101',
    key: 'temp_belt',
    label: 'Belt Surface Temperature',
    unit: '°C',
    decimals: 1,
    warningAbove: 48,
    criticalAbove: 65,
  },
  {
    id: 'TT-201',
    key: 'temp_motor',
    label: 'Motor Temperature',
    unit: '°C',
    decimals: 1,
    warningAbove: 65,
    criticalAbove: 80,
  },
  {
    id: 'VT-301',
    key: 'vib_rms',
    label: 'Vibration RMS',
    unit: 'mm/s',
    decimals: 2,
    warningAbove: 4.5,
    criticalAbove: 7.1,
  },
  {
    id: 'CT-401',
    key: 'current_rms',
    label: 'Motor Current RMS',
    unit: 'A',
    decimals: 3,
    warningAbove: 2.5,
    criticalAbove: 3.5,
  },
]

/* ================================================================
 * NULL-SAFE FORMATTING HELPERS
 * ================================================================ */

export function finiteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function safeString(value, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  return String(value)
}

export function formatNumber(value, decimals = 1) {
  const n = finiteNumber(value)
  if (n === null) {
    return '—'
  }
  return n.toFixed(decimals)
}

export function formatValue(value, decimals = 1) {
  return formatNumber(value, decimals)
}

export function formatMeasurement(value, unit, decimals) {
  const formatted = formatNumber(value, decimals)
  if (formatted === '—') {
    return '—'
  }
  return `${formatted} ${unit}`
}

function normalizeReportType(value) {
  let type = safeString(value, 'Conveyor Performance Report').trim().replace(/\s+/g, ' ')
  type = type.replace(/\s+Report\s+Report$/i, ' Report')
  if (!/Report$/i.test(type)) {
    type += ' Report'
  }
  return type
}

function sanitizeFilename(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/* ================================================================
 * TIMESTAMP PARSING & FORMATTING (en-IN)
 * ================================================================ */

export function timestampMs(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (value instanceof Date) {
    const n = value.getTime()
    return Number.isFinite(n) ? n : null
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    // Seconds to milliseconds conversion if < 1e11 (prior to year 1973 ms)
    return value < 100000000000 ? value * 1000 : value
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      try {
        const n = value.toMillis()
        return Number.isFinite(n) ? n : null
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

export function formatDateTime(value) {
  const ms = timestampMs(value)
  if (ms === null) {
    return '—'
  }

  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/* ================================================================
 * TELEMETRY NORMALIZATION
 * ================================================================ */

export function normalizeFeatures(features) {
  if (!features || typeof features !== 'object' || Array.isArray(features)) {
    return {
      temp_belt: null,
      temp_motor: null,
      vib_rms: null,
      current_rms: null,
    }
  }

  return {
    temp_belt: finiteNumber(features.temp_belt),
    temp_motor: finiteNumber(features.temp_motor),
    vib_rms: finiteNumber(features.vib_rms),
    current_rms: finiteNumber(features.current_rms),
  }
}

function normalizeReading(reading) {
  if (!reading || typeof reading !== 'object') {
    return null
  }

  const features = normalizeFeatures(reading.features || reading)
  const timestamp = timestampMs(reading.timestamp ?? reading.ts ?? reading.time)

  const hasMeasurement = Object.values(features).some(value => value !== null)
  if (!hasMeasurement) {
    return null
  }

  return {
    timestamp,
    features,
  }
}

function buildTelemetryDataset(features, telemetryReadings) {
  const readings = Array.isArray(telemetryReadings)
    ? telemetryReadings.map(normalizeReading).filter(Boolean)
    : []

  if (readings.length === 0 && features) {
    const snapshot = normalizeReading({
      features,
      timestamp: Date.now(),
    })
    if (snapshot) {
      readings.push(snapshot)
    }
  }

  return readings.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
}

function latestFeatures(readings, fallback) {
  if (readings.length > 0) {
    return readings[readings.length - 1].features
  }
  return normalizeFeatures(fallback)
}

/* ================================================================
 * CHANNEL EVALUATION
 * ================================================================ */

export function calculateChannelStatus(channel, value) {
  if (value === null || value === undefined) {
    return 'NO DATA'
  }

  if (channel.criticalAbove !== undefined && value >= channel.criticalAbove) {
    return 'CRITICAL'
  }
  if (channel.warningAbove !== undefined && value >= channel.warningAbove) {
    return 'WARNING'
  }
  if (channel.criticalBelow !== undefined && value <= channel.criticalBelow) {
    return 'CRITICAL'
  }
  if (channel.warningBelow !== undefined && value <= channel.warningBelow) {
    return 'WARNING'
  }

  return 'HEALTHY'
}

function thresholdText(channel) {
  if (channel.warningAbove !== undefined) {
    return `< ${channel.warningAbove} ${channel.unit}`
  }
  if (channel.warningBelow !== undefined) {
    return `> ${channel.warningBelow} ${channel.unit}`
  }
  return 'Configured'
}

function buildChannelRows(features) {
  return CHANNELS.map(channel => {
    const value = finiteNumber(features[channel.key])
    return {
      ...channel,
      value,
      status: calculateChannelStatus(channel, value),
      threshold: thresholdText(channel),
    }
  })
}

/* ================================================================
 * OVERALL DATA STATUS
 * ================================================================ */

export function calculateOverallStatus(channelRows, incidents = []) {
  const available = channelRows.filter(row => row.status !== 'NO DATA')

  if (available.length === 0) {
    return 'DATA UNAVAILABLE'
  }

  if (available.some(row => row.status === 'CRITICAL')) {
    return 'CRITICAL'
  }

  if (available.some(row => row.status === 'WARNING')) {
    return 'WARNING'
  }

  return 'HEALTHY'
}

function calculateCoverage(readings) {
  if (!readings.length) {
    return {
      count: 0,
      first: null,
      last: null,
      durationMs: null,
    }
  }

  const timestamps = readings.map(r => r.timestamp).filter(v => v !== null)

  if (!timestamps.length) {
    return {
      count: readings.length,
      first: null,
      last: null,
      durationMs: null,
    }
  }

  const first = Math.min(...timestamps)
  const last = Math.max(...timestamps)

  return {
    count: readings.length,
    first,
    last,
    durationMs: Math.max(0, last - first),
  }
}

/* ================================================================
 * METADATA & DATA INTEGRITY
 * ================================================================ */

function buildMetadata({
  reportId,
  reportType,
  timeWindow,
  equipment,
  dataSource,
  readings,
}) {
  const coverage = calculateCoverage(readings)

  return {
    reportId,
    reportType,
    timeWindow,
    assetId: safeString(equipment?.id, 'CB_001'),
    assetName: safeString(equipment?.name),
    facility: safeString(equipment?.facility),
    line: safeString(equipment?.line),
    standard: safeString(equipment?.standard),
    dataSource: safeString(dataSource),
    sampleCount: coverage.count,
    firstSample: coverage.first,
    lastSample: coverage.last,
    generatedAt: Date.now(),
  }
}

function buildDataIntegrity(readings) {
  if (!readings.length) {
    return {
      label: 'NOT AVAILABLE',
      detail: 'No telemetry measurements supplied.',
    }
  }

  const timestamped = readings.filter(r => r.timestamp !== null).length
  const withMeasurements = readings.filter(r =>
    Object.values(r.features).some(v => v !== null)
  ).length

  if (timestamped === readings.length && withMeasurements === readings.length) {
    return {
      label: 'AVAILABLE',
      detail: `${readings.length} supplied telemetry sample(s).`,
    }
  }

  return {
    label: 'PARTIAL',
    detail: `${readings.length} supplied sample(s); some records lack timestamp or measurements.`,
  }
}

/* ================================================================
 * RUL / INCIDENTS / DETECTIONS
 * ================================================================ */

function buildRulInfo(rul) {
  if (rul === null || rul === undefined) {
    return {
      available: false,
      value: null,
      confidence: null,
      label: 'Not available',
    }
  }

  if (typeof rul === 'number') {
    return {
      available: true,
      value: rul,
      confidence: null,
      label: 'Estimate / formula pending validation',
    }
  }

  const value = finiteNumber(rul.value ?? rul.hours ?? rul.rulHours)
  if (value === null) {
    return {
      available: false,
      value: null,
      confidence: null,
      label: 'Not available',
    }
  }

  return {
    available: true,
    value,
    confidence: finiteNumber(rul.confidence),
    label: 'Estimate / formula pending validation',
  }
}

function normalizeIncidents(incidents) {
  if (!Array.isArray(incidents)) {
    return []
  }

  return incidents.map((incident, index) => ({
    id: safeString(incident.id, `INC-${index + 1}`),
    timestamp: timestampMs(incident.timestamp ?? incident.time),
    severity: safeString(incident.severity, 'INFO').toUpperCase(),
    sensor: safeString(incident.sensor ?? incident.source, 'SYS'),
    title: safeString(incident.title ?? incident.message ?? incident.description),
    status: safeString(incident.status, '—').toUpperCase(),
  }))
}

function normalizeDetections(detections) {
  if (!Array.isArray(detections)) {
    return []
  }

  return detections.map((detection, index) => ({
    id: safeString(detection.id, `DET-${index + 1}`),
    timestamp: timestampMs(detection.timestamp ?? detection.time),
    class: safeString(detection.class ?? detection.type ?? detection.label),
    confidence: finiteNumber(detection.confidence),
    location: safeString(detection.location),
    severity: safeString(detection.severity, '—').toUpperCase(),
    status: safeString(detection.status, '—').toUpperCase(),
  }))
}

function normalizeAiAssessment(ai) {
  if (!ai || typeof ai !== 'object') {
    return {
      available: false,
      reason: 'AI reasoning service not invoked or returned empty.',
    }
  }

  if (ai.available !== true) {
    return {
      available: false,
      reason: safeString(ai.reason, 'AI analysis unavailable.'),
    }
  }

  return {
    available: true,
    summary: safeString(ai.summary, 'No condition summary provided.'),
    whatHappened: safeString(ai.whatHappened, 'No physical event description provided.'),
    likelyCause: safeString(ai.likelyCause, 'No likely cause identified from supplied data.'),
    supportingEvidence: Array.isArray(ai.supportingEvidence)
      ? ai.supportingEvidence.filter(e => typeof e === 'string' && e.trim() !== '')
      : [],
    alternativeCauses: Array.isArray(ai.alternativeCauses)
      ? ai.alternativeCauses.filter(c => typeof c === 'string' && c.trim() !== '')
      : [],
    riskAssessment: safeString(ai.riskAssessment, 'No operational risk identified.'),
    recommendedAction: safeString(ai.recommendedAction, 'Follow standard operating inspection protocols.'),
    confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(String(ai.confidence).toUpperCase())
      ? String(ai.confidence).toUpperCase()
      : 'MEDIUM',
    uncertainty: safeString(ai.uncertainty, 'None disclosed.'),
    reportParagraph: safeString(ai.reportParagraph, ''),
  }
}

/* ================================================================
 * PDF DRAWING PRIMITIVES
 * ================================================================ */

function severityColors(status) {
  const value = String(status || '').toUpperCase()

  if (value === 'CRITICAL') {
    return { bg: COLORS.criticalBg, fg: COLORS.critical }
  }
  if (value === 'WARNING') {
    return { bg: COLORS.warningBg, fg: COLORS.warning }
  }
  if (value === 'HEALTHY' || value === 'NORMAL') {
    return { bg: COLORS.healthyBg, fg: COLORS.healthy }
  }

  // Neutral for NO DATA, DATA UNAVAILABLE, NOT AVAILABLE, INFO, etc.
  return { bg: COLORS.neutralBg, fg: COLORS.neutral }
}

function drawPill(doc, text, x, y, width) {
  const colors = severityColors(text)
  const height = 13
  const padding = 5

  doc.font('Helvetica-Bold').fontSize(6.5)
  const textWidth = doc.widthOfString(String(text))
  const pillWidth = Math.min(width - 6, textWidth + padding * 2)
  const pillX = x + Math.max(3, (width - pillWidth) / 2)
  const pillY = y + 2

  doc.roundedRect(pillX, pillY, pillWidth, height, 3).fill(colors.bg)
  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor(colors.fg)
    .text(String(text), pillX, pillY + 3, {
      width: pillWidth,
      align: 'center',
      lineBreak: false,
    })
}

function drawSectionHeader(doc, title, y, margin, pageWidth) {
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(COLORS.navy2)
    .text(title, margin, y, { lineBreak: false })

  doc
    .moveTo(margin, y + 13)
    .lineTo(pageWidth - margin, y + 13)
    .strokeColor(COLORS.borderLight)
    .lineWidth(0.5)
    .stroke()

  return y + 21
}

function drawTable(doc, headers, rows, widths, x, y, statusColumn = -1) {
  const headerHeight = 19
  const rowHeight = 18
  const totalWidth = widths.reduce((sum, width) => sum + width, 0)

  // Table Header
  doc.rect(x, y, totalWidth, headerHeight).fill(COLORS.tableHead)

  let cursorX = x
  headers.forEach((header, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(COLORS.white)
      .text(header, cursorX + 4, y + 6, {
        width: widths[index] - 8,
        lineBreak: false,
      })
    cursorX += widths[index]
  })

  // Table Rows
  rows.forEach((row, rowIndex) => {
    const rowY = y + headerHeight + rowIndex * rowHeight

    doc
      .rect(x, rowY, totalWidth, rowHeight)
      .fill(rowIndex % 2 === 0 ? COLORS.white : COLORS.tableAlt)
      .stroke(COLORS.borderLight)

    cursorX = x
    row.forEach((cell, cellIndex) => {
      if (cellIndex === statusColumn) {
        drawPill(doc, cell, cursorX, rowY, widths[cellIndex])
      } else {
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(COLORS.textMid)
          .text(safeString(cell), cursorX + 4, rowY + 5, {
            width: widths[cellIndex] - 8,
            lineBreak: false,
            ellipsis: true,
          })
      }
      cursorX += widths[cellIndex]
    })
  })

  return y + headerHeight + rows.length * rowHeight + 7
}

function drawEmptyBox(doc, text, x, y, width, height = 36) {
  doc
    .rect(x, y, width, height)
    .fill(COLORS.tableAlt)
    .stroke(COLORS.borderLight)

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(COLORS.muted)
    .text(text, x + 10, y + height / 2 - 4, {
      width: width - 20,
      align: 'center',
      lineBreak: false,
    })
}

function renderAiBlock(doc, label, text, currentY, contentW, margin, pageH) {
  const contentText = text && String(text).trim() !== '' ? String(text).trim() : '—'

  doc.font('Helvetica-Bold').fontSize(7.5)
  const labelH = doc.heightOfString(label, { width: contentW }) + 2

  doc.font('Helvetica').fontSize(7.2)
  const textH = doc.heightOfString(contentText, { width: contentW, lineGap: 1.5 }) + 6

  let y = currentY
  if (y + labelH + textH > pageH - 50) {
    doc.addPage()
    y = 50
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(COLORS.navy2)
    .text(label, margin, y, { width: contentW, lineBreak: false })
  y += labelH

  doc
    .font('Helvetica')
    .fontSize(7.2)
    .fillColor(COLORS.textMid)
    .text(contentText, margin, y, { width: contentW, lineGap: 1.5 })
  y += textH

  return y
}

function renderAiBullets(doc, label, items, emptyText, currentY, contentW, margin, pageH) {
  doc.font('Helvetica-Bold').fontSize(7.5)
  const labelH = doc.heightOfString(label, { width: contentW }) + 2

  let y = currentY
  if (y + labelH + 18 > pageH - 50) {
    doc.addPage()
    y = 50
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(COLORS.navy2)
    .text(label, margin, y, { width: contentW, lineBreak: false })
  y += labelH

  const validItems = Array.isArray(items) ? items.filter(Boolean) : []
  if (validItems.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(7.2)
    const emptyH = doc.heightOfString(emptyText, { width: contentW - 8 }) + 5
    if (y + emptyH > pageH - 50) {
      doc.addPage()
      y = 50
    }
    doc
      .font('Helvetica-Oblique')
      .fontSize(7.2)
      .fillColor(COLORS.muted)
      .text(emptyText, margin + 8, y, { width: contentW - 8 })
    return y + emptyH
  }

  for (const item of validItems) {
    const bulletText = `•  ${item}`
    doc.font('Helvetica').fontSize(7.2)
    const itemH = doc.heightOfString(bulletText, { width: contentW - 8, lineGap: 1.2 }) + 3
    if (y + itemH > pageH - 50) {
      doc.addPage()
      y = 50
    }
    doc
      .font('Helvetica')
      .fontSize(7.2)
      .fillColor(COLORS.textMid)
      .text(bulletText, margin + 8, y, { width: contentW - 8, lineGap: 1.2 })
    y += itemH
  }

  return y + 3
}

function renderAiConfidence(doc, confidence, currentY, contentW, margin, pageH) {
  let y = currentY
  if (y + 24 > pageH - 50) {
    doc.addPage()
    y = 50
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(COLORS.navy2)
    .text('AI Root-Cause Confidence', margin, y + 2, { lineBreak: false })

  const conf = String(confidence || 'MEDIUM').toUpperCase()
  drawPill(doc, conf, margin + 120, y, 60)

  return y + 22
}

function renderAiParagraphCallout(doc, paragraph, currentY, contentW, margin, pageH) {
  const contentText = String(paragraph).trim()
  doc.font('Helvetica').fontSize(7.2)
  const textH = doc.heightOfString(contentText, { width: contentW - 20, lineGap: 1.8 })
  const totalBoxH = textH + 28

  let y = currentY
  if (y + totalBoxH > pageH - 50) {
    doc.addPage()
    y = 50
  }

  doc.rect(margin, y, contentW, totalBoxH).fill('#F0F9FF').stroke('#BAE6FD')

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor('#0369A1')
    .text('ENGINEERING ASSESSMENT (SYNTHESIS)', margin + 10, y + 8, {
      width: contentW - 20,
      lineBreak: false,
    })

  doc
    .font('Helvetica')
    .fontSize(7.2)
    .fillColor(COLORS.text)
    .text(contentText, margin + 10, y + 21, { width: contentW - 20, lineGap: 1.8 })

  return y + totalBoxH + 8
}

function renderAiDisclaimer(doc, currentY, contentW, margin, pageH) {
  const disclaimerText =
    'AI-generated analysis is an evidence-based engineering interpretation of the supplied monitoring data. It does not replace qualified maintenance inspection or site safety procedures.'

  doc.font('Helvetica-Oblique').fontSize(6.5)
  const textH = doc.heightOfString(disclaimerText, { width: contentW }) + 6

  let y = currentY
  if (y + textH > pageH - 50) {
    doc.addPage()
    y = 50
  }

  doc
    .font('Helvetica-Oblique')
    .fontSize(6.5)
    .fillColor(COLORS.muted)
    .text(disclaimerText, margin, y, { width: contentW })

  return y + textH + 4
}

function drawAiAssessment(doc, ai, currentY, margin, pageWidth, contentWidth, pageHeight) {
  let Y = currentY

  if (Y > pageHeight - 120) {
    doc.addPage()
    Y = 50
  }

  Y = drawSectionHeader(doc, 'AI-GENERATED CONDITION ASSESSMENT', Y, margin, pageWidth)

  if (!ai || !ai.available) {
    const unavailBoxH = 46
    if (Y + unavailBoxH > pageHeight - 50) {
      doc.addPage()
      Y = 50
    }

    doc.rect(margin, Y, contentWidth, unavailBoxH).fill(COLORS.tableAlt).stroke(COLORS.borderLight)
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('AI analysis unavailable.', margin + 12, Y + 10, {
        width: contentWidth - 24,
        lineBreak: false,
      })

    const reasonText = ai?.reason ? `Reason: ${ai.reason}` : 'Reason: AI reasoning service not configured or temporarily unavailable.'
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(reasonText, margin + 12, Y + 24, {
        width: contentWidth - 24,
        lineBreak: false,
        ellipsis: true,
      })

    return Y + unavailBoxH + 12
  }

  // 1. Condition Summary
  Y = renderAiBlock(doc, 'Condition Summary', ai.summary, Y, contentWidth, margin, pageHeight)

  // 2. What Happened
  Y = renderAiBlock(doc, 'What Happened', ai.whatHappened, Y, contentWidth, margin, pageHeight)

  // 3. Likely Cause
  Y = renderAiBlock(doc, 'Likely Cause', ai.likelyCause, Y, contentWidth, margin, pageHeight)

  // 4. Supporting Evidence
  Y = renderAiBullets(
    doc,
    'Supporting Evidence',
    ai.supportingEvidence,
    'No specific supporting evidence identified from the supplied telemetry.',
    Y,
    contentWidth,
    margin,
    pageHeight
  )

  // 5. Alternative Causes
  const altEmptyMsg = Array.isArray(ai.alternativeCauses)
    ? 'No alternative causes identified from the supplied evidence.'
    : 'Insufficient evidence for alternative-cause assessment.'
  Y = renderAiBullets(
    doc,
    'Alternative Causes',
    ai.alternativeCauses,
    altEmptyMsg,
    Y,
    contentWidth,
    margin,
    pageHeight
  )

  // 6. Risk Assessment
  Y = renderAiBlock(doc, 'Risk Assessment', ai.riskAssessment, Y, contentWidth, margin, pageHeight)

  // 7. Recommended Action
  Y = renderAiBlock(doc, 'Recommended Action', ai.recommendedAction, Y, contentWidth, margin, pageHeight)

  // 8. AI Confidence
  Y = renderAiConfidence(doc, ai.confidence, Y, contentWidth, margin, pageHeight)

  // 9. Uncertainty
  Y = renderAiBlock(doc, 'Uncertainty', ai.uncertainty, Y, contentWidth, margin, pageHeight)

  // 10. Engineering Assessment Synthesis
  if (ai.reportParagraph) {
    Y = renderAiParagraphCallout(doc, ai.reportParagraph, Y, contentWidth, margin, pageHeight)
  }

  // 11. Disclaimer
  Y = renderAiDisclaimer(doc, Y, contentWidth, margin, pageHeight)

  return Y
}

/* ================================================================
 * PDF GENERATOR
 * ================================================================ */

function streamPdf(res, report) {
  const PAGE_W = 595.28
  const PAGE_H = 841.89
  const MARGIN = 45
  const CONTENT_W = PAGE_W - MARGIN * 2 // 505.28 pt

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    compress: true,
  })

  const chunks = []
  doc.on('data', chunk => chunks.push(chunk))
  doc.on('end', () => {
    const buffer = Buffer.concat(chunks)
    const filename = `${sanitizeFilename(report.reportType)}_${sanitizeFilename(report.reportId)}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  })

  /* --- HEADER BAR --- */
  const HEADER_H = 72
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(COLORS.navy)

  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(COLORS.cyan)
    .text('SMARTCONVEYOR / SHIELD', MARGIN, 15, { lineBreak: false })

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#CBD5E1')
    .text('Intelligent Conveyor Monitoring & Predictive Maintenance', MARGIN, 37, { lineBreak: false })

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor('#94A3B8')
    .text(report.standard ? report.standard : 'Industrial telemetry report', MARGIN, 49, { lineBreak: false })

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COLORS.white)
    .text(report.reportId, 0, 16, { width: PAGE_W - MARGIN, align: 'right', lineBreak: false })

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor('#94A3B8')
    .text(`Generated ${formatDateTime(report.generatedAt)}`, 0, 35, {
      width: PAGE_W - MARGIN,
      align: 'right',
      lineBreak: false,
    })

  /* --- REPORT TITLE --- */
  let Y = HEADER_H + 16
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(COLORS.text)
    .text(report.reportType.toUpperCase(), MARGIN, Y, { lineBreak: false })

  /* --- METADATA PANEL --- */
  Y += 24
  const META_H = 62
  doc.rect(MARGIN, Y, CONTENT_W, META_H).fill('#EFF6FA').stroke('#D6E6EF')

  const meta = [
    ['ASSET', report.assetId],
    ['EVALUATION WINDOW', report.timeWindow],
    ['DATA SOURCE', report.dataSource],
    ['SAMPLES', String(report.sampleCount)],
    ['FACILITY', report.facility],
    ['LINE', report.line],
    ['DATA COVERAGE', report.coverageLabel],
    ['DATA INTEGRITY', report.dataIntegrity.label],
  ]

  const metaColW = CONTENT_W / 4
  meta.forEach(([label, value], index) => {
    const row = Math.floor(index / 4)
    const col = index % 4
    const x = MARGIN + col * metaColW + 10
    const y = Y + row * 30 + 6

    doc
      .font('Helvetica-Bold')
      .fontSize(5.8)
      .fillColor(COLORS.muted)
      .text(label, x, y, { lineBreak: false })

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(COLORS.text)
      .text(safeString(value), x, y + 10, {
        width: metaColW - 16,
        lineBreak: false,
        ellipsis: true,
      })
  })

  /* --- EXECUTIVE CONDITION SUMMARY --- */
  Y += META_H + 14
  Y = drawSectionHeader(doc, 'EXECUTIVE CONDITION SUMMARY', Y, MARGIN, PAGE_W)

  const statusColors = severityColors(report.overallStatus)
  const summaryH = 52

  doc.rect(MARGIN, Y, CONTENT_W, summaryH).fill(statusColors.bg).stroke(statusColors.bg)

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(statusColors.fg)
    .text(`OVERALL STATUS: ${report.overallStatus}`, MARGIN + 10, Y + 10, { lineBreak: false })

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.textMid)
    .text(report.summaryText, MARGIN + 10, Y + 24, {
      width: CONTENT_W - 20,
      lineBreak: false,
      ellipsis: true,
    })

  doc
    .font('Helvetica')
    .fontSize(6.5)
    .fillColor(COLORS.muted)
    .text(
      `Channels: ${report.channelCounts.healthy} healthy / ${report.channelCounts.warning} warning / ${report.channelCounts.critical} critical / ${report.channelCounts.noData} no data   |   Incidents: ${report.incidents.length}   |   Vision detections: ${report.detections.length}`,
      MARGIN + 10,
      Y + 38,
      {
        width: CONTENT_W - 20,
        lineBreak: false,
        ellipsis: true,
      }
    )

  Y += summaryH + 14

  /* --- 1. TELEMETRY CONDITION SUMMARY --- */
  Y = drawSectionHeader(doc, '1. TELEMETRY CONDITION SUMMARY', Y, MARGIN, PAGE_W)

  const hasTelemetry = report.channelRows.some(row => row.status !== 'NO DATA')

  if (!hasTelemetry) {
    drawEmptyBox(
      doc,
      'No telemetry measurements were available for this evaluation window.',
      MARGIN,
      Y,
      CONTENT_W,
      38
    )
    Y += 46
  } else {
    const rows = report.channelRows.map(row => [
      row.id,
      row.label,
      formatMeasurement(row.value, row.unit, row.decimals),
      row.threshold,
      row.status,
    ])

    // Column widths total 505: [65, 180, 85, 95, 80]
    Y = drawTable(
      doc,
      ['CHANNEL', 'PARAMETER', 'READING', 'THRESHOLD', 'STATUS'],
      rows,
      [65, 180, 85, 95, 80],
      MARGIN,
      Y,
      4
    )
  }

  /* Telemetry Coverage Footnote */
  Y += 4
  const coverageFootnote = report.sampleCount > 0
    ? `Telemetry coverage: ${report.coverageLabel}. First supplied sample: ${formatDateTime(report.firstSample)}. Last supplied sample: ${formatDateTime(report.lastSample)}.`
    : 'Telemetry coverage: No telemetry measurements were supplied for this evaluation window.'

  doc
    .font('Helvetica')
    .fontSize(6.8)
    .fillColor(COLORS.muted)
    .text(coverageFootnote, MARGIN, Y, {
      width: CONTENT_W,
      lineBreak: false,
      ellipsis: true,
    })

  Y += 15

  /* --- 2. LOGGED SHIFT INCIDENTS --- */
  Y = drawSectionHeader(doc, '2. LOGGED SHIFT INCIDENTS', Y, MARGIN, PAGE_W)

  if (report.incidents.length === 0) {
    drawEmptyBox(
      doc,
      'No incidents recorded in this evaluation window.',
      MARGIN,
      Y,
      CONTENT_W,
      36
    )
    Y += 44
  } else {
    const rows = report.incidents.slice(0, 10).map(incident => [
      incident.id,
      formatDateTime(incident.timestamp),
      incident.severity,
      incident.sensor,
      incident.title,
      incident.status,
    ])

    // Column widths total 505: [80, 110, 55, 50, 150, 60]
    // 80pt width for ID avoids ugly line wrapping
    Y = drawTable(
      doc,
      ['ID', 'TIME', 'SEVERITY', 'SOURCE', 'DESCRIPTION', 'STATE'],
      rows,
      [80, 110, 55, 50, 150, 60],
      MARGIN,
      Y,
      2
    )
  }

  /* --- 3. VISION INSPECTION RECORDS --- */
  Y += 4
  if (Y > PAGE_H - 140) {
    doc.addPage()
    Y = 50
  }

  Y = drawSectionHeader(doc, '3. VISION INSPECTION RECORDS', Y, MARGIN, PAGE_W)

  if (report.detections.length === 0) {
    drawEmptyBox(
      doc,
      'No vision detections recorded in this evaluation window.',
      MARGIN,
      Y,
      CONTENT_W,
      36
    )
    Y += 44
  } else {
    const rows = report.detections.slice(0, 10).map(detection => [
      detection.id,
      formatDateTime(detection.timestamp),
      detection.class,
      detection.confidence === null ? '—' : `${(detection.confidence * 100).toFixed(1)}%`,
      detection.location,
      detection.severity,
      detection.status,
    ])

    // Column widths total 505: [60, 105, 95, 45, 90, 55, 55]
    Y = drawTable(
      doc,
      ['ID', 'TIME', 'DETECTION', 'CONF.', 'LOCATION', 'SEVERITY', 'STATE'],
      rows,
      [60, 105, 95, 45, 90, 55, 55],
      MARGIN,
      Y,
      5
    )
  }

  /* --- 4. REMAINING USEFUL LIFE (Optional, if supplied) --- */
  if (report.rul.available) {
    Y += 6
    if (Y > PAGE_H - 95) {
      doc.addPage()
      Y = 50
    }

    Y = drawSectionHeader(doc, '4. REMAINING USEFUL LIFE', Y, MARGIN, PAGE_W)

    doc.rect(MARGIN, Y, CONTENT_W, 40).fill(COLORS.infoBg).stroke(COLORS.infoBorder)

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLORS.text)
      .text(`${formatNumber(report.rul.value, 1)} h`, MARGIN + 10, Y + 8, { lineBreak: false })

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text('Estimated operating time remaining', MARGIN + 80, Y + 10, { lineBreak: false })

    if (report.rul.confidence !== null) {
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORS.muted)
        .text(`Confidence: ${formatNumber(report.rul.confidence, 1)}%`, MARGIN + 80, Y + 24, { lineBreak: false })
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(6.5)
      .fillColor(COLORS.warning)
      .text('ESTIMATION / FORMULA PENDING VALIDATION', MARGIN + 310, Y + 15, { lineBreak: false })

    Y += 46
  }

  /* --- 5. AI-GENERATED CONDITION ASSESSMENT --- */
  Y += 6
  Y = drawAiAssessment(doc, report.aiAssessment, Y, MARGIN, PAGE_W, CONTENT_W, PAGE_H)

  /* --- DATA QUALITY FOOTER NOTE --- */
  if (Y > PAGE_H - 85) {
    doc.addPage()
    Y = 50
  }

  doc.rect(MARGIN, Y, CONTENT_W, 36).fill('#F8FAFC').stroke(COLORS.borderLight)

  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor(COLORS.text)
    .text('REPORT DATA QUALITY', MARGIN + 10, Y + 7, { lineBreak: false })

  doc
    .font('Helvetica')
    .fontSize(6.7)
    .fillColor(COLORS.muted)
    .text(`${report.dataIntegrity.label}: ${report.dataIntegrity.detail}`, MARGIN + 10, Y + 19, {
      width: CONTENT_W - 20,
      lineBreak: false,
      ellipsis: true,
    })

  /* --- PAGE FOOTERS --- */
  const range = doc.bufferedPageRange()
  for (let page = 0; page < range.count; page++) {
    doc.switchToPage(range.start + page)

    const footerY = PAGE_H - 28

    doc
      .moveTo(MARGIN, footerY - 5)
      .lineTo(PAGE_W - MARGIN, footerY - 5)
      .strokeColor(COLORS.border)
      .lineWidth(0.4)
      .stroke()

    doc
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor('#94A3B8')
      .text('SmartConveyor / Shield  |  Telemetry & Predictive Maintenance', MARGIN, footerY, {
        lineBreak: false,
      })

    doc.text(`Ref: ${report.reportId}  |  Page ${page + 1} of ${range.count}`, 0, footerY, {
      width: PAGE_W - MARGIN,
      align: 'right',
      lineBreak: false,
    })
  }

  doc.end()
}

/* ================================================================
 * CSV GENERATOR
 * ================================================================ */

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function streamCsv(res, report) {
  const filename = `${sanitizeFilename(report.reportType)}_${sanitizeFilename(report.reportId)}.csv`

  const lines = [
    '\uFEFF',
    csvEscape('SMARTCONVEYOR / SHIELD — REPORT'),
    [
      'Report ID',
      report.reportId,
      'Report Type',
      report.reportType,
      'Generated',
      formatDateTime(report.generatedAt),
    ].map(csvEscape).join(','),
    [
      'Asset',
      report.assetId,
      'Evaluation Window',
      report.timeWindow,
      'Data Source',
      report.dataSource,
    ].map(csvEscape).join(','),
    '',
    csvEscape('=== TELEMETRY CONDITION SUMMARY ==='),
    [
      'Channel',
      'Parameter',
      'Reading',
      'Unit',
      'Threshold',
      'Status',
    ].map(csvEscape).join(','),
    ...report.channelRows.map(row =>
      [
        row.id,
        row.label,
        row.value === null ? '—' : formatNumber(row.value, row.decimals),
        row.unit,
        row.threshold,
        row.status,
      ].map(csvEscape).join(',')
    ),
    '',
    csvEscape('=== INCIDENTS ==='),
    [
      'ID',
      'Timestamp',
      'Severity',
      'Source',
      'Description',
      'State',
    ].map(csvEscape).join(','),
    ...(report.incidents.length
      ? report.incidents.map(incident =>
        [
          incident.id,
          formatDateTime(incident.timestamp),
          incident.severity,
          incident.sensor,
          incident.title,
          incident.status,
        ].map(csvEscape).join(',')
      )
      : [
        ['—', '—', '—', '—', 'No incidents recorded in this evaluation window.', '—']
          .map(csvEscape).join(','),
      ]),
    '',
    csvEscape('=== VISION INSPECTION ==='),
    [
      'ID',
      'Timestamp',
      'Detection',
      'Confidence',
      'Location',
      'Severity',
      'State',
    ].map(csvEscape).join(','),
    ...(report.detections.length
      ? report.detections.map(detection =>
        [
          detection.id,
          formatDateTime(detection.timestamp),
          detection.class,
          detection.confidence === null ? '—' : `${(detection.confidence * 100).toFixed(1)}%`,
          detection.location,
          detection.severity,
          detection.status,
        ].map(csvEscape).join(',')
      )
      : [
        ['—', '—', 'No vision detections recorded in this evaluation window.', '—', '—', '—', '—']
          .map(csvEscape).join(','),
      ]),
    '',
    csvEscape('=== AI-GENERATED CONDITION ASSESSMENT ==='),
    ...(report.aiAssessment?.available
      ? [
          ['AI Status', 'AVAILABLE'].map(csvEscape).join(','),
          ['Condition Summary', report.aiAssessment.summary].map(csvEscape).join(','),
          ['What Happened', report.aiAssessment.whatHappened].map(csvEscape).join(','),
          ['Likely Cause', report.aiAssessment.likelyCause].map(csvEscape).join(','),
          [
            'Supporting Evidence',
            report.aiAssessment.supportingEvidence.length > 0
              ? report.aiAssessment.supportingEvidence.join('; ')
              : 'None listed',
          ].map(csvEscape).join(','),
          [
            'Alternative Causes',
            report.aiAssessment.alternativeCauses.length > 0
              ? report.aiAssessment.alternativeCauses.join('; ')
              : 'No alternative causes identified from the supplied evidence.',
          ].map(csvEscape).join(','),
          ['Risk Assessment', report.aiAssessment.riskAssessment].map(csvEscape).join(','),
          ['Recommended Action', report.aiAssessment.recommendedAction].map(csvEscape).join(','),
          ['AI Confidence', report.aiAssessment.confidence].map(csvEscape).join(','),
          ['Uncertainty', report.aiAssessment.uncertainty].map(csvEscape).join(','),
          ['Engineering Assessment', report.aiAssessment.reportParagraph].map(csvEscape).join(','),
          [
            'Disclaimer',
            'AI-generated analysis is an evidence-based engineering interpretation of the supplied monitoring data. It does not replace qualified maintenance inspection or site safety procedures.',
          ].map(csvEscape).join(','),
        ]
      : [
          ['AI Status', 'UNAVAILABLE'].map(csvEscape).join(','),
          ['Reason', report.aiAssessment?.reason || 'AI analysis unavailable.'].map(csvEscape).join(','),
        ]),
    '',
    [
      'Overall Status',
      report.overallStatus,
      'Sample Count',
      report.sampleCount,
      'Data Integrity',
      report.dataIntegrity.label,
    ].map(csvEscape).join(','),
  ]

  const buffer = Buffer.from(lines.join('\r\n'), 'utf8')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Length', buffer.length)
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
}

/* ================================================================
 * JSON GENERATOR
 * ================================================================ */

function sendJson(res, report) {
  const filename = `${sanitizeFilename(report.reportType)}_${sanitizeFilename(report.reportId)}.json`

  const payload = {
    report_id: report.reportId,
    report_type: report.reportType,
    generated_at: new Date(report.generatedAt).toISOString(),
    evaluation_window: report.timeWindow,
    equipment: {
      id: report.assetId,
      name: report.assetName,
      facility: report.facility,
      line: report.line,
      reference_standard: report.standard,
    },
    data_source: report.dataSource,
    data_quality: {
      status: report.dataIntegrity.label,
      detail: report.dataIntegrity.detail,
      sample_count: report.sampleCount,
      first_sample: report.firstSample ? new Date(report.firstSample).toISOString() : null,
      last_sample: report.lastSample ? new Date(report.lastSample).toISOString() : null,
    },
    overall_status: report.overallStatus,
    telemetry: report.channelRows.map(row => ({
      channel: row.id,
      parameter: row.label,
      value: row.value, // null when missing, never fabricated 0
      unit: row.unit,
      threshold: row.threshold,
      status: row.status, // "NO DATA" when value is null
    })),
    incidents: report.incidents,
    vision_detections: report.detections,
    rul: report.rul.available
      ? {
        hours: report.rul.value,
        confidence: report.rul.confidence,
        status: 'ESTIMATION / FORMULA PENDING VALIDATION',
      }
      : null,
    ai_analysis: report.aiAssessment?.available
      ? {
          available: true,
          summary: report.aiAssessment.summary,
          what_happened: report.aiAssessment.whatHappened,
          likely_cause: report.aiAssessment.likelyCause,
          supporting_evidence: report.aiAssessment.supportingEvidence,
          alternative_causes: report.aiAssessment.alternativeCauses,
          risk_assessment: report.aiAssessment.riskAssessment,
          recommended_action: report.aiAssessment.recommendedAction,
          confidence: report.aiAssessment.confidence,
          uncertainty: report.aiAssessment.uncertainty,
          engineering_assessment: report.aiAssessment.reportParagraph,
        }
      : {
          available: false,
          reason: report.aiAssessment?.reason || 'AI analysis unavailable.',
        },
  }

  const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf8')

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', buffer.length)
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
}

/* ================================================================
 * MAIN GENERATOR EXPORT
 * ================================================================ */

export function generateReport({
  res,
  reportId,
  reportType,
  format,
  timeWindow,
  features = null,
  telemetryReadings = [],
  incidents = [],
  detections = [],
  equipment = {},
  dataSource,
  rul = null,
  anomaly = null,
  aiAssessment = null,
}) {
  const normalizedType = normalizeReportType(reportType)
  const readings = buildTelemetryDataset(features, telemetryReadings)
  const currentFeatures = latestFeatures(readings, features)
  const channelRows = buildChannelRows(currentFeatures)
  const normalizedIncidents = normalizeIncidents(incidents)
  const normalizedDetections = normalizeDetections(detections)
  const overallStatus = calculateOverallStatus(channelRows, normalizedIncidents)

  const channelCounts = {
    healthy: channelRows.filter(row => row.status === 'HEALTHY').length,
    warning: channelRows.filter(row => row.status === 'WARNING').length,
    critical: channelRows.filter(row => row.status === 'CRITICAL').length,
    noData: channelRows.filter(row => row.status === 'NO DATA').length,
  }

  const metadata = buildMetadata({
    reportId,
    reportType: normalizedType,
    timeWindow,
    equipment,
    dataSource,
    readings,
  })

  const coverage = calculateCoverage(readings)

  let coverageLabel = 'No telemetry supplied'
  if (coverage.count > 0 && coverage.durationMs !== null) {
    const durationHours = coverage.durationMs / 3600000
    coverageLabel = `${coverage.count} sample(s) spanning ${durationHours.toFixed(2)} hour(s)`
  } else if (coverage.count > 0) {
    coverageLabel = `${coverage.count} sample(s); timestamp coverage unavailable`
  }

  let summaryText
  if (overallStatus === 'DATA UNAVAILABLE') {
    summaryText = 'Equipment condition could not be assessed because no telemetry measurements were available for this evaluation window.'
  } else if (overallStatus === 'CRITICAL') {
    summaryText = 'One or more supplied telemetry channels are outside the configured critical monitoring range.'
  } else if (overallStatus === 'WARNING') {
    summaryText = 'One or more supplied telemetry channels require attention based on the configured monitoring thresholds.'
  } else {
    summaryText = 'All supplied telemetry channels are within the configured monitoring range.'
  }

  const report = {
    ...metadata,
    generatedAt: metadata.generatedAt,
    reportType: normalizedType,
    channelRows,
    incidents: normalizedIncidents,
    detections: normalizedDetections,
    overallStatus,
    channelCounts,
    coverageLabel,
    summaryText,
    dataIntegrity: buildDataIntegrity(readings),
    rul: buildRulInfo(rul),
    anomaly: anomaly || null,
    aiAssessment: normalizeAiAssessment(aiAssessment),
  }

  switch (String(format || 'PDF').toUpperCase()) {
    case 'PDF':
      return streamPdf(res, report)
    case 'CSV':
      return streamCsv(res, report)
    case 'JSON':
      return sendJson(res, report)
    default:
      return res.status(400).json({
        error: `Unsupported format "${format}".`,
      })
  }
}