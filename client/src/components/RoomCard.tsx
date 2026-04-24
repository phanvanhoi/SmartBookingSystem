import { ShoppingCart, Clock, Info, CreditCard, Wrench } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import CountdownTimer from '@/components/CountdownTimer'
import type { Room } from '@/types/room'

interface RoomCardProps {
  room: Room
  onClick: () => void
  onOrderClick?: () => void
  onExtendClick?: () => void
  onCheckoutClick?: () => void
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
}: RoomCardProps) {
  const cfg = statusConfig[room.status]
  const session = room.currentSession

  const handleActionClick = (e: React.MouseEvent, handler?: () => void) => {
    e.stopPropagation()
    handler?.()
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card rounded-xl border border-border shadow-card overflow-hidden',
        'cursor-pointer transition-all duration-200',
        'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-border/80',
        'p-3 flex flex-col',
        room.status === 'ENDING_SOON' && 'ring-1 ring-amber-400/40',
        room.status === 'MAINTENANCE' && 'opacity-75 cursor-default hover:translate-y-0 hover:shadow-card'
      )}
    >
      {/* Left status stripe */}
      <span
        aria-hidden
        className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.stripe)}
      />

      {/* Header: name + status pill */}
      <div className="flex items-center justify-between mb-2 pl-1">
        <span className="font-bold text-base text-foreground tracking-tight">
          {room.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', cfg.labelColor)}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Room type line */}
      <div className="pl-1 mb-1.5">
        <span className="text-[10px] text-muted-foreground">
          {room.roomType.name}
        </span>
      </div>

      {/* AVAILABLE */}
      {room.status === 'AVAILABLE' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 pt-1 pb-0.5">
          <button
            className="w-full btn-gradient text-xs font-bold tracking-wide py-2 rounded-md"
            onClick={(e) => handleActionClick(e, onClick)}
          >
            + NHẬN KHÁCH
          </button>
        </div>
      )}

      {/* OCCUPIED / ENDING_SOON */}
      {(room.status === 'OCCUPIED' || room.status === 'ENDING_SOON') && session && (
        <div className="flex-1 flex flex-col gap-1.5 pl-1">
          {/* Customer + guest count */}
          <p className="text-sm font-semibold text-foreground leading-tight truncate">
            {session.customerName}
            {session.guestCount ? (
              <span className="text-muted-foreground font-normal text-xs ml-1">
                ({session.guestCount})
              </span>
            ) : null}
          </p>

          {/* Timer */}
          <CountdownTimer
            checkInTime={session.checkInTime}
            estimatedEnd={session.estimatedEnd}
          />

          {/* Total */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-muted-foreground">Tạm tính</span>
            <span className="font-bold text-foreground tabular-nums">
              {formatCurrency(session.currentTotal)}
            </span>
          </div>

          {/* Actions */}
          {room.status === 'OCCUPIED' ? (
            <div className="flex items-center gap-1 mt-auto pt-1">
              <button
                onClick={(e) => handleActionClick(e, onOrderClick)}
                className="flex-1 flex items-center justify-center py-1.5 rounded-md bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Order"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => handleActionClick(e, onExtendClick)}
                className="flex-1 flex items-center justify-center py-1.5 rounded-md bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Gia hạn"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => handleActionClick(e, onClick)}
                className="flex-1 flex items-center justify-center py-1.5 rounded-md bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Chi tiết"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="w-full py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md flex items-center justify-center gap-1.5 mt-auto tracking-wide shadow-sm transition-colors"
              onClick={(e) => handleActionClick(e, onCheckoutClick ?? onClick)}
            >
              <CreditCard className="w-3.5 h-3.5" />
              CHECKOUT
            </button>
          )}
        </div>
      )}

      {/* MAINTENANCE */}
      {room.status === 'MAINTENANCE' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 py-1 pl-1">
          <Wrench className="w-5 h-5 text-slate-400" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Bảo trì
          </p>
        </div>
      )}
    </div>
  )
}
