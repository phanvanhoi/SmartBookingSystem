import api from './api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ROOM_ENDING'
  | 'ROOM_EXPIRED'
  | 'ORDER_NEW'
  | 'STOCK_LOW'
  | 'BOOKING_REMINDER'
  | 'CUSTOMER_BIRTHDAY'
  | 'SYSTEM'

export interface Notification {
  id: number
  userId: number
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface GetNotificationsParams {
  unreadOnly?: boolean
  limit?: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const notificationService = {
  async getNotifications(params: GetNotificationsParams = {}): Promise<Notification[]> {
    const queryParams: Record<string, string> = {}
    if (params.unreadOnly !== undefined) {
      queryParams.unreadOnly = String(params.unreadOnly)
    }
    if (params.limit !== undefined) {
      queryParams.limit = String(params.limit)
    }

    const response = await api.get<{ success: boolean; data: Notification[] }>(
      '/notifications',
      { params: queryParams },
    )
    return response.data.data
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ success: boolean; data: { count: number } }>(
      '/notifications/unread-count',
    )
    return response.data.data.count
  },

  async markAsRead(id: number): Promise<Notification> {
    const response = await api.patch<{ success: boolean; data: Notification }>(
      `/notifications/${id}/read`,
    )
    return response.data.data
  },

  async markAllAsRead(): Promise<{ updatedCount: number }> {
    const response = await api.patch<{ success: boolean; data: { updatedCount: number } }>(
      '/notifications/read-all',
    )
    return response.data.data
  },
}
