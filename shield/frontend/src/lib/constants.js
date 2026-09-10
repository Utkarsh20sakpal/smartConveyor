/**
 * constants.js — application-wide enums and tokens
 * Source: theme.md §4, prompt §5
 */

/** Status enums — used for system state only, never decorative */
export const STATUS = {
  HEALTHY:  "HEALTHY",
  WARNING:  "WARNING",
  CRITICAL: "CRITICAL",
  UNKNOWN:  "UNKNOWN",
  OFFLINE:  "OFFLINE",
};


/** Severity levels for alerts and detections */
export const SEVERITY = {
  CRITICAL: "CRITICAL",
  WARNING:  "WARNING",
  NORMAL:   "NORMAL",
};

/** Alert status */
export const ALERT_STATUS = {
  ACTIVE:       "ACTIVE",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED:     "RESOLVED",
};

/** Report types */
export const REPORT_TYPE = {
  CONVEYOR_PERFORMANCE: "Conveyor Performance Report",
  DAMAGE_DETECTION:     "Damage Detection Report",
  SENSOR_HEALTH:        "Sensor Health Report",
  ALERT_HISTORY:        "Alert History Report",
  MAINTENANCE:          "Maintenance Report",
};

/** Firestore device ID */
export const DEVICE_ID = "CB_001";

/** Firestore document paths */
export const FIRESTORE_PATHS = {
  LIVE_LATEST:      `devices/${DEVICE_ID}/live/latest`,
  SNAPSHOT_LATEST:  `devices/${DEVICE_ID}/snapshots/latest`,
};

/**
 * BELT — 3D scene geometry configuration (WebGL rendering parameters only).
 * These define the conveyor mesh dimensions for the Digital Twin visualisation.
 * They are NOT engineering domain rules — those live in backend/src/utils/domainUtils.js.
 * Engineering constants like speed, load, and thresholds are NOT included here.
 */
export const BELT = {
  LENGTH:    60,  // WebGL scene half-length (m) — used by buildConveyorScene.js
  LENGTH_3D: 60,  // alias for clarity
  PULLEY_R:  1.2, // Head/tail pulley render radius (m)
};


/** Camera preset names (Digital Twin) */
export const CAMERA_PRESET = {
  ORBIT:          "Orbit",
  HEAD_DISCHARGE: "Head Discharge",
  TAIL_HOPPER:    "Tail Hopper",
  TOP_DOWN:       "Top-Down Synoptic",
  // NOTE: "Follow Splice" preset removed — joint/splice monitoring not yet implemented
};

/** Color CSS variable names (use via var(--color-*)) */
export const COLOR_VAR = {
  BACKGROUND: "var(--color-background)",
  SURFACE:    "var(--color-surface)",
  ELEVATED:   "var(--color-elevated)",
  BORDER:     "var(--color-border)",
  ACCENT:     "var(--color-accent)",
  TEXT_MAIN:  "var(--color-text-main)",
  TEXT_MUTED: "var(--color-text-muted)",
  HEALTHY:    "var(--color-healthy)",
  WARNING:    "var(--color-warning)",
  CRITICAL:   "var(--color-critical)",
};
