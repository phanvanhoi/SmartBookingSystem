import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  checkinSchema,
  extendSchema,
  transferSchema,
  mergeSchema,
  sessionQuerySchema,
} from './room.validation'
import {
  checkin,
  checkout,
  extendSession,
  transferSession,
  mergeSessions,
  getSessions,
} from './room.controller'

const router = Router()

// GET /api/v1/sessions — lịch sử sessions
router.get('/', authenticate, validate(sessionQuerySchema, 'query'), getSessions)

// POST /api/v1/sessions/checkin — check-in (CASHIER+)
router.post('/checkin', authenticate, authorize('CASHIER'), validate(checkinSchema), checkin)

// POST /api/v1/sessions/merge — gộp phòng (MANAGER+)
router.post('/merge', authenticate, authorize('MANAGER'), validate(mergeSchema), mergeSessions)

// POST /api/v1/sessions/:sessionId/checkout — checkout (CASHIER+)
router.post('/:sessionId/checkout', authenticate, authorize('CASHIER'), checkout)

// PATCH /api/v1/sessions/:sessionId/extend — gia hạn (CASHIER+)
router.patch(
  '/:sessionId/extend',
  authenticate,
  authorize('CASHIER'),
  validate(extendSchema),
  extendSession,
)

// POST /api/v1/sessions/:sessionId/transfer — chuyển phòng (CASHIER+)
router.post(
  '/:sessionId/transfer',
  authenticate,
  authorize('CASHIER'),
  validate(transferSchema),
  transferSession,
)

export default router
