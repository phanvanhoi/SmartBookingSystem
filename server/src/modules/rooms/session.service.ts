import { prisma } from '../../lib/prisma'
import { calculateRoomPrice, roundBillUp, getBillRoundAmount } from './pricing.service'
import { CheckinInput, ExtendInput, TransferInput, MergeInput } from './room.validation'

// ─── Typed error helper ───────────────────────────────────────────────────────
function createError(message: string, statusCode: number, code: string): Error {
  const err = new Error(message) as Error & { statusCode: number; code: string }
  err.statusCode = statusCode
  err.code = code
  return err
}

// ─── checkin ─────────────────────────────────────────────────────────────────
export async function checkin(data: CheckinInput, userId: number) {
  const room = await prisma.room.findFirst({
    where: { id: data.roomId, isActive: true },
    include: { roomType: true },
  })

  if (!room) throw createError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND')
  if (room.status === 'OCCUPIED' || room.status === 'ENDING_SOON') {
    throw createError('Phòng đang được sử dụng', 409, 'ROOM_NOT_AVAILABLE')
  }
  if (room.status === 'MAINTENANCE') {
    throw createError('Phòng đang bảo trì', 409, 'ROOM_MAINTENANCE')
  }

  // Lookup customer by phone (non-blocking)
  let customer: {
    id: number
    tier: string
    totalVisits: number
    isBlacklisted: boolean
  } | null = null

  let customerId: number | undefined

  if (data.customerPhone) {
    const found = await prisma.customer.findUnique({
      where: { phone: data.customerPhone },
    })
    if (found) {
      customerId = found.id
      customer = {
        id: found.id,
        tier: found.tier,
        totalVisits: found.visitCount,
        isBlacklisted: found.isBlacklisted,
      }
    }
  }

  const checkInTime = new Date()
  const estimatedEnd = data.estimatedDurationMinutes
    ? new Date(checkInTime.getTime() + data.estimatedDurationMinutes * 60_000)
    : undefined

  const session = await prisma.$transaction(async (tx) => {
    // Atomic claim — fails if another concurrent check-in just took the room.
    const claim = await tx.room.updateMany({
      where: { id: data.roomId, status: 'AVAILABLE' },
      data: { status: 'OCCUPIED' },
    })
    if (claim.count === 0) {
      throw createError('Phòng vừa được người khác sử dụng', 409, 'ROOM_NOT_AVAILABLE')
    }

    return tx.session.create({
      data: {
        roomId: data.roomId,
        customerId: customerId ?? null,
        checkedInById: userId,
        customerName: data.customerName,
        customerPhone: data.customerPhone ?? null,
        guestCount: data.guestCount ?? null,
        checkInTime,
        estimatedEnd: estimatedEnd ?? null,
        notes: data.notes ?? null,
        status: 'ACTIVE',
      },
    })
  })

  return {
    sessionId: session.id,
    roomId: room.id,
    roomName: room.name,
    customerName: session.customerName,
    checkInTime: session.checkInTime,
    estimatedEnd: session.estimatedEnd,
    customer,
  }
}

