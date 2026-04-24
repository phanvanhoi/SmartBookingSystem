import { useMemo, useState } from 'react'
import { LayoutGrid, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'
import { useRooms } from '@/hooks/useRooms'
import { useRoomStore } from '@/stores/roomStore'
import RoomCard from '@/components/RoomCard'
import CheckinDialog from './CheckinDialog'
import RoomDetailPanel from './RoomDetailPanel'
import OrderDialog from '../orders/OrderDialog'
import ExtendDialog from './ExtendDialog'
import type { Room, RoomStatus } from '@/types/room'

type Filter = 'all' | RoomStatus

export default function RoomMapPage() {
  const { data: rooms = [], isLoading, isFetching, refetch } = useRooms()
  const {
    selectedRoomId,
    isCheckinOpen,
    isDetailOpen,
    openCheckin,
    openDetail,
    openCheckout,
    closeAll,
  } = useRoomStore()

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null
  const [orderRoom, setOrderRoom] = useState<Room | null>(null)
  const [extendRoom, setExtendRoom] = useState<Room | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  // Large rooms first (col-span-2), then small rooms — both sorted by sortOrder
  const orderedRooms = useMemo(() => {
    const large: Room[] = []
    const small: Room[] = []
    rooms.forEach((r) => {
      if (r.roomType.capacityMax > 8) large.push(r)
      else small.push(r)
    })
    large.sort((a, b) => a.sortOrder - b.sortOrder)
    small.sort((a, b) => a.sortOrder - b.sortOrder)
    return [...large, ...small]
  }, [rooms])

  const statusCount = useMemo(() => {
    const counts = { AVAILABLE: 0, OCCUPIED: 0, ENDING_SOON: 0, MAINTENANCE: 0 }
    rooms.forEach((r) => counts[r.status]++)
    return counts
  }, [rooms])

  const visibleRooms =
    filter === 'all' ? orderedRooms : orderedRooms.filter((r) => r.status === filter)

  const handleRoomClick = (room: Room) => {
    if (room.status === 'MAINTENANCE') return
    if (room.status === 'AVAILABLE') openCheckin(room.id)
    else openDetail(room.id)
  }

  const handleCheckoutClick = (room: Room) => {
    openCheckout(room.id)
    openDetail(room.id)
  }

  const handleExtendClick = (room: Room) => setExtendRoom(room)
  const handleOrderClick = (room: Room) => setOrderRoom(room)

  return (
    <div className="flex flex-col h-full">
      {/* ─── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Quản lý phòng
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {statusCount.OCCUPIED + statusCount.ENDING_SOON}/{rooms.length} phòng đang hát
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs h-9"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          <span className="hidden sm:inline">Làm mới</span>
        </Button>
      </div>

      {/* ─── Filter bar ──────────────────────────────────────────── */}
      <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap flex-shrink-0">
        <FilterChip
          label="Tất cả"
          count={rooms.length}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterChip
          label="Trống"
          color="emerald"
          count={statusCount.AVAILABLE}
          active={filter === 'AVAILABLE'}
          onClick={() => setFilter('AVAILABLE')}
        />
        <FilterChip
          label="Đang hát"
          color="rose"
          count={statusCount.OCCUPIED}
          active={filter === 'OCCUPIED'}
          onClick={() => setFilter('OCCUPIED')}
        />
        <FilterChip
          label="Sắp hết"
          color="amber"
          count={statusCount.ENDING_SOON}
          active={filter === 'ENDING_SOON'}
          onClick={() => setFilter('ENDING_SOON')}
          pulse={statusCount.ENDING_SOON > 0}
        />
        {statusCount.MAINTENANCE > 0 && (
          <FilterChip
            label="Bảo trì"
            color="slate"
            count={statusCount.MAINTENANCE}
            active={filter === 'MAINTENANCE'}
            onClick={() => setFilter('MAINTENANCE')}
          />
        )}
      </div>

      {/* ─── Rooms grid ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-5 pb-3">
        {isLoading ? (
          <RoomGridSkeleton />
        ) : visibleRooms.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {filter === 'all' ? 'Không tìm thấy phòng nào' : 'Không có phòng nào khớp bộ lọc'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visibleRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                wide={room.roomType.capacityMax > 8}
                onClick={() => handleRoomClick(room)}
                onOrderClick={() => handleOrderClick(room)}
                onExtendClick={() => handleExtendClick(room)}
                onCheckoutClick={() => handleCheckoutClick(room)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CheckinDialog room={selectedRoom} open={isCheckinOpen} onClose={closeAll} />
      <RoomDetailPanel roomId={selectedRoomId} open={isDetailOpen} onClose={closeAll} />
      {orderRoom?.currentSession && (
        <OrderDialog
          sessionId={orderRoom.currentSession.id}
          roomName={orderRoom.name}
          open={!!orderRoom}
          onClose={() => setOrderRoom(null)}
        />
      )}
      <ExtendDialog
        sessionId={extendRoom?.currentSession?.id ?? null}
        open={!!extendRoom}
        onClose={() => setExtendRoom(null)}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Filter chip
// ──────────────────────────────────────────────────────────────────────────

type ChipColor = 'emerald' | 'rose' | 'amber' | 'slate'

const chipActive: Record<ChipColor | 'neutral', string> = {
  neutral: 'bg-foreground text-background border-foreground',
  emerald: 'bg-emerald-600 text-white border-emerald-600',
  rose: 'bg-rose-600 text-white border-rose-600',
  amber: 'bg-amber-600 text-white border-amber-600',
  slate: 'bg-slate-600 text-white border-slate-600',
}

const chipIdle: Record<ChipColor | 'neutral', string> = {
  neutral: 'bg-card text-foreground border-border hover:bg-muted',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
}

const chipDot: Record<ChipColor, string> = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-400',
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  color,
  pulse,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  color?: ChipColor
  pulse?: boolean
}) {
  const key: ChipColor | 'neutral' = color ?? 'neutral'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums transition-colors',
        active ? chipActive[key] : chipIdle[key],
      )}
    >
      {color && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            active ? 'bg-white/80' : chipDot[color],
            pulse && 'animate-pulse',
          )}
        />
      )}
      <span>{label}</span>
      <span className={cn('px-1 rounded-full', active ? 'bg-white/20' : 'bg-black/5')}>
        {count}
      </span>
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────────────────

function RoomGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-[196px] rounded-xl border border-border bg-card shadow-card p-3 space-y-3',
            i < 3 && 'col-span-2',
          )}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}
