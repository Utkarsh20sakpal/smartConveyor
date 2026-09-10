import { useState } from 'react'
import { toast } from 'sonner'
import { 
  Sliders, Settings as SettingsIcon, Cpu, Bell, 
  Server, Save, RotateCcw, Check, Radio, 
  Database, ShieldCheck 
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'

const TABS = [
  { id: 'General',       label: 'General & Plant',      icon: SettingsIcon },
  { id: 'Conveyor',      label: 'Conveyor Machinery',   icon: Sliders },
  { id: 'Sensors',       label: 'Transducers & Limits', icon: Cpu },
  { id: 'Notifications', label: 'Incident Dispatch',    icon: Bell },
  { id: 'System',        label: 'Gateway & Cloud',      icon: Server },
]

function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
      style={{ 
        background: checked ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <span 
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-slate-950 shadow-md transition-transform duration-200 flex items-center justify-center text-[10px]"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      >
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
      </span>
    </button>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('General')
  const [settings, setSettings] = useState({
    appName:          'SmartConveyor Monitoring',
    plantName:        'Kiriburu Overland Ore Complex',
    deviceId:         'CB-001',
    beltSpeed:        '2.40',
    speedMin:         '0.50',
    speedMax:         '4.50',
    conveyorLength:   '1200',
    oreTonnageHourly: '1850',
    tempWarning:      '32',
    tempCritical:     '40',
    vibWarning:       '4.0',
    vibCritical:      '6.0',
    criticalAlerts:   true,
    warningAlerts:    true,
    audibleAlarm:     true,
    emailNotify:      true,
    smsNotify:        false,
    mqttBroker:       'mqtt://gateway.internal:1883',
    firestoreSync:    true,
    retrainInterval:  '20',
  })

  const update = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  const handleSave = () => {
    toast.success('Configuration saved and applied to telemetry pipeline')
  }

  const handleReset = () => {
    toast.info('Reverted parameters to standard baseline')
  }

  return (
    <div className="space-y-7 pb-10 max-w-7xl mx-auto">
      <PageHeader
        title="Station Settings"
        subtitle="Operational envelope parameters, alarm trip set-points, and telemetry endpoints"
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-tech border font-medium transition-colors hover:bg-white/5 cursor-pointer"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-tech font-semibold transition-all shadow-md hover:opacity-90 cursor-pointer"
              style={{ 
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #0284C7 100%)', 
                color: '#080E1A',
              }}
            >
              <Save size={14} />
              <span>Apply Configuration</span>
            </button>
          </div>
        }
      />

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Nav Tabs (3 cols) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="text-xs font-tech font-semibold text-muted px-2 mb-2 uppercase tracking-wider">
            Categories
          </div>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all text-xs font-tech font-medium cursor-pointer"
              style={{
                background: activeTab === id ? 'rgba(56, 189, 248, 0.1)' : 'var(--color-surface)',
                borderColor: activeTab === id ? 'var(--color-accent)' : 'var(--color-border)',
                color: activeTab === id ? 'var(--color-accent)' : 'var(--color-text-muted)'
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}

          {/* Connected Gateway Card */}
          <div 
            className="p-4 rounded-xl border mt-6 space-y-3 card-modern"
            style={{ 
              background: 'var(--color-surface)', 
              borderColor: 'var(--color-border)',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-2">
              <Server size={14} className="text-accent" />
              <span className="text-xs font-display font-semibold text-main">Connected Edge Gateway</span>
            </div>
            <div className="space-y-1.5 text-xs font-tech">
              <div className="flex justify-between text-muted">
                <span>Status:</span>
                <span className="text-healthy font-medium">Operational</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Protocol:</span>
                <span className="text-main font-mono">MQTT Telemetry</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Latency:</span>
                <span className="text-accent font-mono">14 ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Settings Form (9 cols) */}
        <div 
          className="lg:col-span-9 p-7 rounded-2xl border space-y-6 card-modern"
          style={{ 
            background: 'var(--color-surface)', 
            borderColor: 'var(--color-border)',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)' 
          }}
        >
          {activeTab === 'General' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-display font-semibold text-main">General Plant & Station Details</h4>
                <p className="text-xs text-muted">Naming and operational facility identification</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">System Title</label>
                  <input
                    value={settings.appName}
                    onChange={e => update('appName', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none bg-slate-900/60 text-main"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Mining Facility</label>
                  <input
                    value={settings.plantName}
                    onChange={e => update('plantName', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none bg-slate-900/60 text-main"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Operator Shift</label>
                  <input
                    defaultValue="Shift B (14:00 to 22:00)"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none bg-slate-900/60 text-main"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Measurement System</label>
                  <select
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none bg-slate-900/60 text-main cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option>Metric (m/s, °C, mm/s, TPH)</option>
                    <option>Imperial (ft/min, °F, in/s)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Conveyor' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-display font-semibold text-main">Conveyor Drive Specifications</h4>
                <p className="text-xs text-muted">Operating envelope for line CB-001</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-tech font-medium text-muted">Machine ID</label>
                  <input
                    value={settings.deviceId}
                    readOnly
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none font-mono opacity-70 cursor-not-allowed bg-slate-900/30 text-muted"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-tech font-medium text-muted">Nominal Speed (m/s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.beltSpeed}
                    onChange={e => update('beltSpeed', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none font-mono bg-slate-900/60 text-main"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-tech font-medium text-muted">Total Belt Length (m)</label>
                  <input
                    type="number"
                    value={settings.conveyorLength}
                    onChange={e => update('conveyorLength', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none font-mono bg-slate-900/60 text-main"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-tech font-medium text-muted">Rated Ore Capacity (TPH)</label>
                <input
                  type="number"
                  value={settings.oreTonnageHourly}
                  onChange={e => update('oreTonnageHourly', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none font-mono bg-slate-900/60 text-main max-w-sm"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'Sensors' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-display font-semibold text-main">Transducer Alert Thresholds</h4>
                <p className="text-xs text-muted">Trip set-points for automated anomaly generation</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border space-y-3" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border-subtle)' }}>
                  <div className="text-xs font-display font-semibold text-main">Belt Surface Temperature Limits (°C)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-tech text-muted">Warning</span>
                      <input
                        type="number"
                        value={settings.tempWarning}
                        onChange={e => update('tempWarning', e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border font-mono mt-1 bg-slate-900/60 text-warning"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-tech text-muted">Critical</span>
                      <input
                        type="number"
                        value={settings.tempCritical}
                        onChange={e => update('tempCritical', e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border font-mono mt-1 bg-slate-900/60 text-critical"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border space-y-3" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border-subtle)' }}>
                  <div className="text-xs font-display font-semibold text-main">Vibration Velocity Limits (mm/s RMS)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-tech text-muted">Warning</span>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.vibWarning}
                        onChange={e => update('vibWarning', e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border font-mono mt-1 bg-slate-900/60 text-warning"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-tech text-muted">Critical</span>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.vibCritical}
                        onChange={e => update('vibCritical', e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border font-mono mt-1 bg-slate-900/60 text-critical"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-display font-semibold text-main">Incident Dispatch & Notifications</h4>
                <p className="text-xs text-muted">Configure audible alerts and operator notifications</p>
              </div>

              {[
                { key: 'criticalAlerts', title: 'Critical Incident Siren & Beacon', desc: 'Triggers visual beacon when a critical fault is logged' },
                { key: 'warningAlerts',  title: 'Telemetry Degradation Warnings', desc: 'Logs notification when sensors exceed warning envelope' },
                { key: 'audibleAlarm',   title: 'Audio Chime on Anomaly', desc: 'Plays chime pulse on new high-priority alert' },
                { key: 'emailNotify',    title: 'Daily Shift Digest Email', desc: 'Sends summary to maintenance superintendents at shift end' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border-subtle)' }}>
                  <div>
                    <div className="text-xs font-display font-semibold text-main">{item.title}</div>
                    <div className="text-xs text-muted mt-0.5">{item.desc}</div>
                  </div>
                  <Toggle 
                    checked={settings[item.key]} 
                    onChange={v => update(item.key, v)} 
                    id={`toggle-${item.key}`} 
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'System' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-display font-semibold text-main">Gateway & Cloud Synchronization</h4>
                <p className="text-xs text-muted">Endpoints and cloud data replication</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-tech font-medium text-muted">MQTT Telemetry Broker URI</label>
                <input
                  value={settings.mqttBroker}
                  onChange={e => update('mqttBroker', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none font-mono bg-slate-900/60 text-accent"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>

              <div className="p-4 rounded-xl border space-y-2" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-display font-semibold text-main">Cloud Telemetry Sync</div>
                    <div className="text-xs text-muted">Replicate telemetry stream to cloud database</div>
                  </div>
                  <Toggle 
                    checked={settings.firestoreSync} 
                    onChange={v => update('firestoreSync', v)} 
                    id="toggle-firestore" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
