import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  openShiftSchema,
  closeShiftSchema,
  getShiftsQuerySchema,
} from './shift.validation'
import {
  openShiftHandler,
  closeShiftHandler,
  getCurrentShiftHandler,
  getShiftsHandler,
} from './shift.controller'

const router = Router()

// GET /shifts/current - Ca hiện tại (tất cả authenticated user)
// NOTE: phải đặt trước /:shiftId để tránh match nhầm
router.get(
  '/current',
  authenticate,
  getCurrentShiftHandler
)

// GET /shifts - Lịch sử ca (MANAGER+)
router.get(
  '/',
  authenticate,
  authorize('MANAGER'),
  validate(getShiftsQuerySchema, 'query'),
  getShiftsHandler
)

// POST /shifts/open - Mở ca (MANAGER+)
router.post(
  '/open',
  authenticate,
  authorize('MANAGER'),
  validate(openShiftSchema),
  openShiftHandler
)

// POST /shifts/:shiftId/close - Đóng ca (MANAGER+)
router.post(
  '/:shiftId/close',
  authenticate,
  authorize('MANAGER'),
  validate(closeShiftSchema),
  closeShiftHandler
)

export default router
