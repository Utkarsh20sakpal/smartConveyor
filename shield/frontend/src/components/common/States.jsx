export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
    </div>
  )
}

export function EmptyState({ title = 'No data', message = 'No data available.', icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      {icon && <div style={{ color: 'var(--color-data-neutral)' }}>{icon}</div>}
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
      <p className="text-xs" style={{ color: 'var(--color-data-neutral)' }}>{message}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-sm font-medium" style={{ color: 'var(--color-critical)' }}>Error</p>
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded border transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
