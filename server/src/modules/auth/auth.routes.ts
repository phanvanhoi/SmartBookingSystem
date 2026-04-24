import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { loginHandler, getMeHandler, changePasswordHandler } from './auth.controller'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { loginSchema, changePasswordSchema } from './auth.validation'

const router = Router()

// Brute-force protection: max 10 login attempts per IP per 15 minutes.
// Counts ALL attempts (success + fail) — keeps the limiter simple and predictable.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.',
    },
  },
})

// Same threat model for /password — an attacker who steals a session token
// could try to brute-force the *current* password to lock the user out.
// Stricter cap because legitimate password changes are rare.
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều lần đổi mật khẩu. Vui lòng thử lại sau 1 tiếng.',
    },
  },
})

// POST /api/v1/auth/login - Đăng nhập (không cần auth)
router.post('/login', loginLimiter, validate(loginSchema), loginHandler)

// GET /api/v1/auth/me - Lấy thông tin user hiện tại
router.get('/me', authenticate, getMeHandler)

// PATCH /api/v1/auth/password - Đổi mật khẩu
router.patch(
  '/password',
  authenticate,
  passwordChangeLimiter,
  validate(changePasswordSchema),
  changePasswordHandler,
)

export default router
