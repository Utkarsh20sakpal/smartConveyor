/**
 * sensorSlice.js
 *
 * Manages live sensor readings from:
 * /devices/CB_001/live/latest
 *
 * Also maintains:
 * - frontend history buffer
 * - Firestore connection state
 * - anomaly information
 * - timestamp of the last valid telemetry reading
 *
 * IMPORTANT:
 * We intentionally do NOT create a zero-filled initial reading.
 *
 * null = no telemetry has been received yet
 * 0    = an actual sensor value of zero
 */

import { createSlice } from "@reduxjs/toolkit";


// ================================================================
// INITIAL STATE
// ================================================================

const initialState = {

  /*
   * IMPORTANT:
   *
   * Previously this contained:
   *
   * {
   *   edge_health: 0,
   *   features: {
   *     current_rms: 0,
   *     temp_belt: 0,
   *     temp_motor: 0,
   *     vib_rms: 0
   *   }
   * }
   *
   * That made the dashboard believe that zero was a real
   * sensor reading even before Firestore sent anything.
   *
   * We now use null.
   */
  liveReading: null,


  /*
   * Last N valid readings received by the frontend.
   *
   * This is frontend memory only.
   */
  history: [],


  /*
   * Maximum number of readings retained for charts.
   */
  historyMaxLength: 60,


  /*
   * Firestore connection / telemetry state.
   *
   * Possible values:
   *
   * LOADING
   * ONLINE
   * STALE
   * ERROR
   * OFFLINE
   */
  connectionStatus: "LOADING",


  /*
   * Anomaly detection information.
   *
   * These remain independent from Firestore connectivity.
   */
  anomalyScore: null,

  anomalyStatus: "UNKNOWN",


  /*
   * Timestamp of the most recently accepted telemetry reading.
   *
   * This is NOT simply the time the React component rendered.
   */
  lastUpdated: null,
};


// ================================================================
// SLICE
// ================================================================

const sensorSlice = createSlice({

  name: "sensor",

  initialState,


  reducers: {

    // ============================================================
    // SET LIVE READING
    // ============================================================

    setLiveReading(state, action) {

      const reading = action.payload;


      /*
       * Do not allow null / undefined payloads
       * to overwrite a valid reading.
       */
      if (!reading) {
        return;
      }


      /*
       * Store the new valid telemetry reading.
       */
      state.liveReading = reading;


      /*
       * The timestamp has already been normalized by
       * useLiveReadings.js.
       *
       * Fallback to Date.now() only if the caller didn't
       * provide a timestamp.
       */
      state.lastUpdated =
        reading.timestamp ??
        Date.now();


      // ==========================================================
      // HISTORY
      // ==========================================================

      /*
       * Add the valid reading to the frontend history buffer.
       *
       * We deliberately don't add invalid / null readings.
       */
      state.history = [

        ...state.history.slice(
          -(state.historyMaxLength - 1)
        ),

        reading,

      ];
    },


    // ============================================================
    // CONNECTION STATUS
    // ============================================================

    setConnectionStatus(state, action) {

      state.connectionStatus =
        action.payload;
    },


    // ============================================================
    // ANOMALY SCORE
    // ============================================================

    setAnomalyScore(state, action) {

      const payload =
        action.payload || {};


      state.anomalyScore =
        payload.score ?? null;


      state.anomalyStatus =
        payload.status ?? "UNKNOWN";
    },


    // ============================================================
    // CLEAR HISTORY
    // ============================================================

    clearHistory(state) {

      state.history = [];
    },


    // ============================================================
    // CLEAR LIVE READING
    // ============================================================

    /*
     * Useful when explicitly resetting the telemetry
     * session.
     *
     * NOTE:
     * This is NOT called automatically when Firestore
     * goes offline.
     *
     * That is intentional.
     *
     * When the cloud goes offline, we want the dashboard
     * to continue showing the last known reading.
     */
    clearLiveReading(state) {

      state.liveReading = null;
      state.lastUpdated = null;
    },

  },

});


// ================================================================
// ACTIONS
// ================================================================

export const {
  setLiveReading,
  setConnectionStatus,
  setAnomalyScore,
  clearHistory,
  clearLiveReading,
} = sensorSlice.actions;


// ================================================================
// REDUCER
// ================================================================

export default sensorSlice.reducer;