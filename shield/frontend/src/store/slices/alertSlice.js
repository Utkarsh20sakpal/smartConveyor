/**
 * alertSlice.js
 * Manages the alerts list, filter state, and acknowledge flow.
 *
 * Alert sources can include:
 * - SENSOR_AI
 * - VISION_AI
 * - SYSTEM
 */
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  alerts: [],
  filterSeverity: "ALL",
  filterStatus: "ALL",
  filterSearch: "",
  filterDate: null,
  loading: false,
  error: null,
  totalCount: 0,
  criticalCount: 0,
  warningCount: 0,
  acknowledgedCount: 0,
};

function recomputeCounts(state) {
  state.totalCount = state.alerts.length;
  state.criticalCount = state.alerts.filter(
    (a) => a.severity === "CRITICAL"
  ).length;
  state.warningCount = state.alerts.filter(
    (a) => a.severity === "WARNING"
  ).length;
  state.acknowledgedCount = state.alerts.filter(
    (a) => a.status === "ACKNOWLEDGED"
  ).length;
}

const alertSlice = createSlice({
  name: "alert",
  initialState,
  reducers: {
    setAlerts(state, action) {
      state.alerts = Array.isArray(action.payload) ? action.payload : [];
      recomputeCounts(state);
      state.loading = false;
      state.error = null;
    },

    addAlert(state, action) {
      const incoming = action.payload;

      if (!incoming?.id) {
        return;
      }

      // Never insert the same alert record twice.
      if (state.alerts.some((alert) => alert.id === incoming.id)) {
        return;
      }

      state.alerts.unshift(incoming);

      // Keep the Redux alert log bounded.
      if (state.alerts.length > 100) {
        state.alerts.pop();
      }

      recomputeCounts(state);
    },

    acknowledgeAlert(state, action) {
      const alert = state.alerts.find(
        (a) => a.id === action.payload
      );

      if (alert && alert.status !== "ACKNOWLEDGED") {
        alert.status = "ACKNOWLEDGED";
        recomputeCounts(state);
      }
    },

    setFilterSeverity(state, action) {
      state.filterSeverity = action.payload;
    },

    setFilterStatus(state, action) {
      state.filterStatus = action.payload;
    },

    setFilterSearch(state, action) {
      state.filterSearch = action.payload;
    },

    setFilterDate(state, action) {
      state.filterDate = action.payload;
    },

    setLoading(state) {
      state.loading = true;
      state.error = null;
    },

    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setAlerts,
  addAlert,
  acknowledgeAlert,
  setFilterSeverity,
  setFilterStatus,
  setFilterSearch,
  setFilterDate,
  setLoading,
  setError,
} = alertSlice.actions;

export default alertSlice.reducer;
