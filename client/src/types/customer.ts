export type CustomerTier = 'REGULAR' | 'SILVER' | 'GOLD' | 'VIP'

export interface Customer {
  id: number
  name: string
  // Phone is optional after Phase 4 — imported customers may have no phone.
  phone: string | null
  birthday?: string
  tier: CustomerTier
  totalSpent: number
  totalPoints: number
  visitCount: number
  lastVisit?: string
  notes?: string
  isBlacklisted: boolean
  blacklistReason?: string
  createdAt: string
}

export interface CustomerHistory {
  id: number
  date: string
  roomName: string
  durationMinutes: number
  totalAmount: number
}

export interface PointHistoryItem {
  id: number
  action: 'EARN' | 'REDEEM' | 'ADJUST'
  points: number
  reason?: string
  createdAt: string
}

export interface CreateCustomerForm {
  name: string
  phone: string
  birthday?: string
  notes?: string
}
