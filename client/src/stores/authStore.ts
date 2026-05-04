import { create } from 'zustand'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF'

export interface AuthUser {
  id: number
  username: string
  fullName: string
  role: UserRole
}

interface AuthStore {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean

  login: (token: string, user: AuthUser) => void
  /** Cập nhật chỉ token (sliding refresh) — không đụng auth_user. */
  setToken: (token: string) => void
  logout: () => void
}

// ────────────────────────────────────────────────────────────────────────────
// Hydration – read persisted session synchronously before first render
// ────────────────────────────────────────────────────────────────────────────

function readInitialAuth(): Pick<AuthStore, 'user' | 'token' | 'isAuthenticated'> {
  if (typeof window === 'undefined') {
    return { user: null, token: null, isAuthenticated: false }
  }

  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('auth_user')

  if (!token || !userStr) {
    return { user: null, token: null, isAuthenticated: false }
  }

  try {
    const user = JSON.parse(userStr) as AuthUser
    return { user, token, isAuthenticated: true }
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('auth_user')
    return { user: null, token: null, isAuthenticated: false }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set) => ({
  ...readInitialAuth(),

  login: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('auth_user')
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
