/**
 * twinSlice.js
 * Manages Digital Twin state: conveyor live status, playback mode, and belt speed.
 *
 * NOTE: Joint/splice sector monitoring is NOT currently implemented.
 * This slice contains only state that maps to real monitored functionality.
 * See PRD §3 for future belt-damage analysis plans.
 */
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode:           "LIVE",   // "LIVE" | "HISTORICAL"
  playback: {
    playing:      false,
    speed:        1,         // 1x | 5x | 20x
    currentTime:  null,      // Date.now() when LIVE, timestamp when HISTORICAL
    rangeStart:   null,      // 72h ago
    rangeEnd:     null,      // now
  },
  historicalData: {},        // { [timestamp]: snapshot }
  beltSpeed:      2.4,       // m/s — live from Firestore features
  conveyorStatus: "RUNNING", // "RUNNING" | "STOPPED" | "FAULT"
};

const twinSlice = createSlice({
  name: "twin",
  initialState,
  reducers: {
    setMode(state, action) {
      state.mode = action.payload;
    },
    setPlayback(state, action) {
      Object.assign(state.playback, action.payload);
    },
    setHistoricalData(state, action) {
      state.historicalData = action.payload;
    },
    setBeltSpeed(state, action) {
      state.beltSpeed = action.payload;
    },
    setConveyorStatus(state, action) {
      state.conveyorStatus = action.payload;
    },
  },
});

export const {
  setMode, setPlayback, setHistoricalData, setBeltSpeed, setConveyorStatus,
} = twinSlice.actions;
export default twinSlice.reducer;
