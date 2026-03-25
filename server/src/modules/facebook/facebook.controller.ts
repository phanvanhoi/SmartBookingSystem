import { Request, Response, NextFunction } from 'express'
import * as fbService from './facebook.service'
import { ApiResponse } from '../../types'
import logger from '../../utils/logger'

// ── Webhook Verification (GET) ───────────────────────────────────────────────
// Facebook sends GET request to verify webhook URL
export async function verifyWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'] as string
  const token = req.query['hub.verify_token'] as string
  const challenge = req.query['hub.challenge'] as string

  const settings = await fbService.getFacebookSettings()

  if (mode === 'subscribe' && token === settings.verifyToken) {
    logger.info('Facebook webhook verified', { module: 'facebook' })
    res.status(200).send(challenge)
  } else {
    logger.warn('Facebook webhook verification failed', { module: 'facebook', token })
    res.status(403).send('Forbidden')
  }
}

// ── Webhook Receive (POST) ───────────────────────────────────────────────────
// Facebook sends POST with message events
export async function receiveWebhook(req: Request, res: Response) {
  const body = req.body

  // Must respond 200 quickly to Facebook
  res.status(200).send('EVENT_RECEIVED')

  // Process in background
  if (body.object !== 'page') return

  try {
    for (const entry of body.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        if (!event.message?.text) continue

        const senderId = event.sender?.id
        const messageText = event.message.text
        const messageId = event.message.mid
        const timestamp = event.timestamp

        if (senderId && messageText) {
          await fbService.processIncomingMessage(senderId, messageText, messageId, timestamp)
        }
      }
    }
  } catch (err) {
    logger.error('Error processing Facebook webhook', { module: 'facebook', error: err })
  }
}

// ── Get Facebook Settings ────────────────────────────────────────────────────
export async function getSettings(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const settings = await fbService.getFacebookSettings()
    // Mask token for security
    const masked = {
      ...settings,
      pageToken: settings.pageToken ? `${settings.pageToken.substring(0, 10)}...` : '',
    }
    res.json({ success: true, data: masked })
  } catch (err) { next(err) }
}

// ── Update Facebook Settings ─────────────────────────────────────────────────
export async function updateSettings(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const userId = req.user!.id
    await fbService.updateFacebookSettings(req.body, userId)
    res.json({ success: true, message: 'Cập nhật cài đặt Facebook thành công' })
  } catch (err) { next(err) }
}

// ── Get Messages ─────────────────────────────────────────────────────────────
export async function getMessages(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const messages = fbService.getMessages(limit)
    res.json({ success: true, data: messages })
  } catch (err) { next(err) }
}

// ── Ignore Message ───────────────────────────────────────────────────────────
export async function ignoreMessage(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    fbService.ignoreMessage(req.params.messageId as string)
    res.json({ success: true, message: 'Đã bỏ qua tin nhắn' })
  } catch (err) { next(err) }
}

// ── Confirm Message → Create Booking ─────────────────────────────────────────
export async function confirmMessage(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const booking = await fbService.confirmMessage(req.params.messageId as string, req.body)
    res.json({ success: true, data: booking, message: 'Đã tạo booking từ tin nhắn' })
  } catch (err) { next(err) }
}

// ── Test Parse (for debugging) ───────────────────────────────────────────────
export async function testParse(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const { text } = req.body
    if (!text) {
      res.status(400).json({ success: false, error: { code: 'MISSING_TEXT', message: 'Thiếu text' } })
      return
    }
    const { parseBookingMessage } = await import('./messageParser')
    const parsed = parseBookingMessage(text)
    res.json({ success: true, data: parsed })
  } catch (err) { next(err) }
}
