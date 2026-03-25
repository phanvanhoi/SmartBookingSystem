import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import {
  emitRoomTimerWarning,
  emitRoomTimerExpired,
} from './socketManager'

const WARNING_THRESHOLD_MINUTES = 15

// Track which sessions have already emitted expired event to avoid duplicates
const expiredSessionsEmitted = new Set<number>()

// ── Room Timer Checker Cron ──────────────────────────────────────────────────
export function startRoomTimerChecker(): void {
  console.log('[RoomSocket] Room timer checker started (every 60s)')

  cron.schedule('* * * * *', async () => {
    try {
      await checkRoomTimers()
    } catch (err) {
      console.error('[RoomSocket] Timer check error:', err)
    }
  })
}

async function checkRoomTimers(): Promise<void> {
  const now = new Date()

  // Query all active sessions with an estimated end time
  const activeSessions = await prisma.session.findMany({
    where: {
      status: 'ACTIVE',
      estimatedEnd: { not: null },
    },
    include: {
      room: true,
    },
  })

  for (const session of activeSessions) {
    if (!session.estimatedEnd) continue

    const estimatedEnd = new Date(session.estimatedEnd)
    const remainingMs = estimatedEnd.getTime() - now.getTime()
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60))

    if (remainingMinutes <= 0) {
      // Room time has expired
      if (!expiredSessionsEmitted.has(session.id)) {
        expiredSessionsEmitted.add(session.id)

        const overtimeMinutes = Math.abs(remainingMinutes)

        // Emit socket event
        emitRoomTimerExpired({
          roomId: session.roomId,
          roomName: session.room.name,
          customerName: session.customerName,
          overtimeMinutes,
        })

        // Create notification for all staff
        await createExpiredNotification(session.roomId, session.room.name, session.customerName, overtimeMinutes)
      }
    } else if (remainingMinutes <= WARNING_THRESHOLD_MINUTES) {
      // Room is ending soon - only update and emit if not already ENDING_SOON
      if (session.room.status !== 'ENDING_SOON') {
        try {
          // Update room status to ENDING_SOON
          await prisma.room.update({
            where: { id: session.roomId },
            data: { status: 'ENDING_SOON' },
          })
        } catch {
          // Room may have already been updated
        }

        // Emit socket event
        emitRoomTimerWarning({
          roomId: session.roomId,
          roomName: session.room.name,
          remainingMinutes,
          customerName: session.customerName,
        })

        // Create notification for all staff
        await createWarningNotification(
          session.roomId,
          session.room.name,
          session.customerName,
          remainingMinutes,
        )
      }
    }
  }

  // Cleanup expired set for sessions that are no longer active
  const activeSessionIds = new Set(activeSessions.map((s) => s.id))
  for (const id of expiredSessionsEmitted) {
    if (!activeSessionIds.has(id)) {
      expiredSessionsEmitted.delete(id)
    }
  }
}

async function createWarningNotification(
  roomId: number,
  roomName: string,
  customerName: string,
  remainingMinutes: number,
): Promise<void> {
  try {
    // Get all active users to notify
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    // Dynamically import to avoid circular dependency
    const { createNotification } = await import('../modules/notifications/notification.service')

    for (const user of users) {
      await createNotification({
        userId: user.id,
        title: `${roomName} sắp hết giờ`,
        message: `Còn ${remainingMinutes} phút - Khách: ${customerName}`,
        type: 'ROOM_ENDING',
        metadata: { roomId, roomName, customerName, remainingMinutes },
      })
    }
  } catch (err) {
    console.error('[RoomSocket] Failed to create warning notification:', err)
  }
}

async function createExpiredNotification(
  roomId: number,
  roomName: string,
  customerName: string,
  overtimeMinutes: number,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    const { createNotification } = await import('../modules/notifications/notification.service')

    for (const user of users) {
      await createNotification({
        userId: user.id,
        title: `${roomName} đã hết giờ`,
        message: `Quá ${overtimeMinutes} phút chưa checkout - Khách: ${customerName}`,
        type: 'ROOM_EXPIRED',
        metadata: { roomId, roomName, customerName, overtimeMinutes },
      })
    }
  } catch (err) {
    console.error('[RoomSocket] Failed to create expired notification:', err)
  }
}
