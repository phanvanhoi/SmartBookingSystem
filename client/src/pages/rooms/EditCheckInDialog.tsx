import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/utils/error'
import { useUpdateCheckInTime } from '@/hooks/useRooms'

interface EditCheckInDialogProps {
  sessionId: number | null
  checkInTime: string | null
  open: boolean
  onClose: () => void
}

const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm"

export default function EditCheckInDialog({
  sessionId,
  checkInTime,
  open,
  onClose,
}: EditCheckInDialogProps) {
  const [value, setValue] = useState('')
  const update = useUpdateCheckInTime()

  useEffect(() => {
    if (open && checkInTime) setValue(format(new Date(checkInTime), INPUT_FORMAT))
  }, [open, checkInTime])

  const handleSubmit = async () => {
    if (!sessionId || !value) return
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      toast.error('Giờ vào không hợp lệ')
      return
    }
    if (date.getTime() > Date.now()) {
      toast.error('Giờ vào không được ở tương lai')
      return
    }
    try {
      await update.mutateAsync({ sessionId, checkInTime: date.toISOString() })
      toast.success('Đã cập nhật giờ vào phòng')
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Cập nhật giờ vào thất bại'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle>Sửa giờ vào phòng</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Giờ vào</label>
            <Input
              type="datetime-local"
              value={value}
              max={format(new Date(), INPUT_FORMAT)}
              onChange={(e) => setValue(e.target.value)}
              className="bg-muted/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tiền giờ sẽ được tính lại theo giờ vào mới. Giờ dự kiến kết thúc dời theo.
          </p>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 gap-2">
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={update.isPending || !value}>
            {update.isPending ? 'Đang xử lý...' : '✓ Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
