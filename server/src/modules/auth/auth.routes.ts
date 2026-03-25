import { Router } from 'express'
import { loginHandler, getMeHandler, changePasswordHandler } from './auth.controller'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { loginSchema, changePasswordSchema } from './auth.validation'

const router = Router()

// POST /api/v1/auth/login - Đăng nhập (không cần auth)
router.post('/login', validate(loginSchema), loginHandler)

// GET /api/v1/auth/me - Lấy thông tin user hiện tại
router.get('/me', authenticate, getMeHandler)

// PATCH /api/v1/auth/password - Đổi mật khẩu
router.patch('/password', authenticate, validate(changePasswordSchema), changePasswordHandler)

export default router
