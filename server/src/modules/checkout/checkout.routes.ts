import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  checkoutSchema,
  invoiceQuerySchema,
  voidInvoiceSchema,
  settleDebtSchema,
  adjustDiscountSchema,
  changePaymentMethodSchema,
  editTimesSchema,
  addInvoiceItemSchema,
} from './checkout.validation'
import {
  processCheckoutHandler,
  getQRHandler,
  getInvoicesHandler,
  getInvoiceByIdHandler,
  voidInvoiceHandler,
  settleDebtHandler,
  adjustDiscountHandler,
  changePaymentMethodHandler,
  editTimesHandler,
  addInvoiceItemHandler,
  removeInvoiceItemHandler,
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

// ─── Admin invoice editing — OWNER only ──────────────────────────────────────

router.post(
  '/invoices/:id/void',
  authenticate, authorize('OWNER'),
  validate(voidInvoiceSchema),
  voidInvoiceHandler,
)
router.post(
  '/invoices/:id/settle-debt',
  authenticate, authorize('OWNER'),
  validate(settleDebtSchema),
  settleDebtHandler,
)
router.patch(
  '/invoices/:id/discount',
  authenticate, authorize('OWNER'),
  validate(adjustDiscountSchema),
  adjustDiscountHandler,
)
router.patch(
  '/invoices/:id/payments/:paymentId',
  authenticate, authorize('OWNER'),
  validate(changePaymentMethodSchema),
  changePaymentMethodHandler,
)
router.patch(
  '/invoices/:id/times',
  authenticate, authorize('OWNER'),
  validate(editTimesSchema),
  editTimesHandler,
)
router.post(
  '/invoices/:id/items',
  authenticate, authorize('OWNER'),
  validate(addInvoiceItemSchema),
  addInvoiceItemHandler,
)
router.delete(
  '/invoices/:id/items/:itemId',
  authenticate, authorize('OWNER'),
  removeInvoiceItemHandler,
)

export default router
