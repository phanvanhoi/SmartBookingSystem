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
  isMember?: boolean
  coinBalance?: number
  memberSince?: string | null
  marketingOptOut?: boolean
  blacklistReason?: string
  createdAt: string
}

export interface CustomerHistory {
  sessionId: number
  roomName: string
  checkInTime: string
  checkOutTime: string | null
  /** null while the session is still running */
  durationMinutes: number | null
  /** null while the session has no invoice yet */
  grandTotal: number | null
  invoiceNumber: string | null
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

export interface CoinTransaction {
  id: number
  type: 'TOPUP' | 'SPEND' | 'REFUND'
  amount: number
  balanceAfter: number
  paymentMethod: 'CASH' | 'QR_TRANSFER' | null
  invoiceId: number | null
  note: string | null
  createdAt: string
  createdByName: string | null
}

export interface CoinWallet {
  isMember: boolean
  memberSince: string | null
  coinBalance: number
  transactions: CoinTransaction[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type ExportSegment =
  | 'all'
  | 'frequent'
  | 'recent'
  | 'lapsed'
  | 'members'
  | 'nonMembers'
  | 'birthdayMonth'

export interface ExportRow {
  name: string
  phone: string
  phone84: string
  tier: CustomerTier
  visitCount: number
  lastVisit: string | null
  totalSpent: number
  isMember: boolean
}

export interface ExportResult {
  segment: ExportSegment
  total: number
  skippedInvalidPhone: number
  duplicatePhones: number
  optedOut: number
  rows: ExportRow[]
}
