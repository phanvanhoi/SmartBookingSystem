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
  UserCog,
  Settings,
  Music2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', href: '/dashboard' },
  { icon: DoorOpen, label: 'Phòng', href: '/rooms' },
  { icon: CalendarDays, label: 'Lịch', href: '/timeline' },
  { icon: UtensilsCrossed, label: 'Order', href: '/orders' },
  { icon: Package, label: 'Kho hàng', href: '/stock' },
  { icon: Users, label: 'Khách hàng', href: '/customers' },
  { icon: MessageSquare, label: 'Facebook', href: '/facebook' },
  { icon: BarChart3, label: 'Báo cáo', href: '/reports' },
  { icon: UserCog, label: 'Nhân viên', href: '/staff' },
  { icon: Settings, label: 'Cài đặt', href: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="hidden md:flex flex-col w-60 h-full bg-card border-r border-border shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 h-14 px-5 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-[#6c5ce7] to-[#a855f7] shrink-0">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent whitespace-nowrap">
            Music Box
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
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

  // Only show first 5 items in bottom nav
  const mobileItems = navItems.slice(0, 5)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <ul className="flex items-center justify-around h-16 px-2">
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
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
