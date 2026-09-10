
import IsolationForestState from '../models/IsolationForestState.js';

/**
 * isolationForestService.js
 *
 * Lightweight JavaScript implementation of the Isolation Forest algorithm.
 *
 * References:
 *   Liu, F.T., Ting, K.M., Zhou, Z-H. (2008).
 *   "Isolation Forest". Proceedings of ICDM.
 *
 * ============================================================
 * SCORE CONVENTION (matches domainUtils.anomalyToStatus)
 * ============================================================
 *
 *   score ∈ [0, 1]
 *   0.00 = perfectly normal
 *   1.00 = maximally anomalous
 *
 *   Thresholds (from domainUtils.js):
 *     score < 0.30  → HEALTHY
 *     score < 0.70  → WARNING
 *     score ≥ 0.70  → CRITICAL
 *
 * ============================================================
 * FEATURE VECTOR ORDER (fixed — do NOT reorder)
 * ============================================================
 *
 *   [0] vib_rms
 *   [1] temp_belt
 *   [2] temp_motor
 *   [3] current_rms
 *
 * ============================================================
 * TRAINING STRATEGY
 * ============================================================
 *
 *   The forest trains on the FIRST TRAIN_SAMPLE_SIZE valid
 *   telemetry samples received, then freezes its model.
 *
 *   This is appropriate for unsupervised anomaly detection
 *   where the early operating period is assumed to be nominal.
 *
 *   The forest auto-retrains every RETRAIN_INTERVAL_MS to
 *   adapt to slow operational regime shifts, using the most
 *   recent TRAIN_SAMPLE_SIZE samples.
 */

// ================================================================
// CONSTANTS
// ================================================================

/** Euler-Mascheroni constant used in path-length normalisation. */
const EULER_MASCHERONI = 0.5772156649;

/** Number of trees in the forest. */
const N_ESTIMATORS = 100;

/** Subsample size used when building each tree. */
const SUBSAMPLE_SIZE = 256;

/** Maximum depth of each isolation tree. */
const MAX_DEPTH = Math.ceil(Math.log2(SUBSAMPLE_SIZE));

/** Minimum samples required to train the initial model. */
const TRAIN_SAMPLE_SIZE = 50;

/** Re-train the forest every 30 minutes. */
const RETRAIN_INTERVAL_MS = 30 * 60 * 1000;

/** Maximum history length for training samples. */
const MAX_TRAINING_HISTORY = 500;


// ================================================================
// EXPECTED PATH-LENGTH UTILITY  (Liu et al., Eq. 2)
// ================================================================

/**
 * Expected path length for an unsuccessful BST search
 * with n nodes, approximated using the harmonic number.
 *
 * @param {number} n  Sample size
 * @returns {number}
 */
function expectedPathLength(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const H = Math.log(n - 1) + EULER_MASCHERONI; // harmonic number H(n-1)
  return 2 * H - (2 * (n - 1)) / n;
}


// ================================================================
// ISOLATION TREE
// ================================================================

/**
 * Builds a single isolation tree by recursive random splitting.
 *
 * @param {number[][]} data     2-D array of feature vectors
 * @param {number}     depth   Current depth (starts at 0)
 * @param {number}     maxDepth Maximum allowed depth
 * @returns {object}  Tree node
 */
function buildTree(data, depth, maxDepth) {
  const n = data.length;

  // -- Leaf --
  if (n <= 1 || depth >= maxDepth) {
    return { isLeaf: true, size: n };
  }

  const featureCount = data[0].length;

  // Select a random feature dimension
  const feature = Math.floor(Math.random() * featureCount);

  // Compute min/max for the selected feature
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    if (row[feature] < min) min = row[feature];
    if (row[feature] > max) max = row[feature];
  }

  // All values identical in this dimension — treat as leaf
  if (min === max) {
    return { isLeaf: true, size: n };
  }

  // Random split point within [min, max)
  const splitValue = min + Math.random() * (max - min);

  const left = [];
  const right = [];

  for (const row of data) {
    (row[feature] < splitValue ? left : right).push(row);
  }

  return {
    isLeaf: false,
    feature,
    splitValue,
    left: buildTree(left, depth + 1, maxDepth),
    right: buildTree(right, depth + 1, maxDepth),
  };
}


