import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import type { VoucherQueryInput } from './checkout.validation'

// ─── validateVoucher ─────────────────────────────────────────────────────────

export async function validateVoucher(code: string) {
  const voucher = await prisma.voucher.findUnique({ where: { code } })

  if (!voucher) {
    throw new AppError(404, 'VOUCHER_NOT_FOUND', `Voucher "${code}" không tồn tại`)
  }

  if (!voucher.isActive) {
    throw new AppError(400, 'VOUCHER_INACTIVE', 'Voucher đã bị vô hiệu hóa')
  }

  const now = new Date()
  if (now < voucher.validFrom) {
    throw new AppError(400, 'VOUCHER_NOT_STARTED', 'Voucher chưa đến thời gian sử dụng')
  }
  if (now > voucher.validUntil) {
    throw new AppError(400, 'VOUCHER_EXPIRED', 'Voucher đã hết hạn')
  }

  if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
    throw new AppError(400, 'VOUCHER_MAX_USES_REACHED', 'Voucher đã hết lượt sử dụng')
  }

  return voucher
}

/** Pure discount math — does not consume voucher uses (safe for bill preview). */
export function computeVoucherDiscountAmount(args: {
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | string
  discountValue: number
  maxDiscount?: number | null
  baseAmount: number
}): number {
  const base = Math.max(0, args.baseAmount)
  let discountAmount: number

  if (args.discountType === 'PERCENTAGE') {
    discountAmount = Math.round(base * (Number(args.discountValue) / 100))
    if (args.maxDiscount != null) {
      discountAmount = Math.min(discountAmount, Number(args.maxDiscount))
    }
  } else {
    discountAmount = Number(args.discountValue)
  }

  return Math.min(Math.max(0, discountAmount), base)
}

/** Preview helper: validate + compute discount without incrementing usedCount. */
export async function previewVoucherDiscount(
  code: string,
  baseAmount: number,
): Promise<{ discountAmount: number; voucher: Awaited<ReturnType<typeof validateVoucher>> }> {
  const voucher = await validateVoucher(code)
  const discountAmount = computeVoucherDiscountAmount({
    discountType: voucher.discountType,
    discountValue: Number(voucher.discountValue),
    maxDiscount: voucher.maxDiscount !== null ? Number(voucher.maxDiscount) : null,
    baseAmount,
  })
  return { discountAmount, voucher }
}

// ─── applyVoucher ─────────────────────────────────────────────────────────────

export async function applyVoucher(
  code: string,
  subtotal: number,
): Promise<{ discountAmount: number; voucher: Awaited<ReturnType<typeof validateVoucher>> }> {
  const voucher = await validateVoucher(code)

  const discountAmount = computeVoucherDiscountAmount({
    discountType: voucher.discountType,
    discountValue: Number(voucher.discountValue),
    maxDiscount: voucher.maxDiscount !== null ? Number(voucher.maxDiscount) : null,
    baseAmount: subtotal,
  })

  // Atomic increment with maxUses guard. Two concurrent checkouts cannot both
  // win the last use: updateMany returns count=0 when usedCount already hit the
  // cap, and we throw the same error validateVoucher would throw.
  if (voucher.maxUses !== null) {
    const claim = await prisma.voucher.updateMany({
      where: {
        id: voucher.id,
        isActive: true,
        usedCount: { lt: voucher.maxUses },
      },
      data: { usedCount: { increment: 1 } },
    })
    if (claim.count === 0) {
      throw new AppError(400, 'VOUCHER_MAX_USES_REACHED', 'Voucher đã hết lượt sử dụng')
    }
  } else {
    await prisma.voucher.update({
      where: { id: voucher.id },
      data: { usedCount: { increment: 1 } },
    })
  }

  return { discountAmount, voucher }
}

// ─── getVouchers ──────────────────────────────────────────────────────────────

export async function getVouchers(filters: VoucherQueryInput) {
  const { isActive, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where = isActive !== undefined ? { isActive } : {}

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.voucher.count({ where }),
  ])

  return {
    data: vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      discountType: v.discountType,
      discountValue: Number(v.discountValue),
      maxDiscount: v.maxDiscount !== null ? Number(v.maxDiscount) : null,
      maxUses: v.maxUses,
      usedCount: v.usedCount,
      validFrom: v.validFrom,
      validUntil: v.validUntil,
      isActive: v.isActive,
      createdAt: v.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
