/**
 * alertController.js
 *
 * GET  /api/alerts          — filtered + paginated alert list with aggregated counts
 * POST /api/alerts/:id/acknowledge  — mark alert as acknowledged
 *
 * Aggregated counts (total, critical, warning, active, acknowledged) are
 * computed here on the server and included in every list response.
 * The frontend reads these pre-computed counts — it never re-derives them.
 */



// ---------------------------------------------------------------------------
// In-memory store (replace with MongoDB Alert model when wired)
// ---------------------------------------------------------------------------
let alerts = [
  {
    id: 'ALT-001', timestamp: Date.now() - 2 * 60 * 1000,
    type: 'Surface Delamination', source: 'Vision (YOLOv8)',
    sensor: 'OPT-401', severity: 'CRITICAL', status: 'ACTIVE',
    title: 'Surface delamination detected at 840m. Immediate inspection required.',
  },
  {
    id: 'ALT-002', timestamp: Date.now() - 9 * 60 * 1000,
    type: 'High Vibration', source: 'Sensor (vib_rms)',
    sensor: 'VT-201', severity: 'WARNING', status: 'ACTIVE',
    title: 'Vibration RMS exceeded 4.0 mm/s threshold. Check bearing alignment.',
  },
  {
    id: 'ALT-003', timestamp: Date.now() - 51 * 60 * 1000,
    type: 'Temperature Spike', source: 'Sensor (temp_motor)',
    sensor: 'TT-102', severity: 'WARNING', status: 'ACKNOWLEDGED',
    title: 'Motor temperature reached 67.2 °C. Elevated above normal range.',
  },
  {
    id: 'ALT-004', timestamp: Date.now() - 100 * 60 * 1000,
    type: 'Sensor Offline', source: 'System',
    sensor: 'SYS', severity: 'CRITICAL', status: 'RESOLVED',
    title: 'Vision sensor OPT-401 offline for 3 minutes. Restored automatically.',
  },
  {
    id: 'ALT-005', timestamp: Date.now() - 180 * 60 * 1000,
    type: 'Edge Wear', source: 'Vision (YOLOv8)',
    sensor: 'OPT-401', severity: 'WARNING', status: 'ACKNOWLEDGED',
    title: 'Belt edge fraying detected at 620m. Schedule inspection within 72 hours.',
  },
];

/** Compute aggregated summary counts from an alert array */
function summarise(arr) {
  return {
    total:        arr.length,
    critical:     arr.filter(a => a.severity === 'CRITICAL').length,
    warning:      arr.filter(a => a.severity === 'WARNING').length,
    active:       arr.filter(a => a.status   === 'ACTIVE').length,
    acknowledged: arr.filter(a => a.status   === 'ACKNOWLEDGED').length,
    resolved:     arr.filter(a => a.status   === 'RESOLVED').length,
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/alerts
 * Query params: severity (CRITICAL|WARNING|ALL), status (ACTIVE|ACKNOWLEDGED|RESOLVED|ALL), q (search)
 */
export function handleListAlerts(req, res, next) {
  try {
    const { severity = 'ALL', status = 'ALL', q = '' } = req.query;
    const search = q.toLowerCase();

    const filtered = alerts.filter(a => {
      const sevOk  = severity === 'ALL' || a.severity === severity;
      const statOk = status   === 'ALL' || a.status   === status;
      const srchOk = !search  ||
        a.type.toLowerCase().includes(search)   ||
        a.title.toLowerCase().includes(search)  ||
        a.source.toLowerCase().includes(search) ||
        a.sensor.toLowerCase().includes(search);
      return sevOk && statOk && srchOk;
    });

    res.json({
      alerts:  filtered,
      summary: summarise(alerts),  // always the full summary, not filtered subset
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/alerts/:id/acknowledge
 */
export function handleAcknowledgeAlert(req, res, next) {
  try {
    const { id } = req.params;
    const alert = alerts.find(a => a.id === id);

    if (!alert) {
      return res.status(404).json({ error: `Alert ${id} not found.` });
    }
    if (alert.status === 'ACKNOWLEDGED') {
      return res.status(409).json({ error: `Alert ${id} is already acknowledged.` });
    }

    alert.status = 'ACKNOWLEDGED';
    // TODO: persist to MongoDB, broadcast via WebSocket if wired

    res.json({ success: true, alert, summary: summarise(alerts) });
  } catch (err) {
    next(err);
  }
}
