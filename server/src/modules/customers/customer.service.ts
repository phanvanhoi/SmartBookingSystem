import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import { CustomerTier } from '../../types/index'
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  GetCustomersQuery,
} from './customer.validation'

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function determineTier(totalSpent: Prisma.Decimal | number): CustomerTier {
  const amount = typeof totalSpent === 'number' ? totalSpent : Number(totalSpent)
  if (amount >= 10_000_000) return 'VIP'
  if (amount >= 5_000_000) return 'GOLD'
  if (amount >= 2_000_000) return 'SILVER'
  return 'REGULAR'
}

async function assertCustomerExists(id: number) {
  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng')
  }
  return customer
}

// ────────────────────────────────────────────────────────────────────────────
// getCustomers
// ────────────────────────────────────────────────────────────────────────────

export interface CustomerListItem {
  id: number
  name: string
  phone: string
  birthday: Date | null
  tier: CustomerTier
  totalSpent: number
  totalPoints: number
  visitCount: number
  lastVisit: Date | null
  isBlacklisted: boolean
  notes: string | null
  createdAt: Date
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getCustomers(
  filters: GetCustomersQuery
): Promise<PaginatedResult<CustomerListItem>> {
  const { search, tier, page, limit } = filters
  const skip = (page - 1) * limit

  // Soft delete: hide rows where isActive=false. Hard-deleted customers are
  // never reachable. To list deactivated customers, add an admin-only flag.
  const where: Prisma.CustomerWhereInput = { isActive: true }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
    ]
  }

  if (tier) {
    where.tier = tier
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        birthday: true,
        tier: true,
        totalSpent: true,
        totalPoints: true,
        visitCount: true,
        lastVisit: true,
        isBlacklisted: true,
        notes: true,
        createdAt: true,
      },
    }),
    prisma.customer.count({ where }),
  ])

  return {
    data: customers.map((c) => ({
      ...c,
      tier: c.tier as CustomerTier,
      totalSpent: Number(c.totalSpent),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// lookupByPhone
// ────────────────────────────────────────────────────────────────────────────

export interface CustomerLookupResult {
  id: number
  name: string
  phone: string
  tier: CustomerTier
  totalSpent: number
  totalPoints: number
  visitCount: number
  lastVisit: Date | null
  isBlacklisted: boolean
  notes: string | null
}

export async function lookupByPhone(phone: string): Promise<CustomerLookupResult | null> {
  // findFirst (not findUnique) so we can also filter on isActive without a
  // second round-trip — soft-deleted records must not be returned at the
  // checkout/checkin point of sale.
  const customer = await prisma.customer.findFirst({
    where: { phone, isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      tier: true,
      totalSpent: true,
      totalPoints: true,
      visitCount: true,
      lastVisit: true,
      isBlacklisted: true,
      notes: true,
    },
  })

  if (!customer) return null

  return {
    ...customer,
    tier: customer.tier as CustomerTier,
    totalSpent: Number(customer.totalSpent),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// getCustomerById
// ────────────────────────────────────────────────────────────────────────────

export interface CustomerDetail {
  id: number
  name: string
  phone: string
  birthday: Date | null
  tier: CustomerTier
  totalSpent: number
  totalPoints: number
  visitCount: number
  lastVisit: Date | null
  notes: string | null
  isBlacklisted: boolean
  blacklistReason: string | null
  createdAt: Date
  updatedAt: Date
}

export async function getCustomerById(id: number): Promise<CustomerDetail> {
  const customer = await prisma.customer.findFirst({
    where: { id, isActive: true },
  })

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng')
  }

  return {
    ...customer,
    tier: customer.tier as CustomerTier,
    totalSpent: Number(customer.totalSpent),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// getCustomerHistory
// ────────────────────────────────────────────────────────────────────────────

export interface CustomerHistoryItem {
  sessionId: number
  roomName: string
  checkInTime: Date
  checkOutTime: Date | null
  durationMinutes: number | null
  grandTotal: number | null
  invoiceNumber: string | null
}

export async function getCustomerHistory(
  id: number,
  page: number,
  limit: number
): Promise<PaginatedResult<CustomerHistoryItem>> {
  await assertCustomerExists(id)

  const skip = (page - 1) * limit

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where: { customerId: id },
      skip,
      take: limit,
      orderBy: { checkInTime: 'desc' },
      select: {
        id: true,
        checkInTime: true,
        checkOutTime: true,
        room: {
          select: { name: true },
        },
        invoice: {
          select: {
            grandTotal: true,
            invoiceNumber: true,
          },
        },
      },
    }),
    prisma.session.count({ where: { customerId: id } }),
  ])

  const data: CustomerHistoryItem[] = sessions.map((s) => {
    let durationMinutes: number | null = null
    if (s.checkOutTime) {
      durationMinutes = Math.round(
        (s.checkOutTime.getTime() - s.checkInTime.getTime()) / 60_000
      )
    }

    return {
      sessionId: s.id,
      roomName: s.room.name,
      checkInTime: s.checkInTime,
      checkOutTime: s.checkOutTime,
      durationMinutes,
      grandTotal: s.invoice ? Number(s.invoice.grandTotal) : null,
      invoiceNumber: s.invoice?.invoiceNumber ?? null,
    }
  })

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// getCustomerPoints
// ────────────────────────────────────────────────────────────────────────────

export interface PointHistoryItem {
  id: number
  action: string
  points: number
  reason: string | null
  createdAt: Date
}

export async function getCustomerPoints(
  id: number,
  page: number,
  limit: number
): Promise<PaginatedResult<PointHistoryItem>> {
  await assertCustomerExists(id)

  const skip = (page - 1) * limit

  const [history, total] = await Promise.all([
    prisma.pointHistory.findMany({
      where: { customerId: id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        points: true,
        reason: true,
        createdAt: true,
      },
    }),
    prisma.pointHistory.count({ where: { customerId: id } }),
  ])

  return {
    data: history,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// createCustomer
// ────────────────────────────────────────────────────────────────────────────

export async function createCustomer(data: CreateCustomerInput): Promise<CustomerDetail> {
  const existing = await prisma.customer.findUnique({ where: { phone: data.phone } })
  if (existing) {
    throw new AppError(409, 'PHONE_ALREADY_EXISTS', 'Số điện thoại đã được đăng ký')
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
      notes: data.notes,
    },
  })

  return {
    ...customer,
    tier: customer.tier as CustomerTier,
    totalSpent: Number(customer.totalSpent),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// updateCustomer
// ────────────────────────────────────────────────────────────────────────────

export async function updateCustomer(
  id: number,
  data: UpdateCustomerInput
): Promise<CustomerDetail> {
  await assertCustomerExists(id)

  if (data.phone) {
    const existing = await prisma.customer.findFirst({
      where: { phone: data.phone, id: { not: id } },
    })
    if (existing) {
      throw new AppError(409, 'PHONE_ALREADY_EXISTS', 'Số điện thoại đã được đăng ký')
    }
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.birthday !== undefined && { birthday: new Date(data.birthday) }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })

  return {
    ...customer,
    tier: customer.tier as CustomerTier,
    totalSpent: Number(customer.totalSpent),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// toggleBlacklist
// ────────────────────────────────────────────────────────────────────────────

export async function toggleBlacklist(
  id: number,
  isBlacklisted: boolean,
  reason?: string
): Promise<CustomerDetail> {
  await assertCustomerExists(id)

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      isBlacklisted,
      blacklistReason: isBlacklisted ? (reason ?? null) : null,
    },
  })

  return {
    ...customer,
    tier: customer.tier as CustomerTier,
    totalSpent: Number(customer.totalSpent),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// updateCustomerAfterCheckout
// ────────────────────────────────────────────────────────────────────────────

export async function updateCustomerAfterCheckout(
  customerId: number,
  invoiceTotal: number
): Promise<void> {
  // Lấy customer hiện tại
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { totalSpent: true },
  })
  if (!customer) return

  // Lấy cấu hình điểm: bao nhiêu tiền = 1 điểm
  const setting = await prisma.setting.findUnique({
    where: { key: 'points_per_amount' },
    select: { value: true },
  })

  // Mặc định: 100,000 VND = 1 điểm nếu không có setting
  let pointsPerAmount = 100_000
  if (setting && typeof setting.value === 'number' && setting.value > 0) {
    pointsPerAmount = setting.value
  } else if (
    setting &&
    typeof setting.value === 'object' &&
    setting.value !== null &&
    'amount' in (setting.value as object)
  ) {
    const val = (setting.value as { amount: number }).amount
    if (typeof val === 'number' && val > 0) {
      pointsPerAmount = val
    }
  }

  const earnedPoints = Math.floor(invoiceTotal / pointsPerAmount)
  const newTotalSpent = Number(customer.totalSpent) + invoiceTotal
  const newTier = determineTier(newTotalSpent)

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: invoiceTotal },
        visitCount: { increment: 1 },
        lastVisit: new Date(),
        tier: newTier,
        ...(earnedPoints > 0 && { totalPoints: { increment: earnedPoints } }),
      },
    })

    if (earnedPoints > 0) {
      await tx.pointHistory.create({
        data: {
          customerId,
          action: 'EARN',
          points: earnedPoints,
          reason: `Tích điểm từ hóa đơn ${invoiceTotal.toLocaleString('vi-VN')}đ`,
        },
      })
    }
  })
}

