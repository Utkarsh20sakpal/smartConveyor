import { useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { 
  FileText, Download, Search, Calendar, 
  CheckCircle2, HardDrive, Sparkles, Filter 
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import { mockReports, mockReportStats } from '../data/mockReportData'
import { REPORT_TYPE } from '../lib/constants'
import { exportReportFile } from '../lib/reportExporter'

export default function Reports() {
  const [reports, setReports] = useState(mockReports)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [newReportType, setNewReportType] = useState(REPORT_TYPE.CONVEYOR_PERFORMANCE)
  const [timeWindow, setTimeWindow] = useState('Current Active Shift (8 Hours)')
  const [format, setFormat] = useState('PDF')
  const [generating, setGenerating] = useState(false)

  // Grab active telemetry from Redux store if available
  const features = useSelector(state => state.sensor?.liveSnapshot?.features || state.sensor?.currentReading?.features || {})
  const alerts = useSelector(state => state.alert?.alerts || [])
  const detections = useSelector(state => state.detection?.detections || [])

  const handleGenerate = async (e) => {
    e.preventDefault()
    setGenerating(true)
    const newId = `RPT-00${reports.length + 1}`
    try {
      await exportReportFile({
        reportId: newId,
        reportType: newReportType,
        format,
        timeWindow,
        features,
        alerts,
        detections
      })
      const newReport = {
        id: newId,
        type: newReportType,
        format: format,
        date: new Date().toISOString().split('T')[0],
        status: 'READY',
        size: format === 'JSON' ? '~124 KB' : format === 'CSV' ? '~48 KB' : '~285 KB',
      }
      setReports([newReport, ...reports])
      toast.success(`${format} report downloaded: ${newId}.${format.toLowerCase()}`)
    } catch (err) {
      toast.error(`Export failed: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (report, customFormat = null) => {
    const chosenFormat = customFormat || report.format || format || 'PDF'
    try {
      await exportReportFile({
        reportId: report.id,
        reportType: report.type,
        format: chosenFormat,
        timeWindow: 'Historical Archive',
        features,
        alerts,
        detections
      })
      toast.success(`Downloaded ${report.id}.${chosenFormat.toLowerCase()}`)
    } catch (err) {
      toast.error(`Export failed: ${err.message}`)
    }
  }

  const filtered = reports.filter(r => {
    const typeOk = selectedType === 'ALL' || r.type.toLowerCase().includes(selectedType.toLowerCase())
    const srchOk = !search || r.type.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
    return typeOk && srchOk
  })

  return (
    <div className="space-y-7 pb-10 max-w-7xl mx-auto">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Automated shift telemetry aggregation, ISO compliance logs, and export compilation"
        statusBadge={
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-tech font-medium" 
            style={{ 
              background: 'rgba(56, 189, 248, 0.1)', 
              color: 'var(--color-accent)', 
              border: '1px solid var(--color-accent-border)' 
            }}
          >
            <Sparkles size={13} />
            <span>Shift Audit Active</span>
          </div>
        }
      />

      {/* Row 1: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { label: 'Archived Reports', value: mockReportStats.total + reports.length - mockReports.length, sub: 'All Line Units', icon: FileText, color: 'var(--color-text-main)' },
          { label: 'Shift Generated', value: mockReportStats.thisWeek, sub: 'Current Operations', icon: Calendar, color: 'var(--color-accent)' },
          { label: 'Audit Verification', value: '99.4%', sub: 'Zero Missing Samples', icon: CheckCircle2, color: 'var(--color-healthy)' },
          { label: 'Storage Used', value: '4.8 MB', sub: 'Indexed in Database', icon: HardDrive, color: 'var(--color-warning)' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div 
            key={label}
            className="p-5 rounded-2xl border flex items-center justify-between card-modern"
            style={{ 
              background: 'var(--color-surface)', 
              borderColor: 'var(--color-border)',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)' 
            }}
          >
            <div>
              <span className="text-xs font-tech font-medium text-muted block mb-1">{label}</span>
              <div className="text-2xl font-mono font-bold" style={{ color }}>{value}</div>
              <span className="text-[11px] text-muted mt-1 block">{sub}</span>
            </div>
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.03)', color }}
            >
              <Icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Balanced 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Report Archive Table (8 cols) */}
        <div 
          className="lg:col-span-8 rounded-2xl border flex flex-col justify-between overflow-hidden card-modern"
          style={{ 
            background: 'var(--color-surface)', 
            borderColor: 'var(--color-border)',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)' 
          }}
        >
          <div>
            <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div>
                <h4 className="text-sm font-display font-semibold text-main">Generated Report Index</h4>
                <p className="text-xs text-muted">Filter and download historical telemetry audit logs</p>
              </div>

              {/* Search */}
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 sm:max-w-xs"
                style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border)' }}
              >
                <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search report ID or type..."
                  className="bg-transparent text-xs font-tech outline-none w-full text-main placeholder:text-muted"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-5 py-2.5 border-b flex items-center gap-2 overflow-x-auto" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <span className="text-xs font-tech text-muted flex-shrink-0">Category:</span>
              {[
                { label: 'All Reports', type: 'ALL' },
                { label: 'Performance', type: 'Performance' },
                { label: 'Damage', type: 'Damage' },
                { label: 'Sensor Health', type: 'Health' },
                { label: 'Alert History', type: 'Alert' },
              ].map(cat => (
                <button
                  key={cat.type}
                  onClick={() => setSelectedType(cat.type)}
                  className="text-xs font-tech font-medium px-3 py-1 rounded-full border transition-all whitespace-nowrap cursor-pointer"
                  style={{
                    background: selectedType === cat.type ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    borderColor: selectedType === cat.type ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                    color: selectedType === cat.type ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

              {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider">ID</th>
                    <th className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider">Report Name</th>
                    <th className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider">Format</th>
                    <th className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider">Generated Date</th>
                    <th className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider">Status</th>
                    <th className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider">File Size</th>
                    <th className="px-5 py-3.5 font-tech font-semibold text-muted text-xs tracking-wider text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-muted font-tech">
                        No reports match the selected filters.
                      </td>
                    </tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-mono text-accent">{r.id}</td>
                      <td className="px-5 py-3.5 font-display font-semibold text-main">{r.type}</td>
                      <td className="px-5 py-3.5">
                        <span 
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
                          style={{
                            background: r.format === 'PDF' ? 'rgba(239, 68, 68, 0.12)' : r.format === 'CSV' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                            color: r.format === 'PDF' ? '#F87171' : r.format === 'CSV' ? '#4ADE80' : 'var(--color-accent)',
                            border: `1px solid ${r.format === 'PDF' ? 'rgba(239, 68, 68, 0.25)' : r.format === 'CSV' ? 'rgba(34, 197, 94, 0.25)' : 'var(--color-accent-border)'}`,
                          }}
                        >
                          {r.format || 'PDF'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-tech text-muted">{r.date}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted">{r.size}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDownload(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-tech font-medium border transition-all hover:bg-white/5 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-main)' }}
                          title={`Download as ${r.format || 'PDF'}`}
                        >
                          <Download size={12} />
                          <span>Export .{((r.format || 'PDF')).toLowerCase()}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Custom Report Generator (4 cols) */}
        <div 
          className="lg:col-span-4 p-6 rounded-2xl border flex flex-col justify-between card-modern"
          style={{ 
            background: 'var(--color-surface)', 
            borderColor: 'var(--color-border)',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)' 
          }}
        >
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <h4 className="text-sm font-display font-semibold text-main">Compile Shift Report</h4>
              <p className="text-xs text-muted">Generate certified telemetry audit documents</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-muted font-tech font-medium">Dataset Type</label>
              <select
                value={newReportType}
                onChange={e => setNewReportType(e.target.value)}
                className="w-full text-xs font-tech px-3 py-2 rounded-xl border outline-none bg-slate-900/60 text-main cursor-pointer"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value={REPORT_TYPE.CONVEYOR_PERFORMANCE}>Conveyor Performance</option>
                <option value={REPORT_TYPE.DAMAGE_DETECTION}>Damage Detection Log</option>
                <option value={REPORT_TYPE.SENSOR_HEALTH}>Sensor Health Summary</option>
                <option value={REPORT_TYPE.ALERT_HISTORY}>Alert History Audit</option>
              </select>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-muted font-tech font-medium">Time Window</label>
              <select
                value={timeWindow}
                onChange={e => setTimeWindow(e.target.value)}
                className="w-full text-xs font-tech px-3 py-2 rounded-xl border outline-none bg-slate-900/60 text-main cursor-pointer"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="Current Active Shift (8 Hours)">Current Active Shift (8 Hours)</option>
                <option value="Past 24 Hours Trailing">Past 24 Hours Trailing</option>
                <option value="Trailing 7 Days">Trailing 7 Days</option>
                <option value="Month to Date">Month to Date</option>
              </select>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-muted font-tech font-medium">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {['PDF', 'CSV', 'JSON'].map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className="py-1.5 text-xs font-tech rounded-xl border text-center transition-all font-medium cursor-pointer"
                    style={{
                      background: format === fmt ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: format === fmt ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                      color: format === fmt ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full mt-4 py-2.5 rounded-xl text-xs font-tech font-semibold transition-all shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #0284C7 100%)',
                color: '#080E1A',
              }}
            >
              {generating ? 'Compiling Report...' : 'Compile & Export'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
