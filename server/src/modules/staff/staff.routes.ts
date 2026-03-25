import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  createStaffSchema,
  updateStaffSchema,
  resetPasswordSchema,
  getAuditLogsQuerySchema,
} from './staff.validation'
import {
  getStaffHandler,
  createStaffHandler,
  updateStaffHandler,
  resetPasswordHandler,
  toggleActiveHandler,
  getAuditLogsHandler,
} from './staff.controller'

const router = Router()

// GET /staff/audit-logs - Xem audit logs (OWNER)
// NOTE: phải đặt trước /:id để tránh match nhầm
router.get(
  '/audit-logs',
  authenticate,
  authorize('OWNER'),
  validate(getAuditLogsQuerySchema, 'query'),
  getAuditLogsHandler
)

// GET /staff - Danh sách nhân viên (OWNER)
router.get(
  '/',
  authenticate,
  authorize('OWNER'),
  getStaffHandler
)

// POST /staff - Tạo nhân viên mới (OWNER)
router.post(
  '/',
  authenticate,
  authorize('OWNER'),
  validate(createStaffSchema),
  createStaffHandler
)

// PUT /staff/:id - Cập nhật thông tin nhân viên (OWNER)
router.put(
  '/:id',
  authenticate,
  authorize('OWNER'),
  validate(updateStaffSchema),
  updateStaffHandler
)

// PATCH /staff/:id/reset-password - Đặt lại mật khẩu (OWNER)
router.patch(
  '/:id/reset-password',
  authenticate,
  authorize('OWNER'),
  validate(resetPasswordSchema),
  resetPasswordHandler
)

// PATCH /staff/:id/toggle-active - Kích hoạt/vô hiệu hóa (OWNER)
router.patch(
  '/:id/toggle-active',
  authenticate,
  authorize('OWNER'),
  toggleActiveHandler
)

export default router
