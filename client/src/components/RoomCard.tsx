import { ShoppingCart, Clock, Info, CreditCard, Wrench } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/badge'
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
    dot: 'bg-emerald-500',
    border: 'border-emerald-300 hover:border-emerald-400',
    glow: 'hover:shadow-md hover:shadow-emerald-500/10',
  },
  OCCUPIED: {
    dot: 'bg-red-500',
    border: 'border-red-300 hover:border-red-400',
    glow: 'hover:shadow-md hover:shadow-red-500/10',
  },
  ENDING_SOON: {
    dot: 'bg-amber-500 animate-pulse',
    border: 'border-amber-400 hover:border-amber-500',
    glow: 'shadow-md shadow-amber-500/10',
  },
  MAINTENANCE: {
    dot: 'bg-gray-400',
    border: 'border-gray-300',
    glow: '',
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
        'relative bg-card rounded-lg border-2 cursor-pointer transition-all duration-200 p-2.5 flex flex-col',
        cfg.border,
        cfg.glow,
        room.status === 'ENDING_SOON' && 'status-ending',
        room.status === 'MAINTENANCE' && 'opacity-70 cursor-default'
      )}
    >
      {/* Header: name + status dot */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
          <span className="font-semibold text-sm text-foreground">{room.name}</span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] px-1 py-0 border-border text-muted-foreground"
        >
          {room.roomType.name}
        </Badge>
      </div>

      {/* AVAILABLE */}
      {room.status === 'AVAILABLE' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-1">
          <p className="text-xs text-muted-foreground">Sẵn sàng</p>
          <button
            className="w-full btn-gradient text-white text-xs font-semibold py-1.5 rounded-md"
            onClick={(e) => handleActionClick(e, onClick)}
          >
            + NHẬN KHÁCH
          </button>
        </div>
      )}

      {/* OCCUPIED / ENDING_SOON */}
      {(room.status === 'OCCUPIED' || room.status === 'ENDING_SOON') && session && (
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Customer + count */}
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {session.customerName}
            {session.guestCount ? <span className="text-muted-foreground text-xs ml-1">({session.guestCount})</span> : null}
          </p>

          {/* Timer compact */}
          <CountdownTimer
            checkInTime={session.checkInTime}
            estimatedEnd={session.estimatedEnd}
          />

          {/* Total */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tạm tính</span>
            <span className="font-semibold text-foreground">{formatCurrency(session.currentTotal)}</span>
          </div>

          {/* Actions */}
          {room.status === 'OCCUPIED' ? (
            <div className="flex items-center gap-1 mt-auto">
              <button
                onClick={(e) => handleActionClick(e, onOrderClick)}
                className="flex-1 flex items-center justify-center gap-1 p-1 rounded bg-muted/50 hover:bg-muted transition-colors"
                title="Order"
              >
                <ShoppingCart className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => handleActionClick(e, onExtendClick)}
                className="flex-1 flex items-center justify-center gap-1 p-1 rounded bg-muted/50 hover:bg-muted transition-colors"
                title="Gia hạn"
              >
                <Clock className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => handleActionClick(e, onClick)}
                className="flex-1 flex items-center justify-center gap-1 p-1 rounded bg-muted/50 hover:bg-muted transition-colors"
                title="Chi tiết"
              >
                <Info className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button
              className="w-full py-1 text-xs font-semibold bg-[#f59e0b]/90 hover:bg-[#f59e0b] text-black rounded-md flex items-center justify-center gap-1 mt-auto"
              onClick={(e) => handleActionClick(e, onCheckoutClick ?? onClick)}
            >
              <CreditCard className="w-3 h-3" />
              CHECKOUT
            </button>
          )}
        </div>
      )}

      {/* MAINTENANCE */}
      {room.status === 'MAINTENANCE' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 py-1">
          <Wrench className="w-5 h-5 text-[#6b7280]" />
          <p className="text-xs text-[#6b7280] font-medium">BẢO TRÌ</p>
        </div>
      )}
    </div>
  )
}
