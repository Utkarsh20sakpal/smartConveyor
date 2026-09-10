/**
 * mockSensorData.js
 * Mock data matching exact §4.2 Firestore schema.
 * Shape MUST NOT deviate — swapping in live data later requires no shape changes.
 * 
 * Firestore doc: /devices/CB_001/live/latest
 */

/** Current live reading (same shape as Firestore doc) */
export const mockLiveReading = {
  device_id:   "CB_001",
  edge_health: 96.4,
  features: {
    current_rms: 0.031,
    temp_belt:   25.4,
    temp_motor:  38.7,
    vib_rms:     3.21,
  },
  timestamp: Date.now(),
};

/** Generate a time series of historical readings for trend charts */
function generateHistory(count = 60, intervalMs = 10000) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const base = now - (count - i) * intervalMs;
    return {
      device_id:   "CB_001",
      edge_health: 94 + Math.random() * 4,
      features: {
        current_rms: 0.028 + Math.random() * 0.008,
        temp_belt:   24.0 + Math.random() * 3.5,
        temp_motor:  37.0 + Math.random() * 3.0,
        vib_rms:     2.8  + Math.random() * 0.9,
      },
      timestamp: base,
    };
  });
}

export const mockSensorHistory = generateHistory(60);

/** Defensive fallback export */
export const mockConveyorOverview = {
  speed_ms: 2.4,
  load_pct: 72,
};