// ─── checkout (PREVIEW ONLY) ─────────────────────────────────────────────────
// IMPORTANT: this endpoint is now read-only. It computes the bill so the
// CheckoutDialog can render the breakdown, but does NOT mutate session/room
// status. The real checkout — invoice creation, payment recording, stock
// deduction, status flip — lives in processCheckout (POST /api/v1/checkout)
// and only fires when the cashier clicks "Xác nhận thanh toán".
//
// Previously this function was both preview AND finalize: just opening the
// dialog set the session to COMPLETED + freed the room without creating an
// invoice, so orders looked "lost" and revenue didn't increase if the
// cashier closed the dialog before confirming.
//
// `userId` kept for signature compatibility with the controller.
export async function checkout(sessionId: number, _userId: number) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      room: { include: { roomType: true } },
      customer: true,
      orders: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          items: {
            include: { menuItem: true },
          },
        },
      },
    },
  })

  if (!session) throw createError('Session không tồn tại', 404, 'SESSION_NOT_FOUND')
  if (session.status !== 'ACTIVE') {
    throw createError('Session không ở trạng thái ACTIVE', 400, 'SESSION_NOT_ACTIVE')
  }

  const checkOutTime = new Date()
  const priceBreakdown = await calculateRoomPrice(
    session.checkInTime,
    checkOutTime,
    session.room.roomTypeId,
  )

  const durationMs = checkOutTime.getTime() - session.checkInTime.getTime()
  const totalMinutes = Math.round(durationMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  // Sum order totals
  const orderTotal = session.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
  const subtotal = priceBreakdown.total + orderTotal

  // Member discount (informational only — actual invoice created in Task 12)
  let memberDiscount: Record<string, unknown> | null = null
  if (session.customer) {
    const tierDiscounts: Record<string, number> = {
      REGULAR: 0,
      SILVER: 5,
      GOLD: 10,
      VIP: 15,
    }
    const pct = tierDiscounts[session.customer.tier] ?? 0
    if (pct > 0) {
      const discountAmount = Math.round(priceBreakdown.total * (pct / 100))
      memberDiscount = {
        tier: session.customer.tier,
        percentage: pct,
        amount: discountAmount,
        appliesTo: 'room',
      }
    }
  }

  // Get deposit from booking if any
  const booking = await prisma.booking.findFirst({
    where: {
      roomId: session.roomId,
      status: 'CONFIRMED',
      customerPhone: session.customerPhone ?? undefined,
    },
    orderBy: { createdAt: 'desc' },
  })
  const depositAvailable = booking ? Number(booking.depositAmount) : 0

  const memberDiscountAmount = memberDiscount ? Number(memberDiscount.amount) : 0
  const rawGrandTotal = Math.max(0, subtotal - memberDiscountAmount - depositAvailable)

  // Apply ceiling round (e.g. 45,333 → 46,000) so the preview matches the
  // invoice that processCheckout will save. Owner configures via Settings.
  const roundStep = await getBillRoundAmount()
  const grandTotal = roundBillUp(rawGrandTotal, roundStep)

  // NO mutation here — this is a preview. processCheckout in
  // checkout/checkout.service.ts performs the actual COMPLETED transition.

  return {
    sessionId: session.id,
    roomName: session.room.name,
    customerName: session.customerName,
    checkInTime: session.checkInTime,
    checkOutTime,
    duration: { hours, minutes },
    roomCharge: priceBreakdown,
    orders: session.orders.map((o) => ({
      id: o.id,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.menuItem.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
      total: Number(o.totalAmount),
    })),
    orderTotal,
    subtotal,
    applicableDiscounts: memberDiscount
      ? { memberDiscount }
      : {},
    depositAvailable,
    grandTotal,
  }
}

// ─── extendSession ────────────────────────────────────────────────────────────
export async function extendSession(sessionId: number, data: ExtendInput) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { room: true },
  })

  if (!session) throw createError('Session không tồn tại', 404, 'SESSION_NOT_FOUND')
  if (session.status !== 'ACTIVE') {
    throw createError('Session không ở trạng thái ACTIVE', 400, 'SESSION_NOT_ACTIVE')
  }

  const currentEnd = session.estimatedEnd ?? new Date()
  const newEstimatedEnd = new Date(currentEnd.getTime() + data.additionalMinutes * 60_000)

  // Check for booking conflicts on this room after new estimated end
  const conflictBooking = await prisma.booking.findFirst({
    where: {
      roomId: session.roomId,
      status: 'PENDING',
      bookingTime: {
        lt: newEstimatedEnd,
      },
      bookingDate: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
    orderBy: { bookingTime: 'asc' },
  })

  await prisma.session.update({
    where: { id: sessionId },
    data: { estimatedEnd: newEstimatedEnd },
  })

  const result: {
    sessionId: number
    newEstimatedEnd: Date
    hasConflict: boolean
    nextBooking?: { time: string; customer: string }
  } = {
    sessionId,
    newEstimatedEnd,
    hasConflict: !!conflictBooking,
  }

  if (conflictBooking) {
    result.nextBooking = {
      time: `${String(conflictBooking.bookingTime.getHours()).padStart(2, '0')}:${String(conflictBooking.bookingTime.getMinutes()).padStart(2, '0')}`,
      customer: conflictBooking.customerName,
    }
  }

  return result
}

