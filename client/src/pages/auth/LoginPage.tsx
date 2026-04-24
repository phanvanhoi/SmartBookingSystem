import { useState } from 'react'
import { User, Lock, Eye, EyeOff, Music, Loader2, AlertCircle } from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/error'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const loginMutation = useLogin()

  const errorMessage = loginMutation.isError
    ? getErrorMessage(loginMutation.error, 'Đã xảy ra lỗi, vui lòng thử lại')
    : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    loginMutation.mutate({ username: username.trim(), password })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 50%, #f0f4ff 100%)',
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6 bg-white shadow-xl border border-gray-100"
      >
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              }}
            >
              <Music className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-widest">MUSIC BOX</h1>
          <div
            className="h-px w-24 mx-auto"
            style={{
              background: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
            }}
          />
          <p className="text-sm text-gray-500">Hệ thống quản lý</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              autoComplete="username"
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder-gray-400 outline-none transition-all"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(168, 85, 247, 0.6)'
                e.currentTarget.style.background = '#e2e8f0'
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid #e2e8f0'
                e.currentTarget.style.background = '#f8fafc'
              }}
              disabled={loginMutation.isPending}
            />
          </div>

          {/* Password field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              autoComplete="current-password"
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-foreground placeholder-gray-400 outline-none transition-all"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(168, 85, 247, 0.6)'
                e.currentTarget.style.background = '#e2e8f0'
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid #e2e8f0'
                e.currentTarget.style.background = '#f8fafc'
              }}
              disabled={loginMutation.isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loginMutation.isPending || !username.trim() || !password}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                loginMutation.isPending || !username.trim() || !password
                  ? 'rgba(168, 85, 247, 0.4)'
                  : 'linear-gradient(135deg, #a855f7, #6366f1)',
              boxShadow:
                loginMutation.isPending || !username.trim() || !password
                  ? 'none'
                  : '0 4px 20px rgba(168, 85, 247, 0.4)',
            }}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ĐANG ĐĂNG NHẬP...</span>
              </>
            ) : (
              <span>ĐĂNG NHẬP</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
