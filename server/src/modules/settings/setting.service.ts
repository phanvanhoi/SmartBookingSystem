import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import type {
  UpdateSettingsInput,
  PricingRuleInput,
  SurchargeInput,
  VoucherInput,
} from './setting.validation'

// ────────────────────────────────────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────────────────────────────────────

export interface SettingItem {
  id: number
  key: string
  value: unknown
  description: string | null
  updatedAt: Date
  updatedById: number | null
}

export interface PricingRuleItem {
  id: number
  roomTypeId: number
  roomTypeName: string
  name: string
  timeStart: string
  timeEnd: string
  pricePerHour: number
  dayOfWeek: number[]
  isActive: boolean
  createdAt: Date
}

export interface SurchargeItem {
  id: number
  name: string
  type: string
  percentage: number
  startDate: Date | null
  endDate: Date | null
  dayOfWeek: number[]
  isActive: boolean
  createdAt: Date
}

// Helper: parse dayOfWeek JSON string → number[]
function parseDow(val: string): number[] {
  try { return JSON.parse(val) } catch { return [] }
}
// Helper: number[] → JSON string for DB storage
function stringifyDow(val: number[] | undefined): string {
  return JSON.stringify(val ?? [])
}

export interface VoucherItem {
  id: number
  code: string
  discountType: string
  discountValue: number
  maxDiscount: number | null
  maxUses: number | null
  usedCount: number
  validFrom: Date
  validUntil: Date
  isActive: boolean
  createdAt: Date
}

// ────────────────────────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SettingItem[]> {
  const settings = await prisma.setting.findMany({
    orderBy: { key: 'asc' },
  })

  return settings.map((s) => ({
    id: s.id,
    key: s.key,
    value: s.value,
    description: s.description,
    updatedAt: s.updatedAt,
    updatedById: s.updatedById,
  }))
}

export async function updateSettings(
  data: UpdateSettingsInput,
  userId: number
): Promise<SettingItem[]> {
  // Upsert each setting
  const results = await prisma.$transaction(
    data.settings.map(({ key, value }) =>
      prisma.setting.upsert({
        where: { key },
        update: { value, updatedById: userId },
        create: { key, value, updatedById: userId },
      })
    )
  )

  return results.map((s) => ({
    id: s.id,
    key: s.key,
    value: s.value,
    description: s.description,
    updatedAt: s.updatedAt,
    updatedById: s.updatedById,
  }))
}

export async function uploadQR(
  qrType: 'QR1' | 'QR2',
  filePath: string,
  userId: number
): Promise<SettingItem> {
  const key = qrType === 'QR1' ? 'qr_code_1' : 'qr_code_2'

  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value: filePath, updatedById: userId },
    create: {
      key,
      value: filePath,
      description: qrType === 'QR1' ? 'QR Code trước 00:00' : 'QR Code từ 00:00',
      updatedById: userId,
    },
  })

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    description: setting.description,
    updatedAt: setting.updatedAt,
    updatedById: setting.updatedById,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Pricing Rules
// ────────────────────────────────────────────────────────────────────────────

export async function getPricingRules(): Promise<PricingRuleItem[]> {
  const rules = await prisma.pricingRule.findMany({
    orderBy: [{ roomTypeId: 'asc' }, { timeStart: 'asc' }],
    include: {
      roomType: { select: { name: true } },
    },
  })

  return rules.map((r) => ({
    id: r.id,
    roomTypeId: r.roomTypeId,
    roomTypeName: r.roomType.name,
    name: r.name,
    timeStart: r.timeStart,
    timeEnd: r.timeEnd,
    pricePerHour: Number(r.pricePerHour),
    dayOfWeek: parseDow(r.dayOfWeek),
    isActive: r.isActive,
    createdAt: r.createdAt,
  }))
}

