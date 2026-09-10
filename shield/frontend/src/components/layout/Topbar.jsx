import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  Bell, Clock, ChevronRight, Sparkles 
} from 'lucide-react'
import { toggleAIAssistant } from '../../store/slices/uiSlice'
import { cn } from '../../lib/utils'

const PAGE_META = {
  '/home':              { title: 'Operations Overview',   section: 'Operations' },
  '/dashboard':         { title: 'Telemetry Command Deck', section: 'Live Telemetry' },
  '/digital-twin':      { title: '3D Kinematic Twin',    section: 'Simulation' },
  '/vision-monitoring': { title: 'Vision Inspection Feed',section: 'Optical AI' },
  '/sensor-health':     { title: 'Transducer Fleet',      section: 'Diagnostics' },
  '/alerts':            { title: 'Incident Alarm Queue',  section: 'Interlocks' },
  '/reports':           { title: 'Analytics & Audit',     section: 'Compliance' },
  '/settings':          { title: 'Station Configuration', section: 'Configuration' },
}

export default function Topbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { systemStatus, notificationCount } = useSelector(s => s.ui)
  const { alerts } = useSelector(s => s.alert)
  
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const currentMeta = PAGE_META[location.pathname] ?? { title: 'SmartConveyor', section: 'Portal' }
  const activeCriticalAlerts = (alerts || []).filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length

  return (
    <header
      className="flex items-center justify-between h-14 px-6 flex-shrink-0 z-20"
      style={{
        background: 'var(--color-topbar)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* ── Left: Breadcrumb & Conveyor Identity ── */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span 
            className="font-tech font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[10px]"
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent-border)',
            }}
          >
            {currentMeta.section}
          </span>
          <ChevronRight size={13} style={{ color: 'var(--color-text-dim)' }} />
          <h1 
            className="font-display text-sm font-semibold tracking-tight text-main"
          >
            {currentMeta.title}
          </h1>
        </div>

        {/* Separator */}
        <div className="hidden md:block h-4 w-px bg-white/[0.06]" />

        {/* Conveyor Unit Badge */}
        <div 
          className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl text-xs border border-white/[0.06] bg-white/[0.02]"
        >
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-healthy)', boxShadow: '0 0 6px var(--color-healthy)' }} />
          <span className="font-mono text-xs font-semibold text-main">
            CB-001
          </span>
          <span className="text-[11px] font-tech text-muted">
            Overland Line (1.2 km)
          </span>
        </div>
      </div>

      {/* ── Right Cluster: Live Clock, Status, Telemetry Pill, Alerts & AI ── */}
      <div className="flex items-center gap-3">
        {/* Real-time Clock */}
        <div 
          className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono border border-white/[0.06] bg-white/[0.02] text-muted"
        >
          <Clock size={13} style={{ color: 'var(--color-accent)' }} />
          <span className="text-main font-semibold">{timeStr || '00:00:00'}</span>
        </div>

        {/* System Online Badge */}
        <div 
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-tech"
          style={{
            background: systemStatus === 'ONLINE' ? 'var(--color-healthy-dim)' : 'var(--color-critical-dim)',
            border: `1px solid ${systemStatus === 'ONLINE' ? 'var(--color-healthy-border)' : 'var(--color-critical-border)'}`,
            color: systemStatus === 'ONLINE' ? 'var(--color-healthy)' : 'var(--color-critical)',
          }}
        >
          <span 
            className={cn("w-1.5 h-1.5 rounded-full", systemStatus === 'ONLINE' ? "animate-pulse" : "")} 
            style={{ background: systemStatus === 'ONLINE' ? 'var(--color-healthy)' : 'var(--color-critical)' }} 
          />
          <span className="font-semibold text-[11px] tracking-wider">{systemStatus}</span>
        </div>

        {/* Notification / Alert Button */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-xl transition-all duration-150 flex items-center justify-center border"
          style={{
            background: activeCriticalAlerts > 0 ? 'var(--color-critical-dim)' : 'rgba(255, 255, 255, 0.02)',
            borderColor: activeCriticalAlerts > 0 ? 'var(--color-critical-border)' : 'var(--color-border)',
            color: activeCriticalAlerts > 0 ? 'var(--color-critical)' : 'var(--color-text-muted)',
          }}
          aria-label={`${notificationCount} notifications`}
          id="topbar-notifications"
          title="Active Alerts"
        >
          <Bell size={15} />
          {activeCriticalAlerts > 0 ? (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center animate-bounce"
              style={{ background: 'var(--color-critical)', color: '#fff' }}
            >
              {activeCriticalAlerts}
            </span>
          ) : notificationCount > 0 ? (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-mono font-semibold flex items-center justify-center"
              style={{ background: 'var(--color-warning)', color: '#000' }}
            >
              {notificationCount}
            </span>
          ) : null}
        </button>

        {/* AI Assistant Button */}
        <button
          id="topbar-ai-assistant"
          onClick={() => dispatch(toggleAIAssistant())}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-tech font-semibold transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.2) 100%)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent-border)',
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.12)',
          }}
          aria-label="Open AI Assistant"
        >
          <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
          <span>AI Assistant</span>
        </button>
      </div>
    </header>
  )
}
