import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import { revenueQuerySchema, exportQuerySchema, dateRangeQuerySchema } from './report.validation'
import {
  getDashboard,
  getRevenueReport,
  getRoomReport,
  getPeakHoursReport,
  getStockReport,
  getShiftReport,
  exportReport,
} from './report.controller'

const router = Router()

// GET /api/v1/reports/dashboard — tổng quan dashboard (mọi nhân viên)
router.get('/dashboard', authenticate, getDashboard)

// GET /api/v1/reports/revenue — báo cáo doanh thu (MANAGER+)
router.get(
  '/revenue',
  authenticate,
  authorize('MANAGER'),
  validate(revenueQuerySchema, 'query'),
  getRevenueReport,
)

// GET /api/v1/reports/rooms — phân tích phòng (MANAGER+)
router.get(
  '/rooms',
  authenticate,
  authorize('MANAGER'),
  validate(dateRangeQuerySchema, 'query'),
  getRoomReport,
)

// GET /api/v1/reports/peak-hours — giờ cao điểm (MANAGER+)
router.get(
  '/peak-hours',
  authenticate,
  authorize('MANAGER'),
  validate(dateRangeQuerySchema, 'query'),
  getPeakHoursReport,
)

// GET /api/v1/reports/stock — báo cáo kho (MANAGER+)
router.get(
  '/stock',
  authenticate,
  authorize('MANAGER'),
  validate(dateRangeQuerySchema, 'query'),
  getStockReport,
)

// GET /api/v1/reports/shifts — báo cáo ca (MANAGER+)
router.get(
  '/shifts',
  authenticate,
  authorize('MANAGER'),
  validate(dateRangeQuerySchema, 'query'),
  getShiftReport,
)

// GET /api/v1/reports/export — xuất báo cáo (MANAGER+)
router.get(
  '/export',
  authenticate,
  authorize('MANAGER'),
  validate(exportQuerySchema, 'query'),
  exportReport,
)

export default router
