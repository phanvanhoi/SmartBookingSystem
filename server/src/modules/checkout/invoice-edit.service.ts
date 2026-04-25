/**
 * Admin-only invoice editing operations.
 *
 * Each function:
 *  - Wraps DB writes in a transaction
 *  - Recomputes derived totals (grandTotal, debtAmount) from scratch when
 *    relevant fields change
 *  - Writes an AuditLog row with details so the owner can trace any change
 *  - Reverses stock when items are removed / invoice is voided
 *
 * Source-of-truth check: Invoice.subtotal = roomCharge + orderTotal. Any
 * mutation that changes one must recompute that and re-apply the discount,
 * surcharge, deposit, and bill rounding so the invoice stays internally
 * consistent.
 */
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import logger from '../../utils/logger'
import { calculateRoomPrice, roundBillUp, getBillRoundAmount } from '../rooms/pricing.service'
import { deductStockForOrder } from '../stock/stock.service'

// ── Helpers ─────────────────────────────────────────────────────────────────

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  return typeof v === 'number' ? v : Number(v)
}

async function logAudit(
  tx: Prisma.TransactionClient,
  userId: number,
  action: string,
  invoiceId: number,
  details: Record<string, unknown>,
) {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      entityType: 'invoice',
      entityId: invoiceId,
      details: details as unknown as Prisma.InputJsonValue,
    },
  })
}

/**
 * Recompute grandTotal from current invoice fields, applying the bill round.
 * grandTotal = max(0, subtotal − discount − deposit + surcharge), then ceil.
 */
async function recomputeGrandTotal(args: {
  subtotal: number
  discountAmount: number
  surchargeAmount: number
  depositApplied: number
}): Promise<number> {
  const raw = Math.max(
    0,
    args.subtotal - args.discountAmount - args.depositApplied + args.surchargeAmount,
  )
  const step = await getBillRoundAmount()
  return roundBillUp(raw, step)
}

// ════════════════════════════════════════════════════════════════════════════
// 1. VOID — hủy hóa đơn, hoàn kho, giải phóng phòng nếu cần
// ════════════════════════════════════════════════════════════════════════════

export async function voidInvoice(invoiceId: number, reason: string, actorUserId: number) {
  if (reason.trim().length < 3) {
    throw new AppError(400, 'INVALID_REASON', 'Lý do hủy tối thiểu 3 ký tự')
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      session: {
        include: {
          orders: {
            where: { status: { not: 'CANCELLED' } },
            include: { items: true },
          },
        },
      },
    },
  })
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  if (invoice.status === 'VOID') {
    throw new AppError(400, 'INVOICE_ALREADY_VOID', 'Hóa đơn đã bị hủy')
  }

  // Re-stock every product item from this invoice's orders. We use
  // deductStockForOrder with negative quantities — emit an OUT_SALE entry
  // with quantity > 0 to reflect the reverse. Easiest: push back through
  // the same transaction with explicit StockEntry rows.
  await prisma.$transaction(async (tx) => {
    // Collect items to restock (only those linked to a Product)
    const itemsToRestock: Array<{ productId: number; quantity: number; orderItemId: number }> = []
    for (const order of invoice.session.orders) {
      for (const item of order.items) {
        if (item.productId !== null) {
          itemsToRestock.push({
            productId: item.productId,
            quantity: item.quantity,
            orderItemId: item.id,
          })
        }
      }
    }

    for (const item of itemsToRestock) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      })
      await tx.stockEntry.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          quantity: item.quantity, // positive = restock
          reason: `Hoàn kho hủy HĐ #${invoice.invoiceNumber}`,
          createdById: actorUserId,
        },
      })
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'VOID',
        // Reuse discountReason as the void reason so we don't add a column.
        // The audit log holds the structured detail.
        discountReason: `[HỦY] ${reason}`,
      },
    })

    // If this invoice's session is still ACTIVE somehow (shouldn't be), don't
    // touch it. Otherwise leave the session COMPLETED — voiding doesn't
    // resurrect a session.

    await logAudit(tx, actorUserId, 'INVOICE_VOID', invoiceId, {
      invoiceNumber: invoice.invoiceNumber,
      reason,
      restockedItems: itemsToRestock.length,
      grandTotal: num(invoice.grandTotal),
    })
  })

  logger.info('Invoice voided', {
    module: 'invoice-edit',
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    actorUserId,
  })
  return getInvoiceLite(invoiceId)
}

