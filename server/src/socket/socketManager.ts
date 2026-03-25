import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { AuthUser } from '../types/index'

// ── Socket.data augmentation ─────────────────────────────────────────────────
declare module 'socket.io' {
  interface SocketData {
    user: AuthUser
  }
}

interface JwtSocketPayload {
  sub: number
  username: string
  role: AuthUser['role']
  fullName: string
}

let io: SocketServer

// ── Setup ────────────────────────────────────────────────────────────────────
export function setupSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true,
    },
  })

  // Auth middleware: verify JWT from handshake auth.token
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined

    if (!token) {
      return next(new Error('UNAUTHORIZED'))
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return next(new Error('INTERNAL_ERROR'))
    }

    try {
      const decoded = jwt.verify(token, secret) as unknown as JwtSocketPayload
      socket.data.user = {
        id: decoded.sub,
        username: decoded.username,
        role: decoded.role,
        fullName: decoded.fullName,
      }
      next()
    } catch {
      next(new Error('TOKEN_INVALID'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user
    console.log(`[Socket] Connected: ${user?.username} (${socket.id})`)

    // Join broadcast room for all authenticated users
    socket.join('all')

    // Join personal room for targeted notifications
    if (user?.id) {
      socket.join(`user:${user.id}`)
    }

    // Handle channel subscriptions
    socket.on('subscribe', (channels: string | string[]) => {
      const channelList = Array.isArray(channels) ? channels : [channels]
      channelList.forEach((channel) => {
        socket.join(channel)
        console.log(`[Socket] ${user?.username} subscribed to: ${channel}`)
      })
    })

    socket.on('unsubscribe', (channels: string | string[]) => {
      const channelList = Array.isArray(channels) ? channels : [channels]
      channelList.forEach((channel) => {
        socket.leave(channel)
      })
    })

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${user?.username} (${socket.id}) - ${reason}`)
    })
  })

  return io
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized. Call setupSocket first.')
  return io
}

// ── Broadcast Helpers ────────────────────────────────────────────────────────

export function emitRoomUpdate(
  roomId: number,
  data: Record<string, unknown>,
): void {
  io?.to('all').emit('room:updated', { roomId, ...data })
}

export function emitRoomTimerWarning(data: {
  roomId: number
  roomName: string
  remainingMinutes: number
  customerName: string
}): void {
  io?.to('all').emit('room:timer_warning', data)
}

export function emitRoomTimerExpired(data: {
  roomId: number
  roomName: string
  customerName: string
  overtimeMinutes: number
}): void {
  io?.to('all').emit('room:timer_expired', data)
}

export function emitOrderNew(data: {
  orderId: number
  roomName: string
  items: unknown[]
  createdBy: string
}): void {
  io?.to('all').emit('order:new', data)
}

export function emitOrderStatusChanged(data: {
  orderId: number
  roomName: string
  oldStatus: string
  newStatus: string
}): void {
  io?.to('all').emit('order:status_changed', data)
}

export function emitNotification(
  userId: number | 'all',
  data: {
    id: number
    title: string
    message: string
    type: string
    metadata?: unknown
    createdAt: string
  },
): void {
  if (userId === 'all') {
    io?.to('all').emit('notification:new', data)
  } else {
    io?.to(`user:${userId}`).emit('notification:new', data)
  }
}
