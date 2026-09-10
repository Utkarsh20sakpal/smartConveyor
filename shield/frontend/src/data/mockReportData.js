/**
 * mockReportData.js
 * Mock report list data.
 */
export const mockReports = [
  { id: "RPT-001", type: "Conveyor Performance Report",  format: "PDF",  date: "2026-09-08", status: "READY",   size: "248 KB" },
  { id: "RPT-002", type: "Damage Detection Report",      format: "PDF",  date: "2026-09-07", status: "READY",   size: "312 KB" },
  { id: "RPT-003", type: "Sensor Health Report",         format: "CSV",  date: "2026-09-07", status: "READY",   size: "189 KB" },
  { id: "RPT-004", type: "Alert History Report",         format: "PDF",  date: "2026-09-06", status: "READY",   size: "421 KB" },
  { id: "RPT-005", type: "Maintenance Report",           format: "JSON", date: "2026-09-05", status: "READY",   size: "156 KB" },
  { id: "RPT-006", type: "Conveyor Performance Report",  format: "PDF",  date: "2026-09-01", status: "ARCHIVED",size: "235 KB" },
];

export const mockReportStats = {
  total:     6,
  thisWeek:  5,
  generated: 4,
  pending:   1,
};