// ────────────────────────────────────────────────────────────────────────────
// redeemPoints
// ────────────────────────────────────────────────────────────────────────────

export async function redeemPoints(
  customerId: number,
  points: number,
  reason?: string
): Promise<{ remainingPoints: number }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { totalPoints: true },
  })

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng')
  }

  if (customer.totalPoints < points) {
    throw new AppError(
      400,
      'INSUFFICIENT_POINTS',
      `Khách hàng không đủ điểm (hiện có ${customer.totalPoints} điểm)`
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: { decrement: points },
      },
      select: { totalPoints: true },
    })

    await tx.pointHistory.create({
      data: {
        customerId,
        action: 'REDEEM',
        points: -points,
        reason: reason ?? 'Đổi điểm',
      },
    })

    return result
  })

  return { remainingPoints: updated.totalPoints }
}

// ────────────────────────────────────────────────────────────────────────────
// getBirthdayCustomers
// ────────────────────────────────────────────────────────────────────────────

export interface BirthdayCustomer {
  id: number
  name: string
  phone: string
  tier: CustomerTier
  totalPoints: number
  birthday: Date
}

export async function getBirthdayCustomers(): Promise<BirthdayCustomer[]> {
  const today = new Date()
  const month = today.getMonth() + 1 // 1-12
  const day = today.getDate()

  // SQLite: dùng strftime để so sánh day & month
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  const customers = await prisma.$queryRaw<
    Array<{
      id: number
      name: string
      phone: string
      tier: string
      total_points: number
      birthday: string
    }>
  >`
    SELECT id, name, phone, tier, total_points, birthday
    FROM customers
    WHERE birthday IS NOT NULL
      AND strftime('%m', birthday) = ${monthStr}
      AND strftime('%d', birthday) = ${dayStr}
      AND is_blacklisted = 0
    ORDER BY name ASC
  `

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    tier: c.tier as CustomerTier,
    totalPoints: c.total_points,
    birthday: new Date(c.birthday),
  }))
}
