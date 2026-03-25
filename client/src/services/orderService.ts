import api from './api'
import type { MenuCategory, Order, CreateOrderPayload, OrderStatus } from '@/types/order'

export const orderService = {
  getMenu: async (): Promise<MenuCategory[]> => {
    const res = await api.get('/menu')
    return res.data.data
  },

  createOrder: async (data: CreateOrderPayload): Promise<Order> => {
    const res = await api.post('/orders', data)
    return res.data.data
  },

  getOrdersBySession: async (sessionId: number): Promise<Order[]> => {
    const res = await api.get('/orders', { params: { sessionId } })
    return res.data.data
  },

  updateOrderStatus: async (orderId: number, status: OrderStatus): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/status`, { status })
    return res.data.data
  },

  cancelOrder: async (orderId: number, reason: string): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/cancel`, { reason })
    return res.data.data
  },

  getKitchenOrders: async (): Promise<Order[]> => {
    const res = await api.get('/orders/kitchen')
    return res.data.data
  },
}
