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
      <span
        className={cn(
          'text-2xl font-bold font-mono tracking-widest transition-colors duration-300',
          isExpired && 'text-[#ef4444] animate-pulse',
          isWarning && !isExpired && 'text-[#f59e0b]',
          !isWarning && !isExpired && 'text-foreground'
        )}
      >
        ⏱ {formatted}
      </span>
      <span
        className={cn(
          'text-xs mt-0.5',
          isExpired && 'text-[#ef4444]',
          isWarning && !isExpired && 'text-[#f59e0b]',
          !isWarning && !isExpired && 'text-muted-foreground'
        )}
      >
        {label}
        {isWarning && !isExpired && ' ⚠️'}
      </span>
    </div>
  )
}