// ─── transferSession ──────────────────────────────────────────────────────────
export async function transferSession(sessionId: number, data: TransferInput, userId: number) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { room: { include: { roomType: true } } },
  })

  if (!session) throw createError('Session không tồn tại', 404, 'SESSION_NOT_FOUND')
  if (session.status !== 'ACTIVE') {
    throw createError('Session không ở trạng thái ACTIVE', 400, 'SESSION_NOT_ACTIVE')
  }

  const targetRoom = await prisma.room.findFirst({
    where: { id: data.targetRoomId, isActive: true },
    include: { roomType: true },
  })

  if (!targetRoom) throw createError('Phòng đích không tồn tại', 404, 'ROOM_NOT_FOUND')
  if (targetRoom.status !== 'AVAILABLE') {
    throw createError('Phòng đích không trống', 409, 'ROOM_NOT_AVAILABLE')
  }
  if (targetRoom.id === session.roomId) {
    throw createError('Không thể chuyển sang cùng phòng', 400, 'SAME_ROOM')
  }

  const sourceRoom = session.room

  await prisma.$transaction(async (tx) => {
    // Atomic claim of target room — fails if another action took it concurrently.
    const claim = await tx.room.updateMany({
      where: { id: targetRoom.id, status: 'AVAILABLE' },
      data: { status: 'OCCUPIED' },
    })
    if (claim.count === 0) {
      throw createError('Phòng đích vừa được người khác sử dụng', 409, 'ROOM_NOT_AVAILABLE')
    }

    // Mark old session as TRANSFERRED
    await tx.session.update({
      where: { id: sessionId },
      data: {
        status: 'TRANSFERRED',
        checkOutTime: new Date(),
        checkedOutById: userId,
      },
    })

    // Create new session in target room (continue from same check-in time)
    await tx.session.create({
      data: {
        roomId: targetRoom.id,
        customerId: session.customerId,
        checkedInById: userId,
        customerName: session.customerName,
        customerPhone: session.customerPhone,
        guestCount: session.guestCount,
        checkInTime: session.checkInTime,
        estimatedEnd: session.estimatedEnd,
        notes: session.notes,
        status: 'ACTIVE',
        transferredFromId: sessionId,
      },
    })

    // Free the source room
    await tx.room.update({ where: { id: session.roomId }, data: { status: 'AVAILABLE' } })
  })

  return {
    sessionId,
    fromRoom: { id: sourceRoom.id, name: sourceRoom.name, type: sourceRoom.roomType.name },
    toRoom: { id: targetRoom.id, name: targetRoom.name, type: targetRoom.roomType.name },
    priceNote: 'Giá sẽ tính theo phòng mới từ thời điểm chuyển',
  }
}

// ─── mergeSessions ────────────────────────────────────────────────────────────
export async function mergeSessions(data: MergeInput, userId: number) {
  const primary = await prisma.session.findUnique({
    where: { id: data.primarySessionId },
    include: { room: true },
  })
  const secondary = await prisma.session.findUnique({
    where: { id: data.secondarySessionId },
    include: { room: { include: { roomType: true } } },
  })

  if (!primary) throw createError('Session chính không tồn tại', 404, 'SESSION_NOT_FOUND')
  if (!secondary) throw createError('Session phụ không tồn tại', 404, 'SESSION_NOT_FOUND')
  if (primary.status !== 'ACTIVE') {
    throw createError('Session chính không ở trạng thái ACTIVE', 400, 'SESSION_NOT_ACTIVE')
  }
  if (secondary.status !== 'ACTIVE') {
    throw createError('Session phụ không ở trạng thái ACTIVE', 400, 'SESSION_NOT_ACTIVE')
  }
  if (primary.roomId === secondary.roomId) {
    throw createError('Hai session ở cùng phòng', 400, 'SAME_ROOM')
  }

  // Calculate room charge for secondary session up to now
  const secondaryCheckout = new Date()
  const secondaryCharge = await calculateRoomPrice(
    secondary.checkInTime,
    secondaryCheckout,
    secondary.room.roomTypeId,
  )

  await prisma.$transaction(async (tx) => {
    // Move all orders from secondary to primary
    await tx.order.updateMany({
      where: { sessionId: data.secondarySessionId },
      data: { sessionId: data.primarySessionId },
    })

    // Mark secondary as MERGED
    await tx.session.update({
      where: { id: data.secondarySessionId },
      data: {
        status: 'MERGED',
        checkOutTime: secondaryCheckout,
        checkedOutById: userId,
        roomCharge: secondaryCharge.total,
        mergedIntoId: data.primarySessionId,
      },
    })

    // Free the secondary room
    await tx.room.update({
      where: { id: secondary.roomId },
      data: { status: 'AVAILABLE' },
    })
  })

  return {
    primarySessionId: data.primarySessionId,
    secondarySessionId: data.secondarySessionId,
    secondaryRoomCharge: secondaryCharge.total,
    message: `Đã gộp phòng ${secondary.room.name} vào phòng ${primary.room.name}`,
  }
}

// ─── getSessions ──────────────────────────────────────────────────────────────
export async function getSessions(filters: {
  page: number
  limit: number
  roomId?: number
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}) {
  const { page, limit, roomId, status, dateFrom, dateTo, search } = filters
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (roomId) where.roomId = roomId
  if (status) where.status = status

  if (dateFrom || dateTo) {
    where.checkInTime = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
    }
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ]
  }

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      skip,
      take: limit,
      orderBy: { checkInTime: 'desc' },
      include: {
        room: { select: { id: true, name: true } },
        checkedInBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.session.count({ where }),
  ])

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
