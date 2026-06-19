import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: surface 401/403 to the user as a toast but DO NOT
// auto-logout. A previous "any 401 → wipe session + redirect" rule was
// kicking users back to /login on F5 because a single in-flight query racing
// the page reload could come back as 401 even though /auth/me itself proved
// the token was still valid. The user explicitly observed this.
//
// Source-of-truth for "is the session alive" is now ONLY the auth flow
// (login/logout buttons + token expiry on the server). If the token really
// is dead, every protected query will fail with the same toast and the
// user can hit the Logout button and re-login. That's better UX than
// silently wiping their session mid-action.
let lastAuthToastAt = 0
function toastOnce(msg: string) {
  // Throttle so a burst of failed queries doesn't fire 10 toasts.
  const now = Date.now()
  if (now - lastAuthToastAt > 4000) {
    toast.error(msg)
    lastAuthToastAt = now
  }
}

// Re-export so callers that genuinely need to wipe the session (eg. the
// header dropdown) keep doing so — but it's no longer wired into the
// network layer.
export function clearAuthSession() {
  useAuthStore.getState().logout()
}

api.interceptors.response.use(
  (response) => {
    // Sliding session: server cấp lại token khi gần hết hạn. Lưu ngay vào
    // localStorage + authStore để request kế tiếp + UI cùng dùng.
    const newToken = response.headers['x-new-token']
    if (typeof newToken === 'string' && newToken) {
      useAuthStore.getState().setToken(newToken)
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = String(error.config?.url ?? '')
    const isMeRequest = url.includes('/auth/me')

    if (status === 401) {
      // /auth/me → useMe / keepalive xử lý logout; tránh toast trùng lặp.
      if (!isMeRequest) {
        toastOnce('Phiên đăng nhập có vấn đề. Đăng nhập lại nếu thao tác không thành công.')
      }
    } else if (status === 403 && !isMeRequest) {
      toastOnce('Bạn không có quyền thực hiện thao tác này')
    }
    return Promise.reject(error)
  },
)

export default api
