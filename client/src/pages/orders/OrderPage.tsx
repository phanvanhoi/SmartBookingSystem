import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Users, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import api from '@/services/api'
import OrderDialog from './OrderDialog'
import type { Room } from '@/types/room'

function useActiveRooms() {
  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await api.get('/rooms')
      return res.data.data
    },
    refetchInterval: 30_000,
  })
}

function formatElapsed(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}p`
  return `${m}p`
}

export default function OrderPage() {
  const { data: rooms, isLoading } = useActiveRooms()
  const [selectedRoom, setSelectedRoom] = useState<{
    sessionId: number
    roomName: string
  } | null>(null)

  const activeRooms = rooms?.filter((r) => r.currentSession) ?? []

  return (
    <div className="flex flex-col h-full gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Order</h1>
          <p className="text-sm text-muted-foreground">
            Chọn phòng để tạo order đồ uống / thức ăn
          </p>
        </div>
      </div>

      {/* Active rooms */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Phòng đang hoạt động
          </h2>
          {!isLoading && (
            <Badge variant="outline" className="text-xs tabular-nums">
              {activeRooms.length} phòng
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card shadow-card p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : activeRooms.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Không có phòng nào đang hoạt động</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {activeRooms.map((room) => {
              const session = room.currentSession!
              return (
                <Card
                  key={room.id}
                  className={cn(
                    'group p-4 cursor-pointer bg-card border border-border shadow-card',
                    'hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-0.5',
                    'transition-all duration-200'
                  )}
                  onClick={() =>
                    setSelectedRoom({ sessionId: session.id, roomName: room.name })
                  }
                >
                  {/* Room name */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors tracking-tight">
                      {room.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users className="h-3 w-3" />
                    <span className="truncate">{session.customerName}</span>
                  </div>

                  {/* Elapsed */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />
                    <span className="tabular-nums">{formatElapsed(session.elapsedMinutes)}</span>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-border pt-2 space-y-1">
                    {session.currentOrderTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Order:</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(session.currentOrderTotal)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-center text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                    + Thêm order
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Order Dialog */}
      {selectedRoom && (
        <OrderDialog
          sessionId={selectedRoom.sessionId}
          roomName={selectedRoom.roomName}
          open={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  )
}
