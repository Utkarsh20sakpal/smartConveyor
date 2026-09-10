

/**
 * rulService.js
*
* Authoritative backend RUL (Remaining Useful Life) estimation engine.
*
* Architecture: Backend is the SOLE mathematical calculation engine.
* The frontend (rulSlice.js) is strictly a presentation state container.
*
* ============================================================
* MATHEMATICAL PIPELINE
* ============================================================
*
* 1.  Isolation Forest → ASI_t  ∈ [0,1]   (anomaly severity index)
* 2.  5-min rolling mean of ASI            (ASI_5min)
* 3.  Sensor Degradation Index per sensor  (D_i)
* 4.  Pearson-weighted D_sensor            (D_sensor)
* 5.  Composite: D_t = 0.30*ASI_t + 0.40*ASI_5min + 0.30*D_sensor
* 6.  Health Index: HI_t = clamp(100*(1 - D_t), 0, 100)
* 7.  OLS regression on 15-min HI window  (m, b, R²)
* 8.  RUL = (HI_current - HI_failure) / |m|  [minutes]
*
* ============================================================
* SENSOR BASELINES & CRITICAL VALUES
* ============================================================
*
* VERIFIED SOURCES:
*   - Thresholds: domainUtils.js (ISO 10816-3)
*   - Baselines: ambient / typical low-load operating values
*     consistent with actual Firestore telemetry (Sept 2026)
*     and sensorController.js BASELINE object.
*
* IMPORTANT — current_rms:
*   Actual Firestore readings show ~1.76 A. This value is
*   in a different scale from the ISO warning limit of 52 A.
*   The degradation index for current_rms is therefore
*   labelled PROTOTYPE_ESTIMATE and its weight is reduced
*   via the Pearson correlation mechanism.
*   This does NOT compromise pipeline integrity because the
 *   correlation-weighted scheme will naturally down-weight
 *   sensors with low variance or low ASI correlation.
 */

import * as iForest from './isolationForestService.js';
import RULObservation from '../models/RULObservation.js';


// ================================================================
// SENSOR BASELINES (verified against system documentation)
// ================================================================

/**
 * Per-sensor [baseline, critical] pairs used to compute D_i.
 *
 * baseline : expected value under healthy nominal operation.
 * critical : value at which degradation index D_i reaches 1.0.
 *
 * Source mapping:
 *   vib_rms   : ISO 10816-3 Class II machinery (crit = 6.0 mm/s per domainUtils)
 *   temp_belt : domainUtils.js THRESHOLDS (crit = 70 °C)
 *   temp_motor: domainUtils.js THRESHOLDS (crit = 80 °C)
 *   current_rms: PROTOTYPE_ESTIMATE — scale calibrated to actual
 *                telemetry (~1-3 A); NOT based on ISO 52 A warning
 *                which belongs to a different motor class.
 */
const SENSOR_BASELINES = {
  vib_rms: { baseline: 0.5, critical: 6.0, label: 'VT-201 vib_rms (ISO 10816-3)' },
  temp_belt: { baseline: 20.0, critical: 70.0, label: 'TT-101 temp_belt (domainUtils)' },
  temp_motor: { baseline: 25.0, critical: 80.0, label: 'TT-201 temp_motor (domainUtils)' },
  current_rms: { baseline: 0.5, critical: 4.0, label: 'CT-301 current_rms PROTOTYPE_ESTIMATE' },
};

/**
 * HI value at which the system is considered to have failed.
 * Below this threshold, RUL = 0.
 */
const HI_FAILURE_THRESHOLD = 20;

/**
 * Minimum meaningful degradation rate (HI/min) to prevent
 * absurd large RUL estimates from tiny numerical slopes.
 *
 * Below this threshold, RUL is not estimable:
 *   status = "STABLE — RUL NOT ESTIMABLE"
 */
const MIN_MEANINGFUL_DEGRADATION_RATE = 1e-3;  // HI/min

/**
 * Minimum number of valid HI samples required to run OLS regression.
 */
const MIN_REGRESSION_SAMPLES = 30;

/**
 * Rolling telemetry window duration (ms).
 * Readings older than this are dropped.
 */
const ASI_WINDOW_MS = 5 * 60 * 1000;   // 5 minutes
const HI_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes

