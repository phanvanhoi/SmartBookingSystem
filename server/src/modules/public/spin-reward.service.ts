import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import logger from '../../utils/logger'

type Tx = Prisma.TransactionClient

const PROMO_SKUS = {
  coca: 'PROMO-COCA',
  nuoc_suoi: 'PROMO-SUOI',
  kho: 'PROMO-KHO',
} as const

type PromoKey = keyof typeof PROMO_SKUS

type ParsedLine = { key: PromoKey; qty: number }

type SpinVoucherInfo = {
  rewardCode: string
  prizeType: 'PERCENT_OFF' | 'FIXED_OFF'
  prizeValue: string | null
  label: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  maxDiscount: number | null
}

/**
 * Parse prizeValue like "1 khô gà/bò + 1 nước suối" → line items.
 */
export function parseFreeItemPrize(prizeValue: string): ParsedLine[] {
  const parts = prizeValue
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean)

  const lines: ParsedLine[] = []
  for (const part of parts) {
    const normalized = part.toLowerCase().normalize('NFC')
    const match = normalized.match(/^(\d+)\s+(.+)$/)
    const qty = match ? Math.max(1, Number(match[1])) : 1
    const name = (match ? match[2] : normalized).trim()

    if (/coca|pepsi|cola/.test(name)) {
      lines.push({ key: 'coca', qty })
    } else if (/su[oố]i|suoi|aquafina|lavie/.test(name)) {
      lines.push({ key: 'nuoc_suoi', qty })
    } else if (/kh[oô]|kho|g[aà]|b[oò]/.test(name)) {
      lines.push({ key: 'kho', qty })
    } else {
      logger.warn('[spin-reward] Unmapped prize part', { part })
    }
  }
  return lines
}

async function resolvePromoMenuItems(tx: Tx = prisma) {
  const skus = Object.values(PROMO_SKUS)
  const products = await tx.product.findMany({
    where: { sku: { in: [...skus] }, isActive: true },
    include: {
      menuItems: {
        where: { isAvailable: true },
        take: 1,
        orderBy: { id: 'asc' },
      },
    },
  })

  const bySku = new Map(products.map((p) => [p.sku!, p]))
  const result = new Map<PromoKey, { menuItemId: number; productId: number; name: string }>()

  for (const [key, sku] of Object.entries(PROMO_SKUS) as Array<[PromoKey, string]>) {
    const product = bySku.get(sku)
    const menuItem = product?.menuItems[0]
    if (!product || !menuItem) {
      throw new AppError(
        500,
        'PROMO_MENU_MISSING',
        `Thiếu món khuyến mãi trong hệ thống (${sku}). Chạy seed lại.`,
      )
    }
    result.set(key, {
      menuItemId: menuItem.id,
      productId: product.id,
      name: menuItem.name,
    })
  }

  return result
}

/** ACTIVE session for booking guest — do not require same room (transfer-safe). */
async function findActiveSessionForBooking(bookingId: number, tx: Tx = prisma) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: { roomId: true, customerPhone: true, customerName: true },
  })
  if (!booking) return null

  const customerFilter = booking.customerPhone
    ? { customerPhone: booking.customerPhone }
    : { customerName: booking.customerName }

  // Prefer session on current booking room, else any ACTIVE session for this guest
  const onRoom = await tx.session.findFirst({
    where: { roomId: booking.roomId, status: 'ACTIVE', ...customerFilter },
    orderBy: { checkInTime: 'desc' },
  })
  if (onRoom) return onRoom

  return tx.session.findFirst({
    where: { status: 'ACTIVE', ...customerFilter },
    orderBy: { checkInTime: 'desc' },
  })
}

