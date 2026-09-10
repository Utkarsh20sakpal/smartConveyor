export default function PageHeader({ title, subtitle, actions, children, statusBadge }) {
  return (
    <div className="mb-5 pb-3 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 
              className="text-lg font-bold tracking-tight" 
              style={{ color: 'var(--color-text-main)', fontFamily: 'Outfit, sans-serif' }}
            >
              {title}
            </h2>
            {statusBadge && <div>{statusBadge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        
        {(actions || children) && (
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {actions}
            {children}
          </div>
        )}
      </div>

      {/* Modern subtle accent line */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, rgba(0, 195, 240, 0.4) 0%, rgba(26, 48, 72, 0.6) 30%, transparent 100%)'
        }}
      />
    </div>
  )
}
