import { useState, useEffect } from 'react'
import { formatCountdown } from '@/utils/formatTime'

interface CountdownResult {
  totalSeconds: number
  formatted: string
  isExpired: boolean
  isWarning: boolean
}

/**
 * useCountdown hook
 * - targetTime null → count up (elapsed time since checkInTime — use checkInTime as base)
 * - targetTime provided → count down to targetTime
 */
export function useCountdown(
  targetTime: string | null | undefined,
  checkInTime?: string | null
): CountdownResult {
  const [totalSeconds, setTotalSeconds] = useState(0)

  useEffect(() => {
    const calculate = () => {
      const now = Date.now()

      if (targetTime) {
        // Count down: seconds remaining until targetTime
        const target = new Date(targetTime).getTime()
        const diff = Math.floor((target - now) / 1000)
        setTotalSeconds(diff)
      } else if (checkInTime) {
        // Count up: seconds elapsed since checkInTime
        const start = new Date(checkInTime).getTime()
        const elapsed = Math.floor((now - start) / 1000)
        setTotalSeconds(elapsed)
      } else {
        setTotalSeconds(0)
      }
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetTime, checkInTime])

  const isExpired = targetTime ? totalSeconds <= 0 : false
  const isWarning = targetTime ? totalSeconds > 0 && totalSeconds <= 15 * 60 : false

  const formatted = targetTime
    ? formatCountdown(Math.max(0, totalSeconds))
    : formatCountdown(Math.max(0, totalSeconds))

  return { totalSeconds, formatted, isExpired, isWarning }
}
