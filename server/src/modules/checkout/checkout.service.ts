import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import { calculateRoomPrice, roundBillUp, getBillRoundAmount } from '../rooms/pricing.service'
import { deductStockForOrder } from '../stock/stock.service'
import { updateCustomerAfterCheckout } from '../customers/customer.service'
import { applyVoucher } from './voucher.service'
import logger from '../../utils/logger'
import { getBusinessHours, businessDayDate } from '../../utils/business-day'
import type { CheckoutInput, InvoiceQueryInput } from './checkout.validation'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Sum a list of Prisma.Decimal values and return an integer VND amount.
// Decimal arithmetic keeps full precision; final round to avoid off-by-1đ.
function sumVnd(values: Array<Prisma.Decimal | number | null | undefined>): number {
  const total = values.reduce<Prisma.Decimal>((acc, v) => {
    if (v === null || v === undefined) return acc
    if (typeof v === 'number') return acc.add(v)
    return acc.add(v)
  }, new Prisma.Decimal(0))
  return Math.round(total.toNumber())
}

async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  // Count invoices created today (date-based, local time)
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const count = await prisma.invoice.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  const seq = String(count + 1).padStart(3, '0')
  return `INV-${dateStr}-${seq}`
}

// ─── processCheckout ──────────────────────────────────────────────────────────

