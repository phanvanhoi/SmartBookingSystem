import api from './api'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface SettingItem {
  id: number
  key: string
  value: unknown
  description: string | null
  updatedAt: string
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
  createdAt: string
}

export interface SurchargeItem {
  id: number
  name: string
  type: string
  percentage: number
  startDate: string | null
  endDate: string | null
  dayOfWeek: number[]
  isActive: boolean
  createdAt: string
}

export interface VoucherItem {
  id: number
  code: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  maxDiscount: number | null
  maxUses: number | null
  usedCount: number
  validFrom: string
  validUntil: string
  isActive: boolean
  createdAt: string
}

export interface UpdateSettingEntry {
  key: string
  value: unknown
}

export interface CreatePricingRuleData {
  roomTypeId: number
  name: string
  timeStart: string
  timeEnd: string
  pricePerHour: number
  dayOfWeek?: number[]
  isActive?: boolean
}

export interface CreateSurchargeData {
  name: string
  type: string
  percentage: number
  startDate?: string
  endDate?: string
  dayOfWeek?: number[]
  isActive?: boolean
}

export interface CreateVoucherData {
  code: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  maxDiscount?: number
  maxUses?: number
  validFrom: string
  validUntil: string
  isActive?: boolean
}

interface SingleResponse<T> {
  success: boolean
  data: T
  message?: string
}

// ────────────────────────────────────────────────────────────────────────────
// settingService
// ────────────────────────────────────────────────────────────────────────────

export const settingService = {
  // ── Settings ──────────────────────────────────────────────────────────────

  getSettings: async (): Promise<SingleResponse<SettingItem[]>> => {
    const res = await api.get<SingleResponse<SettingItem[]>>('/settings')
    return res.data
  },

  updateSettings: async (
    settings: UpdateSettingEntry[]
  ): Promise<SingleResponse<SettingItem[]>> => {
    const res = await api.put<SingleResponse<SettingItem[]>>('/settings', { settings })
    return res.data
  },

  uploadQR: async (qrType: 'QR1' | 'QR2', file: File): Promise<SingleResponse<SettingItem>> => {
    const formData = new FormData()
    formData.append('qrType', qrType)
    formData.append('image', file)
    const res = await api.post<SingleResponse<SettingItem>>('/settings/qr-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  // ── Pricing Rules ─────────────────────────────────────────────────────────

  getPricingRules: async (): Promise<SingleResponse<PricingRuleItem[]>> => {
    const res = await api.get<SingleResponse<PricingRuleItem[]>>('/settings/pricing')
    return res.data
  },

  createPricingRule: async (
    data: CreatePricingRuleData
  ): Promise<SingleResponse<PricingRuleItem>> => {
    const res = await api.post<SingleResponse<PricingRuleItem>>('/settings/pricing', data)
    return res.data
  },

  updatePricingRule: async (
    id: number,
    data: Partial<CreatePricingRuleData>
  ): Promise<SingleResponse<PricingRuleItem>> => {
    const res = await api.put<SingleResponse<PricingRuleItem>>(`/settings/pricing/${id}`, data)
    return res.data
  },

  deletePricingRule: async (id: number): Promise<SingleResponse<null>> => {
    const res = await api.delete<SingleResponse<null>>(`/settings/pricing/${id}`)
    return res.data
  },

  // ── Surcharges ────────────────────────────────────────────────────────────

  getSurcharges: async (): Promise<SingleResponse<SurchargeItem[]>> => {
    const res = await api.get<SingleResponse<SurchargeItem[]>>('/settings/surcharges')
    return res.data
  },

  createSurcharge: async (
    data: CreateSurchargeData
  ): Promise<SingleResponse<SurchargeItem>> => {
    const res = await api.post<SingleResponse<SurchargeItem>>('/settings/surcharges', data)
    return res.data
  },

  updateSurcharge: async (
    id: number,
    data: Partial<CreateSurchargeData>
  ): Promise<SingleResponse<SurchargeItem>> => {
    const res = await api.put<SingleResponse<SurchargeItem>>(`/settings/surcharges/${id}`, data)
    return res.data
  },

  deleteSurcharge: async (id: number): Promise<SingleResponse<null>> => {
    const res = await api.delete<SingleResponse<null>>(`/settings/surcharges/${id}`)
    return res.data
  },

  // ── Vouchers ──────────────────────────────────────────────────────────────

  getVouchers: async (): Promise<SingleResponse<VoucherItem[]>> => {
    const res = await api.get<SingleResponse<VoucherItem[]>>('/settings/vouchers')
    return res.data
  },

  createVoucher: async (data: CreateVoucherData): Promise<SingleResponse<VoucherItem>> => {
    const res = await api.post<SingleResponse<VoucherItem>>('/settings/vouchers', data)
    return res.data
  },

  updateVoucher: async (
    id: number,
    data: Partial<CreateVoucherData>
  ): Promise<SingleResponse<VoucherItem>> => {
    const res = await api.put<SingleResponse<VoucherItem>>(`/settings/vouchers/${id}`, data)
    return res.data
  },

  deleteVoucher: async (id: number): Promise<SingleResponse<null>> => {
    const res = await api.delete<SingleResponse<null>>(`/settings/vouchers/${id}`)
    return res.data
  },
}