/** Session id chain: current → transferredFrom → … (max depth guard). */
async function collectTransferAncestorIds(sessionId: number): Promise<number[]> {
  const ids: number[] = [sessionId]
  let currentId: number | null = sessionId
  for (let i = 0; i < 10 && currentId != null; i++) {
    const row: { transferredFromId: number | null } | null = await prisma.session.findUnique({
      where: { id: currentId },
      select: { transferredFromId: true },
    })
    if (!row?.transferredFromId) break
    ids.push(row.transferredFromId)
    currentId = row.transferredFromId
  }
  return ids
}

function toSpinVoucherInfo(args: {
  rewardCode: string
  prizeType: 'PERCENT_OFF' | 'FIXED_OFF'
  prizeValue: string | null
  label: string
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue?: number
  maxDiscount?: number | null
}): SpinVoucherInfo {
  const discountType =
    args.discountType ??
    (args.prizeType === 'PERCENT_OFF' ? 'PERCENTAGE' : 'FIXED_AMOUNT')
  const discountValue = args.discountValue ?? Number(args.prizeValue ?? 0)
  return {
    rewardCode: args.rewardCode,
    prizeType: args.prizeType,
    prizeValue: args.prizeValue,
    label: args.label,
    discountType,
    discountValue,
    maxDiscount:
      args.maxDiscount !== undefined
        ? args.maxDiscount
        : args.prizeType === 'PERCENT_OFF'
          ? 500_000
          : null,
  }
}

/**
 * Attach USED spin prize to an active session as a complimentary order (FREE_ITEM)
 * and/or session notes + voucher hint (PERCENT_OFF / FIXED_OFF).
 * Idempotent via SpinToken.appliedSessionId.
 */
export async function attachSpinRewardToSession(args: {
  bookingId: number
  sessionId: number
  userId: number
  tx?: Tx
}) {
  const db = args.tx ?? prisma

  const token = await db.spinToken.findUnique({
    where: { bookingId: args.bookingId },
    include: { prize: true },
  })

  if (!token || token.status !== 'USED' || !token.prize) {
    return null
  }
  if (token.appliedSessionId) {
    // Already applied — if session was transferred, caller should have rebound id
    return { alreadyApplied: true as const, orderId: token.appliedOrderId }
  }

  const prize = token.prize
  const noteParts = [
    `[KM vòng quay ${token.code}]`,
    token.resultLabel ?? prize.label,
    token.rewardCode ? `Mã: ${token.rewardCode}` : null,
  ].filter(Boolean)

  const session = await db.session.findUnique({ where: { id: args.sessionId } })
  if (!session) return null

  let orderId: number | null = null

  if (prize.prizeType === 'FREE_ITEM') {
    if (!prize.prizeValue) {
      throw new AppError(500, 'PROMO_PARSE_FAILED', 'Phần thưởng FREE_ITEM thiếu mô tả món')
    }
    const parsed = parseFreeItemPrize(prize.prizeValue)
    if (parsed.length === 0) {
      logger.warn('[spin-reward] FREE_ITEM parse empty', { prizeValue: prize.prizeValue })
      throw new AppError(
        500,
        'PROMO_PARSE_FAILED',
        `Không nhận diện được món khuyến mãi: "${prize.prizeValue}"`,
      )
    }

    const catalog = await resolvePromoMenuItems(db)
    const orderItemsData = parsed.map((line) => {
      const item = catalog.get(line.key)!
      return {
        menuItemId: item.menuItemId,
        productId: item.productId,
        quantity: line.qty,
        unitPrice: new Prisma.Decimal(0),
        subtotal: new Prisma.Decimal(0),
        notes: `KM ${token.code}`,
      }
    })

    const order = await db.order.create({
      data: {
        sessionId: args.sessionId,
        createdById: args.userId,
        status: 'PENDING',
        totalAmount: new Prisma.Decimal(0),
        notes: `Khuyến mãi vòng quay ${token.code}: ${prize.label}`,
        items: { create: orderItemsData },
      },
    })
    orderId = order.id
  }

  // Stamp notes only after FREE_ITEM order succeeds (or for % / fixed prizes)
  const mergedNotes = [session.notes, noteParts.join(' — ')].filter(Boolean).join('\n')
  await db.session.update({
    where: { id: args.sessionId },
    data: { notes: mergedNotes },
  })

  await db.spinToken.update({
    where: { id: token.id },
    data: {
      appliedSessionId: args.sessionId,
      appliedOrderId: orderId,
      appliedAt: new Date(),
    },
  })

  return {
    alreadyApplied: false as const,
    orderId,
    prizeType: prize.prizeType,
    rewardCode: token.rewardCode,
    label: prize.label,
  }
}

