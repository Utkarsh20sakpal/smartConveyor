/**
 * rulSlice.js
 *
 * Redux slice for the authoritative backend RUL (Remaining Useful Life) state.
 *
 * ============================================================
 * IMPORTANT — This slice is a PRESENTATION CONTAINER ONLY.
 * ============================================================
 *
 * All RUL mathematics (ASI, D_i, HI, OLS regression, RUL estimate)
 * are computed by the backend rulService.js.
 *
 * This slice:
 *   - Stores the backend's authoritative RUL response.
 *   - Stores the rolling RUL trend history for Dashboard graph.
 *   - Exposes loading / error state for UI feedback.
 *   - Never computes, transforms, or derives any RUL value.
 *
 * State shape matches the backend rulService observation contract:
 *
 *   currentRULMinutes       : number | null
 *   currentRULHours         : number | null
 *   healthIndex             : number | null   (0–100)
 *   asiT                    : number | null   (0–1)
 *   asi5min                 : number | null   (0–1)
 *   dSensor                 : number | null   (0–1)
 *   dT                      : number | null   (0–1)
 *   degradationRatePerMin   : number | null
 *   regressionSlope         : number | null
 *   rSquared                : number | null
 *   trendConfidence         : 'HIGH'|'MEDIUM'|'LOW'|null
 *   weightingMethod         : string | null
 *   weights                 : object | null
 *   status                  : string
 *   reason                  : string | null
 *   failureThreshold        : number
 *   disclaimer              : string
 *   history                 : RULObservation[]
 *   lastUpdated             : number | null   (Unix ms)
 *   loading                 : boolean
 *   error                   : string | null
 */

import { createSlice } from '@reduxjs/toolkit';


// ================================================================
// INITIAL STATE
// ================================================================

const initialState = {
  // ── Latest RUL computation ──────────────────────────────────
  currentRULMinutes:      null,
  currentRULHours:        null,
  healthIndex:            null,
  asiT:                   null,
  asi5min:                null,
  dSensor:                null,
  dT:                     null,
  degradationRatePerMin:  null,
  regressionSlope:        null,
  regressionIntercept:    null,
  rSquared:               null,
  trendConfidence:        null,
  weightingMethod:        null,
  weights:                null,

  // ── Status & reason ─────────────────────────────────────────
  status:           'INSUFFICIENT_DATA',
  reason:           'Awaiting telemetry and baseline validation.',
  failureThreshold: 20,
  disclaimer:       'ESTIMATION / FORMULA PENDING VALIDATION',

  // ── History (for trend graph) ────────────────────────────────
  history: [],

  // ── UI state ─────────────────────────────────────────────────
  lastUpdated: null,
  loading:     false,
  error:       null,
};


// ================================================================
// SLICE
// ================================================================

const rulSlice = createSlice({
  name: 'rul',
  initialState,

  reducers: {

    /**
     * setRULState
     *
     * Replaces the entire RUL state from a backend response.
     *
     * Payload:
     *   {
     *     state:   { ...RUL observation fields }
     *     history: RULObservation[]
     *   }
     */
    setRULState(reduxState, action) {
      const { state: backendState, history } = action.payload;

      if (!backendState) return;

      // Prevent NaN / Infinity from entering Redux
      function safe(v) {
        if (v === null || v === undefined) return null;
        if (typeof v === 'number') {
          if (!Number.isFinite(v)) return null;
          return v;
        }
        return v;
      }

      reduxState.currentRULMinutes      = safe(backendState.rulMinutes);
      reduxState.currentRULHours        = safe(backendState.rulHours);
      reduxState.healthIndex            = safe(backendState.healthIndex);
      reduxState.asiT                   = safe(backendState.asiT);
      reduxState.asi5min                = safe(backendState.asi5min);
      reduxState.dSensor                = safe(backendState.dSensor);
      reduxState.dT                     = safe(backendState.dT);
      reduxState.degradationRatePerMin  = safe(backendState.degradationRatePerMin);
      reduxState.regressionSlope        = safe(backendState.regressionSlope);
      reduxState.regressionIntercept    = safe(backendState.regressionIntercept);
      reduxState.rSquared               = safe(backendState.rSquared);
      reduxState.trendConfidence        = backendState.trendConfidence  ?? null;
      reduxState.weightingMethod        = backendState.weightingMethod  ?? null;
      reduxState.weights                = backendState.weights          ?? null;
      reduxState.status                 = backendState.status           ?? 'INSUFFICIENT_DATA';
      reduxState.reason                 = backendState.reason           ?? null;
      reduxState.failureThreshold       = backendState.failureThreshold ?? 20;
      reduxState.disclaimer             = backendState.disclaimer       ?? 'ESTIMATION / FORMULA PENDING VALIDATION';

      if (Array.isArray(history)) {
        reduxState.history = history;
      }

      reduxState.lastUpdated = Date.now();
      reduxState.loading     = false;
      reduxState.error       = null;
    },


    /**
     * setRULLoading
     *
     * Set while the frontend is waiting for the backend response.
     */
    setRULLoading(reduxState) {
      reduxState.loading = true;
      reduxState.error   = null;
    },


    /**
     * setRULError
     *
     * Set if the backend request fails. Preserves the last known state.
     *
     * Payload: string (error message)
     */
    setRULError(reduxState, action) {
      reduxState.loading = false;
      reduxState.error   = action.payload ?? 'Unknown RUL fetch error.';
    },


    /**
     * clearRULState
     *
     * Reset to initial state (e.g. on device disconnect).
     */
    clearRULState() {
      return initialState;
    },

  },
});

export const {
  setRULState,
  setRULLoading,
  setRULError,
  clearRULState,
} = rulSlice.actions;

export default rulSlice.reducer;
