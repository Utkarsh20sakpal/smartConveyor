/**
 * detectionSlice.js
 *
 * Manages:
 * - Camera snapshots
 * - YOLOv8 detection results
 * - Detection history
 * - Detection loading/error state
 */

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  latestSnapshot: {
    device_id: "CB_001",
    image_base64: "",
    resolution: "QVGA",
    timestamp: null,
  },

  latestDetection: null,

  detectionHistory: [],

  historyMaxLength: 50,

  loading: false,

  error: null,
};

const detectionSlice = createSlice({
  name: "detection",

  initialState,

  reducers: {
    setLatestSnapshot(state, action) {
      state.latestSnapshot = action.payload;
    },

    setLatestDetection(state, action) {
      state.latestDetection = action.payload;

      if (action.payload) {
        state.detectionHistory = [
          action.payload,
          ...state.detectionHistory.filter(
            (item) => item.id !== action.payload.id
          ),
        ].slice(0, state.historyMaxLength);
      }
    },

    setDetectionHistory(state, action) {
      state.detectionHistory = Array.isArray(action.payload)
        ? action.payload
        : [];
    },

    setLoading(state, action) {
      state.loading =
        typeof action.payload === "boolean"
          ? action.payload
          : true;

      if (state.loading) {
        state.error = null;
      }
    },

    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },

    clearError(state) {
      state.error = null;
    },

    clearDetection(state) {
      state.latestDetection = null;
      state.error = null;
    },
  },
});

export const {
  setLatestSnapshot,
  setLatestDetection,
  setDetectionHistory,
  setLoading,
  setError,
  clearError,
  clearDetection,
} = detectionSlice.actions;

export default detectionSlice.reducer;