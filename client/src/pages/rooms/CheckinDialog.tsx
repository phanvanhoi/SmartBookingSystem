import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Search, Loader2 } from 'lucide-react'
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
import { useIsMobile } from '@/hooks/useIsMobile'
import { useCheckin } from '@/hooks/useRooms'
import { roomService } from '@/services/roomService'
import { customerService } from '@/services/customerService'
import type { Customer } from '@/types/customer'
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
  const isMobile = useIsMobile()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Name-search autocomplete state
  const [nameSuggestions, setNameSuggestions] = useState<Customer[]>([])
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false)
  const [isSearchingName, setIsSearchingName] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // When the user picks from the dropdown we set both name + phone. Skip the
  // next debounced search so we don't immediately re-open the dropdown with
  // the same row.
  const justSelectedRef = useRef(false)
  const nameContainerRef = useRef<HTMLDivElement>(null)

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
      setNameSuggestions([])
      setIsNameDropdownOpen(false)
      setHighlightedIndex(-1)
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

  // Close suggestion dropdown when clicking outside the name field area.
  useEffect(() => {
    if (!isNameDropdownOpen) return
    function handler(e: MouseEvent) {
      if (
        nameContainerRef.current &&
        !nameContainerRef.current.contains(e.target as Node)
      ) {
        setIsNameDropdownOpen(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isNameDropdownOpen])

  // Cleanup search debounce on unmount
  useEffect(() => {
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
    }
  }, [])

  function handleNameChange(value: string) {
    setCustomerName(value)
    setHighlightedIndex(-1)

    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)

    // Skip the search firing immediately after a dropdown selection — the
    // value was just set programmatically.
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setNameSuggestions([])
      setIsNameDropdownOpen(false)
      setIsSearchingName(false)
      return
    }

    setIsSearchingName(true)
    setIsNameDropdownOpen(true)
    nameDebounceRef.current = setTimeout(async () => {
      try {
        const res = await customerService.getCustomers({ search: trimmed, limit: 8 })
        setNameSuggestions(res.data)
      } catch {
        setNameSuggestions([])
      } finally {
        setIsSearchingName(false)
      }
    }, 300)
  }

  function selectCustomer(c: Customer) {
    justSelectedRef.current = true
    setCustomerName(c.name)
    setCustomerPhone(c.phone ?? '')
    setCustomerInfo({
      id: c.id,
      name: c.name,
      tier: c.tier,
      totalVisits: c.visitCount,
      lastVisit: c.lastVisit,
    })
    setIsNameDropdownOpen(false)
    setHighlightedIndex(-1)
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isNameDropdownOpen || nameSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % nameSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) =>
        i <= 0 ? nameSuggestions.length - 1 : i - 1,
      )
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      selectCustomer(nameSuggestions[highlightedIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsNameDropdownOpen(false)
      setHighlightedIndex(-1)
    }
  }

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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Check-in thất bại'))
    }
  }

  const tierColors: Record<string, string> = {
    BRONZE: 'text-amber-700',
    SILVER: 'text-slate-600',
    GOLD: 'text-amber-600',
    PLATINUM: 'text-sky-700',
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'max-w-md w-full p-0 gap-0 flex flex-col',
          isMobile ? 'dialog-mobile-full max-h-[100dvh]' : 'max-h-[90vh] overflow-y-auto',
        )}
      >
        <DialogHeader className="px-4 md:px-6 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-base md:text-lg">
            Nhận khách — {room?.name}
            {room && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({room.roomType.name})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            'px-4 md:px-6 py-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0',
          )}
        >
          {/* Customer name with autocomplete */}
          <div ref={nameContainerRef} className="relative">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Tên khách <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                placeholder="Nhập tên khách (≥ 2 ký tự để tìm)..."
                value={customerName}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => {
                  if (nameSuggestions.length > 0) setIsNameDropdownOpen(true)
                }}
                onKeyDown={handleNameKeyDown}
                className="bg-muted/50 text-base pr-9"
                autoComplete="off"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {isSearchingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </span>
            </div>

            {isNameDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                role="listbox"
              >
                {isSearchingName && nameSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Đang tìm...
                  </div>
                )}
                {!isSearchingName && nameSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Không tìm thấy khách. Cứ gõ tên mới rồi bấm NHẬN KHÁCH.
                  </div>
                )}
                {nameSuggestions.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={highlightedIndex === i}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    onClick={() => selectCustomer(c)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors',
                      highlightedIndex === i
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/60',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.phone || '—'}
                        {c.visitCount > 0 && (
                          <span className="ml-2">· {c.visitCount} lượt</span>
                        )}
                      </div>
                    </div>
                    {c.tier !== 'REGULAR' && (
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full border',
                          c.tier === 'VIP' && 'border-fuchsia-300 text-fuchsia-700',
                          c.tier === 'GOLD' && 'border-amber-300 text-amber-700',
                          c.tier === 'SILVER' && 'border-slate-300 text-slate-600',
                        )}
                      >
                        {c.tier}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone + guest count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Số điện thoại
              </label>
              <Input
                placeholder="0901234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-muted/50 text-base"
                type="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Số người</label>
              <Input
                placeholder="5"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="bg-muted/50 text-base"
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
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 text-sm">✅</span>
                <span className="text-sm font-semibold text-foreground">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedDuration(p.value)}
                  className={cn(
                    'h-10 sm:h-9 rounded-md text-sm font-semibold border transition-all min-h-[44px]',
                    selectedDuration === p.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-card'
                      : 'border-border text-foreground bg-card hover:bg-muted'
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

        <DialogFooter
          className={cn(
            'px-4 md:px-6 pb-4 md:pb-6 pt-2 gap-2 shrink-0 border-t border-border bg-card',
            isMobile && 'pb-safe flex-row',
          )}
        >
          <Button variant="outline" onClick={onClose} disabled={checkin.isPending} className="min-h-[48px]">
            Hủy
          </Button>
          <Button
            className="flex-1 min-h-[48px] font-bold"
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
