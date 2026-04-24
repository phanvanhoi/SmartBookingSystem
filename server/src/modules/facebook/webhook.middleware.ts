import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import express from 'express'
import logger from '../../utils/logger'

/**
 * Middleware that captures the raw JSON body so we can compute the HMAC
 * signature later. Place BEFORE the standard `express.json()` for this route.
 */
export const captureRawBody = express.json({
  verify: (req, _res, buf) => {
    ;(req as Request & { rawBody?: Buffer }).rawBody = buf
  },
})

/**
 * Verify Meta's `X-Hub-Signature-256` header against the raw request body
 * using FB_APP_SECRET. Drops the request with 403 if the signature is missing
 * or invalid — protects the webhook from spoofed messages that would
 * otherwise create real bookings.
 *
 * If FB_APP_SECRET is not configured, the request is rejected (fail-closed).
 */
export function verifyFacebookSignature(req: Request, res: Response, next: NextFunction) {
  const appSecret = process.env.FB_APP_SECRET
  if (!appSecret) {
    logger.warn('Facebook webhook hit but FB_APP_SECRET is not configured', { module: 'facebook' })
    res.status(503).send('Facebook integration not configured')
    return
  }

  const signature = req.header('x-hub-signature-256')
  if (!signature || !signature.startsWith('sha256=')) {
    logger.warn('Facebook webhook missing signature header', { module: 'facebook' })
    res.status(403).send('Forbidden')
    return
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
  if (!rawBody) {
    logger.error('Facebook webhook raw body not captured', { module: 'facebook' })
    res.status(500).send('Server error')
    return
  }

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const provided = signature.slice('sha256='.length)

  // Length check first — timingSafeEqual throws on mismatched lengths.
  if (provided.length !== expected.length) {
    logger.warn('Facebook webhook signature length mismatch', { module: 'facebook' })
    res.status(403).send('Forbidden')
    return
  }

  const ok = crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
  if (!ok) {
    logger.warn('Facebook webhook signature mismatch', { module: 'facebook' })
    res.status(403).send('Forbidden')
    return
  }

  next()
}
