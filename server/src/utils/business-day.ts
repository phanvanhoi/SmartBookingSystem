/**
 * "Ngày kinh doanh" cho quán karaoke — bắt đầu giữa trưa hôm nay và kết
 * thúc rạng sáng hôm sau. Hai owner setting:
 *   - business_day_start_hour (mặc định 12)
 *   - business_day_end_hour   (mặc định 5)
 *
 * Mặc định: 12:00 → 05:00 hôm sau. Doanh thu của ca tối qua (vd 23h) và
 * ca rạng sáng (vd 02h) cùng được tính cho 1 ngày kinh doanh duy nhất.
 *
 * Khoảng thời gian giữa endHour và startHour (vd 05:00–11:59) là "gap" —
 * không có ca nào đang chạy. Dùng ngày kinh doanh vừa kết thúc làm fallback
 * (chủ quán xem doanh thu sáng hôm sau là việc thường gặp).
 */
import { prisma } from '../lib/prisma'

export interface BusinessDayWindow {
  from: Date
  to: Date
}

export interface BusinessHours {
  startHour: number
  endHour: number
}

async function readNumber(key: string, fallback: number): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } })
    if (!setting) return fallback
    const v = setting.value
    if (typeof v === 'number') return v
    if (typeof v === 'string') return parseInt(v, 10) || fallback
    if (typeof v === 'object' && v !== null && 'value' in v) {
      return Number((v as Record<string, unknown>).value) || fallback
    }
    return fallback
  } catch {
    return fallback
  }
}

export async function getBusinessHours(): Promise<BusinessHours> {
  const startHour = await readNumber('business_day_start_hour', 12)
  const endHour = await readNumber('business_day_end_hour', 5)
  // Defensive clamp
  return {
    startHour: Math.max(0, Math.min(23, startHour)),
    endHour: Math.max(0, Math.min(23, endHour)),
  }
}

/**
 * Trả về window [from, to) chứa moment đã cho theo định nghĩa ngày kinh
 * doanh. `to` là exclusive (last millisecond of the prev day if cross-midnight).
 *
 * Cases (with default 12 → 5):
 *  - moment = 14:00 ngày X → from = X 12:00, to = X+1 04:59:59.999
 *  - moment = 02:00 ngày X → from = X-1 12:00, to = X 04:59:59.999
 *  - moment = 08:00 ngày X (gap) → fallback business day vừa kết thúc:
 *    from = X-1 12:00, to = X 04:59:59.999
 */
export function businessDayContaining(
  moment: Date,
  hours: BusinessHours,
): BusinessDayWindow {
  const { startHour, endHour } = hours
  const h = moment.getHours()
  const sameDayWindow = startHour < endHour

  if (sameDayWindow) {
    // Vd 09:00 → 17:00: window = today startHour → today endHour
    const from = new Date(moment)
    from.setHours(startHour, 0, 0, 0)
    const to = new Date(moment)
    to.setHours(endHour, 0, 0, 0)
    to.setMilliseconds(-1)
    return { from, to }
  }

  // Cross-midnight: startHour > endHour (vd 12 → 5)
  if (h < endHour) {
    // Đang trong nửa sau của business day (sau midnight, trước endHour)
    const from = new Date(moment)
    from.setDate(from.getDate() - 1)
    from.setHours(startHour, 0, 0, 0)
    const to = new Date(moment)
    to.setHours(endHour, 0, 0, 0)
    to.setMilliseconds(-1)
    return { from, to }
  }
  if (h >= startHour) {
    // Đang trong nửa đầu của business day (sau startHour, trước midnight)
    const from = new Date(moment)
    from.setHours(startHour, 0, 0, 0)
    const to = new Date(moment)
    to.setDate(to.getDate() + 1)
    to.setHours(endHour, 0, 0, 0)
    to.setMilliseconds(-1)
    return { from, to }
  }
  // Gap (endHour ≤ h < startHour): dùng ngày vừa kết thúc làm fallback
  const from = new Date(moment)
  from.setDate(from.getDate() - 1)
  from.setHours(startHour, 0, 0, 0)
  const to = new Date(moment)
  to.setHours(endHour, 0, 0, 0)
  to.setMilliseconds(-1)
  return { from, to }
}

/**
 * Tiện lợi: business day cho moment + tự đọc setting.
 */
export async function getCurrentBusinessDay(moment: Date = new Date()): Promise<BusinessDayWindow> {
  const hours = await getBusinessHours()
  return businessDayContaining(moment, hours)
}

/**
 * Business day liền trước (1 ngày trước window hiện tại).
 */
export function previousBusinessDay(window: BusinessDayWindow): BusinessDayWindow {
  const from = new Date(window.from)
  from.setDate(from.getDate() - 1)
  const to = new Date(window.to)
  to.setDate(to.getDate() - 1)
  return { from, to }
}
