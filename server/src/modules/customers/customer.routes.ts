import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  createCustomerSchema,
  updateCustomerSchema,
  blacklistSchema,
  redeemPointsSchema,
  lookupQuerySchema,
  getCustomersQuerySchema,
  paginationQuerySchema,
} from './customer.validation'
import {
  getCustomersHandler,
  lookupByPhoneHandler,
  getBirthdayCustomersHandler,
  getCustomerByIdHandler,
  getCustomerHistoryHandler,
  getCustomerPointsHandler,
  createCustomerHandler,
  updateCustomerHandler,
  toggleBlacklistHandler,
  redeemPointsHandler,
} from './customer.controller'

const router = Router()

// ── Public to authenticated users ────────────────────────────────────────────

// GET /customers - Danh sách khách hàng
router.get(
  '/',
  authenticate,
  validate(getCustomersQuerySchema, 'query'),
  getCustomersHandler
)

// GET /customers/lookup?phone=... - Tra cứu nhanh theo SĐT
// NOTE: phải đặt trước /:id để tránh bị match nhầm
router.get(
  '/lookup',
  authenticate,
  validate(lookupQuerySchema, 'query'),
  lookupByPhoneHandler
)

// GET /customers/birthdays - Khách có sinh nhật hôm nay
router.get(
  '/birthdays',
  authenticate,
  getBirthdayCustomersHandler
)

// GET /customers/:id - Chi tiết khách hàng
router.get(
  '/:id',
  authenticate,
  getCustomerByIdHandler
)

// GET /customers/:id/history - Lịch sử ghé thăm
router.get(
  '/:id/history',
  authenticate,
  validate(paginationQuerySchema, 'query'),
  getCustomerHistoryHandler
)

// GET /customers/:id/points - Lịch sử tích/đổi điểm
router.get(
  '/:id/points',
  authenticate,
  validate(paginationQuerySchema, 'query'),
  getCustomerPointsHandler
)

// ── CASHIER and above ─────────────────────────────────────────────────────────

// POST /customers - Tạo khách hàng mới
router.post(
  '/',
  authenticate,
  authorize('CASHIER'),
  validate(createCustomerSchema),
  createCustomerHandler
)

// PUT /customers/:id - Cập nhật thông tin khách hàng
router.put(
  '/:id',
  authenticate,
  authorize('CASHIER'),
  validate(updateCustomerSchema),
  updateCustomerHandler
)

// ── MANAGER and above ─────────────────────────────────────────────────────────

// PATCH /customers/:id/blacklist - Đánh dấu/bỏ blacklist
router.patch(
  '/:id/blacklist',
  authenticate,
  authorize('MANAGER'),
  validate(blacklistSchema),
  toggleBlacklistHandler
)

// POST /customers/:id/redeem-points - Đổi điểm
router.post(
  '/:id/redeem-points',
  authenticate,
  authorize('MANAGER'),
  validate(redeemPointsSchema),
  redeemPointsHandler
)

export default router
