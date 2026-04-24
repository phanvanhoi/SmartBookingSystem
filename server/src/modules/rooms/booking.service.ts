import { prisma } from '../../lib/prisma'
import { BookingInput, BookingQueryInput } from './room.validation'

const HOUR_MS = 3_600_000

// ─── Typed error helper ───────────────────────────────────────────────────────
function createError(message: string, statusCode: number, code: string): Error {
  const err = new Error(message) as Error & { statusCode: number; code: string }
  err.statusCode = statusCode
  err.code = code
  return err
}

// Default a booking duration to 1h when not specified — used for overlap math.
function effectiveEnd(start: Date, durationHours: number | null | undefined): Date {
  const hours = durationHours && Number(durationHours) > 0 ? Number(durationHours) : 1
  return new Date(start.getTime() + hours * HOUR_MS)
}

/**
 * Check if a new/updated booking conflicts with existing bookings on the same room+date.
 * Standard interval-overlap formula: existingStart < newEnd AND newStart < existingEnd.
 *
 * Done in JS (small dataset per room/day) because Prisma cannot compute
 * `bookingTime + durationHours` inside a where clause.
 */
async function findConflictingBooking(args: {
  roomId: number
  bookingDate: Date
  newStart: Date
  newEnd: Date
  excludeBookingId?: number
}) {
  const candidates = await prisma.booking.findMany({
    where: {
      roomId: args.roomId,
      bookingDate: args.bookingDate,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(args.excludeBookingId ? { id: { not: args.excludeBookingId } } : {}),
    },
    select: {
      id: true,
      bookingTime: true,
      durationHours: true,
    },
  })

  return candidates.find((c) => {
    const cEnd = effectiveEnd(c.bookingTime, c.durationHours ? Number(c.durationHours) : null)
    return c.bookingTime < args.newEnd && args.newStart < cEnd
  })
}

// ─── createBooking ────────────────────────────────────────────────────────────
export async function createBooking(data: BookingInput, userId: number) {
  const room = await prisma.room.findFirst({
    where: { id: data.roomId, isActive: true },
  })

  if (!room) throw createError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND')

  const bookingDate = new Date(data.bookingDate)
  bookingDate.setHours(0, 0, 0, 0)

  const [bookingHour, bookingMin] = data.bookingTime.split(':').map(Number)
  const bookingTime = new Date(bookingDate)
  bookingTime.setHours(bookingHour, bookingMin, 0, 0)

  const newEnd = effectiveEnd(bookingTime, data.durationHours)

  const conflict = await findConflictingBooking({
    roomId: data.roomId,
    bookingDate,
    newStart: bookingTime,
    newEnd,
  })
  if (conflict) {
    throw createError('Phòng đã có lịch đặt trùng giờ', 409, 'BOOKING_OVERLAP')
  }

  const booking = await prisma.booking.create({
    data: {
      roomId: data.roomId,
      customerName: data.customerName,
      customerPhone: data.customerPhone ?? null,
      bookingDate,
      bookingTime,
      durationHours: data.durationHours ?? null,
      depositAmount: data.depositAmount ?? 0,
      notes: data.notes ?? null,
      createdById: userId,
      status: 'PENDING',
    },
    include: {
      room: { select: { id: true, name: true } },
    },
  })

  return booking
}

