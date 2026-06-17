import type { LucideIcon } from 'lucide-react'
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
} from 'lucide-react'
import type { UserRole } from '@/stores/authStore'

export type NavItem = {
  icon: LucideIcon
  label: string
  href: string
  roles: UserRole[]
}

const ALL: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER', 'STAFF']
const MANAGEMENT: UserRole[] = ['OWNER', 'MANAGER']
const CASHIER_UP: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER']

export const navItems: NavItem[] = [
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

/** Bottom nav tabs — the rest live under "Thêm". */
export const PRIMARY_TAB_HREFS: Record<UserRole, string[]> = {
  STAFF: ['/rooms', '/orders'],
  CASHIER: ['/rooms', '/orders', '/customers'],
  MANAGER: ['/rooms', '/orders', '/timeline', '/dashboard'],
  OWNER: ['/rooms', '/orders', '/timeline', '/dashboard'],
}

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return []
  return navItems.filter((item) => item.roles.includes(role))
}

export function getPrimaryNavItems(role: UserRole): NavItem[] {
  const byHref = new Map(getNavItemsForRole(role).map((item) => [item.href, item]))
  return PRIMARY_TAB_HREFS[role]
    .map((href) => byHref.get(href))
    .filter((item): item is NavItem => !!item)
}

export function getOverflowNavItems(role: UserRole): NavItem[] {
  const primary = new Set(PRIMARY_TAB_HREFS[role])
  return getNavItemsForRole(role).filter((item) => !primary.has(item.href))
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}
