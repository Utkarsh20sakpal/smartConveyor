import { NavLink, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  LayoutDashboard, Box, Camera, Activity,
  Bell, FileText, Settings, ChevronLeft, ChevronRight,
  Home, User, Shield, Radio
} from 'lucide-react'
import { toggleSidebar } from '../../store/slices/uiSlice'

const NAV_ITEMS = [
  { to: '/home',              icon: Home,            label: 'Operations'        },
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard'         },
  { to: '/digital-twin',      icon: Box,             label: 'Digital Twin'      },
  { to: '/vision-monitoring', icon: Camera,          label: 'Vision Inspection' },
  { to: '/sensor-health',     icon: Activity,        label: 'Sensor Fleet'      },
  { to: '/alerts',            icon: Bell,            label: 'Incident Log'      },
  { to: '/reports',           icon: FileText,        label: 'Audit Reports'     },
  { to: '/settings',          icon: Settings,        label: 'Station Settings'  },
]

export default function Sidebar() {
  const dispatch = useDispatch()
  const { sidebarCollapsed, systemStatus } = useSelector(s => s.ui)
  const { alerts } = useSelector(s => s.alert)
  const location = useLocation()

  const activeAlerts = (alerts || []).filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length

  const W = sidebarCollapsed ? '68px' : '240px'

  return (
    <aside
      style={{
        width: W,
        minWidth: W,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border)',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ── Brand / Logo ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: sidebarCollapsed ? '18px 0' : '18px 20px',
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--color-border)',
        minHeight: '66px',
      }}>
        {/* Logo mark */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '11px',
          background: 'linear-gradient(135deg, #38BDF8 0%, #6366F1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.25)',
        }}>
          <Shield size={19} color="#0C1019" strokeWidth={2.5} />
        </div>

        {!sidebarCollapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="font-display font-bold text-sm tracking-tight text-main leading-tight whitespace-nowrap">
              SmartConveyor
            </div>
            <div className="font-tech text-[11px] font-medium text-sky-400/90 tracking-wide uppercase whitespace-nowrap">
              Shield Intelligence
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
          style={{
            marginLeft: sidebarCollapsed ? 0 : 'auto',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '7px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--color-text-main)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
            e.currentTarget.style.color = 'var(--color-text-muted)'
          }}
        >
          {sidebarCollapsed
            ? <ChevronRight size={13} />
            : <ChevronLeft size={13} />
          }
        </button>
      </div>

      {/* ── Nav section label ── */}
      {!sidebarCollapsed && (
        <div className="px-5 pt-5 pb-2 font-tech text-[10px] font-semibold tracking-wider uppercase text-muted">
          Navigation Deck
        </div>
      )}

      {/* ── Navigation items ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: sidebarCollapsed ? '10px 0' : '4px 12px 10px' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to ||
            (to === '/home' && (location.pathname === '/' || location.pathname === ''))
          const showBadge = to === '/alerts' && activeAlerts > 0

          return (
            <NavLink
              key={to}
              to={to}
              title={sidebarCollapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: sidebarCollapsed ? '11px 0' : '10px 14px',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                margin: sidebarCollapsed ? '2px 8px' : '2px 0',
                borderRadius: '12px',
                textDecoration: 'none',
                position: 'relative',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)' 
                  : 'transparent',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--color-hover)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Icon */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon
                  size={17}
                  style={{ 
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)', 
                    flexShrink: 0,
                    transition: 'color 0.15s ease'
                  }}
                />
                {/* Alert badge on icon when collapsed */}
                {sidebarCollapsed && showBadge && (
                  <span style={{
                    position: 'absolute', top: '-3px', right: '-4px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--color-critical)',
                    border: '1.5px solid var(--color-sidebar)',
                  }} />
                )}
              </div>

              {/* Label */}
              {!sidebarCollapsed && (
                <span className={`font-tech text-xs tracking-tight ${
                  isActive ? 'font-semibold text-main' : 'font-normal text-muted'
                }`}>
                  {label}
                </span>
              )}

              {/* Active indicator dot (expanded) */}
              {!sidebarCollapsed && isActive && (
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: 'var(--color-accent)',
                  boxShadow: '0 0 8px var(--color-accent)',
                  flexShrink: 0,
                  marginLeft: 'auto',
                }} />
              )}

              {/* Alerts badge (expanded) */}
              {!sidebarCollapsed && showBadge && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'var(--color-critical)',
                  color: '#fff',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: 'auto',
                }}>
                  {activeAlerts}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ── Bottom Section: Health & Operator Profile ── */}
      <div style={{ 
        borderTop: '1px solid var(--color-border)', 
        padding: sidebarCollapsed ? '12px 6px' : '14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* System status pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: sidebarCollapsed ? '6px 0' : '7px 12px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border-subtle)',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}>
          <div
            className={systemStatus === 'ONLINE' ? 'animate-status-pulse' : ''}
            style={{
              width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
              background: systemStatus === 'ONLINE' ? 'var(--color-healthy)' : 'var(--color-critical)',
              boxShadow: systemStatus === 'ONLINE' ? '0 0 8px var(--color-healthy)' : '0 0 8px var(--color-critical)',
            }}
          />
          {!sidebarCollapsed && (
            <span className="font-tech text-[11px] font-medium tracking-wide text-emerald-400">
              PLC TELEMETRY {systemStatus}
            </span>
          )}
        </div>

        {/* User Profile Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: sidebarCollapsed ? '6px 0' : '6px 12px',
          borderRadius: '10px',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={15} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          {!sidebarCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div className="font-display text-xs font-semibold text-main truncate">
                Operations Lead
              </div>
              <div className="font-tech text-[10px] text-muted truncate">
                Shift Operator
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
