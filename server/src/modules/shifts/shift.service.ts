import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import type { OpenShiftInput, CloseShiftInput, GetShiftsQuery } from './shift.validation'

// ────────────────────────────────────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────────────────────────────────────

export interface ShiftSummary {
  totalSessions: number
  totalRevenue: number
  cashRevenue: number
  qrRevenue: number
  openingCash: number
  closingCash: number
  expectedCash: number
  cashDifference: number
}

export interface ShiftInfo {
  id: number
  openedById: number
  openedByName: string
  closedById: number | null
  closedByName: string | null
  startTime: Date
  endTime: Date | null
  openingCash: number
  closingCash: number | null
  status: string
  notes: string | null
  handoverNote: string | null
  duration?: string
  summary?: ShiftSummary
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime()
  const totalMinutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} phút`
  if (minutes === 0) return `${hours} giờ`
  return `${hours} giờ ${minutes} phút`
}

async function computeShiftSummary(
  startTime: Date,
  endTime: Date,
  openingCash: number,
  closingCash: number
): Promise<ShiftSummary> {
  // Tổng sessions checked out trong ca
  const totalSessions = await prisma.session.count({
    where: {
      checkOutTime: {
        gte: startTime,
        lte: endTime,
      },
      status: 'COMPLETED',
    },
  })

  // Lấy invoices tạo trong khoảng ca
  const invoices = await prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: startTime,
        lte: endTime,
      },
      status: { in: ['PAID', 'PARTIAL'] },
    },
    select: {
      grandTotal: true,
      payments: {
        select: {
          method: true,
          amount: true,
        },
      },
    },
  })

  let totalRevenue = 0
  let cashRevenue = 0
  let qrRevenue = 0

  for (const invoice of invoices) {
    totalRevenue += Number(invoice.grandTotal)
    for (const payment of invoice.payments) {
      if (payment.method === 'CASH') {
        cashRevenue += Number(payment.amount)
      } else if (payment.method === 'QR_TRANSFER') {
        qrRevenue += Number(payment.amount)
      }
    }
  }

  const expectedCash = openingCash + cashRevenue
  const cashDifference = closingCash - expectedCash

  return {
    totalSessions,
    totalRevenue,
    cashRevenue,
    qrRevenue,
    openingCash,
    closingCash,
    expectedCash,
    cashDifference,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// openShift
// ────────────────────────────────────────────────────────────────────────────

export async function openShift(userId: number, data: OpenShiftInput): Promise<ShiftInfo> {
  // Kiểm tra không có shift OPEN
  const existingOpen = await prisma.shift.findFirst({
    where: { status: 'OPEN' },
  })

  if (existingOpen) {
    throw new AppError(409, 'SHIFT_ALREADY_OPEN', 'Đã có ca làm việc đang mở')
  }

  const shift = await prisma.shift.create({
    data: {
      openedById: userId,
      openingCash: data.openingCash,
      notes: data.notes,
      status: 'OPEN',
    },
    include: {
      openedBy: { select: { fullName: true } },
      closedBy: { select: { fullName: true } },
    },
  })

  return {
    id: shift.id,
    openedById: shift.openedById,
    openedByName: shift.openedBy.fullName,
    closedById: shift.closedById,
    closedByName: shift.closedBy?.fullName ?? null,
    startTime: shift.startTime,
    endTime: shift.endTime,
    openingCash: Number(shift.openingCash),
    closingCash: shift.closingCash ? Number(shift.closingCash) : null,
    status: shift.status,
    notes: shift.notes,
    handoverNote: shift.handoverNote,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// closeShift
// ────────────────────────────────────────────────────────────────────────────

export async function closeShift(
  shiftId: number,
  userId: number,
  data: CloseShiftInput
): Promise<{ shiftId: number; duration: string; summary: ShiftSummary }> {
  // Lấy shift (must be OPEN)
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  })

  if (!shift) {
    throw new AppError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy ca làm việc')
  }

  if (shift.status !== 'OPEN') {
    throw new AppError(400, 'SHIFT_NOT_OPEN', 'Ca làm việc này không ở trạng thái mở')
  }

  const endTime = new Date()
  const openingCash = Number(shift.openingCash)

  // Tính summary ca
  const summary = await computeShiftSummary(shift.startTime, endTime, openingCash, data.closingCash)

  // Update shift
  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      closedById: userId,
      endTime,
      closingCash: data.closingCash,
      status: 'CLOSED',
      handoverNote: data.handoverNote,
    },
  })

  const duration = formatDuration(shift.startTime, endTime)

  return {
    shiftId,
    duration,
    summary,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// getCurrentShift
// ────────────────────────────────────────────────────────────────────────────

export async function getCurrentShift(): Promise<ShiftInfo | null> {
  const shift = await prisma.shift.findFirst({
    where: { status: 'OPEN' },
    include: {
      openedBy: { select: { fullName: true } },
      closedBy: { select: { fullName: true } },
    },
    orderBy: { startTime: 'desc' },
  })

  if (!shift) return null

  return {
    id: shift.id,
    openedById: shift.openedById,
    openedByName: shift.openedBy.fullName,
    closedById: shift.closedById,
    closedByName: shift.closedBy?.fullName ?? null,
    startTime: shift.startTime,
    endTime: shift.endTime,
    openingCash: Number(shift.openingCash),
    closingCash: shift.closingCash ? Number(shift.closingCash) : null,
    status: shift.status,
    notes: shift.notes,
    handoverNote: shift.handoverNote,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// getShifts
// ────────────────────────────────────────────────────────────────────────────

export async function getShifts(
  filters: GetShiftsQuery
): Promise<PaginatedResult<ShiftInfo>> {
  const { dateFrom, dateTo, page, limit } = filters
  const skip = (page - 1) * limit

  const where: {
    startTime?: { gte?: Date; lte?: Date }
  } = {}

  if (dateFrom || dateTo) {
    where.startTime = {}
    if (dateFrom) {
      where.startTime.gte = new Date(`${dateFrom}T00:00:00`)
    }
    if (dateTo) {
      where.startTime.lte = new Date(`${dateTo}T23:59:59`)
    }
  }

  const [shifts, total] = await Promise.all([
    prisma.shift.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: 'desc' },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } },
      },
    }),
    prisma.shift.count({ where }),
  ])

  // Tính summary cho mỗi ca đã đóng
  const data: ShiftInfo[] = await Promise.all(
    shifts.map(async (shift) => {
      let summary: ShiftSummary | undefined
      let duration: string | undefined

      if (shift.status === 'CLOSED' && shift.endTime && shift.closingCash !== null) {
        summary = await computeShiftSummary(
          shift.startTime,
          shift.endTime,
          Number(shift.openingCash),
          Number(shift.closingCash)
        )
        duration = formatDuration(shift.startTime, shift.endTime)
      }

      return {
        id: shift.id,
        openedById: shift.openedById,
        openedByName: shift.openedBy.fullName,
        closedById: shift.closedById,
        closedByName: shift.closedBy?.fullName ?? null,
        startTime: shift.startTime,
        endTime: shift.endTime,
        openingCash: Number(shift.openingCash),
        closingCash: shift.closingCash ? Number(shift.closingCash) : null,
        status: shift.status,
        notes: shift.notes,
        handoverNote: shift.handoverNote,
        duration,
        summary,
      }
    })
  )

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
