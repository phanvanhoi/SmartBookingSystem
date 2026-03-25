import { prisma } from '../../lib/prisma'
import { WaitingQueueInput } from './room.validation'

// ─── Typed error helper ───────────────────────────────────────────────────────
function createError(message: string, statusCode: number, code: string): Error {
  const err = new Error(message) as Error & { statusCode: number; code: string }
  err.statusCode = statusCode
  err.code = code
  return err
}

// ─── addToQueue ───────────────────────────────────────────────────────────────
export async function addToQueue(data: WaitingQueueInput, userId: number) {
  return prisma.waitingQueue.create({
    data: {
      customerName: data.customerName,
      customerPhone: data.customerPhone ?? null,
      preferredType: data.preferredType ?? null,
      guestCount: data.guestCount ?? null,
      notes: data.notes ?? null,
      createdById: userId,
      status: 'WAITING',
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  })
}

// ─── getQueue ─────────────────────────────────────────────────────────────────
export async function getQueue(status?: string) {
  const where = status ? { status: status as never } : { status: 'WAITING' as never }

  return prisma.waitingQueue.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  })
}

// ─── assignRoom ───────────────────────────────────────────────────────────────
export async function assignRoom(queueId: number, roomId: number, userId: number) {
  const entry = await prisma.waitingQueue.findUnique({ where: { id: queueId } })

  if (!entry) throw createError('Mục hàng chờ không tồn tại', 404, 'QUEUE_NOT_FOUND')
  if (entry.status !== 'WAITING') {
    throw createError('Mục hàng chờ không ở trạng thái WAITING', 400, 'QUEUE_NOT_WAITING')
  }

  const room = await prisma.room.findFirst({
    where: { id: roomId, isActive: true },
    include: { roomType: true },
  })

  if (!room) throw createError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND')
  if (room.status !== 'AVAILABLE') {
    throw createError('Phòng không trống', 409, 'ROOM_NOT_AVAILABLE')
  }

  const checkInTime = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        roomId,
        checkedInById: userId,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        guestCount: entry.guestCount,
        checkInTime,
        notes: entry.notes,
        status: 'ACTIVE',
      },
    })

    await tx.waitingQueue.update({
      where: { id: queueId },
      data: { status: 'ASSIGNED' },
    })

    await tx.room.update({
      where: { id: roomId },
      data: { status: 'OCCUPIED' },
    })

    return session
  })

  return {
    queueId,
    sessionId: result.id,
    roomId,
    roomName: room.name,
    customerName: entry.customerName,
    checkInTime,
  }
}

// ─── cancelQueue ─────────────────────────────────────────────────────────────
export async function cancelQueue(queueId: number) {
  const entry = await prisma.waitingQueue.findUnique({ where: { id: queueId } })

  if (!entry) throw createError('Mục hàng chờ không tồn tại', 404, 'QUEUE_NOT_FOUND')
  if (entry.status !== 'WAITING') {
    throw createError('Chỉ có thể hủy mục đang ở trạng thái WAITING', 400, 'QUEUE_NOT_WAITING')
  }

  return prisma.waitingQueue.update({
    where: { id: queueId },
    data: { status: 'CANCELLED' },
  })
}
