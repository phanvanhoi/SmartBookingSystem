import { NavLink, useLocation } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/stores/authStore'
import { getOverflowNavItems, isNavActive, type NavItem } from '@/config/navItems'

interface MoreMenuSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MoreTile({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const Icon = item.icon
  const active = isNavActive(pathname, item.href)

  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 min-h-[72px] transition-colors',
        active
          ? 'border-primary/40 bg-accent text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      <Icon className={cn('w-6 h-6', active && 'text-primary')} />
      <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
    </NavLink>
  )
}

export default function MoreMenuSheet({ open, onOpenChange }: MoreMenuSheetProps) {
  const location = useLocation()
  const role = useAuthStore((s) => s.user?.role)
  const items = role ? getOverflowNavItems(role) : []

  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] [&>button.absolute]:hidden"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />

        <SheetHeader className="text-left pb-3 space-y-1">
          <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Không có mục thêm</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <MoreTile
                key={item.href}
                item={item}
                pathname={location.pathname}
                onNavigate={close}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Bottom nav "Thêm" button */
export function MoreNavButton({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors w-full min-h-[44px]',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-primary" />
      )}
      <LayoutGrid className={cn('w-5 h-5', active && 'fill-primary/10')} />
      <span>Thêm</span>
    </button>
  )
}
