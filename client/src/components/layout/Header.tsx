import { useNavigate } from 'react-router-dom'
import { Menu, Bell, ChevronDown, KeyRound, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { useCurrentShift } from '@/hooks/useStaff'

interface HeaderProps {
  onMobileMenuToggle?: () => void
}

const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'Chủ quán',
  MANAGER: 'Quản lý',
  CASHIER: 'Thu ngân',
  STAFF: 'Phục vụ',
}

function formatShiftTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return '--:--'
  }
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const notificationCount = 0
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { data: shiftRes } = useCurrentShift()

  const displayName = user?.fullName || user?.username || 'Người dùng'
  const roleLabel = user ? ROLE_LABEL[user.role] : ''

  const shift = shiftRes?.data ?? null
  const shiftDisplay = shift
    ? `${formatShiftTime(shift.startTime)} – ${shift.openedByName}`
    : 'Chưa mở ca'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 pt-safe-top bg-card border-b border-border">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onMobileMenuToggle}
        aria-label="Mở menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      <span className="md:hidden font-bold text-sm text-foreground tracking-tight truncate">
        Music Box
      </span>

      <div className="flex-1 min-w-0" />

      <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">
        Ca: <span className="text-foreground font-medium">{shiftDisplay}</span>
      </span>

      <div className="relative shrink-0">
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Thông báo">
          <Bell className="w-5 h-5" />
        </Button>
        {notificationCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Tài khoản: ${displayName}`}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors min-h-[44px]',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary shrink-0">
              <User className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-xs font-medium text-foreground">{displayName}</span>
              <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabel} · @{user?.username}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <KeyRound className="w-4 h-4" />
            Đổi mật khẩu
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
