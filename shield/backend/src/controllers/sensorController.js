/**
 * sensorController.js
 *
 * GET /api/sensors/latest   — latest live reading with pre-computed status
 * GET /api/sensors/history  — rolling 60-reading history for trend charts
 * GET /api/sensors/rul      — latest RUL state + history
 * POST /api/sensors/rul/estimate — push fresh telemetry, get RUL result
 *
 * Data source priority:
 *   1. MongoDB SensorReading model (when firestoreSyncJob is wired)
 *   2. Firestore Admin SDK direct read (fallback)
 *   3. Safe synthetic baseline (demo / offline mode)
 *
 * Status classification is done here (server-side), never in the frontend.
 */

import { buildSensorResponse, classifyFeatures } from '../utils/domainUtils.js';
import { processReading, getRULState, getRULHistory, getEngineStats } from '../services/rulService.js';

// ---------------------------------------------------------------------------
// In-memory baseline (demo/offline mode — replace with MongoDB query)
// ---------------------------------------------------------------------------
const BASELINE = {
  device_id: 'CB_001',
  edge_health: 96.4,
  features: {
    current_rms: 41.2,
    temp_belt: 42.4,
    temp_motor: 61.8,
    vib_rms: 1.85,
  },
  timestamp: null,
};

/** Generate synthetic rolling history for demo (60 readings, ~10s apart) */
function generateHistory(count = 60) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const ts = now - (count - i) * 10_000;
    const features = {
      current_rms: +(41.0 + Math.random() * 0.8).toFixed(3),
      temp_belt: +(42.0 + Math.random() * 3.5).toFixed(1),
      temp_motor: +(61.0 + Math.random() * 3.0).toFixed(1),
      vib_rms: +(1.8 + Math.random() * 0.9).toFixed(2),
    };
    const edge_health = +(94 + Math.random() * 4).toFixed(1);
    const { overallStatus, channelStatuses } = classifyFeatures(features, edge_health);
    return {
      device_id: 'CB_001', timestamp: ts,
      edge_health, features, status: overallStatus, channelStatuses,
    };
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/sensors/latest
 */
export function handleGetLatest(_req, res, next) {
  try {
    // TODO: replace BASELINE with actual MongoDB / Firestore read:
    // const doc = await SensorReading.findOne({ device_id: 'CB_001' }).sort({ timestamp: -1 });
    const response = buildSensorResponse({
      ...BASELINE,
      timestamp: Date.now(),
    });
    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sensors/history?count=60
 */
export function handleGetHistory(req, res, next) {
  try {
    const count = Math.min(parseInt(req.query.count) || 60, 200);
    // TODO: replace with MongoDB query:
    // const readings = await SensorReading.find({ device_id: 'CB_001' })
    //   .sort({ timestamp: -1 }).limit(count).lean();
    const history = generateHistory(count);
    res.json({ device_id: 'CB_001', count: history.length, readings: history });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sensors/rul
 *
 * Returns the current authoritative RUL state and recent history.
 * Frontend polls this to update the RUL card + trend graph.
 */
export async function handleRULState(_req, res, next) {
  try {
    const state = getRULState();
    const history = await getRULHistory(100);
    const stats = getEngineStats();

    res.json({
      ok: true,
      state,
      history,
      stats,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sensors/rul/estimate
 *
 * Body: { timestamp, features, edge_health, device_id }
 *
 * The frontend sends a fresh telemetry reading whenever it receives
 * one from Firestore. The backend processes it through the RUL engine
 * and returns the updated RUL state immediately.
 *
 * This is the primary mechanism for feeding telemetry into the
 * authoritative backend engine.
 */
export async function handleRULEstimate(req, res, next) {
  try {
    const reading = req.body;

    if (!reading || typeof reading !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'Request body must be a JSON object with { timestamp, features }.',
      });
    }

    // Validate minimal required fields
    if (!reading.features || !Number.isFinite(reading.timestamp)) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: timestamp (number) and features (object).',
      });
    }

    // Run through the authoritative RUL engine
    const state = processReading(reading);

    // Return fresh RUL state + recent history (for graph update)
    const history = await getRULHistory(100);

    res.json({
      ok: true,
      state,
      history,
    });
  } catch (err) {
    next(err);
  }
}