/**
 * Calculates the path length of a single sample through one tree.
 *
 * @param {number[]} sample  Feature vector
 * @param {object}   node    Tree node
 * @param {number}   depth  Accumulated depth
 * @returns {number}  Path length
 */
function pathLength(sample, node, depth) {
  if (node.isLeaf) {
    // Add the expected path length for the remaining samples
    return depth + expectedPathLength(node.size);
  }

  if (sample[node.feature] < node.splitValue) {
    return pathLength(sample, node.left, depth + 1);
  }
  return pathLength(sample, node.right, depth + 1);
}


// ================================================================
// ISOLATION FOREST STATE
// ================================================================

let _trees = [];           // Trained isolation trees
let _trainedOn = 0;            // Timestamp of last training (ms)
let _subsampleSize = 0;            // n used in this training run
let _isTrained = false;        // True once first training completes

/** Circular buffer of raw feature vectors for training. */
const _trainingHistory = [];       // number[][]


// ================================================================
// TRAINING
// ================================================================

/**
 * Train the Isolation Forest on recent telemetry vectors.
 *
 * @param {number[][]} samples  Array of feature vectors
 */
function trainForest(samples) {
  if (!samples || samples.length < 2) return;

  const n = Math.min(samples.length, SUBSAMPLE_SIZE);
  const trees = [];

  for (let t = 0; t < N_ESTIMATORS; t++) {
    // Random subsample (without replacement, via sort shuffle)
    const shuffled = [...samples].sort(() => Math.random() - 0.5);
    const subsample = shuffled.slice(0, n);
    trees.push(buildTree(subsample, 0, MAX_DEPTH));
  }

  _trees = trees;
  _subsampleSize = n;
  _trainedOn = Date.now();
  _isTrained = true;

  // Persist asynchronously after successful training.

  persistState();
  console.log(
    `[IsolationForest] Trained: ${N_ESTIMATORS} trees, ` +
    `n=${n}, maxDepth=${MAX_DEPTH}`
  );


}


/**
 * Ingest a new telemetry feature vector into the training history.
 * Triggers initial training once TRAIN_SAMPLE_SIZE samples
 * are accumulated, and periodic retraining thereafter.
 *
 * @param {number[]} featureVector  [vib_rms, temp_belt, temp_motor, current_rms]
 */
function ingestSample(featureVector) {
  _trainingHistory.push(featureVector);

  // Keep circular buffer bounded
  if (_trainingHistory.length > MAX_TRAINING_HISTORY) {
    _trainingHistory.shift();
  }

  const now = Date.now();

  const needsInitialTrain =
    !_isTrained &&
    _trainingHistory.length >= TRAIN_SAMPLE_SIZE;

  const needsRetrain =
    _isTrained &&
    (now - _trainedOn) >= RETRAIN_INTERVAL_MS &&
    _trainingHistory.length >= TRAIN_SAMPLE_SIZE;

  if (needsInitialTrain || needsRetrain) {
    trainForest(_trainingHistory);
  }
}


// ================================================================
// SCORING
// ================================================================

/**
 * Score a single feature vector using the trained Isolation Forest.
 *
 * Returns a score in [0, 1]:
 *   0   = very normal (long path to isolate)
 *   1   = very anomalous (short path to isolate)
 *
 * Implements the canonical anomaly score from Liu et al. (2008):
 *   s(x, n) = 2^(-E[h(x)] / c(n))
 *
 * Then re-maps from the canonical range (0,1) where 0.5 is neutral
 * to a linearised [0,1] where 0=normal and 1=anomalous, consistent
 * with domainUtils.anomalyToStatus.
 *
 * @param {number[]} featureVector  [vib_rms, temp_belt, temp_motor, current_rms]
 * @returns {number|null}  Normalised anomaly score [0,1] or null if not trained
 */
function scoreAnomaly(featureVector) {
  if (!_isTrained || _trees.length === 0) {
    return null;
  }

  // Average path length across all trees
  let totalPathLength = 0;
  for (const tree of _trees) {
    totalPathLength += pathLength(featureVector, tree, 0);
  }
  const avgPathLen = totalPathLength / _trees.length;

  // Normalise using c(subsampleSize) — Liu et al. Eq. 2
  const c_n = expectedPathLength(_subsampleSize);

  if (c_n === 0) return 0;

  // Canonical anomaly score: 2^(-avg / c(n))
  // Typical normal: 0.35-0.50; anomalies: > 0.50
  const canonicalScore = Math.pow(2, -avgPathLen / c_n);

  // Re-linearise to [0,1] where 0=normal, 1=anomalous
  // by stretching around the neutral midpoint of 0.5
  const normalised = Math.max(0, Math.min(1, 2 * (canonicalScore - 0.5)));

  return parseFloat(normalised.toFixed(4));
}