export async function createPricingRule(data: PricingRuleInput): Promise<PricingRuleItem> {
  // Verify roomType exists
  const roomType = await prisma.roomType.findUnique({ where: { id: data.roomTypeId } })
  if (!roomType) {
    throw new AppError(404, 'ROOM_TYPE_NOT_FOUND', 'Không tìm thấy loại phòng')
  }

  const rule = await prisma.pricingRule.create({
    data: {
      roomTypeId: data.roomTypeId,
      name: data.name,
      timeStart: data.timeStart,
      timeEnd: data.timeEnd,
      pricePerHour: data.pricePerHour,
      dayOfWeek: stringifyDow(data.dayOfWeek),
      isActive: data.isActive ?? true,
    },
    include: {
      roomType: { select: { name: true } },
    },
  })

  return {
    id: rule.id,
    roomTypeId: rule.roomTypeId,
    roomTypeName: rule.roomType.name,
    name: rule.name,
    timeStart: rule.timeStart,
    timeEnd: rule.timeEnd,
    pricePerHour: Number(rule.pricePerHour),
    dayOfWeek: parseDow(rule.dayOfWeek),
    isActive: rule.isActive,
    createdAt: rule.createdAt,
  }
}

export async function updatePricingRule(
  id: number,
  data: Partial<PricingRuleInput>
): Promise<PricingRuleItem> {
  const existing = await prisma.pricingRule.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'PRICING_RULE_NOT_FOUND', 'Không tìm thấy khung giờ')
  }

  if (data.roomTypeId !== undefined) {
    const roomType = await prisma.roomType.findUnique({ where: { id: data.roomTypeId } })
    if (!roomType) {
      throw new AppError(404, 'ROOM_TYPE_NOT_FOUND', 'Không tìm thấy loại phòng')
    }
  }

  const rule = await prisma.pricingRule.update({
    where: { id },
    data: {
      ...(data.roomTypeId !== undefined && { roomTypeId: data.roomTypeId }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.timeStart !== undefined && { timeStart: data.timeStart }),
      ...(data.timeEnd !== undefined && { timeEnd: data.timeEnd }),
      ...(data.pricePerHour !== undefined && { pricePerHour: data.pricePerHour }),
      ...(data.dayOfWeek !== undefined && { dayOfWeek: stringifyDow(data.dayOfWeek) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      roomType: { select: { name: true } },
    },
  })

  return {
    id: rule.id,
    roomTypeId: rule.roomTypeId,
    roomTypeName: rule.roomType.name,
    name: rule.name,
    timeStart: rule.timeStart,
    timeEnd: rule.timeEnd,
    pricePerHour: Number(rule.pricePerHour),
    dayOfWeek: parseDow(rule.dayOfWeek),
    isActive: rule.isActive,
    createdAt: rule.createdAt,
  }
}

export async function deletePricingRule(id: number): Promise<void> {
  const existing = await prisma.pricingRule.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'PRICING_RULE_NOT_FOUND', 'Không tìm thấy khung giờ')
  }

  await prisma.pricingRule.delete({ where: { id } })
}

// ────────────────────────────────────────────────────────────────────────────
// Surcharges
// ────────────────────────────────────────────────────────────────────────────

export async function getSurcharges(): Promise<SurchargeItem[]> {
  const surcharges = await prisma.surcharge.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return surcharges.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    percentage: Number(s.percentage),
    startDate: s.startDate,
    endDate: s.endDate,
    dayOfWeek: parseDow(s.dayOfWeek),
    isActive: s.isActive,
    createdAt: s.createdAt,
  }))
}

export async function createSurcharge(data: SurchargeInput): Promise<SurchargeItem> {
  const surcharge = await prisma.surcharge.create({
    data: {
      name: data.name,
      type: data.type,
      percentage: data.percentage,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      dayOfWeek: stringifyDow(data.dayOfWeek),
      isActive: data.isActive ?? true,
    },
  })

  return {
    id: surcharge.id,
    name: surcharge.name,
    type: surcharge.type,
    percentage: Number(surcharge.percentage),
    startDate: surcharge.startDate,
    endDate: surcharge.endDate,
    dayOfWeek: parseDow(surcharge.dayOfWeek),
    isActive: surcharge.isActive,
    createdAt: surcharge.createdAt,
  }
}

export async function updateSurcharge(
  id: number,
  data: Partial<SurchargeInput>
): Promise<SurchargeItem> {
  const existing = await prisma.surcharge.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'SURCHARGE_NOT_FOUND', 'Không tìm thấy phụ thu')
  }

  const surcharge = await prisma.surcharge.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.percentage !== undefined && { percentage: data.percentage }),
      ...(data.startDate !== undefined && {
        startDate: data.startDate ? new Date(data.startDate) : null,
      }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
      ...(data.dayOfWeek !== undefined && { dayOfWeek: stringifyDow(data.dayOfWeek) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })

  return {
    id: surcharge.id,
    name: surcharge.name,
    type: surcharge.type,
    percentage: Number(surcharge.percentage),
    startDate: surcharge.startDate,
    endDate: surcharge.endDate,
    dayOfWeek: parseDow(surcharge.dayOfWeek),
    isActive: surcharge.isActive,
    createdAt: surcharge.createdAt,
  }
}

