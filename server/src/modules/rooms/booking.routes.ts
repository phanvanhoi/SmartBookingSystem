import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import { bookingSchema, cancelBookingSchema, bookingQuerySchema } from './room.validation'
import {
  createBooking,
  getBookings,
  confirmBooking,
  cancelBooking,
  updateBooking,
} from './room.controller'

const router = Router()

// POST /api/v1/bookings — tạo booking (CASHIER+)
router.post('/', authenticate, authorize('CASHIER'), validate(bookingSchema), createBooking)

// GET /api/v1/bookings — danh sách bookings
router.get('/', authenticate, validate(bookingQuerySchema, 'query'), getBookings)

// PATCH /api/v1/bookings/:bookingId — cập nhật booking (kéo thả)
router.patch('/:bookingId', authenticate, authorize('CASHIER'), updateBooking)

// POST /api/v1/bookings/:bookingId/confirm — xác nhận → check-in (CASHIER+)
router.post('/:bookingId/confirm', authenticate, authorize('CASHIER'), confirmBooking)

// PATCH /api/v1/bookings/:bookingId/cancel — hủy booking (CASHIER+)
router.patch(
  '/:bookingId/cancel',
  authenticate,
  authorize('CASHIER'),
  validate(cancelBookingSchema),
  cancelBooking,
)

export default router
