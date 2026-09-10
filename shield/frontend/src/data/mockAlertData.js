/**
 * mockAlertData.js
 * Frontend fallback data — used ONLY when the backend API is unreachable.
 * Shape matches the backend /api/alerts response exactly.
 * All business logic (counts, filtering, status classification) lives in the backend.
 *
 * NOTE: Joint/splice references removed — not in current scope (see theme.md §5.3)
 */

export const mockAlerts = [
  {
    id: 'ALT-001', timestamp: Date.now() - 2 * 60 * 1000,
    type: 'Surface Delamination', source: 'Vision (YOLOv8)',
    sensor: 'OPT-401', severity: 'CRITICAL', status: 'ACTIVE',
    title: 'Surface delamination detected at 840m. Immediate inspection required.',
  },
  {
    id: 'ALT-002', timestamp: Date.now() - 9 * 60 * 1000,
    type: 'High Vibration', source: 'Sensor (vib_rms)',
    sensor: 'VT-201', severity: 'WARNING', status: 'ACTIVE',
    title: 'Vibration RMS exceeded 4.0 mm/s threshold. Check bearing alignment.',
  },
  {
    id: 'ALT-003', timestamp: Date.now() - 51 * 60 * 1000,
    type: 'Temperature Spike', source: 'Sensor (temp_motor)',
    sensor: 'TT-102', severity: 'WARNING', status: 'ACKNOWLEDGED',
    title: 'Motor temperature reached 67.2 °C. Elevated above normal range.',
  },
  {
    id: 'ALT-004', timestamp: Date.now() - 100 * 60 * 1000,
    type: 'Sensor Offline', source: 'System',
    sensor: 'SYS', severity: 'CRITICAL', status: 'RESOLVED',
    title: 'Vision sensor offline for 3 minutes. Restored automatically.',
  },
  {
    id: 'ALT-005', timestamp: Date.now() - 180 * 60 * 1000,
    type: 'Belt Edge Wear', source: 'Vision (YOLOv8)',
    sensor: 'OPT-401', severity: 'WARNING', status: 'ACKNOWLEDGED',
    title: 'Belt edge fraying detected at 620m. Schedule inspection within 72 hours.',
  },
];