// ════════════════════════════════════════════════════════════════════════════
// 2. SETTLE DEBT — ghi nhận khách trả nợ thêm, có thể clear PARTIAL → PAID
// ════════════════════════════════════════════════════════════════════════════

export async function settleDebt(
  invoiceId: number,
  data: { amount: number; method: 'CASH' | 'QR_TRANSFER'; cashReceived?: number },
  actorUserId: number,
) {
  if (data.amount <= 0) {
    throw new AppError(400, 'INVALID_AMOUNT', 'Số tiền trả phải lớn hơn 0')
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  if (invoice.status === 'VOID') {
    throw new AppError(400, 'INVOICE_VOID', 'Hóa đơn đã hủy, không thể thu nợ')
  }

  const currentDebt = num(invoice.debtAmount)
  if (currentDebt <= 0) {
    throw new AppError(400, 'NO_DEBT', 'Hóa đơn không có khoản nợ')
  }

  // Cap the payment to the outstanding debt — overpayment becomes change,
  // not credit. Cashier should adjust manually if customer paid extra.
  const appliedAmount = Math.min(data.amount, currentDebt)
  const newDebt = currentDebt - appliedAmount
  const newStatus = newDebt > 0 ? 'PARTIAL' : 'PAID'

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        method: data.method,
        amount: appliedAmount,
        cashReceived:
          data.method === 'CASH' && data.cashReceived !== undefined ? data.cashReceived : null,
        cashChange:
          data.method === 'CASH' && data.cashReceived !== undefined
            ? Math.max(0, data.cashReceived - appliedAmount)
            : null,
      },
    })

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        debtAmount: newDebt,
        status: newStatus,
      },
    })

    await logAudit(tx, actorUserId, 'INVOICE_SETTLE_DEBT', invoiceId, {
      invoiceNumber: invoice.invoiceNumber,
      amountPaid: appliedAmount,
      method: data.method,
      remainingDebt: newDebt,
    })
  })

  return getInvoiceLite(invoiceId)
}

// ════════════════════════════════════════════════════════════════════════════
// 3. ADJUST DISCOUNT / SURCHARGE — sửa giảm giá hoặc phụ thu
// ════════════════════════════════════════════════════════════════════════════

export async function adjustInvoiceDiscount(
  invoiceId: number,
  data: {
    discountAmount?: number
    discountReason?: string
    surchargeAmount?: number
    surchargeReason?: string
  },
  actorUserId: number,
) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  if (invoice.status === 'VOID') {
    throw new AppError(400, 'INVOICE_VOID', 'Không thể sửa hóa đơn đã hủy')
  }

  const subtotal = num(invoice.subtotal)
  const newDiscount =
    data.discountAmount !== undefined ? Math.max(0, data.discountAmount) : num(invoice.discountAmount)
  const newSurcharge =
    data.surchargeAmount !== undefined
      ? Math.max(0, data.surchargeAmount)
      : num(invoice.surchargeAmount)

  if (newDiscount > subtotal + newSurcharge) {
    throw new AppError(400, 'DISCOUNT_TOO_BIG', 'Giảm giá vượt quá tổng hóa đơn')
  }

  const newGrandTotal = await recomputeGrandTotal({
    subtotal,
    discountAmount: newDiscount,
    surchargeAmount: newSurcharge,
    depositApplied: num(invoice.depositApplied),
  })

  // The amount paid stayed the same, so adjust debt accordingly:
  //   newDebt = max(0, newGrandTotal − totalCashPaid)
  // where totalCashPaid = old grandTotal − old debt (everything that wasn't owed).
  const oldGrandTotal = num(invoice.grandTotal)
  const oldDebt = num(invoice.debtAmount)
  const totalPaid = Math.max(0, oldGrandTotal - oldDebt)
  const newDebt = Math.max(0, newGrandTotal - totalPaid)
  const newStatus = newDebt > 0 ? 'PARTIAL' : 'PAID'

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        discountAmount: newDiscount,
        discountReason: data.discountReason ?? invoice.discountReason,
        surchargeAmount: newSurcharge,
        surchargeReason: data.surchargeReason ?? invoice.surchargeReason,
        grandTotal: newGrandTotal,
        debtAmount: newDebt,
        status: newStatus,
      },
    })

    await logAudit(tx, actorUserId, 'INVOICE_ADJUST_DISCOUNT', invoiceId, {
      invoiceNumber: invoice.invoiceNumber,
      old: {
        discountAmount: num(invoice.discountAmount),
        surchargeAmount: num(invoice.surchargeAmount),
        grandTotal: oldGrandTotal,
      },
      new: {
        discountAmount: newDiscount,
        surchargeAmount: newSurcharge,
        grandTotal: newGrandTotal,
      },
      reason: data.discountReason,
    })
  })

  return getInvoiceLite(invoiceId)
}

