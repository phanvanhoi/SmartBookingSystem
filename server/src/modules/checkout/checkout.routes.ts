import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import { checkoutSchema, invoiceQuerySchema } from './checkout.validation'
import {
  processCheckoutHandler,
  getQRHandler,
  getInvoicesHandler,
  getInvoiceByIdHandler,
} from './checkout.controller'

const router = Router()

// POST /api/v1/checkout — Thanh toán (CASHIER+)
router.post(
  '/',
  authenticate,
  authorize('CASHIER'),
  validate(checkoutSchema),
  processCheckoutHandler,
)

// GET /api/v1/checkout/qr — Lấy mã QR hiện tại
router.get('/qr', authenticate, getQRHandler)

// GET /api/v1/checkout/invoices — Danh sách hóa đơn
router.get('/invoices', authenticate, validate(invoiceQuerySchema, 'query'), getInvoicesHandler)

// GET /api/v1/checkout/invoices/:id — Chi tiết hóa đơn
router.get('/invoices/:id', authenticate, getInvoiceByIdHandler)

export default router
