export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'ENDING_SOON' | 'MAINTENANCE'
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED' | 'MERGED'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'

export interface RoomType {
  id: number
  name: string
  capacityMin: number
  capacityMax: number
}

export interface Room {
  id: number
  name: string
  roomType: RoomType
  status: RoomStatus
  sortOrder: number
  currentSession: CurrentSession | null
}

export interface CurrentSession {
  id: number
  customerName: string
  customerPhone?: string
  guestCount?: number
  checkInTime: string
  estimatedEnd?: string
  notes?: string
  elapsedMinutes: number
  remainingMinutes?: number
  currentRoomCharge: number
  currentOrderTotal: number
  currentTotal: number
  orders: SessionOrder[]
}

export interface SessionOrder {
  id: number
  status: string
  totalAmount: number
  createdAt: string
  items: OrderItem[]
}

export interface OrderItem {
  id: number
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

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

export interface CheckoutData {
  sessionId: number
  roomName: string
  customerName: string
  checkInTime: string
  checkOutTime: string
  duration: { hours: number; minutes: number }
  roomCharge: PriceBreakdown
  orders: SessionOrder[]
  orderTotal: number
  subtotal: number
  grandTotal: number
  qrCode: { type: string; label: string; imageUrl: string }
}

export interface CheckinForm {
  roomId: number
  customerName: string
  customerPhone?: string
  guestCount?: number
  estimatedDurationMinutes?: number
  notes?: string
}
