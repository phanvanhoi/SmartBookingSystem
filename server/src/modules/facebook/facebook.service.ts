import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { parseBookingMessage, ParsedBooking } from './messageParser'
import logger from '../../utils/logger'

// ── Types ────────────────────────────────────────────────────────────────────

export interface FacebookMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
  parsed: ParsedBooking | null
  autoBookingId: number | null
  status: 'new' | 'parsed' | 'booked' | 'ignored'
}

const STATUS_TO_DB = {
  new: 'NEW',
  parsed: 'PARSED',
  booked: 'BOOKED',
  ignored: 'IGNORED',
} as const

const STATUS_FROM_DB: Record<string, FacebookMessage['status']> = {
  NEW: 'new',
  PARSED: 'parsed',
  BOOKED: 'booked',
  IGNORED: 'ignored',
}

function toApiMessage(row: {
  messageId: string
  senderId: string
  senderName: string
  text: string
  receivedAt: Date
  parsed: Prisma.JsonValue | null
  autoBookingId: number | null
  status: string
}): FacebookMessage {
  return {
    id: row.messageId,
    senderId: row.senderId,
    senderName: row.senderName,
    text: row.text,
    timestamp: row.receivedAt.getTime(),
    parsed: (row.parsed as unknown as ParsedBooking) ?? null,
    autoBookingId: row.autoBookingId,
    status: STATUS_FROM_DB[row.status] ?? 'new',
  }
}

// ── Get Facebook settings ────────────────────────────────────────────────────

export async function getFacebookSettings() {
  const pageToken = await prisma.setting.findUnique({ where: { key: 'facebook_page_token' } })
  const verifyToken = await prisma.setting.findUnique({ where: { key: 'facebook_verify_token' } })
  const pageId = await prisma.setting.findUnique({ where: { key: 'facebook_page_id' } })
  const enabled = await prisma.setting.findUnique({ where: { key: 'facebook_enabled' } })

  return {
    pageToken: typeof pageToken?.value === 'string' ? pageToken.value : '',
    verifyToken:
      typeof verifyToken?.value === 'string' ? verifyToken.value : process.env.FB_VERIFY_TOKEN ?? '',
    pageId: typeof pageId?.value === 'string' ? pageId.value : '',
    enabled: typeof enabled?.value === 'boolean' ? enabled.value : false,
  }
}

export async function updateFacebookSettings(
  data: {
    pageToken?: string
    verifyToken?: string
    pageId?: string
    enabled?: boolean
  },
  userId: number,
) {
  // Wrap each Setting.value as a Prisma.InputJsonValue. Avoid `as any` casts —
  // a stray non-JSON value would crash on read.
  const updates: Array<{ key: string; value: Prisma.InputJsonValue }> = []
  if (data.pageToken !== undefined) updates.push({ key: 'facebook_page_token', value: data.pageToken })
  if (data.verifyToken !== undefined) updates.push({ key: 'facebook_verify_token', value: data.verifyToken })
  if (data.pageId !== undefined) updates.push({ key: 'facebook_page_id', value: data.pageId })
  if (data.enabled !== undefined) updates.push({ key: 'facebook_enabled', value: data.enabled })

  for (const { key, value } of updates) {
    await prisma.setting.upsert({
      where: { key },
      update: { value, updatedById: userId },
      create: { key, value, description: `Facebook ${key}`, updatedById: userId },
    })
  }
}

// ── Process incoming webhook message ─────────────────────────────────────────

