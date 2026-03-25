// ════════════════════════════════════════════
// SHARED TYPES - Tất cả module import từ đây
// QUY TẮC: Chỉ Task 0/16 được sửa file này
// ════════════════════════════════════════════

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
  pagination?: PaginationInfo
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginationQuery {
  page?: number
  limit?: number
}

// ── Auth Types ──
export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF'

export interface AuthUser {
  id: number
  username: string
  fullName: string
  role: UserRole
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

// ── Room Types ──
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'ENDING_SOON' | 'MAINTENANCE'

// ── Session Types ──
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED' | 'MERGED'

// ── Order Types ──
export type OrderStatus = 'PENDING' | 'PREPARING' | 'SERVED' | 'CANCELLED'

// ── Booking Types ──
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'

// ── Payment Types ──
export type PaymentMethod = 'CASH' | 'QR_TRANSFER' | 'DEBT'
export type InvoiceStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'VOID'

// ── Customer Types ──
export type CustomerTier = 'REGULAR' | 'SILVER' | 'GOLD' | 'VIP'

// ── Shift Types ──
export type ShiftStatus = 'OPEN' | 'CLOSED'

// ── Stock Types ──
export type StockEntryType = 'IN' | 'OUT_SALE' | 'OUT_MANUAL' | 'ADJUSTMENT'

// ── Notification Types ──
export type NotificationType =
  | 'ROOM_ENDING'
  | 'ROOM_EXPIRED'
  | 'ORDER_NEW'
  | 'STOCK_LOW'
  | 'BOOKING_REMINDER'
  | 'CUSTOMER_BIRTHDAY'
  | 'SYSTEM'

// ── Price Calculation ──
export interface PriceSegment {
  start: string
  end: string
  slotName: string
  minutes: number
  pricePerHour: number
  amount: number
}

export interface PriceBreakdown {
  segments: PriceSegment[]
  subtotal: number
  surcharge: number
  total: number
}
