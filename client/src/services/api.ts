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

// Response interceptor: only force-logout when the backend explicitly says
// the token is bad. A blanket "any 401 → wipe session" was too eager — a
// single misbehaving query (eg. transient race on F5, race during checkout,
// background refetch on a tab in another role) used to kick the user back
// to /login. Now we:
//   - distinguish TOKEN_INVALID / UNAUTHORIZED (real auth failure) → logout
//   - other 401s → toast once, stay on page (let the calling code handle)
//   - 403 → toast "không có quyền" (and never logout — they're authenticated)
let lastAuthToastAt = 0
function toastOnce(msg: string) {
  // Throttle so a burst of failed queries doesn't fire 10 toasts.
  const now = Date.now()
  if (now - lastAuthToastAt > 4000) {
    toast.error(msg)
    lastAuthToastAt = now
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const code: string | undefined = error.response?.data?.error?.code

    if (status === 401) {
      // Real token failure: backend told us the token itself is bad.
      const tokenBad = code === 'TOKEN_INVALID' || code === 'UNAUTHORIZED'
      if (tokenBad) {
        useAuthStore.getState().logout()
        toastOnce('Phiên đăng nhập đã hết hạn')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      } else {
        toastOnce('Yêu cầu cần đăng nhập lại')
      }
    } else if (status === 403) {
      toastOnce('Bạn không có quyền thực hiện thao tác này')
    }

    return Promise.reject(error)
  },
)

export default api
