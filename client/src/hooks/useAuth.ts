import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import api, { getAuthToken, isSessionDeadError } from '@/services/api'
import { useAuthStore, type AuthUser } from '@/stores/authStore'

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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await api.post<LoginResponse>('/auth/login', payload)
      return res.data
    },
    onSuccess: (data) => {
      const saved = login(data.data.token, data.data.user)
      if (!saved) {
        toast.error('Không lưu được phiên đăng nhập. Thử đăng nhập lại.')
        return
      }
      queryClient.removeQueries({ queryKey: ['me'] })
      queryClient.setQueryData<MeResponse>(['me'], {
        success: true,
        data: data.data.user,
      })
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
  const queryClient = useQueryClient()

  return () => {
    logout()
    queryClient.removeQueries({ queryKey: ['me'] })
    navigate('/login', { replace: true })
  }
}

// ────────────────────────────────────────────────────────────────────────────
// useMe — verifies the JWT token is still valid when app loads
// ────────────────────────────────────────────────────────────────────────────

export function useMe() {
  const token = useAuthStore((s) => s.token)

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<MeResponse>('/auth/me')
      return res.data
    },
    enabled: !!token,
    retry: (failureCount, error) => {
      if (isSessionDeadError(error)) return false
      return failureCount < 1
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}

/** Gọi sau khi /auth/me thành công — đồng bộ user + token (sliding refresh). */
export function syncSessionFromMe(me: MeResponse) {
  const currentToken = getAuthToken()
  if (!currentToken) return
  const { id, username, fullName, role } = me.data
  useAuthStore.getState().login(currentToken, { id, username, fullName, role })
}

// ────────────────────────────────────────────────────────────────────────────
// useSessionKeepAlive — ping /auth/me định kỳ để sliding refresh token
// ────────────────────────────────────────────────────────────────────────────

const KEEPALIVE_MS = 30 * 60 * 1000 // 30 phút

export function isAuthErrorStatus(status: number | undefined): boolean {
  return status === 401 || status === 403
}

export function getAxiosStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

export function useSessionKeepAlive() {
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return

    const ping = () => {
      void api.get('/auth/me').catch((error) => {
        if (isSessionDeadError(error)) {
          logout()
          navigate('/login', { replace: true })
        }
      })
    }

    ping()
    const id = window.setInterval(ping, KEEPALIVE_MS)
    return () => window.clearInterval(id)
  }, [token, logout, navigate])
}