/**
 * Maximum history entries to keep in memory.
 * At ~10s/reading: 500 readings = ~83 min of history.
 */
const MAX_HISTORY_ENTRIES = 500;

/**
 * Maximum RUL history entries to retain for the trend graph.
 */
const MAX_RUL_HISTORY = 200;


// ================================================================
// IN-MEMORY STATE (module-level singleton)
// ================================================================

/**
 * Telemetry + anomaly score buffer.
 * Each entry: { timestamp, features, asi, degradationIndex }
 */
const _telemetryBuffer = [];

/**
 * HI history for OLS regression.
 * Each entry: { timestamp, hi }
 */
const _hiBuffer = [];

/**
 * Authoritative RUL observation history for Dashboard trend graph.
 * Each entry: RULObservation (see getRULState return shape)
 */
const _rulHistory = [];

/** Most recent calculated RUL state, or null if not yet computed. */
let _latestRULState = null;


// ================================================================
// MATHEMATICS HELPERS
// ================================================================

/**
 * Clips a value to [min, max].
 * If value is NaN, returns min (safe default).
 * Infinity/-Infinity are handled correctly by Math.max/min.
 */
function clip(value, lo, hi) {
  if (value !== value) return lo;   // NaN check (NaN !== NaN)
  return Math.max(lo, Math.min(hi, value));
}


/**
 * Computes Pearson correlation coefficient between two numeric arrays.
 * Returns 0 if variance is zero or arrays have fewer than 2 elements.
 *
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {number}  r ∈ [-1, 1]
 */
function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  if (n < 2 || xs.length !== ys.length) return 0;

  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, y) => s + y, 0) / n;

  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }

  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return 0;

  return clip(num / denom, -1, 1);
}


/**
 * Ordinary Least Squares regression.
 * Fits y = m*x + b over the supplied (x, y) pairs.
 *
 * Returns { m, b, rSquared }.
 * Returns null if fewer than 2 distinct x values exist.
 *
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {{ m: number, b: number, rSquared: number }|null}
 */
function ols(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;

  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, y) => s + y, 0) / n;

  let ssXX = 0, ssXY = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssXX += (xs[i] - meanX) ** 2;
    ssXY += (xs[i] - meanX) * (ys[i] - meanY);
    ssTot += (ys[i] - meanY) ** 2;
  }

  if (ssXX === 0) return null;   // All x values identical

  const m = ssXY / ssXX;
  const b = meanY - m * meanX;

  // R²
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - (m * xs[i] + b)) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : clip(1 - ssRes / ssTot, 0, 1);

  return { m, b, rSquared };
}


/**
 * Map R² value to confidence label.
 *
 * @param {number} rSq
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
function rSquaredToConfidence(rSq) {
  if (rSq >= 0.70) return 'HIGH';
  if (rSq >= 0.40) return 'MEDIUM';
  return 'LOW';
}


// ================================================================
// STEP 3: SENSOR DEGRADATION INDEX
// ================================================================

/**
 * Compute D_i for a single sensor channel.
 *
 * D_i = clip((x - baseline) / (critical - baseline), 0, 1)
 *
 * Returns null if the value is not a finite number.
 *
 * @param {number}  value     Current sensor reading
 * @param {string}  key       Sensor key (e.g. 'vib_rms')
 * @returns {number|null}
 */
function sensorDegradationIndex(value, key) {
  const config = SENSOR_BASELINES[key];
  if (!config) return null;

  if (!Number.isFinite(value)) return null;

  const { baseline, critical } = config;
  if (critical <= baseline) return null;   // Misconfigured — guard

  return clip((value - baseline) / (critical - baseline), 0, 1);
}


// ================================================================
// STEP 4: CORRELATION-WEIGHTED D_sensor
// ================================================================

/**
 * Compute the correlation-weighted composite sensor degradation.
 *
 * @param {object}   currentFeatures  { vib_rms, temp_belt, temp_motor, current_rms }
 * @param {object[]} recentBuffer     Entries from _telemetryBuffer with .features and .asi
 * @returns {{ dSensor: number, weights: object, method: string }}
 */
