import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes — standard shadcn/ui utility */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format a number to fixed decimal places, with tabular display */
export function fmt(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

/** Format temperature */
export function fmtTemp(value) {
  return `${fmt(value, 1)} °C`;
}

/** Format vibration (RMS) */
export function fmtVib(value) {
  return `${fmt(value, 2)} mm/s`;
}

/** Format current */
export function fmtCurrent(value) {
  return `${fmt(value, 3)} A`;
}

/** Format percentage */
export function fmtPct(value) {
  return `${fmt(value, 1)}%`;
}

/** Format RUL in hours */
export function fmtRUL(hours) {
  if (hours === null || hours === undefined) return "— HRS";
  return `${Math.round(hours)} HRS`;
}

/**
 * Defensive timestamp normalization.
 * Handles: 0, Unix seconds, Unix milliseconds, Firestore Timestamp object.
 * Returns a JS Date or null if input is clearly invalid (0 or missing).
 * Per §4.2: "confirm whether this will be a Unix epoch (seconds or ms) or a
 *   Firestore Timestamp — handle both defensively."
 */
export function parseTimestamp(ts) {
  if (!ts || ts === 0) return null;
  // Firestore Timestamp object
  if (ts && typeof ts.toDate === "function") return ts.toDate();
  // Unix milliseconds (> year 2001 in ms = > 1_000_000_000_000)
  if (typeof ts === "number" && ts > 1_000_000_000_000) return new Date(ts);
  // Unix seconds
  if (typeof ts === "number") return new Date(ts * 1000);
  return null;
}

/** Format a Date for display in the UI */
export function fmtTime(date) {
  if (!date) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtDateTime(date) {
  if (!date) return "—";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
}

/**
 * healthToStatus / anomalyToStatus intentionally removed from frontend.
 * Status classification is a backend domain rule (see backend/src/utils/domainUtils.js).
 * The API response already includes pre-computed `status` and `channelStatuses` fields.
 * Frontend reads those fields directly — never re-derives status from raw numbers.
 */
