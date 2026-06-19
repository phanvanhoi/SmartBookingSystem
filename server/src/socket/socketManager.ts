import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { AuthUser } from '../types/index'
import { getJwtSecret } from '../lib/jwtConfig'
import logger from '../utils/logger'

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

// Roles allowed to subscribe to global / staff-only channels.
const MANAGEMENT_ROLES: AuthUser['role'][] = ['OWNER', 'MANAGER']

/**
 * Verify a socket can subscribe to a channel.
 *  - `room:<id>`     → any authenticated user
 *  - `user:<self_id>` → only the user themselves
 *  - `org:*`         → only OWNER/MANAGER
 *  - anything else   → rejected
 */
function isChannelAllowed(channel: string, user: AuthUser | undefined): boolean {
  if (!user) return false
  if (channel === 'all') return false // server-only broadcast room
  if (channel.startsWith('room:')) return true
  if (channel.startsWith('user:')) {
    const targetId = Number(channel.slice('user:'.length))
    return Number.isInteger(targetId) && targetId === user.id
  }
  if (channel.startsWith('org:')) return MANAGEMENT_ROLES.includes(user.role)
  return false
}

// ── Setup ────────────────────────────────────────────────────────────────────
export function setupSocket(server: HttpServer): SocketServer {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error(`Socket CORS: origin ${origin} not allowed`), false)
      },
      credentials: true,
    },
  })

  // Auth middleware: verify JWT from handshake auth.token
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined

    if (!token) {
      return next(new Error('UNAUTHORIZED'))
    }

    const secret = getJwtSecret()
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
    logger.debug('Socket connected', { module: 'socket', user: user?.username, sid: socket.id })

    // Join broadcast room for all authenticated users
    socket.join('all')

    // Join personal room for targeted notifications
    if (user?.id) {
      socket.join(`user:${user.id}`)
    }

    // Handle channel subscriptions — validate access before joining.
    socket.on('subscribe', (channels: string | string[]) => {
      const channelList = Array.isArray(channels) ? channels : [channels]
      channelList.forEach((channel) => {
        if (typeof channel !== 'string' || !channel) return
        if (!isChannelAllowed(channel, user)) {
          socket.emit('subscribe:denied', { channel })
          return
        }
        socket.join(channel)
      })
    })

    socket.on('unsubscribe', (channels: string | string[]) => {
      const channelList = Array.isArray(channels) ? channels : [channels]
      channelList.forEach((channel) => {
        if (typeof channel !== 'string') return
        // unsubscribe never leaves auto-joined `all` or personal `user:<self>`
        if (channel === 'all' || channel === `user:${user?.id}`) return
        socket.leave(channel)
      })
    })

    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { module: 'socket', user: user?.username, sid: socket.id, reason })
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
