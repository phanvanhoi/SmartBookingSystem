import { prisma } from '../../lib/prisma'
import {
  getCurrentBusinessDay,
  previousBusinessDay,
  type BusinessDayWindow,
} from '../../utils/business-day'
import type { RevenueQueryInput, DateRangeQueryInput } from './report.validation'

// ────────────────────────────────────────────────────────────────────────────
// PURE JS DATE HELPERS (no external dependencies)
// ────────────────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  // Monday = 1, so offset: day===0 → 6, else day-1
  const diff = day === 0 ? 6 : day - 1
  r.setDate(r.getDate() - diff)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfWeek(d: Date): Date {
  const r = startOfWeek(d)
  r.setDate(r.getDate() + 6)
  r.setHours(23, 59, 59, 999)
  return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
}

function subDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - n)
  return r
}

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatYM(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Iterate every day between start and end (inclusive) */
function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const finish = endOfDay(end)
  while (cur <= finish) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

/** Iterate every Monday between start and end */
function eachMonday(start: Date, end: Date): Date[] {
  const mondays: Date[] = []
  const cur = startOfWeek(start)
  const finish = new Date(end)
  while (cur <= finish) {
    mondays.push(new Date(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return mondays
}

/** Iterate every month start between start and end */
function eachMonthStart(start: Date, end: Date): Date[] {
  const months: Date[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= end) {
    months.push(new Date(cur))
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

// ────────────────────────────────────────────────────────────────────────────
// COMMON HELPERS
// ────────────────────────────────────────────────────────────────────────────

interface DateRange {
  from: Date
  to: Date
}

async function getDateRange(filters: { period?: string; dateFrom?: string; dateTo?: string }): Promise<DateRange> {
  const now = new Date()
  switch (filters.period) {
    case 'today': {
      // Business day, not calendar day — covers 12:00 → 05:00 next day so
      // ca tối + ca rạng sáng đếm chung.
      const window = await getCurrentBusinessDay(now)
      return { from: window.from, to: window.to }
    }
    case 'week':
      return { from: startOfWeek(now), to: endOfWeek(now) }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) }
    case 'custom':
      return {
        from: filters.dateFrom ? startOfDay(new Date(filters.dateFrom)) : startOfWeek(now),
        to: filters.dateTo ? endOfDay(new Date(filters.dateTo)) : endOfDay(now),
      }
    default:
      // Default: last 7 days
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
  }
}

function getPreviousRange(current: DateRange): DateRange {
  const duration = current.to.getTime() - current.from.getTime()
  return {
    from: new Date(current.from.getTime() - duration - 1),
    to: new Date(current.from.getTime() - 1),
  }
}

function toNumber(decimal: unknown): number {
  if (decimal === null || decimal === undefined) return 0
  return Number(decimal)
}

// ────────────────────────────────────────────────────────────────────────────
// REVENUE REPORT
// ────────────────────────────────────────────────────────────────────────────

export async function getRevenueReport(filters: RevenueQueryInput) {
  const range = await getDateRange(filters)
  const prevRange = getPreviousRange(range)
  const groupBy = filters.groupBy ?? 'day'

  // Current period invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['PAID', 'PARTIAL'] },
      createdAt: { gte: range.from, lte: range.to },
    },
    select: {
      grandTotal: true,
      roomCharge: true,
      orderTotal: true,
      createdAt: true,
    },
  })

  // Previous period invoices for comparison
  const prevInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['PAID', 'PARTIAL'] },
      createdAt: { gte: prevRange.from, lte: prevRange.to },
    },
    select: { grandTotal: true },
  })

  const totalRevenue = invoices.reduce((sum, inv) => sum + toNumber(inv.grandTotal), 0)
  const roomRevenue = invoices.reduce((sum, inv) => sum + toNumber(inv.roomCharge), 0)
  const orderRevenue = invoices.reduce((sum, inv) => sum + toNumber(inv.orderTotal), 0)
  const totalSessions = invoices.length
  const avgRevenuePerSession = totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0

  const previousPeriodRevenue = prevInvoices.reduce((sum, inv) => sum + toNumber(inv.grandTotal), 0)
  const changePercent =
    previousPeriodRevenue > 0
      ? Math.round(((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 1000) / 10
      : 0

  // Build chart data
  let chartData: Array<{ date: string; revenue: number; roomRevenue: number; orderRevenue: number }> = []

  if (groupBy === 'day') {
    const days = eachDay(range.from, range.to)
    chartData = days.map((day) => {
      const dayStr = formatYMD(day)
      const dayInvoices = invoices.filter(
        (inv) => formatYMD(inv.createdAt) === dayStr
      )
      return {
        date: dayStr,
        revenue: dayInvoices.reduce((s, i) => s + toNumber(i.grandTotal), 0),
        roomRevenue: dayInvoices.reduce((s, i) => s + toNumber(i.roomCharge), 0),
        orderRevenue: dayInvoices.reduce((s, i) => s + toNumber(i.orderTotal), 0),
      }
    })
  } else if (groupBy === 'week') {
    const mondays = eachMonday(range.from, range.to)
    chartData = mondays.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart)
      const weekInvoices = invoices.filter(
        (inv) => inv.createdAt >= weekStart && inv.createdAt <= weekEnd
      )
      return {
        date: formatYMD(weekStart),
        revenue: weekInvoices.reduce((s, i) => s + toNumber(i.grandTotal), 0),
        roomRevenue: weekInvoices.reduce((s, i) => s + toNumber(i.roomCharge), 0),
        orderRevenue: weekInvoices.reduce((s, i) => s + toNumber(i.orderTotal), 0),
      }
    })
  } else {
    // month
    const monthStarts = eachMonthStart(range.from, range.to)
    chartData = monthStarts.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart)
      const monthInvoices = invoices.filter(
        (inv) => inv.createdAt >= monthStart && inv.createdAt <= monthEnd
      )
      return {
        date: formatYM(monthStart),
        revenue: monthInvoices.reduce((s, i) => s + toNumber(i.grandTotal), 0),
        roomRevenue: monthInvoices.reduce((s, i) => s + toNumber(i.roomCharge), 0),
        orderRevenue: monthInvoices.reduce((s, i) => s + toNumber(i.orderTotal), 0),
      }
    })
  }

  return {
    summary: {
      totalRevenue,
      roomRevenue,
      orderRevenue,
      totalSessions,
      avgRevenuePerSession,
      comparison: {
        previousPeriod: previousPeriodRevenue,
        changePercent,
      },
    },
    chart: chartData,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ROOM REPORT
// ────────────────────────────────────────────────────────────────────────────

export async function getRoomReport(filters: DateRangeQueryInput) {
  const range = await getDateRange(filters)

  // Business hours: assuming 13 hours/day of operation
  const BUSINESS_HOURS_PER_DAY = 13
  const daysInPeriod = Math.max(
    1,
    Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
  )
  const totalBusinessMinutes = daysInPeriod * BUSINESS_HOURS_PER_DAY * 60

  const sessions = await prisma.session.findMany({
    where: {
      checkInTime: { gte: range.from, lte: range.to },
      status: { in: ['COMPLETED', 'TRANSFERRED'] },
      checkOutTime: { not: null },
    },
    include: {
      room: { select: { id: true, name: true, roomType: { select: { name: true } } } },
      invoice: { select: { grandTotal: true } },
    },
  })

  // Group by room
  const roomMap = new Map<
    number,
    {
      roomId: number
      roomName: string
      roomType: string
      sessions: typeof sessions
    }
  >()

  for (const session of sessions) {
    const roomId = session.room.id
    if (!roomMap.has(roomId)) {
      roomMap.set(roomId, {
        roomId,
        roomName: session.room.name,
        roomType: session.room.roomType.name,
        sessions: [],
      })
    }
    roomMap.get(roomId)!.sessions.push(session)
  }

  const result = Array.from(roomMap.values()).map(
    ({ roomId, roomName, roomType, sessions: roomSessions }) => {
      const totalMinutes = roomSessions.reduce((sum, s) => {
        if (!s.checkOutTime) return sum
        return sum + Math.round((s.checkOutTime.getTime() - s.checkInTime.getTime()) / 60000)
      }, 0)
      const totalRevenue = roomSessions.reduce(
        (sum, s) => sum + toNumber(s.invoice?.grandTotal),
        0
      )
      const occupancyRate =
        totalBusinessMinutes > 0
          ? Math.round((totalMinutes / totalBusinessMinutes) * 1000) / 10
          : 0

      return {
        roomId,
        roomName,
        roomType,
        totalSessions: roomSessions.length,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        occupancyRate,
        totalRevenue,
        avgSessionDuration:
          roomSessions.length > 0
            ? Math.round((totalMinutes / roomSessions.length / 60) * 10) / 10
            : 0,
      }
    }
  )

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ────────────────────────────────────────────────────────────────────────────
// PEAK HOURS REPORT
// ────────────────────────────────────────────────────────────────────────────

export async function getPeakHoursReport(filters: DateRangeQueryInput) {
  const range = await getDateRange(filters)

  const sessions = await prisma.session.findMany({
    where: {
      checkInTime: { gte: range.from, lte: range.to },
    },
    include: {
      invoice: { select: { grandTotal: true } },
    },
  })

  // Initialize hourly buckets
  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    sessionCount: 0,
    totalMinutes: 0,
    revenue: 0,
  }))

  for (const session of sessions) {
    const hour = session.checkInTime.getHours()
    hourBuckets[hour].sessionCount++
    hourBuckets[hour].revenue += toNumber(session.invoice?.grandTotal)

    if (session.checkOutTime) {
      const minutes = Math.round(
        (session.checkOutTime.getTime() - session.checkInTime.getTime()) / 60000
      )
      hourBuckets[hour].totalMinutes += minutes
    }
  }

  return hourBuckets.map(({ hour, sessionCount, totalMinutes, revenue }) => ({
    hour,
    sessionCount,
    avgDuration: sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0,
    revenue,
  }))
}

