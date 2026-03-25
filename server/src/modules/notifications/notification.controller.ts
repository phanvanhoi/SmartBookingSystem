import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../../types'
import type { GetNotificationsQuery } from './notification.validation'
import * as notificationService from './notification.service'

// ── Helper ────────────────────────────────────────────────────────────────────
function parseParam(value: string | string[] | undefined): number {
  const str = Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
  return parseInt(str, 10)
}

// ── Controllers ───────────────────────────────────────────────────────────────

export async function getNotifications(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id
    const query = req.query as unknown as GetNotificationsQuery
    const notifications = await notificationService.getNotifications(userId, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
    })
    res.json({ success: true, data: notifications })
  } catch (err) {
    next(err)
  }
}

export async function getUnreadCount(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id
    const result = await notificationService.getUnreadCount(userId)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function markAsRead(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id
    const notificationId = parseParam(req.params.id)

    const notification = await notificationService.markAsRead(notificationId, userId)

    if (!notification) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Thông báo không tồn tại hoặc không thuộc về bạn',
        },
      })
      return
    }

    res.json({
      success: true,
      data: notification,
      message: 'Đã đánh dấu đã đọc',
    })
  } catch (err) {
    next(err)
  }
}

export async function markAllAsRead(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id
    const result = await notificationService.markAllAsRead(userId)
    res.json({
      success: true,
      data: result,
      message: `Đã đánh dấu đọc ${result.updatedCount} thông báo`,
    })
  } catch (err) {
    next(err)
  }
}
