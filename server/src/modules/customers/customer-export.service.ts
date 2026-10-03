/**
 * Customer list export for messaging campaigns (Zalo ZNS / SMS).
 *
 * Only customers we can actually and lawfully message are returned:
 *   active, not blacklisted, not opted out of marketing, with a valid
 *   Vietnamese mobile number. Landlines / malformed numbers are skipped
 *   and counted so the owner can see how many were dropped.
 */
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'

export const EXPORT_SEGMENTS = [
  'all',
  'frequent',
  'recent',
  'lapsed',
  'members',
  'nonMembers',
  'birthdayMonth',
] as const
export type ExportSegment = (typeof EXPORT_SEGMENTS)[number]

const FREQUENT_MIN_VISITS = 3
const RECENT_DAYS = 30
const LAPSED_DAYS = 60

/** "0912 345 678" / "+84912345678" / "84912345678" → "84912345678", or null if not a VN mobile. */
export function normalizeVnMobile(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('84') && digits.length === 11) {
    // already international
  } else if (digits.startsWith('0') && digits.length === 10) {
    digits = '84' + digits.slice(1)
  } else {
    return null
  }
  // Mobile prefixes only (3, 5, 7, 8, 9) — landlines can't receive SMS/ZNS.
  return /^84[35789]\d{8}$/.test(digits) ? digits : null
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

function segmentWhere(segment: ExportSegment): Prisma.CustomerWhereInput {
  switch (segment) {
    case 'frequent':
      return { visitCount: { gte: FREQUENT_MIN_VISITS } }
    case 'recent':
      return { lastVisit: { gte: daysAgo(RECENT_DAYS) } }
    case 'lapsed':
      return {
        visitCount: { gte: 1 },
        OR: [{ lastVisit: { lt: daysAgo(LAPSED_DAYS) } }, { lastVisit: null }],
      }
    case 'members':
      return { isMember: true }
    case 'nonMembers':
      return { isMember: false }
    case 'birthdayMonth':
      return { birthday: { not: null } }
    default:
      return {}
  }
}

export async function exportCustomersForMessaging(segment: ExportSegment, userId: number) {
  if (!EXPORT_SEGMENTS.includes(segment)) {
    throw new AppError(400, 'INVALID_SEGMENT', 'Nhóm khách không hợp lệ')
  }

  const baseWhere: Prisma.CustomerWhereInput = {
    isActive: true,
    isBlacklisted: false,
    phone: { not: null },
  }

  const [candidates, optedOut] = await Promise.all([
    prisma.customer.findMany({
      where: { ...baseWhere, marketingOptOut: false, ...segmentWhere(segment) },
      orderBy: [{ lastVisit: 'desc' }, { id: 'asc' }],
      select: {
        name: true,
        phone: true,
        birthday: true,
        tier: true,
        visitCount: true,
        lastVisit: true,
        totalSpent: true,
        isMember: true,
      },
    }),
    // Informational: how many in the same segment were dropped by opt-out.
    prisma.customer.count({
      where: { ...baseWhere, marketingOptOut: true, ...segmentWhere(segment) },
    }),
  ])

  const thisMonth = new Date().getMonth()
  const seen = new Set<string>()
  let skippedInvalidPhone = 0
  let duplicatePhones = 0

  const rows: Array<{
    name: string
    phone: string
    phone84: string
    tier: string
    visitCount: number
    lastVisit: string | null
    totalSpent: number
    isMember: boolean
  }> = []

  for (const c of candidates) {
    if (segment === 'birthdayMonth' && (!c.birthday || c.birthday.getMonth() !== thisMonth)) {
      continue
    }
    const phone84 = normalizeVnMobile(c.phone)
    if (!phone84) {
      skippedInvalidPhone++
      continue
    }
    if (seen.has(phone84)) {
      duplicatePhones++
      continue
    }
    seen.add(phone84)
    rows.push({
      name: c.name,
      phone: c.phone ?? '',
      phone84,
      tier: c.tier,
      visitCount: c.visitCount,
      lastVisit: c.lastVisit ? c.lastVisit.toISOString() : null,
      totalSpent: Number(c.totalSpent),
      isMember: c.isMember,
    })
  }

  await prisma.auditLog
    .create({
      data: {
        userId,
        action: 'CUSTOMER_EXPORT',
        entityType: 'customer',
        entityId: 0,
        details: { segment, exported: rows.length, skippedInvalidPhone, optedOut },
      },
    })
    .catch(() => undefined)

  return {
    segment,
    total: rows.length,
    skippedInvalidPhone,
    duplicatePhones,
    optedOut,
    rows,
  }
}

export async function setMarketingOptOut(customerId: number, optOut: boolean, userId: number) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, isActive: true } })
  if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng')
  if (customer.marketingOptOut === optOut) {
    return { id: customerId, marketingOptOut: optOut }
  }
  await prisma.customer.update({ where: { id: customerId }, data: { marketingOptOut: optOut } })
  await prisma.auditLog
    .create({
      data: {
        userId,
        action: optOut ? 'MARKETING_OPT_OUT' : 'MARKETING_OPT_IN',
        entityType: 'customer',
        entityId: customerId,
        details: { name: customer.name },
      },
    })
    .catch(() => undefined)
  return { id: customerId, marketingOptOut: optOut }
}
