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
import type { Room } from '@/types/room'

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

  // Group rooms by type
  const { smallRooms, largeRooms } = useMemo(() => {
    const small: Room[] = []
    const large: Room[] = []
    rooms.forEach((r) => {
      if (r.roomType.capacityMax <= 8) {
        small.push(r)
      } else {
        large.push(r)
      }
    })
    small.sort((a, b) => a.sortOrder - b.sortOrder)
    large.sort((a, b) => a.sortOrder - b.sortOrder)
    return { smallRooms: small, largeRooms: large }
  }, [rooms])

  const handleRoomClick = (room: Room) => {
    if (room.status === 'MAINTENANCE') return

    if (room.status === 'AVAILABLE') {
      openCheckin(room.id)
    } else {
      openDetail(room.id)
    }
  }

  const handleCheckoutClick = (room: Room) => {
    openCheckout(room.id)
    openDetail(room.id) // open panel which contains checkout dialog
  }

  const handleExtendClick = (room: Room) => {
    setExtendRoom(room)
  }

  const handleOrderClick = (room: Room) => {
    setOrderRoom(room)
  }

  const statusCount = useMemo(() => {
    const counts = { AVAILABLE: 0, OCCUPIED: 0, ENDING_SOON: 0, MAINTENANCE: 0 }
    rooms.forEach((r) => counts[r.status]++)
    return counts
  }, [rooms])

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Quản lý phòng
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {statusCount.OCCUPIED + statusCount.ENDING_SOON}/{rooms.length} phòng đang hát
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status summary */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-muted-foreground">{statusCount.AVAILABLE} trống</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-muted-foreground">{statusCount.OCCUPIED} đang hát</span>
            </span>
            {statusCount.ENDING_SOON > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
                <span className="text-[#f59e0b]">{statusCount.ENDING_SOON} sắp trống</span>
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Rooms grid */}
      <div className="flex-1 min-h-0 px-5 pb-3">
        {isLoading ? (
          <RoomGridSkeleton />
        ) : rooms.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Không tìm thấy phòng nào</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-full">
            {/* Cột trái: Phòng lớn (8, 9, 10) */}
            <section className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Phòng lớn
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 grid-rows-3 gap-2 flex-1">
                {largeRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onClick={() => handleRoomClick(room)}
                    onOrderClick={() => handleOrderClick(room)}
                    onExtendClick={() => handleExtendClick(room)}
                    onCheckoutClick={() => handleCheckoutClick(room)}
                  />
                ))}
              </div>
            </section>

            {/* Cột phải: Phòng nhỏ (1-7) - card nhỏ hơn */}
            <section className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Phòng nhỏ
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-4 grid-rows-2 gap-2 flex-1">
                {/* Dòng 1: 1, 3, 5, 7 */}
                {smallRooms.filter((_, i) => i % 2 === 0).map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onClick={() => handleRoomClick(room)}
                    onOrderClick={() => handleOrderClick(room)}
                    onExtendClick={() => handleExtendClick(room)}
                    onCheckoutClick={() => handleCheckoutClick(room)}
                  />
                ))}
                {/* Dòng 2: 2, 4, 6 */}
                {smallRooms.filter((_, i) => i % 2 === 1).map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onClick={() => handleRoomClick(room)}
                    onOrderClick={() => handleOrderClick(room)}
                    onExtendClick={() => handleExtendClick(room)}
                    onCheckoutClick={() => handleCheckoutClick(room)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Checkin dialog */}
      <CheckinDialog
        room={selectedRoom}
        open={isCheckinOpen}
        onClose={closeAll}
      />

      {/* Room detail panel */}
      <RoomDetailPanel
        roomId={selectedRoomId}
        open={isDetailOpen}
        onClose={closeAll}
      />

      {/* Order dialog (from card quick action) */}
      {orderRoom?.currentSession && (
        <OrderDialog
          sessionId={orderRoom.currentSession.id}
          roomName={orderRoom.name}
          open={!!orderRoom}
          onClose={() => setOrderRoom(null)}
        />
      )}

      {/* Extend dialog (from card quick action) */}
      <ExtendDialog
        sessionId={extendRoom?.currentSession?.id ?? null}
        open={!!extendRoom}
        onClose={() => setExtendRoom(null)}
      />
    </div>
  )
}

function RoomGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <Skeleton className="h-4 w-24" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border-2 border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