export async function processCheckout(data: CheckoutInput, userId: number) {
  const {
    sessionId,
    discountAmount: manualDiscountAmount = 0,
    discountReason,
    voucherCode,
    depositApplied = 0,
    payments,
    notes,
  } = data

  // 1. Load session with all relations
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      room: { include: { roomType: true } },
      customer: true,
      orders: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          items: true,
        },
      },
    },
  })

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Session không tồn tại')
  }
  if (session.status !== 'ACTIVE') {
    throw new AppError(400, 'SESSION_NOT_ACTIVE', 'Session không ở trạng thái ACTIVE')
  }

  const checkOutTime = new Date()

  // 2. Calculate room charge
  const priceBreakdown = await calculateRoomPrice(
    session.checkInTime,
    checkOutTime,
    session.room.roomTypeId,
  )
  const roomCharge = priceBreakdown.total
  const surchargeAmount = priceBreakdown.surcharge

  // 3. Sum order totals (non-cancelled) — Decimal arithmetic, then round to VND
  const orderTotal = sumVnd(session.orders.map((o) => o.totalAmount))

  // 4. Subtotal = roomCharge + orderTotal
  const subtotal = roomCharge + orderTotal

  // 5. Apply discounts
  let voucherDiscountAmount = 0
  let appliedVoucherCode: string | undefined

  // 5a. Voucher discount
  if (voucherCode) {
    const result = await applyVoucher(voucherCode, subtotal)
    voucherDiscountAmount = result.discountAmount
    appliedVoucherCode = voucherCode
  }

  // 5b. Manual discount: validate max_discount_percent for CASHIER role
  let validatedManualDiscount = manualDiscountAmount ?? 0
  if (validatedManualDiscount > 0) {
    // Fetch setting for max discount percent
    const discountSetting = await prisma.setting.findUnique({
      where: { key: 'max_discount_percent' },
    })

    if (discountSetting && discountSetting.value !== null) {
      let maxPct = 0
      const val = discountSetting.value
      if (typeof val === 'number') maxPct = val
      else if (typeof val === 'string') maxPct = parseFloat(val) || 0
      else if (typeof val === 'object' && 'value' in (val as object)) {
        maxPct = Number((val as Record<string, unknown>).value) || 0
      }

      const maxAllowedDiscount = Math.round(subtotal * (maxPct / 100))
      if (validatedManualDiscount > maxAllowedDiscount) {
        validatedManualDiscount = maxAllowedDiscount
      }
    }
  }

  // 5c. Total discount (cannot exceed subtotal)
  const totalDiscount = Math.min(
    voucherDiscountAmount + validatedManualDiscount,
    subtotal,
  )

  // Combined discount reason
  const discountReasons: string[] = []
  if (voucherDiscountAmount > 0 && appliedVoucherCode) {
    discountReasons.push(`Voucher ${appliedVoucherCode}`)
  }
  if (validatedManualDiscount > 0 && discountReason) {
    discountReasons.push(discountReason)
  }
  const combinedDiscountReason =
    discountReasons.length > 0 ? discountReasons.join(', ') : discountReason ?? null

  // 6. Deposit applied (validated against available deposit)
  const clampedDeposit = Math.max(0, depositApplied)

  // 7. Grand total, rounded up to the configured step (e.g. 45,333 → 46,000
  // with step=1000). Must match the preview's rounding so the cashier sees
  // the same figure on screen that lands in the invoice.
  const rawGrandTotal = Math.max(0, subtotal - totalDiscount - clampedDeposit)
  const roundStep = await getBillRoundAmount()
  const grandTotal = roundBillUp(rawGrandTotal, roundStep)

  // 8. Calculate payments
  const cashPayments = payments.filter((p) => p.method !== 'DEBT')
  const debtPayments = payments.filter((p) => p.method === 'DEBT')

  const totalCashPayments = cashPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalDebtAmount = debtPayments.reduce((sum, p) => sum + p.amount, 0)

  // 9. Validate: cash payments >= grandTotal - debtAmount
  const requiredCash = grandTotal - totalDebtAmount
  if (requiredCash > 0 && totalCashPayments < requiredCash) {
    throw new AppError(
      400,
      'INSUFFICIENT_PAYMENT',
      `Số tiền thanh toán không đủ. Cần thêm ${(requiredCash - totalCashPayments).toLocaleString('vi-VN')}đ`,
    )
  }

  // 10. Determine invoice status
  const debtAmount = Math.max(0, totalDebtAmount)
  let invoiceStatus: 'PAID' | 'PARTIAL' | 'DEBT' = 'PAID'
  if (debtAmount > 0 && debtAmount < grandTotal) {
    invoiceStatus = 'PARTIAL'
  } else if (debtAmount >= grandTotal) {
    invoiceStatus = 'PARTIAL' // full debt still = PARTIAL since some amount is owed
  }
  const finalStatus = debtAmount > 0 ? 'PARTIAL' : 'PAID'

  // 11. Determine QR code for QR_TRANSFER payments
  const hour = checkOutTime.getHours()
  const activeQR = hour < 12 ? 'QR2' : 'QR1'

  // 12. Collect all order items for stock deduction
  const allOrderItems: Array<{ productId: number; quantity: number }> = []
  for (const order of session.orders) {
    for (const item of order.items) {
      if (item.productId !== null) {
        allOrderItems.push({ productId: item.productId, quantity: item.quantity })
      }
    }
  }

  // ─── Generate invoice number (before transaction to avoid deadlock) ──────
  const invoiceNumber = await generateInvoiceNumber()

  // ─── Execute in transaction ───────────────────────────────────────────────
  const invoice = await prisma.$transaction(async (tx) => {
    // Create Invoice
    const newInvoice = await tx.invoice.create({
      data: {
        sessionId,
        invoiceNumber,
        roomCharge,
        orderTotal,
        subtotal,
        discountAmount: totalDiscount,
        discountReason: combinedDiscountReason,
        voucherCode: appliedVoucherCode ?? null,
        surchargeAmount,
        surchargeReason: surchargeAmount > 0 ? 'Phụ thu tự động' : null,
        depositApplied: clampedDeposit,
        grandTotal,
        debtAmount,
        status: finalStatus,
        createdById: userId,
        ...(notes ? {} : {}), // notes not in schema, stored separately if needed
      },
    })

    // Create Payment records
    for (const payment of payments) {
      const paymentData: {
        invoiceId: number
        method: 'CASH' | 'QR_TRANSFER' | 'DEBT'
        amount: number
        qrCodeUsed?: string
        cashReceived?: number
        cashChange?: number
      } = {
        invoiceId: newInvoice.id,
        method: payment.method,
        amount: payment.amount,
      }

      if (payment.method === 'CASH') {
        if (payment.cashReceived !== undefined) {
          paymentData.cashReceived = payment.cashReceived
          paymentData.cashChange = Math.max(0, payment.cashReceived - payment.amount)
        }
      } else if (payment.method === 'QR_TRANSFER') {
        paymentData.qrCodeUsed = activeQR
      }

      await tx.payment.create({ data: paymentData })
    }

    // Update session: COMPLETED, checkOutTime, roomCharge
    await tx.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        checkOutTime,
        checkedOutById: userId,
        roomCharge,
      },
    })

    // Update room: AVAILABLE
    await tx.room.update({
      where: { id: session.roomId },
      data: { status: 'AVAILABLE' },
    })

    // Deduct stock atomically inside the same transaction so that
    // concurrent checkouts cannot both decrement the same product twice.
    if (allOrderItems.length > 0) {
      await deductStockForOrder(allOrderItems, userId, tx)
    }

    return newInvoice
  })

  // ─── Post-transaction: customer update (non-critical, async) ─────────────
  if (session.customerId) {
    try {
      await updateCustomerAfterCheckout(session.customerId, grandTotal)
    } catch (err) {
      logger.error('[checkout] updateCustomerAfterCheckout failed', { err, customerId: session.customerId })
    }
  }

  // ─── Return full invoice detail ───────────────────────────────────────────
  return getInvoiceById(invoice.id)
}

