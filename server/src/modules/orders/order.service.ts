import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import { emitOrderNew, emitOrderStatusChanged } from '../../socket/socketManager'
import logger from '../../utils/logger'
import { CreateOrderInput } from './order.validation'

// ── Valid status transitions ───────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PREPARING'],
  PREPARING: ['SERVED'],
  SERVED: [],
  CANCELLED: [],
}

// ── Service Functions ──────────────────────────────────────────────────────

/**
 * Create a new order for an active session.
 * Validates session, menu items, and computes totals from current prices.
 */
export async function createOrder(data: CreateOrderInput, userId: number) {
  // 1. Validate session exists and is ACTIVE
  const session = await prisma.session.findUnique({
    where: { id: data.sessionId },
    select: { id: true, status: true },
  })

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Không tìm thấy phiên')
  }

  if (session.status !== 'ACTIVE') {
    throw new AppError(400, 'SESSION_NOT_ACTIVE', 'Phiên không ở trạng thái hoạt động')
  }

  // 2 & 3. Validate all menu items exist and are available, fetch prices
  const menuItemIds = data.items.map((i) => i.menuItemId)
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: {
      id: true,
      name: true,
      price: true,
      isAvailable: true,
      productId: true,
      product: { select: { stockQuantity: true } },
    },
  })

  if (menuItems.length !== menuItemIds.length) {
    const foundIds = menuItems.map((m) => m.id)
    const missing = menuItemIds.filter((id) => !foundIds.includes(id))
    throw new AppError(
      404,
      'MENU_ITEM_NOT_FOUND',
      `Không tìm thấy món: ${missing.join(', ')}`
    )
  }

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]))

  for (const item of data.items) {
    const menuItem = menuItemMap.get(item.menuItemId)!

    // Auto-check stock availability
    const outOfStock =
      menuItem.product !== null && menuItem.product.stockQuantity <= 0

    if (!menuItem.isAvailable || outOfStock) {
      throw new AppError(
        400,
        'MENU_ITEM_UNAVAILABLE',
        `Món "${menuItem.name}" hiện không còn phục vụ`
      )
    }
  }

  // 5. Compute totalAmount
  let totalAmount = new Prisma.Decimal(0)
  const orderItemsData = data.items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId)!
    const unitPrice = menuItem.price
    const subtotal = unitPrice.mul(item.quantity)
    totalAmount = totalAmount.add(subtotal)

    return {
      menuItemId: item.menuItemId,
      productId: menuItem.productId ?? null,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      notes: item.notes ?? null,
    }
  })

  // 6. Create Order + OrderItems in a transaction
  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        sessionId: data.sessionId,
        createdById: userId,
        status: 'PENDING',
        totalAmount,
        notes: data.notes ?? null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true, image: true },
            },
          },
        },
        session: {
          select: { room: { select: { name: true } } },
        },
        createdBy: { select: { fullName: true } },
      },
    })
  })

  // Notify kitchen + connected staff in realtime. Fire-and-forget — don't
  // fail the API call if socket emit hits a transient issue.
  try {
    emitOrderNew({
      orderId: order.id,
      roomName: order.session.room.name,
      items: order.items.map((it) => ({
        name: it.menuItem.name,
        quantity: it.quantity,
      })),
      createdBy: order.createdBy.fullName,
    })
  } catch (err) {
    logger.warn('Failed to emit order:new', { module: 'orders', orderId: order.id, err })
  }

  return order
}

/**
 * Get all orders for a session, sorted by creation time (newest first).
 */
export async function getOrdersBySession(sessionId: number) {
  // Verify session exists
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true },
  })

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Không tìm thấy phiên')
  }

  return prisma.order.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              categoryId: true,
            },
          },
        },
      },
      createdBy: {
        select: { id: true, fullName: true, role: true },
      },
    },
  })
}

/**
 * Update order status with valid transition check.
 * PENDING → PREPARING → SERVED
 */