function computeWeightedDSensor(currentFeatures, recentBuffer) {
  const keys = ['vib_rms', 'temp_belt', 'temp_motor', 'current_rms'];

  // ── D_i for current reading ─────────────────────────────────
  const dValues = {};
  for (const k of keys) {
    const di = sensorDegradationIndex(currentFeatures[k], k);
    if (di !== null) dValues[k] = di;
  }

  const validKeys = Object.keys(dValues);

  if (validKeys.length === 0) {
    return {
      dSensor: 0,
      weights: {},
      method: 'INSUFFICIENT_DATA',
    };
  }

  // ── Attempt Pearson-weighted correlation ────────────────────
  const asiValues = recentBuffer.map(e => e.asi).filter(Number.isFinite);
  const canCorrelate = recentBuffer.length >= 5 && asiValues.length >= 5;

  if (canCorrelate) {
    const correlations = {};
    for (const k of validKeys) {
      const featureValues = recentBuffer
        .map(e => e.features[k])
        .filter(Number.isFinite);

      if (featureValues.length >= 5) {
        const slicedASI = recentBuffer
          .filter(e => Number.isFinite(e.features[k]) && Number.isFinite(e.asi))
          .map(e => e.asi);

        correlations[k] = Math.abs(
          pearsonCorrelation(featureValues.slice(0, slicedASI.length), slicedASI)
        );
      }
    }

    const totalCorr = Object.values(correlations).reduce((s, v) => s + v, 0);

    if (totalCorr > 0) {
      const weights = {};
      for (const k of Object.keys(correlations)) {
        weights[k] = correlations[k] / totalCorr;
      }

      let dSensor = 0;
      for (const k of Object.keys(weights)) {
        dSensor += weights[k] * (dValues[k] ?? 0);
      }

      return { dSensor: clip(dSensor, 0, 1), weights, method: 'PEARSON_WEIGHTED' };
    }
  }

  // ── Equal-weight fallback ───────────────────────────────────
  const equalWeight = 1 / validKeys.length;
  const weights = {};
  let dSensor = 0;
  for (const k of validKeys) {
    weights[k] = equalWeight;
    dSensor += equalWeight * dValues[k];
  }

  return {
    dSensor: clip(dSensor, 0, 1),
    weights,
    method: 'EQUAL_WEIGHT_FALLBACK',
  };
}


// ================================================================
// MAIN PROCESSING FUNCTION
// ================================================================

/**
 * Process a fresh telemetry reading through the full RUL pipeline.
 *
 * This function:
 *   1. Validates the reading.
 *   2. Computes ASI via Isolation Forest.
 *   3. Builds 5-min rolling ASI.
 *   4. Computes sensor degradation index.
 *   5. Computes composite D_t and HI_t.
 *   6. Appends HI to regression buffer.
 *   7. Runs OLS over 15-min window.
 *   8. Estimates RUL.
 *   9. Stores result in authoritative history.
 *
 * @param {object} reading  { timestamp, features, edge_health, device_id }
 * @returns {object}  Full RUL state (same shape as getRULState)
 */