// ════════════════════════════════════════════════════════════════════════════
// 4. CHANGE PAYMENT METHOD — đổi cash → QR (sau khi đã ghi sai)
// ════════════════════════════════════════════════════════════════════════════

export async function changePaymentMethod(
  invoiceId: number,
  paymentId: number,
  newMethod: 'CASH' | 'QR_TRANSFER',
  actorUserId: number,
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.invoiceId !== invoiceId) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Không tìm thấy thanh toán')
  }
  if (payment.method === 'DEBT') {
    throw new AppError(400, 'CANNOT_CHANGE_DEBT', 'Không thể đổi phương thức của khoản nợ')
  }
  if (newMethod === payment.method) {
    return { ok: true, message: 'Phương thức không thay đổi' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        method: newMethod,
        // Clear cash-only fields when switching to QR
        ...(newMethod === 'QR_TRANSFER'
          ? { cashReceived: null, cashChange: null }
          : { qrCodeUsed: null }),
      },
    })

    await logAudit(tx, actorUserId, 'INVOICE_CHANGE_PAYMENT_METHOD', invoiceId, {
      paymentId,
      from: payment.method,
      to: newMethod,
      amount: num(payment.amount),
    })
  })

  return getInvoiceLite(invoiceId)
}

// ════════════════════════════════════════════════════════════════════════════
// 5. EDIT TIMES → RECOMPUTE roomCharge
// ════════════════════════════════════════════════════════════════════════════

export async function editInvoiceTimes(
  invoiceId: number,
  data: { checkInTime?: string; checkOutTime?: string },
  actorUserId: number,
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { session: { include: { room: true } } },
  })
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  if (invoice.status === 'VOID') {
    throw new AppError(400, 'INVOICE_VOID', 'Không thể sửa hóa đơn đã hủy')
  }

  const newCheckIn = data.checkInTime ? new Date(data.checkInTime) : invoice.session.checkInTime
  const newCheckOut = data.checkOutTime
    ? new Date(data.checkOutTime)
    : invoice.session.checkOutTime ?? new Date()

  if (newCheckOut <= newCheckIn) {
    throw new AppError(400, 'INVALID_TIMES', 'Thời gian ra phải sau thời gian vào')
  }

  // Recompute the room charge with new times
  const breakdown = await calculateRoomPrice(newCheckIn, newCheckOut, invoice.session.room.roomTypeId)
  const newRoomCharge = breakdown.total
  const oldRoomCharge = num(invoice.roomCharge)
  const orderTotal = num(invoice.orderTotal)
  const newSubtotal = newRoomCharge + orderTotal
  const newGrandTotal = await recomputeGrandTotal({
    subtotal: newSubtotal,
    discountAmount: num(invoice.discountAmount),
    surchargeAmount: num(invoice.surchargeAmount),
    depositApplied: num(invoice.depositApplied),
  })
  const oldGrandTotal = num(invoice.grandTotal)
  const oldDebt = num(invoice.debtAmount)
  const totalPaid = Math.max(0, oldGrandTotal - oldDebt)
  const newDebt = Math.max(0, newGrandTotal - totalPaid)
  const newStatus = newDebt > 0 ? 'PARTIAL' : 'PAID'

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: invoice.sessionId },
      data: {
        checkInTime: newCheckIn,
        checkOutTime: newCheckOut,
        roomCharge: newRoomCharge,
      },
    })
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        roomCharge: newRoomCharge,
        subtotal: newSubtotal,
        grandTotal: newGrandTotal,
        debtAmount: newDebt,
        status: newStatus,
      },
    })

    await logAudit(tx, actorUserId, 'INVOICE_EDIT_TIMES', invoiceId, {
      invoiceNumber: invoice.invoiceNumber,
      old: {
        checkInTime: invoice.session.checkInTime,
        checkOutTime: invoice.session.checkOutTime,
        roomCharge: oldRoomCharge,
        grandTotal: oldGrandTotal,
      },
      new: {
        checkInTime: newCheckIn,
        checkOutTime: newCheckOut,
        roomCharge: newRoomCharge,
        grandTotal: newGrandTotal,
      },
    })
  })

  return getInvoiceLite(invoiceId)
}

