import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNotificationStore } from '@/stores/notificationStore'
import { playWarningSound, playExpiredSound, playOrderSound } from '@/utils/audio'
import type { Notification } from '@/services/notificationService'

// Prod: same origin, Dev: localhost:3000
const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3000'

// ── Socket Events Types ───────────────────────────────────────────────────────

interface RoomUpdatedEvent {
  roomId: number
  [key: string]: unknown
}

interface RoomTimerWarningEvent {
  roomId: number
  roomName: string
  remainingMinutes: number
  customerName: string
}

interface RoomTimerExpiredEvent {
  roomId: number
  roomName: string
  customerName: string
  overtimeMinutes: number
}

interface OrderNewEvent {
  orderId: number
  roomName: string
  items: unknown[]
  createdBy: string
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSocket() {
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((s) => s.addNotification)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Create socket connection with JWT auth
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    // ── Connection lifecycle ──────────────────────────────────────────────────

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    // ── Room events ───────────────────────────────────────────────────────────

    socket.on('room:updated', (_data: RoomUpdatedEvent) => {
      // Invalidate rooms query to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    })

    socket.on('room:timer_warning', (data: RoomTimerWarningEvent) => {
      playWarningSound()
      toast(`${data.roomName} sắp hết giờ - Còn ${data.remainingMinutes} phút`, {
        icon: '🟡',
        duration: 6000,
      })
      // Also invalidate rooms to reflect ENDING_SOON status
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    })

    socket.on('room:timer_expired', (data: RoomTimerExpiredEvent) => {
      playExpiredSound()
      toast.error(
        `${data.roomName} đã hết giờ - Quá ${data.overtimeMinutes} phút`,
        { duration: 8000 },
      )
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    })

    // ── Order events ──────────────────────────────────────────────────────────

    socket.on('order:new', (data: OrderNewEvent) => {
      playOrderSound()
      toast(`Order mới #${data.orderId} - ${data.roomName}`, {
        icon: '🍺',
        duration: 5000,
      })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })

    socket.on('order:status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })

    // ── Notification events ───────────────────────────────────────────────────

    socket.on('notification:new', (data: Omit<Notification, 'userId'> & { userId?: number }) => {
      // Add to store - current user's userId will be filled from server
      addNotification(data as Notification)
      // Also update unread count by incrementing via store (handled in addNotification)
      // Re-fetch unread count from server to keep in sync
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return socketRef.current
}
