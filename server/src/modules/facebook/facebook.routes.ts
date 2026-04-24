import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import {
  verifyWebhook,
  receiveWebhook,
  getSettings,
  updateSettings,
  getMessages,
  ignoreMessage,
  confirmMessage,
  testParse,
} from './facebook.controller'
import { captureRawBody, verifyFacebookSignature } from './webhook.middleware'

const router = Router()

// ── Facebook Webhook (PUBLIC - no auth) ──
// GET = verification handshake (token-based, no signature yet).
// POST = real events — must be HMAC-signed with FB_APP_SECRET.
router.get('/webhook', verifyWebhook)
router.post('/webhook', captureRawBody, verifyFacebookSignature, receiveWebhook)

// ── Settings (OWNER only) ──
router.get('/settings', authenticate, authorize('OWNER'), getSettings)
router.put('/settings', authenticate, authorize('OWNER'), updateSettings)

// ── Messages inbox ──
router.get('/messages', authenticate, getMessages)
router.patch('/messages/:messageId/ignore', authenticate, authorize('CASHIER'), ignoreMessage)
router.post('/messages/:messageId/confirm', authenticate, authorize('CASHIER'), confirmMessage)

// ── Test parser ──
router.post('/test-parse', authenticate, testParse)

export default router