export async function updateOrderStatus(orderId: number, status: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
  }

  const allowedNext = STATUS_TRANSITIONS[order.status] ?? []
  if (!allowedNext.includes(status)) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Không thể chuyển trạng thái từ ${order.status} sang ${status}`
    )
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as 'PENDING' | 'PREPARING' | 'SERVED' | 'CANCELLED' },
    include: {
      items: {
        include: {
          menuItem: { select: { id: true, name: true } },
        },
      },
      session: { select: { room: { select: { name: true } } } },
    },
  })

  try {
    emitOrderStatusChanged({
      orderId,
      roomName: updated.session.room.name,
      oldStatus: order.status,
      newStatus: status,
    })
  } catch (err) {
    logger.warn('Failed to emit order:status_changed', { module: 'orders', orderId, err })
  }

  return updated
}

/**
 * Cancel an order. Only PENDING orders can be cancelled. Atomic guard so
 * a concurrent updateStatus that just bumped the row to PREPARING doesn't
 * lose to a slower cancel call.
 */
export async function cancelOrder(
  orderId: number,
  reason: string,
  _userId: number,
) {
  const claim = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'CANCELLED', cancelReason: reason },
  })

  if (claim.count === 0) {
    // Either the order doesn't exist or it has moved past PENDING. Look up
    // the row so we can give a precise error.
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    })
    if (!existing) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
    }
    throw new AppError(
      400,
      'ORDER_CANNOT_CANCEL',
      `Chỉ có thể hủy đơn hàng ở trạng thái PENDING, đơn hiện tại: ${existing.status}`,
    )
  }

  const result = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      cancelReason: true,
      updatedAt: true,
      session: { select: { room: { select: { name: true } } } },
    },
  })

  try {
    emitOrderStatusChanged({
      orderId,
      roomName: result?.session.room.name ?? '',
      oldStatus: 'PENDING',
      newStatus: 'CANCELLED',
    })
  } catch (err) {
    logger.warn('Failed to emit cancel event', { module: 'orders', orderId, err })
  }

  return {
    id: result!.id,
    status: result!.status,
    cancelReason: result!.cancelReason,
    updatedAt: result!.updatedAt,
  }
}

/**
 * Update a single order item quantity.
 * quantity = 0 removes the item entirely.
 * Recalculates order totalAmount after update.
 */
export async function updateOrderItem(
  orderId: number,
  itemId: number,
  quantity: number
) {
  // Validate order exists and is still editable
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
  }

  if (order.status === 'CANCELLED' || order.status === 'SERVED') {
    throw new AppError(
      400,
      'ORDER_NOT_EDITABLE',
      `Không thể chỉnh sửa đơn hàng ở trạng thái ${order.status}`
    )
  }

  // Validate order item exists and belongs to the order
  const orderItem = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
    select: { id: true, unitPrice: true },
  })

  if (!orderItem) {
    throw new AppError(404, 'ORDER_ITEM_NOT_FOUND', 'Không tìm thấy món trong đơn hàng')
  }

  return prisma.$transaction(async (tx) => {
    if (quantity === 0) {
      // Remove item
      await tx.orderItem.delete({ where: { id: itemId } })
    } else {
      // Update quantity and recalculate subtotal
      const newSubtotal = orderItem.unitPrice.mul(quantity)
      await tx.orderItem.update({
        where: { id: itemId },
        data: { quantity, subtotal: newSubtotal },
      })
    }

    // Recalculate order total from remaining items
    const remainingItems = await tx.orderItem.findMany({
      where: { orderId },
      select: { subtotal: true },
    })

    const newTotal = remainingItems.reduce(
      (acc, item) => acc.add(item.subtotal),
      new Prisma.Decimal(0)
    )

    return tx.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
      include: {
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true } },
          },
        },
      },
    })
  })
}

/**
 * Get orders for kitchen display: PENDING and PREPARING, oldest first.
 */
export async function getOrdersForKitchen() {
  return prisma.order.findMany({
    where: {
      status: { in: ['PENDING', 'PREPARING'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      session: {
        select: {
          id: true,
          room: { select: { id: true, name: true } },
        },
      },
      items: {
        include: {
          menuItem: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  })
}
