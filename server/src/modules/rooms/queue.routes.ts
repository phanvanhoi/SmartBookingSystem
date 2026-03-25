import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import { waitingQueueSchema, queueQuerySchema } from './room.validation'
import { z } from 'zod'
import { addToQueue, getQueue, assignRoom, cancelQueue } from './room.controller'

const assignRoomSchema = z.object({
  roomId: z.number({ required_error: 'roomId là bắt buộc' }).int().positive(),
})

const router = Router()

// POST /api/v1/waiting-queue — thêm vào hàng chờ (CASHIER+)
router.post(
  '/',
  authenticate,
  authorize('CASHIER'),
  validate(waitingQueueSchema),
  addToQueue,
)

// GET /api/v1/waiting-queue — danh sách hàng chờ
router.get('/', authenticate, validate(queueQuerySchema, 'query'), getQueue)

// POST /api/v1/waiting-queue/:id/assign — xếp phòng (CASHIER+)
router.post(
  '/:id/assign',
  authenticate,
  authorize('CASHIER'),
  validate(assignRoomSchema),
  assignRoom,
)

// PATCH /api/v1/waiting-queue/:id/cancel — hủy chờ (CASHIER+)
router.patch('/:id/cancel', authenticate, authorize('CASHIER'), cancelQueue)

export default router