// ─── updateBooking (kéo thả) ────────────────────────────────────────────────
export async function updateBooking(
  bookingId: number,
  data: { roomId?: number; bookingTime?: string; durationHours?: number }
) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw createError('Booking không tồn tại', 404, 'BOOKING_NOT_FOUND')
  if (booking.status !== 'PENDING') {
    throw createError('Chỉ có thể sửa booking đang chờ', 400, 'BOOKING_NOT_PENDING')
  }

  // Compute target room/time/duration after the proposed update
  const targetRoomId = data.roomId ?? booking.roomId

  let targetStart = booking.bookingTime
  if (data.bookingTime !== undefined) {
    const [h, m] = data.bookingTime.split(':').map(Number)
    targetStart = new Date(booking.bookingDate)
    targetStart.setHours(h, m, 0, 0)
  }

  const targetDuration =
    data.durationHours !== undefined
      ? data.durationHours
      : booking.durationHours
        ? Number(booking.durationHours)
        : null

  const targetEnd = effectiveEnd(targetStart, targetDuration)

  // Validate target room
  if (data.roomId !== undefined) {
    const room = await prisma.room.findFirst({ where: { id: targetRoomId, isActive: true } })
    if (!room) throw createError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND')
  }

  // Check overlap with other bookings (excluding self)
  const conflict = await findConflictingBooking({
    roomId: targetRoomId,
    bookingDate: booking.bookingDate,
    newStart: targetStart,
    newEnd: targetEnd,
    excludeBookingId: bookingId,
  })
  if (conflict) {
    throw createError('Khung giờ này đã có lịch đặt khác', 409, 'BOOKING_OVERLAP')
  }

  const updateData: Record<string, unknown> = {}
  if (data.roomId !== undefined) updateData.roomId = data.roomId
  if (data.bookingTime !== undefined) updateData.bookingTime = targetStart
  if (data.durationHours !== undefined) updateData.durationHours = data.durationHours

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: updateData,
    include: { room: { select: { id: true, name: true } } },
  })

  return updated
}

// ─── getBookings ──────────────────────────────────────────────────────────────
export async function getBookings(filters: BookingQueryInput) {
  const { date, roomId, status, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    where.bookingDate = d
  } else {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    where.bookingDate = today
  }

  if (roomId) where.roomId = roomId
  if (status) where.status = status

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { bookingTime: 'asc' },
      include: {
        room: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.booking.count({ where }),
  ])

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ─── confirmBooking ───────────────────────────────────────────────────────────
export async function confirmBooking(bookingId: number, userId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true },
  })

  if (!booking) throw createError('Booking không tồn tại', 404, 'BOOKING_NOT_FOUND')
  if (booking.status !== 'PENDING') {
    throw createError('Booking không ở trạng thái PENDING', 400, 'BOOKING_NOT_PENDING')
  }

  const room = booking.room
  if (room.status === 'OCCUPIED' || room.status === 'ENDING_SOON') {
    throw createError('Phòng đang được sử dụng', 409, 'ROOM_NOT_AVAILABLE')
  }
  if (room.status === 'MAINTENANCE') {
    throw createError('Phòng đang bảo trì', 409, 'ROOM_MAINTENANCE')
  }

  const checkInTime = new Date()
  const estimatedEnd = booking.durationHours
    ? new Date(checkInTime.getTime() + Number(booking.durationHours) * HOUR_MS)
    : undefined

  const result = await prisma.$transaction(async (tx) => {
    // Atomic room claim — fails (count=0) if another concurrent confirm took it.
    const claim = await tx.room.updateMany({
      where: { id: booking.roomId, status: 'AVAILABLE' },
      data: { status: 'OCCUPIED' },
    })
    if (claim.count === 0) {
      throw createError('Phòng vừa được người khác sử dụng', 409, 'ROOM_NOT_AVAILABLE')
    }

    const session = await tx.session.create({
      data: {
        roomId: booking.roomId,
        checkedInById: userId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        checkInTime,
        estimatedEnd: estimatedEnd ?? null,
        notes: booking.notes,
        status: 'ACTIVE',
      },
    })

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    })

    return session
  })

  return {
    bookingId,
    sessionId: result.id,
    roomId: booking.roomId,
    customerName: booking.customerName,
    checkInTime,
    estimatedEnd,
  }
}

// ─── cancelBooking ────────────────────────────────────────────────────────────
export async function cancelBooking(bookingId: number, reason?: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })

  if (!booking) throw createError('Booking không tồn tại', 404, 'BOOKING_NOT_FOUND')
  if (booking.status === 'CANCELLED') {
    throw createError('Booking đã bị hủy', 400, 'BOOKING_ALREADY_CANCELLED')
  }
  if (booking.status === 'CONFIRMED') {
    throw createError('Không thể hủy booking đã được xác nhận', 400, 'BOOKING_CONFIRMED')
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      notes: reason ? `${booking.notes ?? ''} [HỦY: ${reason}]`.trim() : booking.notes,
    },
  })
}
