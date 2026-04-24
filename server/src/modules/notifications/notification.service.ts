import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import type { NotificationType } from '../../types/index'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GetNotificationsFilters {
  unreadOnly?: boolean
  limit?: number
}

interface CreateNotificationData {
  userId: number
  title: string
  message: string
  type: NotificationType
  metadata?: Record<string, unknown>
}

// ── Service Functions ─────────────────────────────────────────────────────────

export async function getNotifications(
  userId: number,
  filters: GetNotificationsFilters = {},
) {
  const { unreadOnly = false, limit = 20 } = filters

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return notifications
}

export async function markAsRead(
  notificationId: number,
  userId: number,
) {
  // Verify ownership before updating
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })

  if (!notification) {
    return null
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
}

export async function markAllAsRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })

  return { updatedCount: result.count }
}

export async function createNotification(data: CreateNotificationData) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      metadata: data.metadata
        ? (data.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      isRead: false,
    },
  })

  // Emit socket event - import lazily to avoid circular dep at module load time
  try {
    const { emitNotification } = await import('../../socket/socketManager')
    emitNotification(data.userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata,
      createdAt: notification.createdAt.toISOString(),
    })
  } catch {
    // Socket may not be initialized yet (e.g. during tests)
  }

  return notification
}

export async function getUnreadCount(userId: number) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  })

  return { count }
}
