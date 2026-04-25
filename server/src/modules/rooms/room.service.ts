import { prisma } from '../../lib/prisma'
import { calculateRoomPrice, calculateCurrentCharge } from './pricing.service'

// ─── getAllRooms ──────────────────────────────────────────────────────────────
export async function getAllRooms(statusFilter?: string) {
  const where = statusFilter ? { status: statusFilter as never, isActive: true } : { isActive: true }

  const rooms = await prisma.room.findMany({
    where,
    include: {
      roomType: true,
      sessions: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: {
          orders: {
            where: { status: { not: 'CANCELLED' } },
            include: { items: true },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  const now = new Date()

  return Promise.all(
    rooms.map(async (room) => {
      const session = room.sessions[0] ?? null

      let currentSession: Record<string, unknown> | null = null

      if (session) {
        const elapsedMs = now.getTime() - session.checkInTime.getTime()
        const elapsedMinutes = Math.floor(elapsedMs / 60_000)

        let remainingMinutes: number | null = null
        if (session.estimatedEnd) {
          remainingMinutes = Math.max(
            0,
            Math.round((session.estimatedEnd.getTime() - now.getTime()) / 60_000),
          )
        }

        // Calculate current room charge
        const priceBreakdown = await calculateCurrentCharge(
          session.checkInTime,
          room.roomTypeId,
        )
        const currentRoomCharge = priceBreakdown.total

        // Sum order totals
        const currentOrderTotal = session.orders.reduce((sum, order) => {
          return sum + Number(order.totalAmount)
        }, 0)

        currentSession = {
          id: session.id,
          customerName: session.customerName,
          guestCount: session.guestCount,
          checkInTime: session.checkInTime,
          estimatedEnd: session.estimatedEnd,
          elapsedMinutes,
          remainingMinutes,
          currentRoomCharge,
          currentOrderTotal,
          currentTotal: currentRoomCharge + currentOrderTotal,
        }
      }

      return {
        id: room.id,
        name: room.name,
        roomType: {
          id: room.roomType.id,
          name: room.roomType.name,
          capacityMax: room.roomType.capacityMax,
        },
        status: room.status,
        sortOrder: room.sortOrder,
        currentSession,
      }
    }),
  )
}

// ─── getRoomById ─────────────────────────────────────────────────────────────
export async function getRoomById(id: number) {
  const room = await prisma.room.findFirst({
    where: { id, isActive: true },
    include: {
      roomType: true,
      sessions: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: {
          orders: {
            where: { status: { not: 'CANCELLED' } },
            include: {
              items: {
                include: { menuItem: true },
              },
            },
          },
        },
      },
      bookings: {
        where: {
          bookingDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: { not: 'CANCELLED' },
        },
        orderBy: { bookingTime: 'asc' },
      },
    },
  })

  if (!room) return null

  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0))
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999))

  // Today stats
  const todaySessions = await prisma.session.findMany({
    where: {
      roomId: id,
      status: 'COMPLETED',
      checkInTime: { gte: todayStart, lte: todayEnd },
    },
    select: { roomCharge: true },
  })

  const todayStats = {
    sessionsCount: todaySessions.length,
    totalRevenue: todaySessions.reduce((sum, s) => sum + Number(s.roomCharge ?? 0), 0),
  }

  const session = room.sessions[0] ?? null
  let currentSession: Record<string, unknown> | null = null

  if (session) {
    const elapsedMinutes = Math.floor((new Date().getTime() - session.checkInTime.getTime()) / 60_000)
    const priceBreakdown = await calculateCurrentCharge(session.checkInTime, room.roomTypeId)

    const currentRoomCharge = priceBreakdown.total
    const currentOrderTotal = session.orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    )

    currentSession = {
      id: session.id,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      guestCount: session.guestCount,
      checkInTime: session.checkInTime,
      estimatedEnd: session.estimatedEnd,
      notes: session.notes,
      elapsedMinutes,
      orders: session.orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
        })),
        createdAt: order.createdAt,
      })),
      priceBreakdown,
      // Flat fields the detail panel binds to directly
      currentRoomCharge,
      currentOrderTotal,
      currentTotal: currentRoomCharge + currentOrderTotal,
    }
  }

  return {
    id: room.id,
    name: room.name,
    roomType: {
      id: room.roomType.id,
      name: room.roomType.name,
      capacityMin: room.roomType.capacityMin,
      capacityMax: room.roomType.capacityMax,
    },
    status: room.status,
    currentSession,
    todayBookings: room.bookings,
    todayStats,
  }
}

// ─── updateRoom ───────────────────────────────────────────────────────────────
export async function updateRoom(
  id: number,
  data: { name?: string; roomTypeId?: number; sortOrder?: number },
) {
  const room = await prisma.room.findFirst({ where: { id, isActive: true } })
  if (!room) {
    const err = new Error('Phòng không tồn tại') as Error & { statusCode: number; code: string }
    err.statusCode = 404
    err.code = 'ROOM_NOT_FOUND'
    throw err
  }

  return prisma.room.update({
    where: { id },
    data,
    include: { roomType: true },
  })
}

// ─── setMaintenance ───────────────────────────────────────────────────────────
export async function setMaintenance(id: number, maintenance: boolean, reason?: string) {
  const room = await prisma.room.findFirst({ where: { id, isActive: true } })
  if (!room) {
    const err = new Error('Phòng không tồn tại') as Error & { statusCode: number; code: string }
    err.statusCode = 404
    err.code = 'ROOM_NOT_FOUND'
    throw err
  }

  if (maintenance && room.status === 'OCCUPIED') {
    const err = new Error('Không thể bảo trì phòng đang có khách') as Error & {
      statusCode: number
      code: string
    }
    err.statusCode = 409
    err.code = 'ROOM_OCCUPIED'
    throw err
  }

  const newStatus = maintenance ? 'MAINTENANCE' : 'AVAILABLE'

  return prisma.room.update({
    where: { id },
    data: {
      status: newStatus,
      ...(reason ? {} : {}), // reason logged externally; no column on Room
    },
    include: { roomType: true },
  })
}
