import { prisma } from '../../lib/prisma'
import { BookingInput, BookingQueryInput } from './room.validation'

// ─── Typed error helper ───────────────────────────────────────────────────────
function createError(message: string, statusCode: number, code: string): Error {
  const err = new Error(message) as Error & { statusCode: number; code: string }
  err.statusCode = statusCode
  err.code = code
  return err
}

// ─── createBooking ────────────────────────────────────────────────────────────
export async function createBooking(data: BookingInput, userId: number) {
  const room = await prisma.room.findFirst({
    where: { id: data.roomId, isActive: true },
  })

  if (!room) throw createError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND')

  // Parse booking datetime
  const bookingDate = new Date(data.bookingDate)
  const [bookingHour, bookingMin] = data.bookingTime.split(':').map(Number)
  const bookingTime = new Date(bookingDate)
  bookingTime.setHours(bookingHour, bookingMin, 0, 0)

  // Calculate end time if durationHours provided (for overlap check)
  const endTime = data.durationHours
    ? new Date(bookingTime.getTime() + data.durationHours * 3_600_000)
    : null

  // Check for overlapping bookings
  const overlap = await prisma.booking.findFirst({
    where: {
      roomId: data.roomId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      bookingDate: bookingDate,
      ...(endTime
        ? {
            AND: [
              { bookingTime: { lt: endTime } },
              {
                OR: [
                  {
                    AND: [
                      { durationHours: { not: null } },
                      // bookingTime + duration > new bookingTime
                      // Approximate: bookingTime < endTime is checked above
                    ],
                  },
                  { bookingTime: { gte: bookingTime } },
                ],
              },
            ],
          }
        : {
            bookingTime: {
              gte: bookingTime,
              lt: new Date(bookingTime.getTime() + 60 * 60_000), // 1hr window
            },
          }),
    },
  })

  if (overlap) {
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

  const updateData: Record<string, unknown> = {}

  if (data.roomId !== undefined) {
    const room = await prisma.room.findFirst({ where: { id: data.roomId, isActive: true } })
    if (!room) throw createError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND')
    updateData.roomId = data.roomId
  }

  if (data.bookingTime !== undefined) {
    const [h, m] = data.bookingTime.split(':').map(Number)
    const newTime = new Date(booking.bookingDate)
    newTime.setHours(h, m, 0, 0)
    updateData.bookingTime = newTime
  }

  if (data.durationHours !== undefined) {
    updateData.durationHours = data.durationHours
  }

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
    where.bookingDate = d
  } else {
    // Default to today
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
    ? new Date(checkInTime.getTime() + Number(booking.durationHours) * 3_600_000)
    : undefined

  const result = await prisma.$transaction(async (tx) => {
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

    await tx.room.update({
      where: { id: booking.roomId },
      data: { status: 'OCCUPIED' },
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
