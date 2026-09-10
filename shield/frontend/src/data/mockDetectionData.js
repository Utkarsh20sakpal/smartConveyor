/**
 * mockDetectionData.js
 * Mock detection data — same shape as Firestore §4.2 snapshot + backend YOLOv8 response.
 */

/** Firestore snapshot doc shape (§4.2) */
export const mockSnapshot = {
  device_id:    "CB_001",
  image_base64: "", // Empty — Vision viewer shows placeholder when no real image
  resolution:   "QVGA",
  timestamp:    Date.now(),
};

// TODO: joints out of scope for now, see theme.md §5.3 — location fields replaced with belt position references
/** YOLOv8 detection result shape (from backend yolov8Service) */
export const mockDetection = {
  id:         "DET-001",
  timestamp:  Date.now() - 2 * 60 * 1000,
  class:      "Surface Delamination",
  confidence: 0.94,
  severity:   "CRITICAL",
  bbox:       { x: 120, y: 80, width: 80, height: 60 }, // px on QVGA 320×240
  location:   "840 m (CB-001)",
  status:     "ACTIVE",
};

export const mockDetectionHistory = [
  { id: "DET-001", timestamp: Date.now() - 2 * 60 * 1000,   class: "Surface Delamination", confidence: 0.94, severity: "CRITICAL", location: "840 m (CB-001)", status: "ACTIVE" },
  { id: "DET-002", timestamp: Date.now() - 15 * 60 * 1000,  class: "Surface Wear",          confidence: 0.87, severity: "WARNING",  location: "620 m (CB-001)", status: "ACKNOWLEDGED" },
  { id: "DET-003", timestamp: Date.now() - 35 * 60 * 1000,  class: "Edge Fraying",          confidence: 0.78, severity: "WARNING",  location: "Belt Edge",      status: "RESOLVED" },
  { id: "DET-004", timestamp: Date.now() - 120 * 60 * 1000, class: "Rubber Cracking",       confidence: 0.82, severity: "WARNING",  location: "390 m (CB-001)", status: "RESOLVED" },
];

export const mockDetections = mockDetectionHistory;

