import { NavLink, useLocation } from 'react-router-dom'
import { Music2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/authStore'
import {
  getNavItemsForRole,
  getOverflowNavItems,
  getPrimaryNavItems,
  isNavActive,
} from '@/config/navItems'
import { MoreNavButton } from './MoreMenuSheet'

interface BottomNavProps {
  onMoreClick: () => void
}

export default function Sidebar() {
  const location = useLocation()
  const role = useAuthStore((s) => s.user?.role)
  const visibleItems = getNavItemsForRole(role)

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="hidden md:flex flex-col w-60 h-full bg-card border-r border-border shrink-0">
        <div className="flex items-center gap-3 h-14 px-5 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0 shadow-card">
            <Music2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight whitespace-nowrap">
            Music Box
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const active = isNavActive(location.pathname, item.href)

              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-accent text-primary'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        active ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="shrink-0 px-4 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Music Box Manager v1.0
          </p>
        </div>
      </aside>
    </TooltipProvider>
  )
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const location = useLocation()
  const role = useAuthStore((s) => s.user?.role)

  if (!role) {
    return (
      <nav className="md:hidden border-t border-border bg-card pb-safe">
        <p className="text-xs text-muted-foreground text-center py-4">Không có quyền</p>
      </nav>
    )
  }

  const primaryItems = getPrimaryNavItems(role)
  const overflowItems = getOverflowNavItems(role)
  const moreActive = overflowItems.some((item) => isNavActive(location.pathname, item.href))

  return (
    <nav className="md:hidden border-t border-border bg-card pb-safe">
      <ul className="flex items-stretch justify-around h-16 px-1">
        {primaryItems.map((item) => {
          const Icon = item.icon
          const active = isNavActive(location.pathname, item.href)

          return (
            <li key={item.href} className="flex-1 min-w-0">
              <NavLink
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 h-full text-[10px] font-medium transition-colors min-h-[44px]',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-primary" />
                )}
                <Icon className={cn('w-5 h-5', active && 'fill-primary/10')} />
                <span className="truncate max-w-full px-0.5">{item.label}</span>
              </NavLink>
            </li>
          )
        })}

        {overflowItems.length > 0 && (
          <li className="flex-1 min-w-0">
            <MoreNavButton active={moreActive} onClick={onMoreClick} />
          </li>
        )}
      </ul>
    </nav>
  )
}
