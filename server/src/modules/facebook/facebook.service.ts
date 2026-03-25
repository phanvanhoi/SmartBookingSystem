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

// In-memory store for messages (could use DB table in production)
const messageStore: FacebookMessage[] = []

// ── Get Facebook settings ────────────────────────────────────────────────────

export async function getFacebookSettings() {
  const pageToken = await prisma.setting.findUnique({ where: { key: 'facebook_page_token' } })
  const verifyToken = await prisma.setting.findUnique({ where: { key: 'facebook_verify_token' } })
  const pageId = await prisma.setting.findUnique({ where: { key: 'facebook_page_id' } })
  const enabled = await prisma.setting.findUnique({ where: { key: 'facebook_enabled' } })

  return {
    pageToken: pageToken?.value as string ?? '',
    verifyToken: verifyToken?.value as string ?? 'musicbox_verify_2026',
    pageId: pageId?.value as string ?? '',
    enabled: (enabled?.value as boolean) ?? false,
  }
}

export async function updateFacebookSettings(data: {
  pageToken?: string
  verifyToken?: string
  pageId?: string
  enabled?: boolean
}, userId: number) {
  const updates = [
    { key: 'facebook_page_token', value: data.pageToken },
    { key: 'facebook_verify_token', value: data.verifyToken },
    { key: 'facebook_page_id', value: data.pageId },
    { key: 'facebook_enabled', value: data.enabled },
  ]

  for (const { key, value } of updates) {
    if (value === undefined) continue
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as any, updatedById: userId },
      create: { key, value: value as any, description: `Facebook ${key}`, updatedById: userId },
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

  // Get sender name from Facebook (simplified - in prod, call Graph API)
  const senderName = await getSenderName(senderId, settings.pageToken)

  // Parse the message
  const parsed = parseBookingMessage(messageText)

  // Use sender name as customer name if not found in message
  if (!parsed.customerName && senderName) {
    parsed.customerName = senderName
  }

  const fbMessage: FacebookMessage = {
    id: messageId,
    senderId,
    senderName: senderName || senderId,
    text: messageText,
    timestamp,
    parsed: parsed.confidence > 0.3 ? parsed : null,
    autoBookingId: null,
    status: parsed.confidence > 0.3 ? 'parsed' : 'new',
  }

  // Auto-create booking if confidence is high enough
  if (parsed.confidence >= 0.7 && parsed.date && parsed.time) {
    try {
      const booking = await autoCreateBooking(parsed, senderName || senderId)
      fbMessage.autoBookingId = booking.id
      fbMessage.status = 'booked'

      // Send confirmation reply
      if (settings.pageToken) {
        await sendReply(senderId, settings.pageToken,
          `✅ Đã đặt phòng thành công!\n` +
          `📅 Ngày: ${parsed.date}\n` +
          `🕐 Giờ: ${parsed.time}\n` +
          `${parsed.roomPreference === 'large' ? '🏠 Phòng lớn' : parsed.roomPreference === 'small' ? '🏠 Phòng nhỏ' : ''}\n` +
          `${parsed.guestCount ? `👥 ${parsed.guestCount} người` : ''}\n` +
          `Cảm ơn bạn đã đặt phòng tại Music Box! 🎵`
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
      fbMessage.status = 'parsed'
    }
  } else if (parsed.confidence > 0.3 && settings.pageToken) {
    // Partially parsed - ask for more info
    const missing: string[] = []
    if (!parsed.date) missing.push('ngày')
    if (!parsed.time) missing.push('giờ')

    if (missing.length > 0) {
      await sendReply(senderId, settings.pageToken,
        `Cảm ơn bạn đã liên hệ Music Box! 🎵\n` +
        `Mình nhận được yêu cầu đặt phòng nhưng cần thêm thông tin:\n` +
        `${missing.map(m => `- ${m}`).join('\n')}\n` +
        `Bạn vui lòng cho mình biết thêm nhé!`
      )
    }
  }

  // Store message
  messageStore.unshift(fbMessage)
  if (messageStore.length > 200) messageStore.length = 200 // keep last 200

  return fbMessage
}

// ── Auto-create booking ──────────────────────────────────────────────────────

async function autoCreateBooking(parsed: ParsedBooking, customerName: string) {
  // Find available room
  let roomId: number | null = null

  if (parsed.roomPreference) {
    const typeName = parsed.roomPreference === 'large' ? 'Phòng lớn' : 'Phòng nhỏ'
    const room = await prisma.room.findFirst({
      where: {
        isActive: true,
        roomType: { name: typeName },
      },
      orderBy: { sortOrder: 'asc' },
    })
    roomId = room?.id ?? null
  }

  if (!roomId) {
    // Default: first available room
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

  // Get admin user for createdBy
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
    include: {
      room: { select: { id: true, name: true } },
    },
  })

  return booking
}

// ── Facebook Graph API helpers ───────────────────────────────────────────────

async function getSenderName(senderId: string, pageToken: string): Promise<string | null> {
  if (!pageToken) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${senderId}?fields=name&access_token=${pageToken}`
    )
    if (!res.ok) return null
    const data = await res.json() as { name?: string }
    return data.name ?? null
  } catch {
    return null
  }
}

async function sendReply(recipientId: string, pageToken: string, text: string) {
  try {
    await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    )
  } catch (err) {
    logger.error('Failed to send Facebook reply', { module: 'facebook', error: err })
  }
}

// ── Get messages for UI ──────────────────────────────────────────────────────

export function getMessages(limit = 50): FacebookMessage[] {
  return messageStore.slice(0, limit)
}

export function ignoreMessage(messageId: string) {
  const msg = messageStore.find((m) => m.id === messageId)
  if (msg) msg.status = 'ignored'
}

export async function confirmMessage(messageId: string, bookingData: {
  roomId: number
  customerName: string
  customerPhone?: string
  date: string
  time: string
  durationHours?: number
  guestCount?: number
}) {
  const msg = messageStore.find((m) => m.id === messageId)
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
    include: {
      room: { select: { id: true, name: true } },
    },
  })

  msg.autoBookingId = booking.id
  msg.status = 'booked'
  return booking
}
