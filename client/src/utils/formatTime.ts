import { format, formatDistanceToNow, differenceInMinutes, differenceInHours } from 'date-fns'
import { vi } from 'date-fns/locale'

/**
 * Format thời gian HH:mm
 */
export function formatTime(date: Date | string): string {
  return format(new Date(date), 'HH:mm')
}

/**
 * Format ngày dd/MM/yyyy
 */
export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy')
}

/**
 * Format đầy đủ dd/MM/yyyy HH:mm
 */
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm')
}

/**
 * Format "X phút trước", "2 giờ trước"
 */
export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi })
}

/**
 * Format thời lượng từ phút → "2h 30p"
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes}p`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}p`
}

/**
 * Format countdown từ số giây → "01:23:45"
 */
export function formatCountdown(totalSeconds: number): string {
  const isNegative = totalSeconds < 0
  const abs = Math.abs(totalSeconds)
  const hours = Math.floor(abs / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const seconds = abs % 60
  const time = [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':')
  return isNegative ? `-${time}` : time
}

/**
 * Tính số phút giữa 2 thời điểm
 */
export function minutesBetween(start: Date | string, end: Date | string): number {
  return differenceInMinutes(new Date(end), new Date(start))
}

/**
 * Tính số giờ (thập phân) giữa 2 thời điểm
 */
export function hoursBetween(start: Date | string, end: Date | string): number {
  return differenceInMinutes(new Date(end), new Date(start)) / 60
}