export function processReading(reading) {

  // ── Validate ───────────────────────────────────────────────
  const ts = reading?.timestamp;
  if (
    !reading ||
    !reading.features ||
    !Number.isFinite(ts)
  ) {
    return buildState('INSUFFICIENT_DATA', 'Invalid or missing reading fields.', null);
  }

  const { features } = reading;
  const { vib_rms, temp_belt, temp_motor, current_rms } = features;

  const allFeaturesValid =
    Number.isFinite(vib_rms) &&
    Number.isFinite(temp_belt) &&
    Number.isFinite(temp_motor) &&
    Number.isFinite(current_rms);

  if (!allFeaturesValid) {
    return buildState('INSUFFICIENT_DATA', 'One or more sensor features are non-finite.', null);
  }


  // ── Step 1: Isolation Forest ASI ──────────────────────────
  const { score: rawScore } = iForest.processReading(features);

  // ASI is null before the forest is trained
  const asiT = rawScore !== null ? clip(rawScore, 0, 1) : null;


  // ── Prune old entries from telemetry buffer ─────────────
  const cutoffASI = ts - ASI_WINDOW_MS;
  while (_telemetryBuffer.length > 0 && _telemetryBuffer[0].timestamp < cutoffASI) {
    _telemetryBuffer.shift();
  }

  // Append current entry (only if ASI is available)
  if (asiT !== null) {
    _telemetryBuffer.push({ timestamp: ts, features, asi: asiT });
    if (_telemetryBuffer.length > MAX_HISTORY_ENTRIES) {
      _telemetryBuffer.shift();
    }
  }


  // ── Step 2: 5-min Rolling ASI ─────────────────────────────
  const windowASI = _telemetryBuffer.filter(e => e.timestamp >= cutoffASI);
  const asiValues5 = windowASI.map(e => e.asi).filter(Number.isFinite);
  const asi5min = asiValues5.length > 0
    ? asiValues5.reduce((s, v) => s + v, 0) / asiValues5.length
    : asiT;

  // Before forest is trained, skip further computation
  if (asiT === null || asi5min === null) {
    const samplesNeeded = iForest.TRAIN_SAMPLE_SIZE - iForest.getSamplesInBuffer();
    return buildState(
      'INSUFFICIENT_DATA',
      `Isolation Forest not yet trained. ${Math.max(0, samplesNeeded)} more samples needed.`,
      null
    );
  }


  // ── Steps 3 & 4: Sensor Degradation ──────────────────────
  const { dSensor, weights, method: weightingMethod } =
    computeWeightedDSensor(features, _telemetryBuffer);


  // ── Step 5: Composite D_t ─────────────────────────────────
  const dT = clip(
    0.30 * asiT + 0.40 * asi5min + 0.30 * dSensor,
    0,
    1
  );


  // ── Step 6: Health Index ──────────────────────────────────
  const hiT = clip(100 * (1 - dT), 0, 100);


  // ── Append HI to regression buffer ───────────────────────
  const cutoffHI = ts - HI_WINDOW_MS;
  while (_hiBuffer.length > 0 && _hiBuffer[0].timestamp < cutoffHI) {
    _hiBuffer.shift();
  }
  _hiBuffer.push({ timestamp: ts, hi: hiT });
  if (_hiBuffer.length > MAX_HISTORY_ENTRIES) {
    _hiBuffer.shift();
  }


  // ── Step 7: OLS Regression ────────────────────────────────
  const validHIWindow = _hiBuffer.filter(e => e.timestamp >= cutoffHI);

  if (validHIWindow.length < MIN_REGRESSION_SAMPLES) {
    const status = buildState(
      'INSUFFICIENT_DATA',
      `Regression requires ${MIN_REGRESSION_SAMPLES} samples in 15-min window. ` +
      `Currently: ${validHIWindow.length}.`,
      {
        asiT,
        asi5min,
        dSensor,
        dT,
        hiT,
        weightingMethod,
        weights,
      }
    );
    _latestRULState = status;
    return status;
  }

  // Convert timestamps to elapsed minutes from the first entry in window
  const t0 = validHIWindow[0].timestamp;
  const xs = validHIWindow.map(e => (e.timestamp - t0) / 60000);  // min
  const ys = validHIWindow.map(e => e.hi);

  const regression = ols(xs, ys);

  if (!regression) {
    const status = buildState(
      'INSUFFICIENT_DATA',
      'OLS regression failed (all HI values identical or < 2 distinct time points).',
      { asiT, asi5min, dSensor, dT, hiT, weightingMethod, weights }
    );
    _latestRULState = status;
    return status;
  }

  const { m, b, rSquared } = regression;
  const trendConfidence = rSquaredToConfidence(rSquared);


  // ── Step 8: RUL Estimation ────────────────────────────────
  let rulMinutes = null;
  let rulHours = null;
  let rulStatus;
  let rulReason;

  if (m >= 0) {
    // Improving or stable — RUL not estimable
    rulStatus = 'STABLE — RUL NOT ESTIMABLE';
    rulReason = `Regression slope m=${m.toFixed(4)} ≥ 0 (HI is not degrading).`;

  } else {
    // alpha = |m| = degradation rate in HI/min
    const alpha = -m;

    if (alpha < MIN_MEANINGFUL_DEGRADATION_RATE) {
      rulStatus = 'STABLE — RUL NOT ESTIMABLE';
      rulReason =
        `Slope |m|=${alpha.toExponential(2)} < MIN_MEANINGFUL_DEGRADATION_RATE` +
        ` (${MIN_MEANINGFUL_DEGRADATION_RATE}). Too slow to estimate.`;

    } else if (hiT <= HI_FAILURE_THRESHOLD) {
      rulMinutes = 0;
      rulHours = 0;
      rulStatus = 'CRITICAL / FAILURE REGION';
      rulReason =
        `HI=${hiT.toFixed(1)} ≤ failure threshold ${HI_FAILURE_THRESHOLD}.`;

    } else if (rSquared < 0.40) {
      // Weak trend — do not expose a numerical RUL estimate.
      rulStatus = 'LOW CONFIDENCE — RUL NOT ESTIMABLE';
      rulReason =
        `Degrading slope detected (m=${m.toFixed(4)} HI/min), ` +
        `but R²=${rSquared.toFixed(3)} < 0.40. ` +
        `Trend confidence is too low for a reliable RUL estimate.`;

    } else {
      // Normal estimation
      const rawMinutes = (hiT - HI_FAILURE_THRESHOLD) / alpha;

      // Safety: must be finite and positive
      if (!Number.isFinite(rawMinutes) || rawMinutes <= 0) {
        rulStatus = 'STABLE — RUL NOT ESTIMABLE';
        rulReason =
          'RUL calculation produced a non-positive or non-finite result.';
      } else {
        rulMinutes = parseFloat(rawMinutes.toFixed(1));
        rulHours = parseFloat((rawMinutes / 60).toFixed(2));
        rulStatus = 'ESTIMATING';
        rulReason =
          `Trend: m=${m.toFixed(4)} HI/min, ` +
          `α=${alpha.toFixed(4)}, R²=${rSquared.toFixed(3)}.`;
      }
    }
  }

  // ── Build observation ─────────────────────────────────────
  const observation = {
    timestamp: ts,
    rulMinutes,
    rulHours,
    healthIndex: parseFloat(hiT.toFixed(2)),
    asiT: parseFloat(asiT.toFixed(4)),
    asi5min: parseFloat(asi5min.toFixed(4)),
    dSensor: parseFloat(dSensor.toFixed(4)),
    dT: parseFloat(dT.toFixed(4)),
    degradationRatePerMin: m < 0 ? parseFloat((-m).toFixed(6)) : null,
    regressionSlope: parseFloat(m.toFixed(6)),
    regressionIntercept: parseFloat(b.toFixed(4)),
    rSquared: parseFloat(rSquared.toFixed(4)),
    trendConfidence,
    weightingMethod,
    weights,
    status: rulStatus,
    reason: rulReason,
    failureThreshold: HI_FAILURE_THRESHOLD,
    method: 'UNSUPERVISED_TREND_OLS_v1',
    disclaimer: 'ESTIMATION / FORMULA PENDING VALIDATION',
  };

  // Persist to history
  _rulHistory.push(observation);

  if (_rulHistory.length > MAX_RUL_HISTORY) {
    _rulHistory.shift();
  }

  _latestRULState = observation;

  // Persist the calculated RUL observation in MongoDB.
  persistRULObservation(observation, reading);

  return observation;


}





