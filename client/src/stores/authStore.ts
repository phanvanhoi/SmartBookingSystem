import { create } from 'zustand'
import { isJwtExpired, normalizeStoredToken } from '@/utils/jwt'
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

  login: (token: string, user: AuthUser) => boolean
  /** Cập nhật chỉ token (sliding refresh) — không đụng auth_user. */
  setToken: (token: string) => boolean
  logout: () => void
}

function normalizeToken(token: string | null | undefined): string | null {
  return normalizeStoredToken(token)
}
// ────────────────────────────────────────────────────────────────────────────
// Hydration – read persisted session synchronously before first render
// ────────────────────────────────────────────────────────────────────────────

function clearStoredAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('auth_user')
}

function readInitialAuth(): Pick<AuthStore, 'user' | 'token' | 'isAuthenticated'> {
  if (typeof window === 'undefined') {
    return { user: null, token: null, isAuthenticated: false }
  }

  const token = normalizeToken(localStorage.getItem('token'))
  const userStr = localStorage.getItem('auth_user')

  if (!token) {
    return { user: null, token: null, isAuthenticated: false }
  }

  // Token hết hạn trong localStorage → xóa sạch, tránh F5 gọi /auth/me → TOKEN_EXPIRED.
  if (isJwtExpired(token)) {
    clearStoredAuth()
    return { user: null, token: null, isAuthenticated: false }
  }

  // Còn token nhưng thiếu/hỏng auth_user → vẫn coi là đã đăng nhập,
  // RequireAuth sẽ gọi /auth/me để khôi phục user (tránh F5 đá về login oan).
  if (!userStr) {
    return { user: null, token, isAuthenticated: true }
  }

  try {
    const user = JSON.parse(userStr) as AuthUser
    return { user, token, isAuthenticated: true }
  } catch {
    localStorage.removeItem('auth_user')
    return { user: null, token, isAuthenticated: true }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set) => ({
  ...readInitialAuth(),

  login: (token, user) => {
    const normalized = normalizeToken(token)
    if (!normalized) return false
    localStorage.setItem('token', normalized)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ token: normalized, user, isAuthenticated: true })
    return true
  },

  setToken: (token) => {
    const normalized = normalizeToken(token)
    if (!normalized) return false
    localStorage.setItem('token', normalized)
    set({ token: normalized })
    return true
  },

  logout: () => {
    clearStoredAuth()
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
