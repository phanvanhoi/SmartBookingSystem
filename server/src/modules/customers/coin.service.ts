/**
 * Member coin wallet (ví coin trả trước của hội viên). 1 coin = 1 VND.
 *
 * Every balance change goes through here so Customer.coinBalance and the
 * CoinTransaction ledger can never disagree:
 *   TOPUP  — member pays cash/QR at the counter, balance goes up
 *   SPEND  — coin used as a payment method at checkout (in checkout's tx)
 *   REFUND — coin given back when a coin-paid invoice is voided (in void's tx)
 */
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import logger from '../../utils/logger'

export type TopUpMethod = 'CASH' | 'QR_TRANSFER'

// Sanity cap for a single top-up — catches a typo like an extra zero.
const MAX_TOPUP = 100_000_000

function mapTx(t: {
  id: number
  type: string
  amount: number
  balanceAfter: number
  paymentMethod: string | null
  invoiceId: number | null
  note: string | null
  createdAt: Date
  createdBy?: { fullName: string } | null
}) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    balanceAfter: t.balanceAfter,
    paymentMethod: t.paymentMethod,
    invoiceId: t.invoiceId,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
    createdByName: t.createdBy?.fullName ?? null,
  }
}

export async function setMembership(customerId: number, isMember: boolean, userId: number) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer || !customer.isActive) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng')
  }
  if (customer.isMember === isMember) {
    return { id: customer.id, isMember: customer.isMember, coinBalance: customer.coinBalance }
  }
  if (!isMember && customer.coinBalance > 0) {
    throw new AppError(
      400,
      'COIN_BALANCE_REMAINING',
      `Khách còn ${customer.coinBalance.toLocaleString('vi-VN')} coin, không thể tắt hội viên`,
    )
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { isMember, memberSince: isMember ? new Date() : null },
  })
  await prisma.auditLog.create({
    data: {
      userId,
      action: isMember ? 'MEMBER_ENABLE' : 'MEMBER_DISABLE',
      entityType: 'customer',
      entityId: customerId,
      details: { name: customer.name },
    },
  })
  return { id: updated.id, isMember: updated.isMember, coinBalance: updated.coinBalance }
}

export async function topUpCoin(
  customerId: number,
  amount: number,
  method: TopUpMethod,
  note: string | undefined,
  userId: number,
) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError(400, 'INVALID_AMOUNT', 'Số coin nạp phải là số nguyên dương')
  }
  if (amount > MAX_TOPUP) {
    throw new AppError(400, 'AMOUNT_TOO_LARGE', 'Số tiền nạp quá lớn, vui lòng kiểm tra lại')
  }

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } })
    if (!customer || !customer.isActive) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng')
    }
    if (!customer.isMember) {
      throw new AppError(400, 'NOT_A_MEMBER', 'Khách chưa là hội viên')
    }
    const updated = await tx.customer.update({
      where: { id: customerId },
      data: { coinBalance: { increment: amount } },
    })
    const entry = await tx.coinTransaction.create({
      data: {
        customerId,
        type: 'TOPUP',
        amount,
        balanceAfter: updated.coinBalance,
        paymentMethod: method,
        note: note?.trim() || null,
        createdById: userId,
      },
    })
    return { balance: updated.coinBalance, entry }
  })

  await prisma.auditLog
    .create({
      data: {
        userId,
        action: 'COIN_TOPUP',
        entityType: 'customer',
        entityId: customerId,
        details: { amount, method, balanceAfter: result.balance },
      },
    })
    .catch((err: Error) => logger.error('coin topup audit failed', { err }))

  return {
    coinBalance: result.balance,
    transaction: mapTx({ ...result.entry, createdBy: null }),
  }
}

export async function getCoinHistory(customerId: number, page = 1, limit = 20) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, isMember: true, memberSince: true, coinBalance: true },
  })
  if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng')

  const [total, rows] = await Promise.all([
    prisma.coinTransaction.count({ where: { customerId } }),
    prisma.coinTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { createdBy: { select: { fullName: true } } },
    }),
  ])

  return {
    isMember: customer.isMember,
    memberSince: customer.memberSince?.toISOString() ?? null,
    coinBalance: customer.coinBalance,
    transactions: rows.map(mapTx),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }
}

/** Deduct coin for an invoice. Must run inside the checkout transaction. */
export async function spendCoinTx(
  tx: Prisma.TransactionClient,
  customerId: number,
  amount: number,
  invoiceId: number,
  userId: number,
  invoiceNumber: string,
) {
  // Conditional update keeps the balance from ever going negative, even if
  // two checkouts for the same member race each other.
  const res = await tx.customer.updateMany({
    where: { id: customerId, isMember: true, coinBalance: { gte: amount } },
    data: { coinBalance: { decrement: amount } },
  })
  if (res.count === 0) {
    throw new AppError(400, 'INSUFFICIENT_COIN', 'Số dư coin không đủ để thanh toán')
  }
  const after = await tx.customer.findUnique({
    where: { id: customerId },
    select: { coinBalance: true },
  })
  await tx.coinTransaction.create({
    data: {
      customerId,
      type: 'SPEND',
      amount: -amount,
      balanceAfter: after?.coinBalance ?? 0,
      invoiceId,
      note: `Thanh toán HĐ ${invoiceNumber}`,
      createdById: userId,
    },
  })
}

/** Give coin back (voided invoice). Must run inside the void transaction. */
export async function refundCoinTx(
  tx: Prisma.TransactionClient,
  customerId: number,
  amount: number,
  invoiceId: number,
  userId: number,
  invoiceNumber: string,
) {
  const updated = await tx.customer.update({
    where: { id: customerId },
    data: { coinBalance: { increment: amount } },
  })
  await tx.coinTransaction.create({
    data: {
      customerId,
      type: 'REFUND',
      amount,
      balanceAfter: updated.coinBalance,
      invoiceId,
      note: `Hoàn coin do hủy HĐ ${invoiceNumber}`,
      createdById: userId,
    },
  })
}

/** Coin top-ups taken in a time window, split by how the member paid. */
export async function sumCoinTopups(from: Date, to: Date) {
  const rows = await prisma.coinTransaction.groupBy({
    by: ['paymentMethod'],
    where: { type: 'TOPUP', createdAt: { gte: from, lte: to } },
    _sum: { amount: true },
  })
  let cash = 0
  let qr = 0
  for (const r of rows) {
    const amt = r._sum.amount ?? 0
    if (r.paymentMethod === 'CASH') cash += amt
    else if (r.paymentMethod === 'QR_TRANSFER') qr += amt
  }
  return { cash, qr }
}