async function persistRULObservation(observation, reading) {
  try {
    await RULObservation.create({
      device_id: reading?.device_id || 'CB_001',
      timestamp: observation.timestamp,

      features: reading?.features || {},

      rulMinutes: observation.rulMinutes,
      rulHours: observation.rulHours,
      healthIndex: observation.healthIndex,

      asiT: observation.asiT,
      asi5min: observation.asi5min,

      dSensor: observation.dSensor,
      dT: observation.dT,

      degradationRatePerMin: observation.degradationRatePerMin,
      regressionSlope: observation.regressionSlope,
      regressionIntercept: observation.regressionIntercept,

      rSquared: observation.rSquared,
      trendConfidence: observation.trendConfidence,

      weightingMethod: observation.weightingMethod,
      weights: observation.weights,

      status: observation.status,
      reason: observation.reason,

      failureThreshold: observation.failureThreshold,
      method: observation.method,
      disclaimer: observation.disclaimer,
    });

    return true;
  } catch (error) {
    console.error(
      '[RUL] Failed to persist observation:',
      error.message
    );

    return false;
  }
}

export async function restoreRULState() {
  try {
    const observations = await RULObservation.find({
      device_id: 'CB_001',
    })
      .sort({ timestamp: -1 })
      .limit(MAX_RUL_HISTORY)
      .lean();

    if (!observations.length) {
      console.log(
        '[RUL] No persisted observations found. Starting with empty RUL history.'
      );

      return false;
    }

    // Database returns newest first.
    // Internal buffers work chronologically.
    observations.reverse();

    _rulHistory.length = 0;
    _telemetryBuffer.length = 0;
    _hiBuffer.length = 0;

    const now = Date.now();
    const asiCutoff = now - ASI_WINDOW_MS;
    const hiCutoff = now - HI_WINDOW_MS;

    for (const observation of observations) {
      _rulHistory.push(observation);

      if (
        Number.isFinite(observation.timestamp) &&
        observation.timestamp >= asiCutoff &&
        Number.isFinite(observation.asiT)
      ) {
        _telemetryBuffer.push({
          timestamp: observation.timestamp,
          features: observation.features || {},
          asi: observation.asiT,
        });
      }

      if (
        Number.isFinite(observation.timestamp) &&
        observation.timestamp >= hiCutoff &&
        Number.isFinite(observation.healthIndex)
      ) {
        _hiBuffer.push({
          timestamp: observation.timestamp,
          hi: observation.healthIndex,
        });
      }
    }

    _latestRULState = observations[observations.length - 1];

    console.log(
      `[RUL] Restored ${observations.length} persisted observations.`
    );

    return true;
  } catch (error) {
    console.error(
      '[RUL] Failed to restore persisted state:',
      error.message
    );

    return false;
  }
}