// ================================================================
// PUBLIC API
// ================================================================

/**
 * Process one telemetry reading:
 *   1. Ingest it into the training buffer.
 *   2. Return the anomaly score (or null before trained).
 *
 * @param {object} features  { vib_rms, temp_belt, temp_motor, current_rms }
 * @returns {{ score: number|null, trained: boolean, samplesInBuffer: number }}
 */
function processReading(features) {
  const { vib_rms, temp_belt, temp_motor, current_rms } = features;

  // Validate all required features are finite numbers
  if (
    !Number.isFinite(vib_rms) ||
    !Number.isFinite(temp_belt) ||
    !Number.isFinite(temp_motor) ||
    !Number.isFinite(current_rms)
  ) {
    return {
      score: null,
      trained: _isTrained,
      samplesInBuffer: _trainingHistory.length,
    };
  }

  // Feature vector order is fixed — see module header
  const featureVector = [vib_rms, temp_belt, temp_motor, current_rms];

  ingestSample(featureVector);

  const score = scoreAnomaly(featureVector);

  return {
    score,
    trained: _isTrained,
    samplesInBuffer: _trainingHistory.length,
  };
}


/**
 * Returns true once the model has been trained at least once.
 */
function isTrained() {
  return _isTrained;
}


/**
 * Returns the number of samples currently in the training buffer.
 */
function getSamplesInBuffer() {
  return _trainingHistory.length;
}


/**
 * Force a retrain using all available history.
 * Useful for tests or manual admin triggers.
 */
function forceRetrain() {
  if (_trainingHistory.length >= 2) {
    trainForest(_trainingHistory);
  }
}

// ================================================================
// MONGODB PERSISTENCE
// ================================================================

/**
 * Save the currently trained Isolation Forest to MongoDB.
 *
 * The trees are plain JSON-compatible objects, so they can be
 * stored directly using a Mixed field.
 */
export async function persistState() {
  if (!_isTrained || !_trees.length) {
    return false;
  }

  try {
    await IsolationForestState.findOneAndUpdate(
      { modelKey: 'CB_001' },
      {
        modelKey: 'CB_001',
        trees: _trees,
        trainedOn: _trainedOn,
        subsampleSize: _subsampleSize,
        trainingHistory: _trainingHistory,
        isTrained: _isTrained,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log('[IsolationForest] State persisted to MongoDB.');

    return true;
  } catch (error) {
    console.error(
      '[IsolationForest] Failed to persist state:',
      error.message
    );

    return false;
  }
}


/**
 * Restore the most recently persisted Isolation Forest.
 *
 * Returns true when a valid trained forest was restored.
 */
export async function restoreState() {
  try {
    const savedState = await IsolationForestState.findOne({
      modelKey: 'CB_001',
    }).lean();

    if (!savedState) {
      console.log(
        '[IsolationForest] No persisted model found. Fresh training required.'
      );

      return false;
    }

    if (
      !savedState.isTrained ||
      !Array.isArray(savedState.trees) ||
      savedState.trees.length === 0
    ) {
      console.log(
        '[IsolationForest] Persisted state is not a trained forest.'
      );

      return false;
    }

    _trees = savedState.trees;
    _trainedOn = Number(savedState.trainedOn) || 0;
    _subsampleSize = Number(savedState.subsampleSize) || 0;
    _isTrained = true;

    _trainingHistory.length = 0;

    if (Array.isArray(savedState.trainingHistory)) {
      _trainingHistory.push(...savedState.trainingHistory);
    }

    console.log(
      `[IsolationForest] Restored: ${_trees.length} trees, ` +
      `training samples=${_trainingHistory.length}`
    );

    return true;
  } catch (error) {
    console.error(
      '[IsolationForest] Failed to restore state:',
      error.message
    );

    return false;
  }
}

export {
  processReading,
  isTrained,
  getSamplesInBuffer,
  forceRetrain,
  // Exported for unit tests
  expectedPathLength,
  scoreAnomaly,
  buildTree,
  pathLength,
  trainForest,
  TRAIN_SAMPLE_SIZE,
};
