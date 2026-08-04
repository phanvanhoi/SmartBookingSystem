import { randomBytes } from 'crypto'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import type { PublicBookingInput, UpdateSpinPrizeInput } from './public.validation'

const HOUR_MS = 3_600_000
const TOKEN_TTL_DAYS = 7
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function effectiveEnd(start: Date, durationHours: number | null | undefined): Date {
  const hours = durationHours && Number(durationHours) > 0 ? Number(durationHours) : 1
  return new Date(start.getTime() + hours * HOUR_MS)
}

async function findConflictingBooking(args: {
  roomId: number
  bookingDate: Date
  newStart: Date
  newEnd: Date
}) {
  const candidates = await prisma.booking.findMany({
    where: {
      roomId: args.roomId,
      bookingDate: args.bookingDate,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { id: true, bookingTime: true, durationHours: true },
  })

  return candidates.find((c) => {
    const cEnd = effectiveEnd(c.bookingTime, c.durationHours ? Number(c.durationHours) : null)
    return c.bookingTime < args.newEnd && args.newStart < cEnd
  })
}

function generateTokenCode(): string {
  const bytes = randomBytes(6)
  let code = 'MB-'
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return code
}

async function resolveSystemUserId(): Promise<number> {
  const admin = await prisma.user.findFirst({
    where: { role: 'OWNER', isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
  if (!admin) {
    throw new AppError(500, 'SYSTEM_USER_MISSING', 'Chưa cấu hình tài khoản hệ thống')
  }
  return admin.id
}

async function getActiveCampaign(roomTypeId?: number) {
  const now = new Date()
  const campaign = await prisma.spinCampaign.findFirst({
    where: {
      isActive: true,
      ...(roomTypeId !== undefined ? { roomTypeId } : { roomTypeId: { not: null } }),
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: {
      roomType: { select: { id: true, name: true, capacityMin: true, capacityMax: true } },
      prizes: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  })

  if (!campaign || campaign.prizes.length === 0) {
    throw new AppError(503, 'SPIN_UNAVAILABLE', 'Chương trình vòng quay tạm thời chưa mở')
  }

  return campaign
}

function pickWeightedPrize<T extends { id: number; weight: number; stockLimit: number | null; wonCount: number }>(
  prizes: T[],
): T {
  const eligible = prizes.filter(
    (p) => p.weight > 0 && (p.stockLimit === null || p.wonCount < p.stockLimit),
  )
  if (eligible.length === 0) {
    throw new AppError(503, 'SPIN_NO_PRIZES', 'Đã hết phần thưởng khả dụng')
  }

  const total = eligible.reduce((sum, p) => sum + p.weight, 0)
  let cursor = Math.random() * total
  for (const prize of eligible) {
    cursor -= prize.weight
    if (cursor <= 0) return prize
  }
  return eligible[eligible.length - 1]!
}

// ─── Public rooms ────────────────────────────────────────────────────────────

export async function listPublicRooms() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true, status: { not: 'MAINTENANCE' } },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      roomType: {
        select: {
          id: true,
          name: true,
          capacityMin: true,
          capacityMax: true,
        },
      },
    },
  })

  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    roomTypeId: r.roomType.id,
    roomTypeName: r.roomType.name,
    capacityMin: r.roomType.capacityMin,
    capacityMax: r.roomType.capacityMax,
  }))
}

// ─── Public booking + spin token ─────────────────────────────────────────────

