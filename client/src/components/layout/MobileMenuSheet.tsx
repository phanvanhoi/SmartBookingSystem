import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, Music2, User } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/utils/cn'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import {
  getNavItemsForRole,
  isNavActive,
  type NavItem,
} from '@/config/navItems'

const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'Chủ quán',
  MANAGER: 'Quản lý',
  CASHIER: 'Thu ngân',
  STAFF: 'Phục vụ',
}

interface MobileMenuSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function NavRow({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const Icon = item.icon
  const active = isNavActive(pathname, item.href)

  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
        active
          ? 'bg-accent text-primary'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      <span>{item.label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
    </NavLink>
  )
}

export default function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const items = getNavItemsForRole(user?.role)

  const close = () => onOpenChange(false)

  function handleLogout() {
    close()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-[320px] p-0 flex flex-col [&>button.absolute]:hidden"
      >
        <SheetHeader className="px-5 py-4 border-b border-border text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-card">
              <Music2 className="w-4 h-4" />
            </div>
            <SheetTitle className="text-base font-bold tracking-tight">Music Box</SheetTitle>
          </div>

          {user && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABEL[user.role]} · @{user.username}
                </p>
              </div>
            </div>
          )}
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.href}>
                <NavRow item={item} pathname={location.pathname} onNavigate={close} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-border p-3 space-y-0.5">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground min-h-[44px]"
          >
            <KeyRound className="w-5 h-5" />
            Đổi mật khẩu
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
