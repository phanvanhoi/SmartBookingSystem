import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCountdown } from '@/hooks/useCountdown'

interface CountdownTimerProps {
  checkInTime: string
  estimatedEnd?: string
  className?: string
}

export default function CountdownTimer({
  checkInTime,
  estimatedEnd,
  className,
}: CountdownTimerProps) {
  const { formatted, isExpired, isWarning } = useCountdown(estimatedEnd, checkInTime)

  const isCountingDown = Boolean(estimatedEnd)
  const label = isCountingDown ? 'Còn lại' : 'Đã hát'

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className={cn(
          'flex items-center gap-1.5 transition-colors duration-300',
          isExpired && 'text-rose-600 animate-pulse',
          isWarning && !isExpired && 'text-amber-600',
          !isWarning && !isExpired && 'text-foreground'
        )}
      >
        <Clock className="w-4 h-4 opacity-70" />
        <span className="text-2xl font-bold font-mono tracking-wider tabular-nums">
          {formatted}
        </span>
      </div>
      <span
        className={cn(
          'text-xs mt-0.5 flex items-center gap-1',
          isExpired && 'text-rose-600',
          isWarning && !isExpired && 'text-amber-600',
          !isWarning && !isExpired && 'text-muted-foreground'
        )}
      >
        {label}
        {isWarning && !isExpired && <AlertTriangle className="w-3 h-3" />}
      </span>
    </div>
  )
}
