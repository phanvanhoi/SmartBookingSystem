import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import axios from 'axios'
import api from '@/services/api'
import { useAuthStore, type AuthUser } from '@/stores/authStore'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface LoginPayload {
  username: string
  password: string
}

interface LoginResponse {
  success: boolean
  data: {
    token: string
    user: AuthUser
  }
}

interface MeResponse {
  success: boolean
  data: AuthUser
}

// ────────────────────────────────────────────────────────────────────────────
// useLogin
// ────────────────────────────────────────────────────────────────────────────

export function useLogin() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await api.post<LoginResponse>('/auth/login', payload)
      return res.data
    },
    onSuccess: (data) => {
      login(data.data.token, data.data.user)
      navigate('/rooms', { replace: true })
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// useLogout
// ────────────────────────────────────────────────────────────────────────────

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return () => {
    logout()
    navigate('/login', { replace: true })
  }
}

// ────────────────────────────────────────────────────────────────────────────
// useMe — verifies the JWT token is still valid when app loads
// ────────────────────────────────────────────────────────────────────────────

export function useMe() {
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)

  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<MeResponse>('/auth/me')
      return res.data
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Handle side effects via useEffect (v5 pattern)
  useEffect(() => {
    if (query.isSuccess && query.data) {
      // Dùng token mới nhất từ localStorage (sliding refresh có thể vừa cập nhật).
      const currentToken = localStorage.getItem('token')
      if (currentToken) {
        login(currentToken, query.data.data)
      }
    }
  }, [query.isSuccess, query.data, login])

  useEffect(() => {
    if (query.isError) {
      const status = axios.isAxiosError(query.error)
        ? query.error.response?.status
        : undefined
      // Chỉ logout khi token thật sự hết hạn / bị vô hiệu — không logout vì mạng lỗi.
      if (status === 401 || status === 403) {
        logout()
      }
    }
  }, [query.isError, query.error, logout])

  return query
}

// ────────────────────────────────────────────────────────────────────────────
// useSessionKeepAlive — ping /auth/me định kỳ để sliding refresh token
// ────────────────────────────────────────────────────────────────────────────

const KEEPALIVE_MS = 30 * 60 * 1000 // 30 phút

export function useSessionKeepAlive() {
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return

    const ping = () => {
      void api.get('/auth/me').catch(() => {
        // Lỗi auth được xử lý ở useMe / interceptor.
      })
    }

    // Gia hạn định kỳ mỗi 30 phút khi tab còn mở (/auth/me lúc mount do useMe xử lý).
    const id = window.setInterval(ping, KEEPALIVE_MS)
    return () => window.clearInterval(id)
  }, [token])
}
