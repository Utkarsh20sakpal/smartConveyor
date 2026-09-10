/**
 * reportExporter.js  (frontend)
 *
 * Thin client — POSTs to the backend API and triggers a browser file download
 * from the streamed response. Zero report-generation logic lives here.
 *
 * Endpoint: POST /api/reports/generate
 */

const rawApiBase = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL ?? '';
const API_BASE = String(rawApiBase).replace(/\/+$/, '');

/**
 * Calls the backend to generate and download a report file.
 *
 * @param {Object} params
 * @param {string} params.reportId
 * @param {string} params.reportType
 * @param {string} params.format       'PDF' | 'CSV' | 'JSON'
 * @param {string} params.timeWindow
 * @param {Object} params.features     live sensor features from Redux / Firestore
 * @param {Array}  params.alerts       active alert records
 * @param {Array}  params.detections   vision detection records
 */
export async function exportReportFile({
  reportId    = 'RPT-001',
  reportType  = 'Conveyor Performance Report',
  format      = 'PDF',
  timeWindow  = 'Current Active Shift (8 Hours)',
  features    = {},
  alerts      = [],
  detections  = [],
}) {
  const ext = String(format).toLowerCase();
  const safeType = reportType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeType}_${reportId}.${ext}`;

  const query = new URLSearchParams({
    reportId,
    reportType,
    format: format.toUpperCase(),
    timeWindow,
    features: typeof features === 'string' ? features : JSON.stringify(features),
    incidents: typeof alerts === 'string' ? alerts : JSON.stringify(alerts),
    detections: typeof detections === 'string' ? detections : JSON.stringify(detections),
  });

  const downloadUrl = `${API_BASE}/api/reports/download/${encodeURIComponent(filename)}?${query.toString()}`;

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.setAttribute('download', filename);
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch (_) { /* ignore */ }
  }, 2000);
}



