import { cn } from '../../lib/utils'
import { STATUS } from '../../lib/constants'

const STATUS_CONFIG = {
  [STATUS.HEALTHY]:  { label: 'HEALTHY',  dot: 'var(--color-healthy)',  bg: 'rgba(0, 214, 143, 0.12)', border: 'rgba(0, 214, 143, 0.25)', text: 'var(--color-healthy)' },
  [STATUS.WARNING]:  { label: 'WARNING',  dot: 'var(--color-warning)',  bg: 'rgba(255, 176, 32, 0.12)', border: 'rgba(255, 176, 32, 0.25)', text: 'var(--color-warning)' },
  [STATUS.CRITICAL]: { label: 'CRITICAL', dot: 'var(--color-critical)', bg: 'rgba(255, 61, 87, 0.14)', border: 'rgba(255, 61, 87, 0.3)',  text: 'var(--color-critical)', pulse: true },
  [STATUS.UNKNOWN]:  { label: 'UNKNOWN',  dot: 'var(--color-text-dim)', bg: 'rgba(58, 88, 120, 0.1)',   border: 'rgba(58, 88, 120, 0.25)', text: 'var(--color-text-muted)' },
  [STATUS.OFFLINE]:  { label: 'OFFLINE',  dot: 'var(--color-text-dim)', bg: 'rgba(58, 88, 120, 0.1)',   border: 'rgba(58, 88, 120, 0.25)', text: 'var(--color-text-muted)' },
  'RUNNING':         { label: 'RUNNING',  dot: 'var(--color-healthy)',  bg: 'rgba(0, 214, 143, 0.12)', border: 'rgba(0, 214, 143, 0.25)', text: 'var(--color-healthy)' },
  'ONLINE':          { label: 'ONLINE',   dot: 'var(--color-healthy)',  bg: 'rgba(0, 214, 143, 0.12)', border: 'rgba(0, 214, 143, 0.25)', text: 'var(--color-healthy)' },
  'STOPPED':         { label: 'STOPPED',  dot: 'var(--color-critical)', bg: 'rgba(255, 61, 87, 0.14)', border: 'rgba(255, 61, 87, 0.3)',  text: 'var(--color-critical)' },
  'NORMAL':          { label: 'NORMAL',   dot: 'var(--color-healthy)',  bg: 'rgba(0, 214, 143, 0.12)', border: 'rgba(0, 214, 143, 0.25)', text: 'var(--color-healthy)' },
  'ACTIVE':          { label: 'ACTIVE',   dot: 'var(--color-critical)', bg: 'rgba(255, 61, 87, 0.14)', border: 'rgba(255, 61, 87, 0.3)',  text: 'var(--color-critical)', pulse: true },
  'ACKNOWLEDGED':    { label: "ACK'D",    dot: 'var(--color-warning)',  bg: 'rgba(255, 176, 32, 0.12)', border: 'rgba(255, 176, 32, 0.25)', text: 'var(--color-warning)' },
  'RESOLVED':        { label: 'RESOLVED', dot: 'var(--color-accent)',   bg: 'rgba(0, 195, 240, 0.1)',   border: 'rgba(0, 195, 240, 0.25)', text: 'var(--color-accent)' },
  'READY':           { label: 'READY',    dot: 'var(--color-healthy)',  bg: 'rgba(0, 214, 143, 0.12)', border: 'rgba(0, 214, 143, 0.25)', text: 'var(--color-healthy)' },
  'PENDING':         { label: 'PENDING',  dot: 'var(--color-warning)',  bg: 'rgba(255, 176, 32, 0.12)', border: 'rgba(255, 176, 32, 0.25)', text: 'var(--color-warning)' },
  'ARCHIVED':        { label: 'ARCHIVED', dot: 'var(--color-text-dim)', bg: 'rgba(58, 88, 120, 0.1)',   border: 'rgba(58, 88, 120, 0.25)', text: 'var(--color-text-muted)' },
}

export default function StatusBadge({ status, showDot = true, className }) {
  const cfg = STATUS_CONFIG[status] ?? { 
    label: status, 
    dot: 'var(--color-text-dim)', 
    bg: 'rgba(58, 88, 120, 0.12)', 
    border: 'rgba(58, 88, 120, 0.25)', 
    text: 'var(--color-text-muted)' 
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium tracking-wider",
        className
      )}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
      }}
    >
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.pulse ? "animate-pulse" : "")}
          style={{ 
            background: cfg.dot,
            boxShadow: `0 0 6px ${cfg.dot}`
          }}
        />
      )}
      {cfg.label}
    </span>
  )
}
