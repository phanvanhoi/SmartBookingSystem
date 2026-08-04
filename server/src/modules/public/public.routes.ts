import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  publicBookingSchema,
  publicSpinSchema,
  updateSpinPrizeSchema,
} from './public.validation'
import {
  listRoomsHandler,
  getAvailabilityHandler,
  createBookingHandler,
  getCampaignHandler,
  getTokenHandler,
  spinHandler,
  adminCampaignHandler,
  updatePrizeHandler,
  recentSpinsHandler,
} from './public.controller'

const router = Router()

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    },
  },
})

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Bạn đã đặt quá nhiều lịch trong 1 giờ. Vui lòng thử lại sau.',
    },
  },
})

const spinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều lần quay. Vui lòng thử lại sau.',
    },
  },
})

// ── Public (no auth) ─────────────────────────────────────────────────────────

router.get('/rooms', publicLimiter, listRoomsHandler)
router.get('/availability', publicLimiter, getAvailabilityHandler)
router.post(
  '/bookings',
  publicLimiter,
  bookingLimiter,
  validate(publicBookingSchema),
  createBookingHandler,
)
router.get('/spin/campaign', publicLimiter, getCampaignHandler)
router.get('/spin/token/:token', publicLimiter, getTokenHandler)
router.post('/spin', publicLimiter, spinLimiter, validate(publicSpinSchema), spinHandler)

// ── Admin (OWNER) ────────────────────────────────────────────────────────────

router.get('/admin/spin/campaign', authenticate, authorize('OWNER'), adminCampaignHandler)
router.patch(
  '/admin/spin/prizes/:id',
  authenticate,
  authorize('OWNER'),
  validate(updateSpinPrizeSchema),
  updatePrizeHandler,
)
router.get('/admin/spin/recent', authenticate, authorize('OWNER'), recentSpinsHandler)

export default router
