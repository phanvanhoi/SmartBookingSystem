import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { cn } from '@/utils/cn'

/**
 * Thin animated bar pinned to the top of the viewport. Visible whenever
 * any react-query is fetching or any mutation is in flight. Replaces the
 * heavier "swap content with skeleton on every refresh" anti-pattern with
 * a non-disruptive cue, so existing data stays on screen during refetch.
 */
export default function GlobalFetchIndicator() {
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const active = fetching > 0 || mutating > 0

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden pointer-events-none',
        active ? 'opacity-100' : 'opacity-0 transition-opacity duration-300',
      )}
    >
      <div
        className={cn(
          'h-full bg-gradient-to-r from-primary/40 via-primary to-primary/40',
          active && 'animate-pulse',
        )}
        style={{
          width: '100%',
          backgroundSize: '200% 100%',
          animation: active ? 'fetchBar 1.4s ease-in-out infinite' : undefined,
        }}
      />
      <style>{`
        @keyframes fetchBar {
          0%   { background-position: 100% 50%; }
          100% { background-position: -100% 50%; }
        }
      `}</style>
    </div>
  )
}
