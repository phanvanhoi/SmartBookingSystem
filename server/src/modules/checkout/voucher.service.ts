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

// ─── applyVoucher ─────────────────────────────────────────────────────────────

export async function applyVoucher(
  code: string,
  subtotal: number,
): Promise<{ discountAmount: number; voucher: Awaited<ReturnType<typeof validateVoucher>> }> {
  const voucher = await validateVoucher(code)

  let discountAmount: number

  if (voucher.discountType === 'PERCENTAGE') {
    const pct = Number(voucher.discountValue) // e.g. 20 = 20%
    discountAmount = Math.round(subtotal * (pct / 100))

    // Respect maxDiscount cap
    if (voucher.maxDiscount !== null) {
      discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount))
    }
  } else {
    // FIXED_AMOUNT
    discountAmount = Number(voucher.discountValue)
  }

  // Discount can never exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal)

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