export async function createPublicBooking(data: PublicBookingInput) {
  const room = await prisma.room.findFirst({
    where: { id: data.roomId, isActive: true, status: { not: 'MAINTENANCE' } },
    include: {
      roomType: { select: { id: true, name: true, capacityMin: true, capacityMax: true } },
    },
  })
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Phòng không tồn tại hoặc đang bảo trì')
  }

  if (data.guestCount !== undefined) {
    if (
      data.guestCount < room.roomType.capacityMin ||
      data.guestCount > room.roomType.capacityMax
    ) {
      throw new AppError(
        400,
        'INVALID_GUEST_COUNT',
        `${room.roomType.name} nhận ${room.roomType.capacityMin}–${room.roomType.capacityMax} người`,
      )
    }
  }

  const bookingDate = new Date(data.bookingDate)
  bookingDate.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (bookingDate < today) {
    throw new AppError(400, 'DATE_IN_PAST', 'Không thể đặt lịch trong quá khứ')
  }

  const [hour, min] = data.bookingTime.split(':').map(Number)
  const bookingTime = new Date(bookingDate)
  bookingTime.setHours(hour!, min!, 0, 0)

  if (bookingDate.getTime() === today.getTime() && bookingTime.getTime() < Date.now()) {
    throw new AppError(400, 'TIME_IN_PAST', 'Giờ đặt phải sau thời điểm hiện tại')
  }

  const durationHours = data.durationHours ?? 2
  const newEnd = effectiveEnd(bookingTime, durationHours)
  const conflict = await findConflictingBooking({
    roomId: data.roomId,
    bookingDate,
    newStart: bookingTime,
    newEnd,
  })
  if (conflict) {
    throw new AppError(409, 'BOOKING_OVERLAP', 'Khung giờ này đã có người đặt. Vui lòng chọn giờ khác.')
  }

  const campaign = await getActiveCampaign(room.roomType.id)
  const systemUserId = await resolveSystemUserId()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * HOUR_MS)

  const noteParts = [
    '[Đặt online]',
    data.guestCount ? `Số khách: ${data.guestCount}` : null,
    data.notes?.trim() || null,
  ].filter(Boolean)

  let tokenCode = generateTokenCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await prisma.spinToken.findUnique({ where: { code: tokenCode } })
    if (!exists) break
    tokenCode = generateTokenCode()
  }

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        roomId: data.roomId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        bookingDate,
        bookingTime,
        durationHours,
        depositAmount: 0,
        notes: noteParts.join(' — '),
        createdById: systemUserId,
        status: 'PENDING',
      },
      include: { room: { select: { id: true, name: true } } },
    })

    const token = await tx.spinToken.create({
      data: {
        code: tokenCode,
        bookingId: booking.id,
        campaignId: campaign.id,
        expiresAt,
      },
    })

    return { booking, token }
  })

  return {
    booking: {
      id: result.booking.id,
      roomId: result.booking.room.id,
      roomName: result.booking.room.name,
      customerName: result.booking.customerName,
      customerPhone: result.booking.customerPhone,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      durationHours,
      status: result.booking.status,
    },
    spinToken: {
      code: result.token.code,
      expiresAt: result.token.expiresAt,
      status: result.token.status,
    },
    campaignName: campaign.name,
  }
}

// ─── Campaign (public wheel segments) ────────────────────────────────────────

export async function getPublicCampaign(opts?: { roomId?: number; token?: string }) {
  let roomTypeId: number | undefined

  if (opts?.token) {
    const token = await prisma.spinToken.findUnique({
      where: { code: opts.token.toUpperCase() },
      select: {
        campaignId: true,
        campaign: {
          include: {
            roomType: { select: { id: true, name: true, capacityMin: true, capacityMax: true } },
            prizes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })
    if (!token?.campaign || token.campaign.prizes.length === 0) {
      throw new AppError(503, 'SPIN_UNAVAILABLE', 'Chương trình vòng quay tạm thời chưa mở')
    }
    const campaign = token.campaign
    return {
      id: campaign.id,
      name: campaign.name,
      roomTypeId: campaign.roomType?.id ?? null,
      roomTypeName: campaign.roomType?.name ?? null,
      capacityMin: campaign.roomType?.capacityMin ?? null,
      capacityMax: campaign.roomType?.capacityMax ?? null,
      prizes: campaign.prizes.map((p, index) => ({
        id: p.id,
        label: p.label,
        color: p.color,
        sortOrder: p.sortOrder,
        index,
      })),
    }
  }

  if (opts?.roomId) {
    const room = await prisma.room.findFirst({
      where: { id: opts.roomId, isActive: true },
      select: { roomTypeId: true },
    })
    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Phòng không tồn tại')
    }
    roomTypeId = room.roomTypeId
  }

  const campaign = await getActiveCampaign(roomTypeId)
  return {
    id: campaign.id,
    name: campaign.name,
    roomTypeId: campaign.roomType?.id ?? null,
    roomTypeName: campaign.roomType?.name ?? null,
    capacityMin: campaign.roomType?.capacityMin ?? null,
    capacityMax: campaign.roomType?.capacityMax ?? null,
    prizes: campaign.prizes.map((p, index) => ({
      id: p.id,
      label: p.label,
      color: p.color,
      sortOrder: p.sortOrder,
      index,
    })),
  }
}

// ─── Token status ────────────────────────────────────────────────────────────

export async function getTokenStatus(code: string) {
  const token = await prisma.spinToken.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      prize: true,
      booking: {
        select: {
          id: true,
          customerName: true,
          bookingDate: true,
          bookingTime: true,
          status: true,
          room: { select: { name: true } },
        },
      },
      campaign: { select: { name: true } },
    },
  })

  if (!token) {
    throw new AppError(404, 'TOKEN_NOT_FOUND', 'Mã quay thưởng không tồn tại')
  }

  if (token.status === 'UNUSED' && token.expiresAt < new Date()) {
    await prisma.spinToken.update({
      where: { id: token.id },
      data: { status: 'EXPIRED' },
    })
    token.status = 'EXPIRED'
  }

  if (token.booking.status === 'CANCELLED' && token.status === 'UNUSED') {
    await prisma.spinToken.update({
      where: { id: token.id },
      data: { status: 'EXPIRED' },
    })
    token.status = 'EXPIRED'
  }

  return {
    code: token.code,
    status: token.status,
    expiresAt: token.expiresAt,
    campaignName: token.campaign.name,
    resultLabel: token.resultLabel,
    rewardCode: token.rewardCode,
    spunAt: token.spunAt,
    prizeType: token.prize?.prizeType ?? null,
    booking: {
      id: token.booking.id,
      customerName: token.booking.customerName,
      roomName: token.booking.room.name,
      bookingDate: token.booking.bookingDate,
      bookingTime: token.booking.bookingTime,
      status: token.booking.status,
    },
  }
}

