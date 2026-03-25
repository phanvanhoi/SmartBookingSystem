import { create } from 'zustand'
import type { Notification } from '@/services/notificationService'

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean

  // Actions
  addNotification: (notification: Notification) => void
  setNotifications: (notifications: Notification[]) => void
  setUnreadCount: (count: number) => void
  markOneAsRead: (id: number) => void
  markAllRead: () => void
  togglePanel: () => void
  closePanel: () => void
  openPanel: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    })),

  setNotifications: (notifications) =>
    set({ notifications }),

  setUnreadCount: (count) =>
    set({ unreadCount: count }),

  markOneAsRead: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id)
      const wasUnread = notification && !notification.isRead
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  togglePanel: () =>
    set((state) => ({ isOpen: !state.isOpen })),

  closePanel: () =>
    set({ isOpen: false }),

  openPanel: () =>
    set({ isOpen: true }),
}))
