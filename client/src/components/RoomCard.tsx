import { ShoppingCart, Clock, Info, CreditCard, Wrench, Users } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import { useCountdown } from '@/hooks/useCountdown'
import type { Room } from '@/types/room'

interface RoomCardProps {
  room: Room
  onClick: () => void
  onOrderClick?: () => void
  onExtendClick?: () => void
  onCheckoutClick?: () => void
  /**
   * Visual size hint. Large = bigger title, taller card, beefier CTA.
   * Parent grid decides geometry (col-span); this prop only governs the
   * card's intrinsic styling so the visual hierarchy reads at a glance.
   */
  size?: 'normal' | 'large'
}

const statusConfig = {
  AVAILABLE: {
    label: 'Trống',
    dot: 'bg-emerald-500',
    stripe: 'bg-emerald-500',
    labelColor: 'text-emerald-700',
  },
  OCCUPIED: {
    label: 'Đang hát',
    dot: 'bg-rose-500',
    stripe: 'bg-rose-500',
    labelColor: 'text-rose-700',
  },
  ENDING_SOON: {
    label: 'Sắp hết giờ',
    dot: 'bg-amber-500 animate-pulse',
    stripe: 'bg-amber-500',
    labelColor: 'text-amber-700',
  },
  MAINTENANCE: {
    label: 'Bảo trì',
    dot: 'bg-slate-400',
    stripe: 'bg-slate-400',
    labelColor: 'text-slate-600',
  },
}

