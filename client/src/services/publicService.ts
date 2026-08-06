import axios from 'axios'
import api from './api'

/** Public API client — no auth header. */
const publicApi = axios.create({
  baseURL: '/api/v1/public',
  headers: { 'Content-Type': 'application/json' },
})

export type PublicRoom = {
  id: number
  name: string
  roomTypeId: number
  roomTypeName: string
  capacityMin: number
  capacityMax: number
  status?: string
}

export type PublicBusySlot = {
  start: string
  end: string
  reason: 'booking' | 'singing'
  label: string
}

export type PublicAvailabilityRoom = {
  id: number
  name: string
  status: string
  roomTypeId: number
  roomTypeName: string
  capacityMin: number
  capacityMax: number
  isSinging: boolean
  sessionEndsAt: string | null
  busySlots: PublicBusySlot[]
  availableSlots: string[]
  hasAvailability: boolean
}

export type PublicAvailability = {
  date: string
  durationHours: number
  guestCount?: number | null
  operatingHours: { open: string; close: string }
  minLeadMinutes: number
  slotStepMinutes?: number
  earliestSlot?: string
  timeSlots: string[]
  availableTimeSlots?: string[]
  serverNow: string
  rooms: PublicAvailabilityRoom[]
}

export type PublicBookingPayload = {
  roomId?: number
  customerName: string
  customerPhone: string
  bookingDate: string
  bookingTime: string
  durationHours: number
  guestCount: number
  notes?: string
}

export type PublicBookingResult = {
  booking: {
    id: number
    roomId: number
    roomName: string
    roomTypeName?: string
    customerName: string
    customerPhone: string | null
    bookingDate: string
    bookingTime: string
    durationHours: number
    guestCount?: number
    status: string
  }
  spinToken: {
    code: string
    expiresAt: string
    status: string
  }
  campaignName: string
}

export type NoRoomAvailableDetails = {
  nextFreeAt: string | null
  nextFreeTime: string | null
  alternatives: Array<{ bookingTime: string; roomCount: number }>
}

export type SpinPrizeSegment = {
  id: number
  label: string
  prizeType?: string
  prizeValue?: string | null
  color: string
  sortOrder: number
  index: number
}

export type SpinCampaign = {
  id: number
  name: string
  roomTypeId?: number | null
  roomTypeName?: string | null
  capacityMin?: number | null
  capacityMax?: number | null
  prizes: SpinPrizeSegment[]
}

export type PublicStoreInfo = {
  name: string
  address: string
  phone: string
  mapsUrl: string
  operatingHours: { open: string; close: string }
}

export type SpinTokenStatus = {
  code: string
  status: 'UNUSED' | 'USED' | 'EXPIRED'
  expiresAt: string
  campaignName: string
  resultLabel: string | null
  rewardCode: string | null
  spunAt: string | null
  prizeType: string | null
  booking: {
    id: number
    customerName: string
    roomName: string
    bookingDate: string
    bookingTime: string
    status: string
  }
}

export type SpinResult = {
  code: string
  prizeIndex: number
  prize: {
    id: number
    label: string
    prizeType: string
    prizeValue: string | null
    color: string
  }
  rewardCode: string | null
  redeemHint: string
  customerName: string
  spunAt: string | null
}

export type AdminSpinCampaign = {
  id: number
  name: string
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  roomTypeId: number | null
  roomTypeName: string | null
  capacityMin: number | null
  capacityMax: number | null
  prizes: Array<{
    id: number
    label: string
    prizeType: string
    prizeValue: string | null
    weight: number
    color: string
    sortOrder: number
    isActive: boolean
    stockLimit: number | null
    wonCount: number
  }>
}

export type RecentSpin = {
  id: number
  code: string
  resultLabel: string | null
  rewardCode: string | null
  prizeType: string | null
  spunAt: string | null
  customerName: string
  customerPhone: string | null
  roomName: string
}

export const publicService = {
  async getRooms() {
    const res = await publicApi.get<{ success: boolean; data: PublicRoom[] }>('/rooms')
    return res.data.data
  },

  async getStoreInfo() {
    const res = await publicApi.get<{ success: boolean; data: PublicStoreInfo }>('/store-info')
    return res.data.data
  },

  async getAvailability(params: {
    date: string
    durationHours: number
    roomId?: number
    guestCount?: number
  }) {
    const res = await publicApi.get<{ success: boolean; data: PublicAvailability }>(
      '/availability',
      { params },
    )
    return res.data.data
  },

  async createBooking(payload: PublicBookingPayload) {
    const res = await publicApi.post<{ success: boolean; data: PublicBookingResult }>(
      '/bookings',
      payload,
    )
    return res.data.data
  },

  async getCampaign(params?: { roomId?: number; token?: string }) {
    const res = await publicApi.get<{ success: boolean; data: SpinCampaign }>('/spin/campaign', {
      params,
    })
    return res.data.data
  },

  async getToken(token: string) {
    const res = await publicApi.get<{ success: boolean; data: SpinTokenStatus }>(
      `/spin/token/${encodeURIComponent(token)}`,
    )
    return res.data.data
  },

  async spin(token: string) {
    const res = await publicApi.post<{ success: boolean; data: SpinResult }>('/spin', { token })
    return res.data.data
  },

  async getAdminCampaign() {
    const res = await api.get<{ success: boolean; data: AdminSpinCampaign[] }>(
      '/public/admin/spin/campaign',
    )
    return res.data.data
  },

  async updatePrize(
    id: number,
    data: Partial<{
      label: string
      weight: number
      color: string
      isActive: boolean
      stockLimit: number | null
      prizeValue: string | null
    }>,
  ) {
    const res = await api.patch<{ success: boolean; data: AdminSpinCampaign['prizes'][number] }>(
      `/public/admin/spin/prizes/${id}`,
      data,
    )
    return res.data.data
  },

  async getRecentSpins(limit = 30) {
    const res = await api.get<{ success: boolean; data: RecentSpin[] }>(
      '/public/admin/spin/recent',
      { params: { limit } },
    )
    return res.data.data
  },
}