// ────────────────────────────────────────────────────────────────────────────
// STOCK REPORT
// ────────────────────────────────────────────────────────────────────────────

export async function getStockReport(filters: DateRangeQueryInput) {
  const range = await getDateRange(filters)

  // Get order items in range with product info
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: range.from, lte: range.to },
        status: { not: 'CANCELLED' },
      },
      productId: { not: null },
    },
    include: {
      product: { select: { id: true, name: true, costPrice: true } },
    },
  })

  // Aggregate by product
  const productMap = new Map<
    number,
    {
      productId: number
      name: string
      totalSold: number
      revenue: number
      cost: number
    }
  >()

  for (const item of orderItems) {
    if (!item.productId || !item.product) continue

    const productId = item.productId
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        name: item.product.name,
        totalSold: 0,
        revenue: 0,
        cost: 0,
      })
    }

    const entry = productMap.get(productId)!
    entry.totalSold += item.quantity
    entry.revenue += toNumber(item.unitPrice) * item.quantity
    entry.cost += toNumber(item.product.costPrice) * item.quantity
  }

  const profitability = Array.from(productMap.values())
    .map(({ productId, name, totalSold, revenue, cost }) => ({
      productId,
      name,
      totalSold,
      revenue,
      cost,
      profit: revenue - cost,
    }))
    .sort((a, b) => b.totalSold - a.totalSold)

  const topSelling = profitability.slice(0, 10)
  const slowMoving = [...profitability].sort((a, b) => a.totalSold - b.totalSold).slice(0, 10)

  return {
    topSelling,
    profitability,
    slowMoving,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SHIFT REPORT
// ────────────────────────────────────────────────────────────────────────────

export async function getShiftReport(filters: DateRangeQueryInput) {
  const range = await getDateRange(filters)

  const shifts = await prisma.shift.findMany({
    where: {
      startTime: { gte: range.from, lte: range.to },
      status: 'CLOSED',
    },
    include: {
      openedBy: { select: { fullName: true } },
    },
    orderBy: { startTime: 'desc' },
  })

  const shiftData = await Promise.all(
    shifts.map(async (shift) => {
      const shiftEnd = shift.endTime ?? new Date()
      const durationMinutes = Math.round(
        (shiftEnd.getTime() - shift.startTime.getTime()) / 60000
      )

      // Get all invoices paid during this shift
      const invoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['PAID', 'PARTIAL'] },
          createdAt: { gte: shift.startTime, lte: shiftEnd },
        },
        include: {
          payments: { select: { method: true, amount: true } },
        },
      })

      const totalRevenue = invoices.reduce((sum, inv) => sum + toNumber(inv.grandTotal), 0)
      const cashRevenue = invoices.reduce((sum, inv) => {
        const cashPayments = inv.payments
          .filter((p) => p.method === 'CASH')
          .reduce((s, p) => s + toNumber(p.amount), 0)
        return sum + cashPayments
      }, 0)
      const qrRevenue = invoices.reduce((sum, inv) => {
        const qrPayments = inv.payments
          .filter((p) => p.method === 'QR_TRANSFER')
          .reduce((s, p) => s + toNumber(p.amount), 0)
        return sum + qrPayments
      }, 0)

      const expectedCash = toNumber(shift.openingCash) + cashRevenue
      const cashDifference =
        shift.closingCash !== null ? toNumber(shift.closingCash) - expectedCash : null

      return {
        shiftId: shift.id,
        staffName: shift.openedBy.fullName,
        date: formatYMD(shift.startTime),
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime?.toISOString() ?? null,
        duration: durationMinutes,
        totalRevenue,
        cashRevenue,
        qrRevenue,
        openingCash: toNumber(shift.openingCash),
        closingCash: shift.closingCash !== null ? toNumber(shift.closingCash) : null,
        cashDifference,
      }
    })
  )

  const totalShifts = shiftData.length
  const avgRevenue =
    totalShifts > 0
      ? Math.round(shiftData.reduce((s, sh) => s + sh.totalRevenue, 0) / totalShifts)
      : 0

  return {
    shifts: shiftData,
    summary: {
      totalShifts,
      avgRevenue,
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────────────────────────────────────

export async function getDashboardData() {
  const now = new Date()
  // Doanh thu "hôm nay" = ngày kinh doanh hiện tại (vd 12h trưa → 5h sáng).
  // So sánh với ngày kinh doanh liền trước.
  const todayWindow: BusinessDayWindow = await getCurrentBusinessDay(now)
  const yesterdayWindow: BusinessDayWindow = previousBusinessDay(todayWindow)
  const todayStart = todayWindow.from
  const todayEnd = todayWindow.to
  const yesterdayStart = yesterdayWindow.from
  const yesterdayEnd = yesterdayWindow.to

  // Today's invoices
  const [todayInvoices, yesterdayInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: { in: ['PAID', 'PARTIAL'] },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      select: { grandTotal: true, roomCharge: true, orderTotal: true },
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: ['PAID', 'PARTIAL'] },
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: { grandTotal: true },
    }),
  ])

  const todayRevenue = todayInvoices.reduce((s, i) => s + toNumber(i.grandTotal), 0)
  const todayRoomRevenue = todayInvoices.reduce((s, i) => s + toNumber(i.roomCharge), 0)
  const todayOrderRevenue = todayInvoices.reduce((s, i) => s + toNumber(i.orderTotal), 0)
  const yesterdayRevenue = yesterdayInvoices.reduce((s, i) => s + toNumber(i.grandTotal), 0)
  const revenueChangePercent =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10
      : 0

  // Active rooms with current sessions
  const [activeRooms, allRoomsCount] = await Promise.all([
    prisma.room.findMany({
      where: { status: { in: ['OCCUPIED', 'ENDING_SOON'] }, isActive: true },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          include: {
            orders: {
              where: { status: { not: 'CANCELLED' } },
              include: { items: { select: { subtotal: true } } },
            },
          },
          take: 1,
        },
      },
    }),
    prisma.room.count({ where: { isActive: true } }),
  ])

  // Today's sessions
  const [todaySessions, yesterdaySessions] = await Promise.all([
    prisma.session.findMany({
      where: { checkInTime: { gte: todayStart, lte: todayEnd } },
      select: { checkInTime: true, checkOutTime: true, status: true },
    }),
    prisma.session.findMany({
      where: { checkInTime: { gte: yesterdayStart, lte: yesterdayEnd } },
      select: { id: true },
    }),
  ])

  const guestCountToday = todaySessions.length
  const guestCountYesterday = yesterdaySessions.length
  const guestChangeCount = guestCountToday - guestCountYesterday

  // Avg duration for completed today sessions
  const completedToday = todaySessions.filter((s) => s.status === 'COMPLETED' && s.checkOutTime)
  const avgDurationMinutes =
    completedToday.length > 0
      ? Math.round(
          completedToday.reduce((sum, s) => {
            return sum + (s.checkOutTime!.getTime() - s.checkInTime.getTime()) / 60000
          }, 0) / completedToday.length
        )
      : 0
  const avgDurationHours = Math.round((avgDurationMinutes / 60) * 10) / 10

  // Active rooms detail
  const activeRoomsDetail = activeRooms.map((room) => {
    const session = room.sessions[0]
    const elapsedMinutes = session
      ? Math.round((now.getTime() - session.checkInTime.getTime()) / 60000)
      : 0
    const orderTotal = session
      ? session.orders.reduce(
          (sum, order) => sum + order.items.reduce((s, item) => s + toNumber(item.subtotal), 0),
          0
        )
      : 0
    return {
      roomId: room.id,
      roomName: room.name,
      status: room.status,
      customerName: session?.customerName ?? '',
      elapsedMinutes,
      currentTotal: orderTotal,
    }
  })

  // Warnings: rooms ending soon
  const endingSoonWarnings = activeRooms
    .filter((r) => r.status === 'ENDING_SOON')
    .map((r) => ({
      type: 'ROOM_ENDING' as const,
      message: `${r.name} sắp hết giờ`,
      roomId: r.id,
      roomName: r.name,
    }))

  // Low stock products via raw query (comparing two numeric columns)
  const allLowStock = await prisma.$queryRaw<
    Array<{
      id: number
      name: string
      stock_quantity: number
      min_stock: number
    }>
  >`
    SELECT id, name, stock_quantity, min_stock
    FROM products
    WHERE is_active = 1 AND stock_quantity <= min_stock
    LIMIT 5
  `

  const lowStockWarnings = allLowStock.map((p) => ({
    type: 'STOCK_LOW' as const,
    message: `${p.name} còn ${p.stock_quantity} (tối thiểu: ${p.min_stock})`,
    productId: p.id,
    productName: p.name,
    stockQuantity: Number(p.stock_quantity),
    minStock: Number(p.min_stock),
  }))

  const warnings = [...endingSoonWarnings, ...lowStockWarnings]

  // Recent activity (audit logs)
  const recentLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { fullName: true } } },
  })

  // Revenue chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i))
  const last7Start = startOfDay(last7Days[0])

  const last7DaysInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['PAID', 'PARTIAL'] },
      createdAt: { gte: last7Start, lte: endOfDay(now) },
    },
    select: { grandTotal: true, roomCharge: true, orderTotal: true, createdAt: true },
  })

  const revenueChart = last7Days.map((day) => {
    const dayStr = formatYMD(day)
    const dayInvoices = last7DaysInvoices.filter(
      (inv) => formatYMD(inv.createdAt) === dayStr
    )
    return {
      date: dayStr,
      revenue: dayInvoices.reduce((s, i) => s + toNumber(i.grandTotal), 0),
      roomRevenue: dayInvoices.reduce((s, i) => s + toNumber(i.roomCharge), 0),
      orderRevenue: dayInvoices.reduce((s, i) => s + toNumber(i.orderTotal), 0),
    }
  })

  return {
    today: {
      revenue: todayRevenue,
      roomRevenue: todayRoomRevenue,
      orderRevenue: todayOrderRevenue,
      revenueChangePercent,
      guestCount: guestCountToday,
      guestChangeCount,
      avgDurationHours,
    },
    rooms: {
      active: activeRooms.length,
      total: allRoomsCount,
      list: activeRoomsDetail,
    },
    warnings,
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      userName: log.user.fullName,
      createdAt: log.createdAt.toISOString(),
    })),
    revenueChart,
  }
}