export default function RoomCard({
  room,
  onClick,
  onOrderClick,
  onExtendClick,
  onCheckoutClick,
  size = 'normal',
}: RoomCardProps) {
  const cfg = statusConfig[room.status]
  const session = room.currentSession
  const isLarge = size === 'large'

  const handleActionClick = (e: React.MouseEvent, handler?: () => void) => {
    e.stopPropagation()
    handler?.()
  }

  const capacityLabel = (() => {
    const { capacityMin, capacityMax } = room.roomType
    const hasMin = typeof capacityMin === 'number' && capacityMin > 0
    const hasMax = typeof capacityMax === 'number' && capacityMax > 0
    if (hasMin && hasMax && capacityMin !== capacityMax) {
      return `${capacityMin}–${capacityMax} khách`
    }
    if (hasMax) return `Tối đa ${capacityMax} khách`
    if (hasMin) return `Từ ${capacityMin} khách`
    return 'Phòng karaoke'
  })()

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card rounded-xl border shadow-card overflow-hidden',
        'cursor-pointer transition-all duration-200',
        'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-border/80',
        'flex flex-col',
        // Size variant — large rooms get a thicker stripe, more padding, taller body.
        isLarge ? 'p-4 pl-5 h-[240px] border-2 border-primary/30' : 'p-3 pl-4 h-[196px] border-border',
        room.status === 'ENDING_SOON' && 'ring-1 ring-amber-400/40',
        room.status === 'AVAILABLE' && 'hover:border-emerald-300 hover:bg-emerald-50/30',
        room.status === 'MAINTENANCE' && 'opacity-80 cursor-default hover:translate-y-0 hover:shadow-card hover:border-border',
      )}
    >
      {/* Left status stripe — wider on large rooms */}
      <span
        aria-hidden
        className={cn('absolute left-0 top-0 bottom-0', isLarge ? 'w-1.5' : 'w-1', cfg.stripe)}
      />

      {/* "Phòng lớn" badge top-right corner — only on large rooms */}
      {isLarge && (
        <span
          aria-hidden
          className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20"
        >
          VIP
        </span>
      )}

      {/* Maintenance diagonal hatching */}
      {room.status === 'MAINTENANCE' && (
        <span
          aria-hidden
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 10px, rgb(241 245 249) 10px 20px)',
          }}
        />
      )}

      {/* Header: name + status pill */}
      <div className={cn('relative flex items-center justify-between', isLarge && 'pr-12')}>
        <span
          className={cn(
            'font-bold text-foreground tracking-tight',
            isLarge ? 'text-xl' : 'text-base',
          )}
        >
          {room.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn('rounded-full', isLarge ? 'w-2 h-2' : 'w-1.5 h-1.5', cfg.dot)} />
          <span
            className={cn(
              'font-semibold uppercase tracking-wide',
              isLarge ? 'text-[11px]' : 'text-[10px]',
              cfg.labelColor,
            )}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Type line */}
      <div className="relative mt-0.5">
        <span className={cn('text-muted-foreground', isLarge ? 'text-xs' : 'text-[10px]')}>
          {room.roomType.name}
        </span>
      </div>

      {/* ═══ AVAILABLE ═══ */}
      {room.status === 'AVAILABLE' && (
        <>
          <div className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-medium tabular-nums">{capacityLabel}</span>
            </div>
            <span className="text-[11px] text-muted-foreground/80">Sẵn sàng đón khách</span>
          </div>
          <button
            className="relative w-full btn-gradient text-xs font-bold tracking-wide py-2 rounded-md"
            onClick={(e) => handleActionClick(e, onClick)}
          >
            + NHẬN KHÁCH
          </button>
        </>
      )}

      {/* ═══ OCCUPIED / ENDING_SOON ═══ */}
      {(room.status === 'OCCUPIED' || room.status === 'ENDING_SOON') && session && (
        <>
          {/* Customer · guest count */}
          <p className="relative mt-1.5 text-sm font-semibold text-foreground leading-tight truncate">
            {session.customerName}
            {session.guestCount ? (
              <span className="text-muted-foreground font-normal ml-1">
                · {session.guestCount} khách
              </span>
            ) : null}
          </p>

          {/* Info band: timer + total */}
          <InfoBand session={session} urgent={room.status === 'ENDING_SOON'} />

          {/* Actions */}
          {room.status === 'OCCUPIED' ? (
            <div className="relative flex items-center gap-1 mt-auto">
              <ActionBtn title="Order" onClick={(e) => handleActionClick(e, onOrderClick)}>
                <ShoppingCart className="w-4 h-4" />
              </ActionBtn>
              <ActionBtn title="Gia hạn" onClick={(e) => handleActionClick(e, onExtendClick)}>
                <Clock className="w-4 h-4" />
              </ActionBtn>
              <ActionBtn title="Chi tiết" onClick={(e) => handleActionClick(e, onClick)}>
                <Info className="w-4 h-4" />
              </ActionBtn>
            </div>
          ) : (
            <button
              className="relative mt-auto w-full h-9 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md flex items-center justify-center gap-1.5 tracking-wide shadow-sm transition-colors"
              onClick={(e) => handleActionClick(e, onCheckoutClick ?? onClick)}
            >
              <CreditCard className="w-3.5 h-3.5" />
              CHECKOUT
            </button>
          )}
        </>
      )}

      {/* ═══ MAINTENANCE ═══ */}
      {room.status === 'MAINTENANCE' && (
        <div className="relative flex-1 flex items-center justify-center gap-2">
          <Wrench className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-600 font-semibold uppercase tracking-wide">
            Đang bảo trì
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Info band ───────────────────────────────────────────────────────────────

function InfoBand({
  session,
  urgent,
}: {
  session: NonNullable<Room['currentSession']>
  urgent: boolean
}) {
  const { formatted, isExpired, isWarning } = useCountdown(session.estimatedEnd, session.checkInTime)
  const isCountingDown = Boolean(session.estimatedEnd)

  const timerColor = isExpired
    ? 'text-rose-600'
    : isWarning
      ? 'text-amber-700'
      : 'text-foreground'

  return (
    <div
      className={cn(
        'relative grid grid-cols-[1fr_auto] items-end gap-2 mt-2 mb-2 py-1.5 px-2 rounded-md border',
        urgent
          ? 'bg-amber-50/60 border-amber-200/60'
          : 'bg-muted/40 border-border/60',
      )}
    >
      {/* Left — timer */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{isCountingDown ? 'Còn lại' : 'Đã hát'}</span>
        </div>
        <span
          className={cn(
            'text-xl font-bold font-mono tabular-nums leading-none',
            isExpired && 'animate-pulse',
            timerColor,
          )}
        >
          {formatted}
        </span>
      </div>

      {/* Right — total */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] text-muted-foreground">Tạm tính</span>
        <span className="text-sm font-bold text-foreground tabular-nums leading-none">
          {formatCurrency(session.currentTotal)}
          <span className="text-muted-foreground font-normal ml-0.5">đ</span>
        </span>
      </div>
    </div>
  )
}

// ─── Action button ───────────────────────────────────────────────────────────

function ActionBtn({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex-1 flex items-center justify-center h-8 rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {children}
    </button>
  )
}