// ════════════════════════════════════════════════════════════════════════════
// 6. ADD / REMOVE ORDER ITEMS POST-CHECKOUT
// ════════════════════════════════════════════════════════════════════════════

export async function addInvoiceItem(
  invoiceId: number,
  data: { menuItemId: number; quantity: number; notes?: string },
  actorUserId: number,
) {
  if (data.quantity <= 0) {
    throw new AppError(400, 'INVALID_QUANTITY', 'Số lượng phải lớn hơn 0')
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { session: true },
  })
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  if (invoice.status === 'VOID') {
    throw new AppError(400, 'INVOICE_VOID', 'Không thể sửa hóa đơn đã hủy')
  }

  const menuItem = await prisma.menuItem.findUnique({ where: { id: data.menuItemId } })
  if (!menuItem) {
    throw new AppError(404, 'MENU_ITEM_NOT_FOUND', 'Không tìm thấy món')
  }

  const unitPrice = menuItem.price
  const subtotalDecimal = unitPrice.mul(data.quantity)
  const itemSubtotal = num(subtotalDecimal)

  // Find an existing post-checkout order for this session, else create one.
  // We tag added orders with notes so they're identifiable.
  const session = invoice.session
  const existingOrder = await prisma.order.findFirst({
    where: { sessionId: session.id, notes: '__POST_CHECKOUT_EDIT__' },
  })

  await prisma.$transaction(async (tx) => {
    let orderId: number
    if (existingOrder) {
      orderId = existingOrder.id
      await tx.order.update({
        where: { id: orderId },
        data: { totalAmount: { increment: itemSubtotal } },
      })
    } else {
      const newOrder = await tx.order.create({
        data: {
          sessionId: session.id,
          createdById: actorUserId,
          status: 'SERVED',
          totalAmount: itemSubtotal,
          notes: '__POST_CHECKOUT_EDIT__',
        },
      })
      orderId = newOrder.id
    }

    await tx.orderItem.create({
      data: {
        orderId,
        menuItemId: menuItem.id,
        productId: menuItem.productId ?? null,
        quantity: data.quantity,
        unitPrice,
        subtotal: subtotalDecimal,
        notes: data.notes ?? null,
      },
    })

    // Deduct stock for the new item (atomic, throws on insufficient stock)
    if (menuItem.productId) {
      await deductStockForOrder([{ productId: menuItem.productId, quantity: data.quantity }], actorUserId, tx)
    }

    // Recompute invoice totals
    const newOrderTotal = num(invoice.orderTotal) + itemSubtotal
    const newSubtotal = num(invoice.roomCharge) + newOrderTotal
    const newGrandTotal = await recomputeGrandTotal({
      subtotal: newSubtotal,
      discountAmount: num(invoice.discountAmount),
      surchargeAmount: num(invoice.surchargeAmount),
      depositApplied: num(invoice.depositApplied),
    })
    const totalPaid = Math.max(0, num(invoice.grandTotal) - num(invoice.debtAmount))
    const newDebt = Math.max(0, newGrandTotal - totalPaid)

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        orderTotal: newOrderTotal,
        subtotal: newSubtotal,
        grandTotal: newGrandTotal,
        debtAmount: newDebt,
        status: newDebt > 0 ? 'PARTIAL' : 'PAID',
      },
    })

    await logAudit(tx, actorUserId, 'INVOICE_ADD_ITEM', invoiceId, {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: data.quantity,
      addedAmount: itemSubtotal,
      newGrandTotal,
    })
  })

  return getInvoiceLite(invoiceId)
}

