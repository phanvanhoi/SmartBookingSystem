import { useState } from 'react'
import { Merge } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import { useRooms, useMergeSessions } from '@/hooks/useRooms'
import toast from 'react-hot-toast'
import type { Room } from '@/types/room'

interface MergeDialogProps {
  /** Session hiện tại (phòng chính - giữ lại) */
  primarySessionId: number | null
  primaryRoomName: string
  open: boolean
  onClose: () => void
}

export default function MergeDialog({
  primarySessionId,
  primaryRoomName,
  open,
  onClose,
}: MergeDialogProps) {
  const { data: rooms = [] } = useRooms()
  const mergeMutation = useMergeSessions()
  const [secondaryRoomId, setSecondaryRoomId] = useState<number | null>(null)

  // Phòng đang có khách (trừ phòng chính)
  const occupiedRooms = rooms.filter(
    (r) =>
      r.currentSession &&
      r.currentSession.id !== primarySessionId &&
      (r.status === 'OCCUPIED' || r.status === 'ENDING_SOON')
  )

  const secondaryRoom = occupiedRooms.find((r) => r.id === secondaryRoomId)

  const handleMerge = () => {
    if (!primarySessionId || !secondaryRoom?.currentSession) return
    mergeMutation.mutate(
      {
        primarySessionId,
        secondarySessionId: secondaryRoom.currentSession.id,
      },
      {
        onSuccess: () => {
          toast.success(`Đã gộp ${secondaryRoom.name} vào ${primaryRoomName}`)
          setSecondaryRoomId(null)
          onClose()
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error?.message ?? 'Lỗi gộp phòng')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => { setSecondaryRoomId(null); onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5" />
            Gộp phòng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Phòng chính */}
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground">Phòng chính (giữ lại)</p>
            <p className="text-sm font-semibold">{primaryRoomName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tất cả order sẽ được gộp về phòng này
            </p>
          </div>

          {/* Chọn phòng gộp */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Chọn phòng muốn gộp vào:</p>
            {occupiedRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có phòng nào đang hoạt động để gộp
              </p>
            ) : (
              <div className="space-y-2">
                {occupiedRooms.map((room) => (
                  <RoomOption
                    key={room.id}
                    room={room}
                    selected={secondaryRoomId === room.id}
                    onClick={() => setSecondaryRoomId(room.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          {secondaryRoom && (
            <div className="text-xs bg-amber-500/10 text-amber-700 p-2.5 rounded-lg border border-amber-500/20">
              ⚠️ <strong>{secondaryRoom.name}</strong> sẽ được giải phóng.
              Tiền phòng {secondaryRoom.name} tính theo thời gian thực tế đã dùng.
              Toàn bộ order chuyển sang {primaryRoomName}.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setSecondaryRoomId(null); onClose() }}>
            Hủy
          </Button>
          <Button
            className="btn-gradient text-white"
            onClick={handleMerge}
            disabled={!secondaryRoomId || mergeMutation.isPending}
          >
            {mergeMutation.isPending ? 'Đang gộp...' : 'Xác nhận gộp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RoomOption({ room, selected, onClick }: { room: Room; selected: boolean; onClick: () => void }) {
  const session = room.currentSession
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-all',
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{room.name}</p>
          <p className="text-xs text-muted-foreground">
            {session?.customerName} {session?.guestCount ? `(${session.guestCount} người)` : ''}
          </p>
        </div>
        {session && (
          <p className="text-sm font-semibold">{formatCurrency(session.currentTotal)}</p>
        )}
      </div>
    </button>
  )
}
