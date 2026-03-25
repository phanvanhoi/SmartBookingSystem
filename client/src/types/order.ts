export interface MenuCategory {
  id: number
  name: string
  sortOrder: number
  items: MenuItem[]
}

export interface MenuItem {
  id: number
  name: string
  price: number
  image?: string
  isAvailable: boolean
  categoryId: number
}

export interface Order {
  id: number
  sessionId: number
  status: OrderStatus
  totalAmount: number
  notes?: string
  cancelReason?: string
  items: OrderItemDetail[]
  createdAt: string
  createdBy?: { fullName: string }
}

export interface OrderItemDetail {
  id: number
  menuItemId: number
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

export type OrderStatus = 'PENDING' | 'PREPARING' | 'SERVED' | 'CANCELLED'

export interface CreateOrderPayload {
  sessionId: number
  items: { menuItemId: number; quantity: number; notes?: string }[]
  notes?: string
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
  notes?: string
}
