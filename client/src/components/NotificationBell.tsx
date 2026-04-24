import { useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useNotificationStore } from '@/stores/notificationStore'
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications'
import type { Notification, NotificationType } from '@/services/notificationService'
import { cn } from '@/utils/cn'

// ── Type Icons ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, string> = {
  ROOM_ENDING: '🟡',
  ROOM_EXPIRED: '🔴',
  ORDER_NEW: '🍺',
  STOCK_LOW: '📦',
  BOOKING_REMINDER: '📅',
  CUSTOMER_BIRTHDAY: '🎂',
  SYSTEM: 'ℹ️',
}

const TYPE_COLOR: Record<NotificationType, string> = {
  ROOM_ENDING: 'text-amber-700',
  ROOM_EXPIRED: 'text-rose-700',
  ORDER_NEW: 'text-sky-700',
  STOCK_LOW: 'text-orange-700',
  BOOKING_REMINDER: 'text-fuchsia-700',
  CUSTOMER_BIRTHDAY: 'text-pink-700',
  SYSTEM: 'text-slate-600',
}

// ── Notification Item ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification
  onRead: (id: number) => void
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const icon = TYPE_ICON[notification.type] ?? 'ℹ️'
  const titleColor = TYPE_COLOR[notification.type] ?? 'text-foreground'

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: false,
    locale: vi,
  })

  return (
    <button
      type="button"
      className={cn(
        'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors duration-150 group',
        !notification.isRead && 'bg-accent border-l-2 border-l-primary',
      )}
      onClick={() => {
        if (!notification.isRead) {
          onRead(notification.id)
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-base mt-0.5 flex-shrink-0 leading-none">{icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-medium leading-tight truncate', titleColor)}>
              {notification.title}
            </p>
            <span className="text-[11px] text-muted-foreground flex-shrink-0 mt-0.5">
              {timeAgo}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
        </div>

        {/* Unread dot */}
        {!notification.isRead && (
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
        )}
      </div>
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { isOpen, unreadCount, togglePanel, closePanel } = useNotificationStore()
  const notifications = useNotificationStore((s) => s.notifications)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Data fetching
  useNotifications({ limit: 20 })
  useUnreadCount()

  const { mutate: markAsRead } = useMarkAsRead()
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAsRead()

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closePanel()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closePanel])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        closePanel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closePanel])

  const displayedNotifications = notifications.slice(0, 20)

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePanel}
        className={cn(
          'relative flex items-center justify-center w-9 h-9 rounded-lg',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'transition-colors duration-150',
          isOpen && 'bg-accent text-foreground',
        )}
        aria-label="Thông báo"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1',
              'flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1',
              'rounded-full bg-destructive text-destructive-foreground',
              'text-[10px] font-bold leading-none',
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'w-[340px] max-w-[calc(100vw-1rem)]',
            'rounded-xl border border-border',
            'bg-card shadow-elevated',
            'overflow-hidden',
          )}
          role="dialog"
          aria-label="Bảng thông báo"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({unreadCount} chưa đọc)
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-primary hover:text-primary/80"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? 'Đang đọc...' : 'Đọc hết'}
              </Button>
            )}
          </div>

          {/* Notification list */}
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Không có thông báo nào</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[420px]">
              <div className="py-1">
                {displayedNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <NotificationItem
                      notification={notification}
                      onRead={(id) => markAsRead(id)}
                    />
                    {index < displayedNotifications.length - 1 && (
                      <Separator className="opacity-30" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Footer */}
          {displayedNotifications.length > 0 && (
            <>
              <Separator className="opacity-40" />
              <div className="px-4 py-2.5">
                <button
                  type="button"
                  className={cn(
                    'w-full text-center text-xs text-primary',
                    'hover:text-primary/80 hover:underline transition-colors',
                  )}
                  onClick={closePanel}
                >
                  Xem tất cả thông báo →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
