import { Request, Response, NextFunction } from 'express'
import * as orderService from './order.service'
import { CreateOrderInput, UpdateStatusInput, CancelOrderInput, UpdateItemInput } from './order.validation'

// ── Create Order ───────────────────────────────────────────────────────────

export async function createOrderHandler(
  req: Request<object, object, CreateOrderInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để tiếp tục' },
      })
      return
    }

    const order = await orderService.createOrder(req.body, req.user.id)
    res.status(201).json({ success: true, data: order, message: 'Tạo đơn hàng thành công' })
  } catch (err) {
    next(err)
  }
}

// ── Get Orders By Session ──────────────────────────────────────────────────

export async function getOrdersBySessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = parseInt(req.query['sessionId'] as string, 10)

    if (isNaN(sessionId) || sessionId <= 0) {
      res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sessionId phải là số nguyên dương' },
      })
      return
    }

    const orders = await orderService.getOrdersBySession(sessionId)
    res.status(200).json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}

// ── Kitchen View ───────────────────────────────────────────────────────────

export async function getOrdersForKitchenHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orders = await orderService.getOrdersForKitchen()
    res.status(200).json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}

// ── Update Order Status ────────────────────────────────────────────────────

export async function updateOrderStatusHandler(
  req: Request<{ id: string }, object, UpdateStatusInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10)
    const { status } = req.body

    const order = await orderService.updateOrderStatus(orderId, status)
    res.status(200).json({ success: true, data: order, message: 'Cập nhật trạng thái thành công' })
  } catch (err) {
    next(err)
  }
}

// ── Cancel Order ───────────────────────────────────────────────────────────

export async function cancelOrderHandler(
  req: Request<{ id: string }, object, CancelOrderInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để tiếp tục' },
      })
      return
    }

    const orderId = parseInt(req.params.id, 10)
    const { reason } = req.body

    const order = await orderService.cancelOrder(orderId, reason, req.user.id)
    res.status(200).json({ success: true, data: order, message: 'Hủy đơn hàng thành công' })
  } catch (err) {
    next(err)
  }
}

// ── Update Order Item ──────────────────────────────────────────────────────

export async function updateOrderItemHandler(
  req: Request<{ id: string; itemId: string }, object, UpdateItemInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10)
    const itemId = parseInt(req.params.itemId, 10)
    const { quantity } = req.body

    const order = await orderService.updateOrderItem(orderId, itemId, quantity)
    res.status(200).json({ success: true, data: order, message: 'Cập nhật món thành công' })
  } catch (err) {
    next(err)
  }
}
