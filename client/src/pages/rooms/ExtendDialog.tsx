import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import { getErrorMessage } from '@/utils/error'
import { useExtendSession } from '@/hooks/useRooms'

interface ExtendDialogProps {
  sessionId: number | null
  open: boolean
  onClose: () => void
}

const EXTEND_PRESETS = [
  { label: '30p', value: 30 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
]

export default function ExtendDialog({ sessionId, open, onClose }: ExtendDialogProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null)
  const [customMinutes, setCustomMinutes] = useState('')
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  const extend = useExtendSession()

  const getAdditionalMinutes = (): number | null => {
    if (selectedMinutes !== null) return selectedMinutes
    const parsed = parseInt(customMinutes)
    return isNaN(parsed) ? null : parsed
  }

  const handleClose = () => {
    setSelectedMinutes(null)
    setCustomMinutes('')
    setConflictWarning(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!sessionId) return
    const minutes = getAdditionalMinutes()
    if (!minutes || minutes <= 0) {
      toast.error('Vui lòng chọn thời gian gia hạn')
      return
    }

    try {
      const result = await extend.mutateAsync({ sessionId, additionalMinutes: minutes })
      if (result.hasConflict) {
        setConflictWarning(`⚠️ Có booking trùng giờ. Vui lòng kiểm tra lại lịch phòng.`)
      } else {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        const label = h > 0 ? `${h}h${m > 0 ? m + 'p' : ''}` : `${m}p`
        toast.success(`Gia hạn thêm ${label} thành công`)
        handleClose()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gia hạn thất bại'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle>Gia hạn phòng</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Chọn thời gian muốn gia hạn thêm:</p>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-2">
            {EXTEND_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setSelectedMinutes(p.value)
                  setCustomMinutes('')
                  setConflictWarning(null)
                }}
                className={cn(
                  'h-10 rounded-md text-sm font-medium border transition-all',
                  selectedMinutes === p.value
                    ? 'btn-gradient text-white border-transparent'
                    : 'border-border text-foreground bg-muted/30 hover:bg-muted'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Tùy chỉnh (phút)
            </label>
            <Input
              placeholder="Nhập số phút..."
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value)
                setSelectedMinutes(null)
                setConflictWarning(null)
              }}
              className="bg-muted/50"
              type="number"
              min="1"
            />
          </div>

          {/* Conflict warning */}
          {conflictWarning && (
            <div className="p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-sm text-[#f59e0b]">
              {conflictWarning}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={extend.isPending}>
            Hủy
          </Button>
          <Button
            className="btn-gradient text-white"
            onClick={handleSubmit}
            disabled={extend.isPending || (selectedMinutes === null && !customMinutes)}
          >
            {extend.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xử lý...
              </div>
            ) : (
              '✓ Xác nhận gia hạn'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
