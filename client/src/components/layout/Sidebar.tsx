import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  DoorOpen,
  CalendarDays,
  MessageSquare,
  UtensilsCrossed,
  Package,
  Users,
  BarChart3,
  Receipt,
  UserCog,
  Settings,
  Music2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthStore, type UserRole } from '@/stores/authStore'

type NavItem = {
  icon: typeof LayoutDashboard
  label: string
  href: string
  roles: UserRole[]
}

const ALL: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER', 'STAFF']
const MANAGEMENT: UserRole[] = ['OWNER', 'MANAGER']
const CASHIER_UP: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER']

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tổng quan', href: '/dashboard', roles: MANAGEMENT },
  { icon: DoorOpen, label: 'Phòng', href: '/rooms', roles: ALL },
  { icon: CalendarDays, label: 'Lịch', href: '/timeline', roles: CASHIER_UP },
  { icon: UtensilsCrossed, label: 'Order', href: '/orders', roles: ALL },
  { icon: Package, label: 'Kho hàng', href: '/stock', roles: MANAGEMENT },
  { icon: Users, label: 'Khách hàng', href: '/customers', roles: CASHIER_UP },
  { icon: MessageSquare, label: 'Facebook', href: '/facebook', roles: MANAGEMENT },
  { icon: BarChart3, label: 'Báo cáo', href: '/reports', roles: MANAGEMENT },
  { icon: Receipt, label: 'Hóa đơn', href: '/invoices', roles: ['OWNER'] },
  { icon: UserCog, label: 'Nhân viên', href: '/staff', roles: MANAGEMENT },
  { icon: Settings, label: 'Cài đặt', href: '/settings', roles: ['OWNER'] },
]

function useVisibleNavItems() {
  const role = useAuthStore((s) => s.user?.role)
  if (!role) return []
  return navItems.filter((item) => item.roles.includes(role))
}

export default function Sidebar() {
  const location = useLocation()
  const visibleItems = useVisibleNavItems()

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="hidden md:flex flex-col w-60 h-full bg-card border-r border-border shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 h-14 px-5 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0 shadow-card">
            <Music2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight whitespace-nowrap">
            Music Box
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.href)

              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-accent text-primary'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Music Box Manager v1.0
          </p>
        </div>
      </aside>
    </TooltipProvider>
  )
}

/** Mobile bottom navigation (shown on small screens) */
export function BottomNav() {
  const location = useLocation()
  const visibleItems = useVisibleNavItems()

  // Only show first 5 items in bottom nav
  const mobileItems = visibleItems.slice(0, 5)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <ul className="flex items-center justify-around h-16 px-2">
        {mobileItems.length === 0 && (
          <li className="text-xs text-muted-foreground py-4">Không có quyền</li>
        )}
        {mobileItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.href)

          return (
            <li key={item.href} className="flex-1">
              <NavLink
                to={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {/* Top accent bar marks the active route — visible at a glance */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-primary" />
                )}
                <Icon className={cn('w-5 h-5', isActive && 'fill-primary/10')} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