// ================================================================
// STATE ACCESSOR
// ================================================================

/**
 * Returns the latest RUL state as calculated by processReading.
 * Returns a default INSUFFICIENT_DATA state if never called.
 *
 * @returns {object}
 */
export function getRULState() {
  if (_latestRULState) return _latestRULState;
  return buildState('INSUFFICIENT_DATA', 'No telemetry has been processed yet.', null);
}


/**
 * Returns the authoritative RUL observation history.
 * Only includes observations where RUL was successfully estimated.
 *
 * @param {number} [limit=100]  Maximum entries to return (most recent first)
 * @returns {object[]}
 */
export async function getRULHistory(limit = 100) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 100, 1),
    MAX_RUL_HISTORY
  );

  try {
    const observations = await RULObservation.find({
      device_id: 'CB_001',
    })
      .sort({ timestamp: -1 })
      .limit(safeLimit)
      .lean();

    return observations;
  } catch (error) {
    console.error(
      '[RUL] Failed to read persisted history:',
      error.message
    );

    // Fall back to the current in-memory history if MongoDB
    // temporarily fails.
    return _rulHistory
      .slice(-safeLimit)
      .reverse();
  }
}


/**
 * Returns a summary of the current engine state (for diagnostics).
 */
export function getEngineStats() {
  return {
    telemetryBufferLength: _telemetryBuffer.length,
    hiBufferLength: _hiBuffer.length,
    rulHistoryLength: _rulHistory.length,
    forestTrained: iForest.isTrained(),
    forestSamplesInBuffer: iForest.getSamplesInBuffer(),
    samplesNeededToTrain: Math.max(0, iForest.TRAIN_SAMPLE_SIZE - iForest.getSamplesInBuffer()),
  };
}


// ================================================================
// INTERNAL: BUILD STATE
// ================================================================

/**
 * Build a structured state object with a given status.
 * Used for error / insufficient-data conditions.
 *
 * @param {string}      status
 * @param {string}      reason
 * @param {object|null} partialMetrics  Partial metrics if available
 * @returns {object}
 */
function buildState(status, reason, partialMetrics) {
  return {
    timestamp: Date.now(),
    rulMinutes: null,
    rulHours: null,
    healthIndex: partialMetrics?.hiT ?? null,
    asiT: partialMetrics?.asiT ?? null,
    asi5min: partialMetrics?.asi5min ?? null,
    dSensor: partialMetrics?.dSensor ?? null,
    dT: partialMetrics?.dT ?? null,
    degradationRatePerMin: null,
    regressionSlope: null,
    regressionIntercept: null,
    rSquared: null,
    trendConfidence: null,
    weightingMethod: partialMetrics?.weightingMethod ?? null,
    weights: partialMetrics?.weights ?? null,
    status,
    reason,
    failureThreshold: HI_FAILURE_THRESHOLD,
    method: 'UNSUPERVISED_TREND_OLS_v1',
    disclaimer: 'ESTIMATION / FORMULA PENDING VALIDATION',
  };
}

