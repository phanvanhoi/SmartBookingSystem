import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  createOrderSchema,
  updateStatusSchema,
  cancelOrderSchema,
  updateItemSchema,
} from './order.validation'
import {
  createOrderHandler,
  getOrdersBySessionHandler,
  getOrdersForKitchenHandler,
  updateOrderStatusHandler,
  cancelOrderHandler,
  updateOrderItemHandler,
} from './order.controller'

const router = Router()

// POST /api/v1/orders - Create order (all authenticated roles = STAFF minimum)
router.post(
  '/',
  authenticate,
  authorize('STAFF'),
  validate(createOrderSchema),
  createOrderHandler
)

// GET /api/v1/orders?sessionId=:id - Get orders by session
router.get('/', authenticate, getOrdersBySessionHandler)

// GET /api/v1/orders/kitchen - Kitchen display (PENDING + PREPARING)
router.get('/kitchen', authenticate, getOrdersForKitchenHandler)

// PATCH /api/v1/orders/:id/status - Update order status (STAFF minimum)
router.patch(
  '/:id/status',
  authenticate,
  authorize('STAFF'),
  validate(updateStatusSchema),
  updateOrderStatusHandler
)

// PATCH /api/v1/orders/:id/cancel - Cancel order (MANAGER minimum)
router.patch(
  '/:id/cancel',
  authenticate,
  authorize('MANAGER'),
  validate(cancelOrderSchema),
  cancelOrderHandler
)

// PATCH /api/v1/orders/:id/items/:itemId - Update item quantity (CASHIER minimum)
router.patch(
  '/:id/items/:itemId',
  authenticate,
  authorize('CASHIER'),
  validate(updateItemSchema),
  updateOrderItemHandler
)

export default router
