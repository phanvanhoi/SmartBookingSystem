import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { normalizeStoredToken, isJwtShape } from '@/utils/jwt'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

type RetriableConfig = InternalAxiosRequestConfig & { __retriedAfterTokenRefresh?: boolean }

/** Single source for Authorization header — store first, then localStorage. */
export function getAuthToken(): string | null {
  const fromStore = normalizeStoredToken(useAuthStore.getState().token)
  if (fromStore) return fromStore
  return normalizeStoredToken(localStorage.getItem('token'))
}

export function getAuthErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined
  return error.response?.data?.error?.code as string | undefined
}

/** Server confirmed the JWT is dead — not a permission or network glitch. */
export function isSessionDeadError(error: unknown): boolean {
  const code = getAuthErrorCode(error)
  return (
    code === 'TOKEN_EXPIRED' ||
    code === 'TOKEN_INVALID' ||
    code === 'UNAUTHORIZED' ||
    code === 'ACCOUNT_DISABLED'
  )
}

function applySlidingToken(response: { headers: Record<string, unknown> }): void {
  const newToken = response.headers['x-new-token']
  if (typeof newToken === 'string') {
    const normalized = normalizeStoredToken(newToken)
    if (normalized && isJwtShape(normalized)) {
      useAuthStore.getState().setToken(normalized)
    }
  }
}

function tokenUsedOnRequest(config: RetriableConfig | undefined): string | null {
  const header = config?.headers?.Authorization
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return normalizeStoredToken(header.slice(7))
  }
  return null
}

let lastAuthToastAt = 0
function toastOnce(msg: string) {
  const now = Date.now()
  if (now - lastAuthToastAt > 4000) {
    toast.error(msg)
    lastAuthToastAt = now
  }
}

function authFailureMessage(errorCode: string | undefined): string {
  if (errorCode === 'TOKEN_EXPIRED') {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }
  if (errorCode === 'TOKEN_INVALID') {
    return 'Phiên không hợp lệ (có thể do server khởi động lại). Vui lòng đăng nhập lại.'
  }
  if (errorCode === 'ACCOUNT_DISABLED') {
    return 'Tài khoản đã bị vô hiệu hóa.'
  }
  return 'Phiên đăng nhập có vấn đề. Đăng nhập lại nếu thao tác không thành công.'
}

export function clearAuthSession() {
  useAuthStore.getState().logout()
}

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    applySlidingToken(response)
    return response
  },
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const url = String(config?.url ?? '')
    const isMeRequest = url.includes('/auth/me')
    const errorCode = getAuthErrorCode(error)

    // Parallel requests during sliding refresh: another call may have stored X-New-Token.
    if (
      status === 401 &&
      config &&
      !config.__retriedAfterTokenRefresh &&
      (errorCode === 'TOKEN_EXPIRED' || errorCode === 'TOKEN_INVALID')
    ) {
      const tokenBefore = tokenUsedOnRequest(config) ?? getAuthToken()
      await new Promise((r) => setTimeout(r, 50))
      const freshToken = getAuthToken()
      if (freshToken && freshToken !== tokenBefore) {
        config.__retriedAfterTokenRefresh = true
        config.headers.Authorization = `Bearer ${freshToken}`
        try {
          const retryResponse = await api.request(config)
          return retryResponse
        } catch (retryErr) {
          error = retryErr as AxiosError
        }
      }
    }

    const finalStatus = error.response?.status
    const finalCode = getAuthErrorCode(error)

    if (finalStatus === 401) {
      if (!isMeRequest && isSessionDeadError(error)) {
        clearAuthSession()
      }
      if (!isMeRequest) {
        toastOnce(authFailureMessage(finalCode))
      }
    } else if (finalStatus === 403 && !isMeRequest) {
      toastOnce('Bạn không có quyền thực hiện thao tác này')
    }

    return Promise.reject(error)
  },
)

export default api
