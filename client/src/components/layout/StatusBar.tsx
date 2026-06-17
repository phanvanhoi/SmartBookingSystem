import { formatCurrency } from '@/utils/formatCurrency'
import { useCurrentShift } from '@/hooks/useStaff'
import { useDashboard } from '@/hooks/useReports'

interface StatusBarProps {
  compact?: boolean
}

function formatShiftTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return '--:--'
  }
}

export default function StatusBar({ compact = false }: StatusBarProps) {
  const { data: shiftRes } = useCurrentShift()
  const { data: dashboard } = useDashboard()

  const shift = shiftRes?.data ?? null
  const revenue = dashboard?.today?.revenue ?? 0

  const shiftLabel = shift
    ? `Ca ${formatShiftTime(shift.startTime)}`
    : 'Chưa mở ca'

  if (compact) {
    return (
      <footer className="h-8 shrink-0 flex items-center justify-between gap-2 px-3 bg-muted/40 border-b border-border text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-emerald-700 font-medium">Online</span>
        </span>
        <span className="truncate text-center flex-1">{shiftLabel}</span>
        <span className="shrink-0 tabular-nums">
          <span className="text-foreground font-semibold">{formatCurrency(revenue, true)}</span>
        </span>
      </footer>
    )
  }

  return (
    <footer className="relative h-8 shrink-0 flex items-center px-4 bg-background border-t border-border text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-emerald-600 font-medium">Online</span>
      </span>

      <span className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
        {shift ? (
          <>
            Ca:{' '}
            <span className="text-foreground">
              {formatShiftTime(shift.startTime)} – {shift.openedByName}
            </span>
          </>
        ) : (
          <>
            Ca: <span className="text-foreground">Chưa mở ca</span>
          </>
        )}
      </span>

      <span className="ml-auto tabular-nums">
        Doanh thu hôm nay:{' '}
        <span className="text-foreground font-medium">{formatCurrency(revenue, true)}</span>
      </span>
    </footer>
  )
}