export async function processIncomingMessage(
  senderId: string,
  messageText: string,
  messageId: string,
  timestamp: number,
) {
  const settings = await getFacebookSettings()
  if (!settings.enabled) return null

  // Idempotency: Meta retries webhooks; skip if we already saw this mid.
  const existing = await prisma.facebookMessage.findUnique({ where: { messageId } })
  if (existing) return toApiMessage(existing)

  const senderName = await getSenderName(senderId, settings.pageToken)

  const parsed = parseBookingMessage(messageText)
  if (!parsed.customerName && senderName) parsed.customerName = senderName

  let status: keyof typeof STATUS_TO_DB = parsed.confidence > 0.3 ? 'parsed' : 'new'
  let autoBookingId: number | null = null

  // Auto-create booking if confidence is high enough
  if (parsed.confidence >= 0.7 && parsed.date && parsed.time) {
    try {
      const booking = await autoCreateBooking(parsed, senderName || senderId)
      autoBookingId = booking.id
      status = 'booked'

      if (settings.pageToken) {
        await sendReply(
          senderId,
          settings.pageToken,
          `✅ Đã đặt phòng thành công!\n` +
            `📅 Ngày: ${parsed.date}\n` +
            `🕐 Giờ: ${parsed.time}\n` +
            `${parsed.roomPreference === 'large' ? '🏠 Phòng lớn' : parsed.roomPreference === 'small' ? '🏠 Phòng nhỏ' : ''}\n` +
            `${parsed.guestCount ? `👥 ${parsed.guestCount} người` : ''}\n` +
            `Cảm ơn bạn đã đặt phòng tại Music Box! 🎵`,
        )
      }

      logger.info('Auto-created booking from Facebook message', {
        module: 'facebook',
        messageId,
        bookingId: booking.id,
        confidence: parsed.confidence,
      })
    } catch (err) {
      logger.error('Failed to auto-create booking', { module: 'facebook', error: err })
      status = 'parsed'
    }
  } else if (parsed.confidence > 0.3 && settings.pageToken) {
    const missing: string[] = []
    if (!parsed.date) missing.push('ngày')
    if (!parsed.time) missing.push('giờ')
    if (missing.length > 0) {
      await sendReply(
        senderId,
        settings.pageToken,
        `Cảm ơn bạn đã liên hệ Music Box! 🎵\n` +
          `Mình nhận được yêu cầu đặt phòng nhưng cần thêm thông tin:\n` +
          `${missing.map((m) => `- ${m}`).join('\n')}\n` +
          `Bạn vui lòng cho mình biết thêm nhé!`,
      )
    }
  }

  // Persist to DB so it survives restart and is queryable.
  const row = await prisma.facebookMessage.create({
    data: {
      messageId,
      senderId,
      senderName: senderName || senderId,
      text: messageText,
      receivedAt: new Date(timestamp),
      parsed: parsed.confidence > 0.3 ? (parsed as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      autoBookingId,
      status: STATUS_TO_DB[status],
    },
  })

  return toApiMessage(row)
}

// ── Auto-create booking ──────────────────────────────────────────────────────

async function autoCreateBooking(parsed: ParsedBooking, customerName: string) {
  let roomId: number | null = null

  if (parsed.roomPreference) {
    const typeName = parsed.roomPreference === 'large' ? 'Phòng lớn' : 'Phòng nhỏ'
    const room = await prisma.room.findFirst({
      where: { isActive: true, roomType: { name: typeName } },
      orderBy: { sortOrder: 'asc' },
    })
    roomId = room?.id ?? null
  }

  if (!roomId) {
    const room = await prisma.room.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    roomId = room?.id ?? null
  }

  if (!roomId) throw new Error('No rooms available')

  const bookingDate = new Date(parsed.date!)
  const [h, m] = parsed.time!.split(':').map(Number)
  const bookingTime = new Date(bookingDate)
  bookingTime.setHours(h, m, 0, 0)

  const admin = await prisma.user.findFirst({ where: { role: 'OWNER' } })

  const booking = await prisma.booking.create({
    data: {
      roomId,
      customerName: parsed.customerName || customerName,
      customerPhone: parsed.customerPhone,
      bookingDate,
      bookingTime,
      durationHours: parsed.durationHours,
      depositAmount: 0,
      notes: `[Facebook] ${parsed.raw.substring(0, 100)}`,
      createdById: admin?.id ?? 1,
      status: 'PENDING',
    },
    include: { room: { select: { id: true, name: true } } },
  })

  return booking
}

// ── Facebook Graph API helpers ───────────────────────────────────────────────

async function getSenderName(senderId: string, pageToken: string): Promise<string | null> {
  if (!pageToken) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${senderId}?fields=name&access_token=${pageToken}`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as { name?: string }
    return data.name ?? null
  } catch {
    return null
  }
}

async function sendReply(recipientId: string, pageToken: string, text: string) {
  try {
    await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    })
  } catch (err) {
    logger.error('Failed to send Facebook reply', { module: 'facebook', error: err })
  }
}

// ── Get messages for UI (DB-backed) ──────────────────────────────────────────

export async function getMessages(limit = 50): Promise<FacebookMessage[]> {
  const rows = await prisma.facebookMessage.findMany({
    orderBy: { receivedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  })
  return rows.map(toApiMessage)
}

export async function ignoreMessage(messageId: string) {
  await prisma.facebookMessage.update({
    where: { messageId },
    data: { status: 'IGNORED' },
  })
}

export async function confirmMessage(
  messageId: string,
  bookingData: {
    roomId: number
    customerName: string
    customerPhone?: string
    date: string
    time: string
    durationHours?: number
    guestCount?: number
  },
) {
  const msg = await prisma.facebookMessage.findUnique({ where: { messageId } })
  if (!msg) throw new Error('Message not found')

  const bookingDate = new Date(bookingData.date)
  const [h, m] = bookingData.time.split(':').map(Number)
  const bookingTime = new Date(bookingDate)
  bookingTime.setHours(h, m, 0, 0)

  const admin = await prisma.user.findFirst({ where: { role: 'OWNER' } })

  const booking = await prisma.booking.create({
    data: {
      roomId: bookingData.roomId,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone ?? null,
      bookingDate,
      bookingTime,
      durationHours: bookingData.durationHours ?? null,
      depositAmount: 0,
      notes: `[Facebook] ${msg.text.substring(0, 100)}`,
      createdById: admin?.id ?? 1,
      status: 'PENDING',
    },
    include: { room: { select: { id: true, name: true } } },
  })

  await prisma.facebookMessage.update({
    where: { messageId },
    data: { autoBookingId: booking.id, status: 'BOOKED' },
  })

  return booking
}
