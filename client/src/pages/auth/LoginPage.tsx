import { useState } from 'react'
import { User, Lock, Eye, EyeOff, Music2, Loader2, AlertCircle } from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'

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

  const disabled = loginMutation.isPending || !username.trim() || !password

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-background"
      style={{
        backgroundImage:
          'radial-gradient(circle at 10% 10%, hsl(16 85% 95%) 0%, transparent 35%), radial-gradient(circle at 90% 90%, hsl(30 25% 96%) 0%, transparent 40%)',
      }}
    >
      <div className="w-full max-w-sm rounded-2xl p-8 space-y-6 bg-card shadow-elevated border border-border">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary text-primary-foreground shadow-card">
              <Music2 className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-widest">MUSIC BOX</h1>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <p className="text-sm text-muted-foreground">Hệ thống quản lý</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              autoComplete="username"
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-xl text-base text-foreground placeholder:text-muted-foreground bg-muted/50 border border-border outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 min-h-[48px]"
              disabled={loginMutation.isPending}
            />
          </div>

          {/* Password field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              autoComplete="current-password"
              className="w-full pl-10 pr-10 py-3 rounded-xl text-base text-foreground placeholder:text-muted-foreground bg-muted/50 border border-border outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 min-h-[48px]"
              disabled={loginMutation.isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={disabled}
            className={cn(
              'w-full py-3 rounded-xl text-base font-bold tracking-wider flex items-center justify-center gap-2 transition-all min-h-[48px]',
              'bg-primary text-primary-foreground shadow-card',
              'hover:bg-primary/90 hover:shadow-card-hover',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-card'
            )}
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