/** If booking already checked in, attach prize right after spin. */
export async function attachSpinRewardIfSessionExists(args: {
  bookingId: number
  userId: number
}) {
  const session = await findActiveSessionForBooking(args.bookingId)
  if (!session) return null
  return attachSpinRewardToSession({
    bookingId: args.bookingId,
    sessionId: session.id,
    userId: args.userId,
  })
}

/** Move spin token + complimentary order link when session transfers/merges. */
export async function rebindSpinTokenToSession(args: {
  fromSessionId: number
  toSessionId: number
  tx?: Tx
}) {
  const db = args.tx ?? prisma
  await db.spinToken.updateMany({
    where: { appliedSessionId: args.fromSessionId },
    data: { appliedSessionId: args.toSessionId },
  })
}

/** Resolve spin voucher for checkout auto-apply (PERCENT/FIXED). Transfer-safe. */
export async function findSpinVoucherForSession(sessionId: number): Promise<SpinVoucherInfo | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      roomId: true,
      customerPhone: true,
      customerName: true,
      notes: true,
      transferredFromId: true,
    },
  })
  if (!session) return null

  const ancestorIds = await collectTransferAncestorIds(sessionId)

  // Prefer token applied to this session or any transfer ancestor
  let token = await prisma.spinToken.findFirst({
    where: { appliedSessionId: { in: ancestorIds }, status: 'USED' },
    include: { prize: true },
    orderBy: { id: 'desc' },
  })

  // Fallback: booking by guest (any room — transfer may have moved them)
  if (!token) {
    const customerFilter = session.customerPhone
      ? { customerPhone: session.customerPhone }
      : { customerName: session.customerName }

    const booking = await prisma.booking.findFirst({
      where: {
        status: { in: ['CONFIRMED', 'PENDING'] },
        ...customerFilter,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        spinToken: { include: { prize: true } },
      },
    })
    token = booking?.spinToken ?? null
  }

  // Fallback: WIN-* in notes on this session or ancestors
  if ((!token?.prize || !token.rewardCode) && session.notes) {
    const match = session.notes.match(/Mã:\s*(WIN-[A-Z0-9-]+)/i)
    if (match?.[1]) {
      const voucher = await prisma.voucher.findUnique({ where: { code: match[1].toUpperCase() } })
      if (voucher?.isActive) {
        return toSpinVoucherInfo({
          rewardCode: voucher.code,
          prizeType: voucher.discountType === 'PERCENTAGE' ? 'PERCENT_OFF' : 'FIXED_OFF',
          prizeValue: String(voucher.discountValue),
          label: `Voucher ${voucher.code}`,
          discountType: voucher.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT',
          discountValue: Number(voucher.discountValue),
          maxDiscount: voucher.maxDiscount !== null ? Number(voucher.maxDiscount) : null,
        })
      }
    }
  }

  if (!token?.prize || !token.rewardCode) return null
  if (token.prize.prizeType !== 'PERCENT_OFF' && token.prize.prizeType !== 'FIXED_OFF') {
    return null
  }

  return toSpinVoucherInfo({
    rewardCode: token.rewardCode,
    prizeType: token.prize.prizeType,
    prizeValue: token.prize.prizeValue,
    label: token.resultLabel ?? token.prize.label,
  })
}