// ─── Spin ────────────────────────────────────────────────────────────────────

export async function spinWithToken(code: string) {
  const normalized = code.toUpperCase()
  const token = await prisma.spinToken.findUnique({
    where: { code: normalized },
    include: {
      booking: { select: { id: true, status: true, customerName: true } },
      campaign: {
        include: {
          prizes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })

  if (!token) {
    throw new AppError(404, 'TOKEN_NOT_FOUND', 'Mã quay thưởng không tồn tại')
  }
  if (token.status === 'USED') {
    throw new AppError(400, 'TOKEN_ALREADY_USED', 'Mã này đã được quay rồi')
  }
  if (token.status === 'EXPIRED' || token.expiresAt < new Date()) {
    if (token.status !== 'EXPIRED') {
      await prisma.spinToken.update({ where: { id: token.id }, data: { status: 'EXPIRED' } })
    }
    throw new AppError(400, 'TOKEN_EXPIRED', 'Mã quay thưởng đã hết hạn')
  }
  if (token.booking.status === 'CANCELLED') {
    await prisma.spinToken.update({ where: { id: token.id }, data: { status: 'EXPIRED' } })
    throw new AppError(400, 'BOOKING_CANCELLED', 'Lịch đặt đã bị hủy — mã không còn hiệu lực')
  }
  if (!token.campaign.isActive) {
    throw new AppError(503, 'SPIN_UNAVAILABLE', 'Chương trình vòng quay tạm dừng')
  }

  const prize = pickWeightedPrize(token.campaign.prizes)
  const prizeIndex = token.campaign.prizes.findIndex((p) => p.id === prize.id)

  let rewardCode: string | null = null
  const now = new Date()
  const voucherUntil = new Date(now.getTime() + 30 * 24 * HOUR_MS)

  const updated = await prisma.$transaction(async (tx) => {
    if (prize.prizeType === 'PERCENT_OFF' || prize.prizeType === 'FIXED_OFF') {
      const value = Number(prize.prizeValue ?? 0)
      rewardCode = `WIN-${normalized.replace('MB-', '')}`
      await tx.voucher.create({
        data: {
          code: rewardCode,
          discountType: prize.prizeType === 'PERCENT_OFF' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
          discountValue: value,
          maxDiscount: prize.prizeType === 'PERCENT_OFF' ? 500_000 : null,
          maxUses: 1,
          usedCount: 0,
          validFrom: now,
          validUntil: voucherUntil,
          isActive: true,
        },
      })
    } else if (prize.prizeType === 'FREE_MINUTES' || prize.prizeType === 'FREE_ITEM') {
      rewardCode = `DOI-${normalized.replace('MB-', '')}`
    }

    const claim = await tx.spinToken.updateMany({
      where: { id: token.id, status: 'UNUSED' },
      data: {
        status: 'USED',
        prizeId: prize.id,
        resultLabel: prize.label,
        rewardCode,
        spunAt: now,
      },
    })
    if (claim.count === 0) {
      throw new AppError(409, 'TOKEN_ALREADY_USED', 'Mã này vừa được quay bởi phiên khác')
    }

    await tx.spinPrize.update({
      where: { id: prize.id },
      data: { wonCount: { increment: 1 } },
    })

    return tx.spinToken.findUniqueOrThrow({
      where: { id: token.id },
      include: { prize: true },
    })
  })

  // Nếu khách đã nhận phòng rồi → gắn KM vào order ngay
  let attachedToOrder = false
  try {
    const { attachSpinRewardIfSessionExists } = await import('./spin-reward.service')
    const systemUserId = await resolveSystemUserId()
    const attached = await attachSpinRewardIfSessionExists({
      bookingId: token.booking.id,
      userId: systemUserId,
    })
    attachedToOrder = !!attached && !attached.alreadyApplied && !!attached.orderId
  } catch (err) {
    // Không chặn kết quả quay nếu gắn order thất bại (thiếu menu seed, v.v.)
    const { default: log } = await import('../../utils/logger')
    log.warn('[spin] attach after spin failed', { err, bookingId: token.booking.id })
  }

  return {
    code: updated.code,
    prizeIndex: prizeIndex < 0 ? 0 : prizeIndex,
    prize: {
      id: prize.id,
      label: prize.label,
      prizeType: prize.prizeType,
      prizeValue: prize.prizeValue,
      color: prize.color,
    },
    rewardCode: updated.rewardCode,
    redeemHint: buildRedeemHint(prize.prizeType, updated.rewardCode, attachedToOrder),
    customerName: token.booking.customerName,
    spunAt: updated.spunAt,
    attachedToOrder,
  }
}

function buildRedeemHint(
  prizeType: string,
  rewardCode: string | null,
  attachedToOrder = false,
): string {
  switch (prizeType) {
    case 'PERCENT_OFF':
    case 'FIXED_OFF':
      return rewardCode
        ? `Giảm giờ hát sẽ tự áp dụng khi thanh toán (mã ${rewardCode}).`
        : 'Giảm giờ hát sẽ tự áp dụng khi thanh toán.'
    case 'FREE_ITEM':
      return attachedToOrder
        ? 'Quà đã được thêm vào order phòng (miễn phí). Tồn kho trừ khi checkout.'
        : 'Khi nhận phòng, quà sẽ tự thêm vào order (miễn phí). Tồn kho trừ khi checkout.'
    case 'FREE_MINUTES':
      return rewardCode
        ? `Đưa mã ${rewardCode} tại quầy để được cộng phút hát miễn phí.`
        : 'Đưa kết quả này tại quầy để được cộng phút hát.'
    default:
      return 'Chúc bạn buổi hát vui vẻ — hẹn gặp lại lần sau!'
  }
}

// ─── Admin: campaign / prizes / recent spins ─────────────────────────────────

export async function getAdminCampaign() {
  const campaigns = await prisma.spinCampaign.findMany({
    where: { roomTypeId: { not: null } },
    orderBy: { id: 'asc' },
    include: {
      roomType: { select: { id: true, name: true, capacityMin: true, capacityMax: true } },
      prizes: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (campaigns.length === 0) {
    throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Chưa có chiến dịch vòng quay')
  }

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    isActive: campaign.isActive,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    roomTypeId: campaign.roomType?.id ?? null,
    roomTypeName: campaign.roomType?.name ?? null,
    capacityMin: campaign.roomType?.capacityMin ?? null,
    capacityMax: campaign.roomType?.capacityMax ?? null,
    prizes: campaign.prizes.map((p) => ({
      id: p.id,
      label: p.label,
      prizeType: p.prizeType,
      prizeValue: p.prizeValue,
      weight: p.weight,
      color: p.color,
      sortOrder: p.sortOrder,
      isActive: p.isActive,
      stockLimit: p.stockLimit,
      wonCount: p.wonCount,
    })),
  }))
}

export async function updateSpinPrize(id: number, data: UpdateSpinPrizeInput) {
  const existing = await prisma.spinPrize.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'PRIZE_NOT_FOUND', 'Không tìm thấy phần thưởng')
  }

  const updated = await prisma.spinPrize.update({
    where: { id },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.stockLimit !== undefined && { stockLimit: data.stockLimit }),
      ...(data.prizeValue !== undefined && { prizeValue: data.prizeValue }),
    },
  })

  return updated
}

export async function listRecentSpins(limit = 30) {
  const tokens = await prisma.spinToken.findMany({
    where: { status: 'USED' },
    orderBy: { spunAt: 'desc' },
    take: Math.min(limit, 100),
    include: {
      booking: {
        select: {
          customerName: true,
          customerPhone: true,
          room: { select: { name: true } },
        },
      },
      prize: { select: { label: true, prizeType: true } },
    },
  })

  return tokens.map((t) => ({
    id: t.id,
    code: t.code,
    resultLabel: t.resultLabel,
    rewardCode: t.rewardCode,
    prizeType: t.prize?.prizeType ?? null,
    spunAt: t.spunAt,
    customerName: t.booking.customerName,
    customerPhone: t.booking.customerPhone,
    roomName: t.booking.room.name,
  }))
}

export async function expireTokenForCancelledBooking(bookingId: number) {
  await prisma.spinToken.updateMany({
    where: { bookingId, status: 'UNUSED' },
    data: { status: 'EXPIRED' },
  })
}
