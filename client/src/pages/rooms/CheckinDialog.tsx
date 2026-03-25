import { useState, useEffect, useRef } from 'react'
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
import { useCheckin } from '@/hooks/useRooms'
import { roomService } from '@/services/roomService'
import type { Room } from '@/types/room'

interface CheckinDialogProps {
  room: Room | null
  open: boolean
  onClose: () => void
}

const DURATION_PRESETS = [
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: 'Tùy chọn', value: -1 },
]

interface CustomerInfo {
  id: number
  name: string
  tier: string
  totalVisits: number
  lastVisit?: string
}

export default function CheckinDialog({ room, open, onClose }: CheckinDialogProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkin = useCheckin()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCustomerName('')
      setCustomerPhone('')
      setGuestCount('')
      setSelectedDuration(null)
      setCustomDuration('')
      setNotes('')
      setCustomerInfo(null)
    }
  }, [open])

  // Debounce phone lookup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (customerPhone.length >= 9) {
      setIsLookingUp(true)
      debounceRef.current = setTimeout(async () => {
        const info = await roomService.lookupCustomer(customerPhone)
        setCustomerInfo(info)
        if (info) {
          setCustomerName(info.name)
        }
        setIsLookingUp(false)
      }, 500)
    } else {
      setCustomerInfo(null)
      setIsLookingUp(false)
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [customerPhone])

  const getEstimatedMinutes = (): number | undefined => {
    if (selectedDuration === -1) {
      const parsed = parseInt(customDuration)
      return isNaN(parsed) ? undefined : parsed
    }
    return selectedDuration ?? undefined
  }

  const handleSubmit = async () => {
    if (!room || !customerName.trim()) {
      toast.error('Vui lòng nhập tên khách')
      return
    }

    try {
      await checkin.mutateAsync({
        roomId: room.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone || undefined,
        guestCount: guestCount ? parseInt(guestCount) : undefined,
        estimatedDurationMinutes: getEstimatedMinutes(),
        notes: notes || undefined,
      })
      toast.success(`Check-in ${room.name} thành công`)
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Check-in thất bại'
      toast.error(msg)
    }
  }

  const tierColors: Record<string, string> = {
    BRONZE: 'text-amber-600',
    SILVER: 'text-slate-400',
    GOLD: 'text-yellow-400',
    PLATINUM: 'text-cyan-400',
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nhận khách — {room?.name}
            {room && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({room.roomType.name})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Customer name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Tên khách <span className="text-[#ef4444]">*</span>
            </label>
            <Input
              placeholder="Nhập tên khách..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-muted/50"
            />
          </div>

          {/* Phone + guest count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Số điện thoại
              </label>
              <Input
                placeholder="0901234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-muted/50"
                type="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Số người</label>
              <Input
                placeholder="5"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="bg-muted/50"
                type="number"
                min="1"
              />
            </div>
          </div>

          {/* Customer lookup result */}
          {isLookingUp && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Đang tìm khách quen...</span>
            </div>
          )}
          {!isLookingUp && customerInfo && (
            <div className="p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30">
              <div className="flex items-center gap-2">
                <span className="text-[#22c55e] text-sm">✅</span>
                <span className="text-sm font-medium text-foreground">
                  Khách quen: {customerInfo.name}
                </span>
              </div>
              <div className="ml-6 mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  Hạng:{' '}
                  <span className={cn('font-medium', tierColors[customerInfo.tier] ?? '')}>
                    {customerInfo.tier}
                  </span>
                </span>
                <span>|</span>
                <span>{customerInfo.totalVisits} lần đến</span>
                {customerInfo.lastVisit && (
                  <>
                    <span>|</span>
                    <span>
                      Lần cuối: {new Date(customerInfo.lastVisit).toLocaleDateString('vi-VN')}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Duration presets */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Thời gian dự kiến{' '}
              <span className="text-muted-foreground font-normal">(tùy chọn)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedDuration(p.value)}
                  className={cn(
                    'h-9 rounded-md text-sm font-medium border transition-all',
                    selectedDuration === p.value
                      ? 'btn-gradient text-white border-transparent'
                      : 'border-border text-foreground bg-muted/30 hover:bg-muted'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {selectedDuration === -1 && (
              <div className="mt-2">
                <Input
                  placeholder="Số phút (ví dụ: 90)"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="bg-muted/50"
                  type="number"
                  min="1"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
            <textarea
              placeholder="Yêu cầu đặc biệt, mic không dây, ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 gap-2">
          <Button variant="outline" onClick={onClose} disabled={checkin.isPending}>
            Hủy
          </Button>
          <Button
            className="btn-gradient text-white flex-1"
            onClick={handleSubmit}
            disabled={checkin.isPending || !customerName.trim()}
          >
            {checkin.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xử lý...
              </div>
            ) : (
              '✓ NHẬN KHÁCH'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