export async function removeInvoiceItem(
  invoiceId: number,
  orderItemId: number,
  actorUserId: number,
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { session: true },
  })
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  if (invoice.status === 'VOID') {
    throw new AppError(400, 'INVOICE_VOID', 'Không thể sửa hóa đơn đã hủy')
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, menuItem: true },
  })
  if (!item || item.order.sessionId !== invoice.sessionId) {
    throw new AppError(404, 'ORDER_ITEM_NOT_FOUND', 'Không tìm thấy món trong hóa đơn này')
  }

  const itemSubtotal = num(item.subtotal)

  await prisma.$transaction(async (tx) => {
    // Restock if linked to a product
    if (item.productId !== null) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      })
      await tx.stockEntry.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          quantity: item.quantity,
          reason: `Hoàn kho xóa món HĐ #${invoice.invoiceNumber}`,
          createdById: actorUserId,
        },
      })
    }

    await tx.orderItem.delete({ where: { id: orderItemId } })

    // Recompute order's totalAmount; if no items left, mark order CANCELLED
    const remainingSubtotal = await tx.orderItem.aggregate({
      where: { orderId: item.orderId },
      _sum: { subtotal: true },
    })
    const newOrderTotal = num(remainingSubtotal._sum.subtotal)
    if (newOrderTotal === 0) {
      await tx.order.update({
        where: { id: item.orderId },
        data: { totalAmount: 0, status: 'CANCELLED' },
      })
    } else {
      await tx.order.update({
        where: { id: item.orderId },
        data: { totalAmount: newOrderTotal },
      })
    }

    // Recompute invoice totals
    const newInvoiceOrderTotal = Math.max(0, num(invoice.orderTotal) - itemSubtotal)
    const newSubtotal = num(invoice.roomCharge) + newInvoiceOrderTotal
    const newGrandTotal = await recomputeGrandTotal({
      subtotal: newSubtotal,
      discountAmount: num(invoice.discountAmount),
      surchargeAmount: num(invoice.surchargeAmount),
      depositApplied: num(invoice.depositApplied),
    })
    const totalPaid = Math.max(0, num(invoice.grandTotal) - num(invoice.debtAmount))
    const newDebt = Math.max(0, newGrandTotal - totalPaid)

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        orderTotal: newInvoiceOrderTotal,
        subtotal: newSubtotal,
        grandTotal: newGrandTotal,
        debtAmount: newDebt,
        status: newDebt > 0 ? 'PARTIAL' : 'PAID',
      },
    })

    await logAudit(tx, actorUserId, 'INVOICE_REMOVE_ITEM', invoiceId, {
      orderItemId,
      menuItemName: item.menuItem.name,
      quantity: item.quantity,
      removedAmount: itemSubtotal,
      newGrandTotal,
    })
  })

  return getInvoiceLite(invoiceId)
}

// ── lightweight refresher used by every mutation as the response ──
async function getInvoiceLite(invoiceId: number) {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!inv) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    roomCharge: num(inv.roomCharge),
    orderTotal: num(inv.orderTotal),
    subtotal: num(inv.subtotal),
    discountAmount: num(inv.discountAmount),
    discountReason: inv.discountReason,
    surchargeAmount: num(inv.surchargeAmount),
    surchargeReason: inv.surchargeReason,
    depositApplied: num(inv.depositApplied),
    grandTotal: num(inv.grandTotal),
    debtAmount: num(inv.debtAmount),
    status: inv.status,
    updatedAt: new Date(),
  }
}