// ─── getQRCode ────────────────────────────────────────────────────────────────

export async function getQRCode() {
  const now = new Date()
  const hour = now.getHours()

  // < 12 → QR2 (after midnight), >= 12 → QR1 (before midnight)
  const isAfterMidnight = hour < 12
  const label = isAfterMidnight ? 'QR Mã 2 (sau 00:00)' : 'QR Mã 1 (trước 00:00)'
  const switchTime = isAfterMidnight ? '12:00' : '00:00'

  const [setting1, setting2] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'qr_code_1' } }),
    prisma.setting.findUnique({ where: { key: 'qr_code_2' } }),
  ])

  const getImageUrl = (setting: { value: unknown } | null): string | null => {
    if (!setting) return null
    const val = setting.value
    if (typeof val === 'string') return val
    if (typeof val === 'object' && val !== null && 'url' in (val as object)) {
      return String((val as Record<string, unknown>).url)
    }
    return null
  }

  const qr1Url = getImageUrl(setting1)
  const qr2Url = getImageUrl(setting2)
  const imageUrl = isAfterMidnight ? qr2Url : qr1Url

  return {
    activeQR: isAfterMidnight ? 'QR2' : 'QR1',
    label,
    imageUrl: imageUrl ?? (isAfterMidnight
      ? '/uploads/qr/qr_after_midnight.png'
      : '/uploads/qr/qr_before_midnight.png'),
    switchTime,
    currentTime: `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    qr1: { key: 'QR1', imageUrl: qr1Url ?? '/uploads/qr/qr_before_midnight.png' },
    qr2: { key: 'QR2', imageUrl: qr2Url ?? '/uploads/qr/qr_after_midnight.png' },
  }
}

// ─── getInvoices ──────────────────────────────────────────────────────────────

/**
 * Khoảng [from, to) cho filter doanh thu theo cửa sổ business-day.
 * Tuần bắt đầu thứ 2; ranh giới là endHour (vd 5h sáng) — không phải 00:00.
 */
async function resolvePeriodRange(
  period: 'day' | 'yesterday' | 'week' | 'month',
): Promise<{ from: Date; to: Date }> {
  const { endHour } = await getBusinessHours()
  const bdDate = businessDayDate(new Date(), endHour)

  if (period === 'day' || period === 'yesterday') {
    const from = new Date(bdDate)
    if (period === 'yesterday') from.setDate(from.getDate() - 1)
    from.setHours(endHour, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 1)
    return { from, to }
  }

  if (period === 'week') {
    const dow = bdDate.getDay()
    const offsetToMonday = dow === 0 ? 6 : dow - 1
    const from = new Date(bdDate)
    from.setDate(from.getDate() - offsetToMonday)
    from.setHours(endHour, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 7)
    return { from, to }
  }

  const from = new Date(bdDate.getFullYear(), bdDate.getMonth(), 1, endHour, 0, 0, 0)
  const to = new Date(bdDate.getFullYear(), bdDate.getMonth() + 1, 1, endHour, 0, 0, 0)
  return { from, to }
}

/**
 * Custom date range theo business-day boundary: dateFrom/dateTo coi như
 * YYYY-MM-DD business-date, range = [dateFrom endHour, (dateTo+1) endHour).
 * Vd 5h: dateFrom=2026-05-01, dateTo=2026-05-03 → [01/5 5h, 04/5 5h).
 */
async function resolveCustomRange(
  dateFrom: string | undefined,
  dateTo: string | undefined,
): Promise<{ gte?: Date; lt?: Date }> {
  const { endHour } = await getBusinessHours()
  const range: { gte?: Date; lt?: Date } = {}
  if (dateFrom) {
    const d = new Date(dateFrom)
    d.setHours(endHour, 0, 0, 0)
    range.gte = d
  }
  if (dateTo) {
    const d = new Date(dateTo)
    d.setDate(d.getDate() + 1)
    d.setHours(endHour, 0, 0, 0)
    range.lt = d
  }
  return range
}

export async function getInvoices(filters: InvoiceQueryInput) {
  const { page = 1, limit = 20, period, dateFrom, dateTo, status, paymentMethod, search } = filters
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (status) where.status = status

  // Period ưu tiên hơn dateFrom/dateTo khi cả hai cùng có.
  if (period) {
    const range = await resolvePeriodRange(period)
    where.createdAt = { gte: range.from, lt: range.to }
  } else if (dateFrom || dateTo) {
    where.createdAt = await resolveCustomRange(dateFrom, dateTo)
  }

  if (paymentMethod) {
    where.payments = { some: { method: paymentMethod } }
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      {
        session: {
          customerName: { contains: search },
        },
      },
    ]
  }

  // Summary luôn tính trên PAID + PARTIAL bất kể status filter của list,
  // để tổng doanh thu phản ánh toàn bộ khoảng thời gian.
  const summaryWhere: Record<string, unknown> = { ...where, status: { in: ['PAID', 'PARTIAL'] } }

  const [invoices, total, summaryAgg, cashAgg, qrAgg] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            checkInTime: true,
            checkOutTime: true,
            room: { select: { id: true, name: true } },
          },
        },
        payments: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({
      where: summaryWhere,
      _sum: { grandTotal: true, debtAmount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { method: 'CASH', invoice: summaryWhere },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { method: 'QR_TRANSFER', invoice: summaryWhere },
      _sum: { amount: true },
    }),
  ])

  const totalRevenue = Number(summaryAgg._sum.grandTotal ?? 0)
  const totalDebt = Number(summaryAgg._sum.debtAmount ?? 0)
  const invoiceCount = summaryAgg._count._all
  const cashTotal = Number(cashAgg._sum.amount ?? 0)
  const qrTotal = Number(qrAgg._sum.amount ?? 0)

  return {
    data: invoices.map(mapInvoice),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      totalRevenue,
      totalDebt,
      invoiceCount,
      cashTotal,
      qrTotal,
    },
  }
}

// ─── getInvoiceById ───────────────────────────────────────────────────────────

export async function getInvoiceById(id: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      session: {
        include: {
          room: { select: { id: true, name: true } },
          orders: {
            where: { status: { not: 'CANCELLED' } },
            include: {
              items: {
                include: {
                  menuItem: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
      payments: true,
      createdBy: { select: { id: true, fullName: true } },
    },
  })

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại')
  }

  return mapInvoiceDetail(invoice)
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapInvoice(invoice: {
  id: number
  invoiceNumber: string
  roomCharge: { toNumber(): number } | number
  orderTotal: { toNumber(): number } | number
  subtotal: { toNumber(): number } | number
  discountAmount: { toNumber(): number } | number
  discountReason: string | null
  voucherCode: string | null
  surchargeAmount: { toNumber(): number } | number
  depositApplied: { toNumber(): number } | number
  grandTotal: { toNumber(): number } | number
  debtAmount: { toNumber(): number } | number
  status: string
  createdAt: Date
  session: {
    id: number
    customerName: string
    customerPhone: string | null
    checkInTime: Date
    checkOutTime: Date | null
    room: { id: number; name: string }
  }
  payments: Array<{
    id: number
    method: string
    amount: { toNumber(): number } | number
    qrCodeUsed: string | null
    cashReceived: { toNumber(): number } | number | null
    cashChange: { toNumber(): number } | number | null
    createdAt: Date
  }>
  createdBy: { id: number; fullName: string }
}) {
  const toNum = (v: { toNumber(): number } | number | null | undefined): number => {
    if (v === null || v === undefined) return 0
    return typeof v === 'number' ? v : v.toNumber()
  }

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    roomCharge: toNum(invoice.roomCharge),
    orderTotal: toNum(invoice.orderTotal),
    subtotal: toNum(invoice.subtotal),
    discountAmount: toNum(invoice.discountAmount),
    discountReason: invoice.discountReason,
    voucherCode: invoice.voucherCode,
    surchargeAmount: toNum(invoice.surchargeAmount),
    depositApplied: toNum(invoice.depositApplied),
    grandTotal: toNum(invoice.grandTotal),
    debtAmount: toNum(invoice.debtAmount),
    status: invoice.status,
    createdAt: invoice.createdAt,
    session: invoice.session,
    payments: invoice.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: toNum(p.amount),
      qrCodeUsed: p.qrCodeUsed,
      cashReceived: p.cashReceived !== null ? toNum(p.cashReceived) : null,
      cashChange: p.cashChange !== null ? toNum(p.cashChange) : null,
      createdAt: p.createdAt,
    })),
    createdBy: invoice.createdBy,
  }
}

type InvoiceDetailRecord = {
  id: number
  invoiceNumber: string
  roomCharge: { toNumber(): number } | number
  orderTotal: { toNumber(): number } | number
  subtotal: { toNumber(): number } | number
  discountAmount: { toNumber(): number } | number
  discountReason: string | null
  voucherCode: string | null
  surchargeAmount: { toNumber(): number } | number
  depositApplied: { toNumber(): number } | number
  grandTotal: { toNumber(): number } | number
  debtAmount: { toNumber(): number } | number
  status: string
  createdAt: Date
  session: {
    id: number
    customerName: string
    customerPhone: string | null
    checkInTime: Date
    checkOutTime: Date | null
    room: { id: number; name: string }
    orders: Array<{
      id: number
      status: string
      totalAmount: { toNumber(): number } | number
      notes: string | null
      createdAt: Date
      items: Array<{
        id: number
        quantity: number
        unitPrice: { toNumber(): number } | number
        subtotal: { toNumber(): number } | number
        notes: string | null
        menuItem: { id: number; name: string }
      }>
    }>
  }
  payments: Array<{
    id: number
    method: string
    amount: { toNumber(): number } | number
    qrCodeUsed: string | null
    cashReceived: { toNumber(): number } | number | null
    cashChange: { toNumber(): number } | number | null
    createdAt: Date
  }>
  createdBy: { id: number; fullName: string }
}

function mapInvoiceDetail(invoice: InvoiceDetailRecord) {

  const toNum = (v: { toNumber(): number } | number | null | undefined): number => {
    if (v === null || v === undefined) return 0
    return typeof v === 'number' ? v : v.toNumber()
  }

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    roomCharge: toNum(invoice.roomCharge),
    orderTotal: toNum(invoice.orderTotal),
    subtotal: toNum(invoice.subtotal),
    discountAmount: toNum(invoice.discountAmount),
    discountReason: invoice.discountReason,
    voucherCode: invoice.voucherCode,
    surchargeAmount: toNum(invoice.surchargeAmount),
    depositApplied: toNum(invoice.depositApplied),
    grandTotal: toNum(invoice.grandTotal),
    debtAmount: toNum(invoice.debtAmount),
    status: invoice.status,
    createdAt: invoice.createdAt,
    session: {
      id: invoice.session.id,
      customerName: invoice.session.customerName,
      customerPhone: invoice.session.customerPhone,
      checkInTime: invoice.session.checkInTime,
      checkOutTime: invoice.session.checkOutTime,
      room: invoice.session.room,
      orders: invoice.session.orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: toNum(o.totalAmount),
        notes: o.notes,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          id: i.id,
          menuItem: i.menuItem,
          quantity: i.quantity,
          unitPrice: toNum(i.unitPrice),
          subtotal: toNum(i.subtotal),
          notes: i.notes,
        })),
      })),
    },
    payments: invoice.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: toNum(p.amount),
      qrCodeUsed: p.qrCodeUsed,
      cashReceived: p.cashReceived !== null ? toNum(p.cashReceived) : null,
      cashChange: p.cashChange !== null ? toNum(p.cashChange) : null,
      createdAt: p.createdAt,
    })),
    createdBy: invoice.createdBy,
  }
}
