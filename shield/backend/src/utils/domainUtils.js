/**
 * domainUtils.js — backend domain logic utilities
 *
 * These rules live in the backend so:
 *  - API responses always include pre-computed status strings
 *  - Frontend is strictly a display layer — never re-derives business status
 *
 * Sensor channel thresholds (ISO 10816-3 / plant engineering specs):
 *   TT-101  Belt Surface Temp:    warn ≥ 55°C   crit ≥ 70°C
 *   TT-102  Motor Winding Temp:   warn ≥ 65°C   crit ≥ 80°C
 *   VT-201  Vibration RMS:        warn ≥ 4.0mm/s crit ≥ 6.0mm/s
 *   CT-301  Motor Current RMS:    warn ≥ 52A    crit ≥ 62A
 *   OPT-401 Belt Edge Health:     warn ≤ 80%    crit ≤ 65%
 */

export const THRESHOLDS = {
  temp_belt:   { warn: 55,   crit: 70   },
  temp_motor:  { warn: 65,   crit: 80   },
  vib_rms:     { warn: 4.0,  crit: 6.0  },
  current_rms: { warn: 52,   crit: 62   },
  edge_health: { warnBelow: 80, critBelow: 65 }, // inverted — lower is worse
};

/**
 * Classifies a numeric sensor reading into HEALTHY | WARNING | CRITICAL.
 * @param {string} channel - 'temp_belt' | 'temp_motor' | 'vib_rms' | 'current_rms' | 'edge_health'
 * @param {number} value
 * @returns {'HEALTHY'|'WARNING'|'CRITICAL'}
 */
export function classifyChannel(channel, value) {
  const t = THRESHOLDS[channel];
  if (!t || value == null || isNaN(value)) return 'UNKNOWN';

  if (channel === 'edge_health') {
    if (value <= t.critBelow) return 'CRITICAL';
    if (value <= t.warnBelow) return 'WARNING';
    return 'HEALTHY';
  }

  if (value >= t.crit) return 'CRITICAL';
  if (value >= t.warn) return 'WARNING';
  return 'HEALTHY';
}

/**
 * Classifies overall belt health from a 0–100 score.
 * @param {number} score
 * @returns {'HEALTHY'|'WARNING'|'CRITICAL'}
 */
export function healthToStatus(score) {
  if (score >= 80) return 'HEALTHY';
  if (score >= 50) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Classifies Isolation Forest anomaly score (0–1, higher = more anomalous).
 * @param {number} score
 * @returns {'HEALTHY'|'WARNING'|'CRITICAL'}
 */
export function anomalyToStatus(score) {
  if (score < 0.30) return 'HEALTHY';
  if (score < 0.70) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Derives a single system-wide health status from a features object.
 * Returns the worst status across all channels.
 * @param {Object} features - { temp_belt, temp_motor, vib_rms, current_rms }
 * @param {number} edge_health
 * @returns {{ overallStatus: string, channelStatuses: Object }}
 */
export function classifyFeatures(features = {}, edge_health = 100) {
  const channelStatuses = {
    temp_belt:   classifyChannel('temp_belt',   features.temp_belt),
    temp_motor:  classifyChannel('temp_motor',  features.temp_motor),
    vib_rms:     classifyChannel('vib_rms',     features.vib_rms),
    current_rms: classifyChannel('current_rms', features.current_rms),
    edge_health: classifyChannel('edge_health', edge_health),
  };

  const RANK = { CRITICAL: 3, WARNING: 2, HEALTHY: 1, UNKNOWN: 0 };
  const worst = Object.values(channelStatuses).reduce((acc, s) =>
    RANK[s] > RANK[acc] ? s : acc, 'HEALTHY'
  );

  return { overallStatus: worst, channelStatuses };
}

/**
 * Builds a standardised sensor reading response object to send to the frontend.
 * The frontend never computes status — it just displays what it receives.
 * @param {Object} raw - raw Firestore reading
 * @returns {Object}
 */
export function buildSensorResponse(raw = {}) {
  const features = raw.features ?? {};
  const edge_health = raw.edge_health ?? 100;
  const { overallStatus, channelStatuses } = classifyFeatures(features, edge_health);

  return {
    device_id:    raw.device_id ?? 'CB_001',
    timestamp:    raw.timestamp ?? null,
    edge_health,
    features,
    status:         overallStatus,          // <-- pre-computed: HEALTHY | WARNING | CRITICAL
    channelStatuses,                         // <-- per-channel, pre-computed
    edge_health_status: channelStatuses.edge_health,
  };
}