export async function deleteSurcharge(id: number): Promise<void> {
  const existing = await prisma.surcharge.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'SURCHARGE_NOT_FOUND', 'Không tìm thấy phụ thu')
  }

  await prisma.surcharge.delete({ where: { id } })
}

// ────────────────────────────────────────────────────────────────────────────
// Vouchers
// ────────────────────────────────────────────────────────────────────────────

export async function getVouchers(): Promise<VoucherItem[]> {
  const vouchers = await prisma.voucher.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return vouchers.map((v) => ({
    id: v.id,
    code: v.code,
    discountType: v.discountType as string,
    discountValue: Number(v.discountValue),
    maxDiscount: v.maxDiscount !== null ? Number(v.maxDiscount) : null,
    maxUses: v.maxUses,
    usedCount: v.usedCount,
    validFrom: v.validFrom,
    validUntil: v.validUntil,
    isActive: v.isActive,
    createdAt: v.createdAt,
  }))
}

export async function createVoucher(data: VoucherInput): Promise<VoucherItem> {
  // Check unique code
  const existing = await prisma.voucher.findUnique({ where: { code: data.code } })
  if (existing) {
    throw new AppError(409, 'VOUCHER_CODE_EXISTS', 'Mã voucher đã tồn tại')
  }

  const voucher = await prisma.voucher.create({
    data: {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscount: data.maxDiscount ?? null,
      maxUses: data.maxUses ?? null,
      validFrom: new Date(`${data.validFrom}T00:00:00`),
      validUntil: new Date(`${data.validUntil}T23:59:59`),
      isActive: data.isActive ?? true,
    },
  })

  return {
    id: voucher.id,
    code: voucher.code,
    discountType: voucher.discountType as string,
    discountValue: Number(voucher.discountValue),
    maxDiscount: voucher.maxDiscount !== null ? Number(voucher.maxDiscount) : null,
    maxUses: voucher.maxUses,
    usedCount: voucher.usedCount,
    validFrom: voucher.validFrom,
    validUntil: voucher.validUntil,
    isActive: voucher.isActive,
    createdAt: voucher.createdAt,
  }
}

export async function updateVoucher(
  id: number,
  data: Partial<VoucherInput>
): Promise<VoucherItem> {
  const existing = await prisma.voucher.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'VOUCHER_NOT_FOUND', 'Không tìm thấy voucher')
  }

  // Check code uniqueness if changing code
  if (data.code && data.code !== existing.code) {
    const codeExists = await prisma.voucher.findUnique({ where: { code: data.code } })
    if (codeExists) {
      throw new AppError(409, 'VOUCHER_CODE_EXISTS', 'Mã voucher đã tồn tại')
    }
  }

  const voucher = await prisma.voucher.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.discountType !== undefined && { discountType: data.discountType }),
      ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
      ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount ?? null }),
      ...(data.maxUses !== undefined && { maxUses: data.maxUses ?? null }),
      ...(data.validFrom !== undefined && {
        validFrom: new Date(`${data.validFrom}T00:00:00`),
      }),
      ...(data.validUntil !== undefined && {
        validUntil: new Date(`${data.validUntil}T23:59:59`),
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })

  return {
    id: voucher.id,
    code: voucher.code,
    discountType: voucher.discountType as string,
    discountValue: Number(voucher.discountValue),
    maxDiscount: voucher.maxDiscount !== null ? Number(voucher.maxDiscount) : null,
    maxUses: voucher.maxUses,
    usedCount: voucher.usedCount,
    validFrom: voucher.validFrom,
    validUntil: voucher.validUntil,
    isActive: voucher.isActive,
    createdAt: voucher.createdAt,
  }
}

export async function deleteVoucher(id: number): Promise<void> {
  const existing = await prisma.voucher.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'VOUCHER_NOT_FOUND', 'Không tìm thấy voucher')
  }

  await prisma.voucher.delete({ where: { id } })
}
