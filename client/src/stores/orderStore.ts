import { create } from 'zustand'
import type { CartItem, MenuItem } from '@/types/order'

interface OrderStore {
  cart: CartItem[]
  sessionId: number | null

  // Actions
  setSessionId: (id: number | null) => void
  addToCart: (menuItem: MenuItem, quantity?: number) => void
  removeFromCart: (menuItemId: number) => void
  updateQuantity: (menuItemId: number, qty: number) => void
  setItemNote: (menuItemId: number, note: string) => void
  clearCart: () => void
  getCartTotal: () => number
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  cart: [],
  sessionId: null,

  setSessionId: (id) => set({ sessionId: id }),

  addToCart: (menuItem, quantity = 1) => {
    set((state) => {
      const existing = state.cart.find((c) => c.menuItem.id === menuItem.id)
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.menuItem.id === menuItem.id
              ? { ...c, quantity: c.quantity + quantity }
              : c
          ),
        }
      }
      return { cart: [...state.cart, { menuItem, quantity }] }
    })
  },

  removeFromCart: (menuItemId) => {
    set((state) => ({
      cart: state.cart.filter((c) => c.menuItem.id !== menuItemId),
    }))
  },

  updateQuantity: (menuItemId, qty) => {
    if (qty <= 0) {
      get().removeFromCart(menuItemId)
      return
    }
    set((state) => ({
      cart: state.cart.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, quantity: qty } : c
      ),
    }))
  },

  setItemNote: (menuItemId, note) => {
    set((state) => ({
      cart: state.cart.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, notes: note } : c
      ),
    }))
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0)
  },
}))
