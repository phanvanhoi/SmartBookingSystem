import { useState } from 'react'
import { ArrowRightLeft, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { useRooms, useTransferSession } from '@/hooks/useRooms'
import toast from 'react-hot-toast'

interface TransferDialogProps {
  sessionId: number | null
  currentRoomId: number | null
  currentRoomName: string
  open: boolean
  onClose: () => void
}

export default function TransferDialog({
  sessionId,
  currentRoomId,
  currentRoomName,
  open,
  onClose,
}: TransferDialogProps) {
  const { data: rooms = [] } = useRooms()
  const transferMutation = useTransferSession()
  const [targetRoomId, setTargetRoomId] = useState<number | null>(null)

  const availableRooms = rooms.filter(
    (r) => r.id !== currentRoomId && r.status === 'AVAILABLE'
  )

  const targetRoom = rooms.find((r) => r.id === targetRoomId)

  const handleTransfer = () => {
    if (!sessionId || !targetRoomId) return
    transferMutation.mutate(
      { sessionId, targetRoomId },
      {
        onSuccess: (data) => {
          toast.success(`Đã chuyển sang ${data.toRoom.name}`)
          setTargetRoomId(null)
          onClose()
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error?.message ?? 'Lỗi chuyển phòng')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => { setTargetRoomId(null); onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Chuyển phòng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current room */}
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 rounded-lg border border-border bg-muted/40">
              <p className="text-xs text-muted-foreground">Phòng hiện tại</p>
              <p className="text-sm font-bold">{currentRoomName}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 p-3 rounded-lg border border-primary/40 bg-accent">
              <p className="text-xs text-accent-foreground/70">Phòng đích</p>
              <p className="text-sm font-bold text-accent-foreground">
                {targetRoom ? targetRoom.name : 'Chọn phòng...'}
              </p>
            </div>
          </div>

          {/* Room selection */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Chọn phòng trống:</p>
            {availableRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có phòng trống
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setTargetRoomId(room.id)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-all text-sm',
                      targetRoomId === room.id
                        ? 'border-primary bg-accent ring-1 ring-primary'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <p className="font-bold">{room.name}</p>
                    <p className="text-[10px] text-muted-foreground">{room.roomType.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          {targetRoom && currentRoomId && (
            <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border">
              {rooms.find(r => r.id === currentRoomId)?.roomType.name !== targetRoom.roomType.name
                ? '⚠️ Loại phòng khác nhau - giá sẽ tính lại từ thời điểm chuyển.'
                : 'Giá phòng không thay đổi.'}
              {' '}Toàn bộ order sẽ được chuyển sang phòng mới.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setTargetRoomId(null); onClose() }}>
            Hủy
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!targetRoomId || transferMutation.isPending}
          >
            {transferMutation.isPending ? 'Đang chuyển...' : 'Xác nhận chuyển'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
