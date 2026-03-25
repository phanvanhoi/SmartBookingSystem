import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService, type GetNotificationsParams } from '@/services/notificationService'
import { useNotificationStore } from '@/stores/notificationStore'
import { useEffect } from 'react'

// ── Query Keys ────────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: GetNotificationsParams) => ['notifications', params] as const,
  unreadCount: ['unread-count'] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useNotifications(params: GetNotificationsParams = { limit: 20 }) {
  const setNotifications = useNotificationStore((s) => s.setNotifications)

  const query = useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationService.getNotifications(params),
    staleTime: 30_000,
  })

  // Sync query results into Zustand store
  useEffect(() => {
    if (query.data) {
      setNotifications(query.data)
    }
  }, [query.data, setNotifications])

  return query
}

export function useUnreadCount() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  const query = useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  // Sync into store
  useEffect(() => {
    if (query.data !== undefined) {
      setUnreadCount(query.data)
    }
  }, [query.data, setUnreadCount])

  return query
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const markOneAsRead = useNotificationStore((s) => s.markOneAsRead)

  return useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onMutate: (id) => {
      // Optimistic update
      markOneAsRead(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: () => {
      // On error, re-fetch to restore correct state
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  const markAllRead = useNotificationStore((s) => s.markAllRead)

  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onMutate: () => {
      // Optimistic update
      markAllRead()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}
