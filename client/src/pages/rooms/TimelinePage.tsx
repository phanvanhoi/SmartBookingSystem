import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarPlus, Pencil, Users, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import toast from 'react-hot-toast'
import { useRooms } from '@/hooks/useRooms'
import { useBookings, useCreateBooking, useConfirmBooking, useCancelBooking, useUpdateBooking } from '@/hooks/useBookings'
import type { Room } from '@/types/room'
import type { Booking, CreateBookingPayload } from '@/services/bookingService'

// ── Constants ────────────────────────────────────────────────────────────────
const HOUR_START = 12
const HOUR_END = 29 // 05:00 next day
const TOTAL_HOURS = HOUR_END - HOUR_START
const PX_PER_HOUR = 150
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 32
const GROUP_HEADER_HEIGHT = 26
const ROOM_LABEL_WIDTH = 180

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateVN(d: Date): string {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function hourLabel(h: number): string {
  const actual = h >= 24 ? h - 24 : h
  return `${String(actual).padStart(2, '0')}:00`
}

function toTimelineHour(dt: Date | string): number {
  const d = new Date(dt)
  const fractional = d.getHours() + d.getMinutes() / 60
  return fractional < HOUR_START ? fractional + 24 : fractional
}

function timelineHourToTimeStr(h: number): string {
  const actual = h >= 24 ? h - 24 : h
  const hours = Math.floor(actual)
  const mins = Math.round((actual - hours) * 60)
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function getNowHour(): number {
  return toTimelineHour(new Date())
}

// ── Bar types ────────────────────────────────────────────────────────────────
interface BarData {
  id: string
  roomId: number
  startH: number
  endH: number
  label: string
  guestCount?: number
  type: 'session' | 'booking'
  booking?: Booking
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function TimelinePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const dateStr = formatDateISO(selectedDate)

  const { data: rooms = [] } = useRooms()
  const { data: bookingData } = useBookings(dateStr)
  const bookings: Booking[] = Array.isArray(bookingData) ? bookingData : bookingData?.bookings ?? []

  const [nowHour, setNowHour] = useState(getNowHour)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [createDialog, setCreateDialog] = useState<{ roomId: number; hour: number } | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const justDraggedRef = useRef(false)

  const updateBookingMutation = useUpdateBooking()

  // Drag state
  const [dragState, setDragState] = useState<{
    bar: BarData
    mode: 'move' | 'resize-end'
    startX: number
    startY: number
    origStartH: number
    origEndH: number
    origRoomId: number
    hasMoved: boolean // distinguish click vs drag
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ startH: number; endH: number; roomId: number; hasConflict: boolean } | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNowHour(getNowHour()), 30_000)
    return () => clearInterval(timer)
  }, [])

  // Scroll to now on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = (getNowHour() - HOUR_START - 1.5) * PX_PER_HOUR
      scrollRef.current.scrollLeft = Math.max(0, scrollTo)
    }
  }, [])

  // Sort & group rooms
  const { smallRooms, largeRooms } = useMemo(() => {
    const small: Room[] = []
    const large: Room[] = []
    rooms.forEach(r => {
      if (r.roomType.capacityMax > 8) large.push(r)
      else small.push(r)
    })
    small.sort((a, b) => a.sortOrder - b.sortOrder)
    large.sort((a, b) => a.sortOrder - b.sortOrder)
    return { smallRooms: small, largeRooms: large }
  }, [rooms])

  // Build bars
  const bars = useMemo(() => {
    const result: BarData[] = []
    // Sessions (đang hát)
    for (const room of rooms) {
      if (room.currentSession) {
        const s = room.currentSession
        const startH = toTimelineHour(s.checkInTime)
        const endH = s.estimatedEnd ? toTimelineHour(s.estimatedEnd) : Math.max(startH + 1, nowHour + 0.5)
        result.push({
          id: `session-${s.id}`,
          roomId: room.id,
          startH, endH,
          label: s.customerName,
          guestCount: s.guestCount ?? undefined,
          type: 'session',
        })
      }
    }
    // Bookings (đặt trước)
    for (const b of bookings) {
      if (b.status !== 'PENDING') continue
      const startH = toTimelineHour(b.bookingTime)
      const duration = b.durationHours ? Number(b.durationHours) : 0
      const endH = duration > 0 ? startH + duration : startH + 1
      result.push({
        id: `booking-${b.id}`,
        roomId: b.roomId,
        startH, endH,
        label: b.customerName,
        type: 'booking',
        booking: b,
      })
    }
    return result
  }, [rooms, bookings, nowHour])

  const isToday = formatDateISO(new Date()) === dateStr
  const prevDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
  const nextDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })

  const toggleGroup = (group: string) =>
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }))

  // Upcoming bookings count
  const upcomingCount = bookings.filter(b => b.status === 'PENDING').length

  // Get all room rows for vertical drag mapping
  const allRoomRows = useMemo(() => {
    const rows: Room[] = []
    if (!collapsedGroups['small']) rows.push(...smallRooms)
    if (!collapsedGroups['large']) rows.push(...largeRooms)
    return rows
  }, [smallRooms, largeRooms, collapsedGroups])

  // ── Drag handlers ──
  const handleDragStart = useCallback((
    e: React.MouseEvent,
    bar: BarData,
    mode: 'move' | 'resize-end'
  ) => {
    if (bar.type !== 'booking') return
    e.preventDefault()
    e.stopPropagation()
    setDragState({
      bar, mode,
      startX: e.clientX,
      startY: e.clientY,
      origStartH: bar.startH,
      origEndH: bar.endH,
      origRoomId: bar.roomId,
      hasMoved: false,
    })
    setDragPreview({ startH: bar.startH, endH: bar.endH, roomId: bar.roomId, hasConflict: false })
  }, [])

  // Check overlap with existing bars (exclude the bar being dragged)
  const checkOverlap = useCallback((startH: number, endH: number, roomId: number, excludeBarId: string): boolean => {
    return bars.some(b =>
      b.id !== excludeBarId &&
      b.roomId === roomId &&
      startH < b.endH &&
      endH > b.startH
    )
  }, [bars])

  // Check if booking is placed before current time
  const checkBeforeNow = useCallback((startH: number): boolean => {
    if (!isToday) return false
    return startH < nowHour
  }, [isToday, nowHour])

  useEffect(() => {
    if (!dragState) return

    const DRAG_THRESHOLD = 5 // px before considered a drag

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaY = e.clientY - dragState.startY

      // Check if moved enough to be a drag
      if (!dragState.hasMoved && Math.abs(deltaX) + Math.abs(deltaY) < DRAG_THRESHOLD) return
      if (!dragState.hasMoved) {
        setDragState(prev => prev ? { ...prev, hasMoved: true } : null)
      }

      const deltaH = deltaX / PX_PER_HOUR
      const snap = (v: number) => Math.round(v * 2) / 2 // snap to 30 min

      // Vertical: determine target room based on Y offset
      let targetRoomId = dragState.origRoomId
      if (dragState.mode === 'move') {
        const roomSteps = Math.round(deltaY / ROW_HEIGHT)
        const origIndex = allRoomRows.findIndex(r => r.id === dragState.origRoomId)
        if (origIndex >= 0) {
          const newIndex = Math.max(0, Math.min(allRoomRows.length - 1, origIndex + roomSteps))
          targetRoomId = allRoomRows[newIndex].id
        }
      }

      if (dragState.mode === 'move') {
        const newStart = snap(dragState.origStartH + deltaH)
        const duration = dragState.origEndH - dragState.origStartH
        const clampedStart = Math.max(HOUR_START, Math.min(HOUR_END - duration, newStart))
        const conflict = checkOverlap(clampedStart, clampedStart + duration, targetRoomId, dragState.bar.id)
          || checkBeforeNow(clampedStart)
        setDragPreview({ startH: clampedStart, endH: clampedStart + duration, roomId: targetRoomId, hasConflict: conflict })
      } else {
        const newEnd = snap(dragState.origEndH + deltaH)
        const clampedEnd = Math.max(dragState.origStartH + 0.5, Math.min(HOUR_END, newEnd))
        const conflict = checkOverlap(dragState.origStartH, clampedEnd, dragState.origRoomId, dragState.bar.id)
        setDragPreview({ startH: dragState.origStartH, endH: clampedEnd, roomId: dragState.origRoomId, hasConflict: conflict })
      }
    }

    const handleMouseUp = () => {
      if (dragState.hasMoved && dragPreview && dragState.bar.booking) {
        if (dragPreview.hasConflict) {
          // Conflict → snap back, show error
          const beforeNow = checkBeforeNow(dragPreview.startH)
          toast.error(beforeNow
            ? 'Không thể đặt vào thời gian đã qua'
            : 'Trùng lịch với booking/phòng đang hát'
          )
        } else {
          // No conflict → call API to update
          const newTimeStr = timelineHourToTimeStr(dragPreview.startH)
          const newDuration = Math.round((dragPreview.endH - dragPreview.startH) * 10) / 10
          const changes: { roomId?: number; bookingTime?: string; durationHours?: number } = {}

          if (dragPreview.startH !== dragState.origStartH) changes.bookingTime = newTimeStr
          if (dragPreview.endH !== dragState.origEndH) changes.durationHours = newDuration
          if (dragPreview.roomId !== dragState.origRoomId) changes.roomId = dragPreview.roomId

          if (Object.keys(changes).length > 0) {
            if (changes.bookingTime && !changes.durationHours) changes.durationHours = newDuration
            updateBookingMutation.mutate({ id: dragState.bar.booking.id, data: changes })
          }
        }
      } else if (!dragState.hasMoved && dragState.bar.booking) {
        // It was a click, not a drag → open detail dialog
        setSelectedBooking(dragState.bar.booking)
      }
      if (dragState.hasMoved) {
        justDraggedRef.current = true
        setTimeout(() => { justDraggedRef.current = false }, 50)
      }
      setDragState(null)
      setDragPreview(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, dragPreview, allRoomRows, updateBookingMutation])

  // ── Build visible rows ──
  const visibleRows: Array<{ type: 'group'; label: string; key: string; count: number } | { type: 'room'; room: Room }> = []

  // Phòng bé
  visibleRows.push({ type: 'group', label: 'PHÒNG BÉ', key: 'small', count: smallRooms.length })
  if (!collapsedGroups['small']) {
    smallRooms.forEach(r => visibleRows.push({ type: 'room', room: r }))
  }
  // Phòng lớn
  visibleRows.push({ type: 'group', label: 'PHÒNG LỚN', key: 'large', count: largeRooms.length })
  if (!collapsedGroups['large']) {
    largeRooms.forEach(r => visibleRows.push({ type: 'room', room: r }))
  }

  const nowLeft = (nowHour - HOUR_START) * PX_PER_HOUR

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-base font-bold text-foreground">Ngày</h1>

          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-3 rounded-sm bg-emerald-500" /> Đã xếp bàn
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-3 rounded-sm bg-blue-500" /> Đã nhận bàn
            </span>
            {upcomingCount > 0 && (
              <span className="text-emerald-400 font-medium">
                {upcomingCount} Lượt khách sắp đến
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date navigation */}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-w-[180px] text-center',
              isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'
            )}
          >
            {formatDateVN(selectedDate)}
          </button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Đặt bàn button */}
          <Button
            className="btn-gradient text-white text-sm h-8 px-4 ml-2"
            onClick={() => setCreateDialog({ roomId: smallRooms[0]?.id ?? 1, hour: Math.ceil(nowHour) })}
          >
            <CalendarPlus className="w-4 h-4 mr-1.5" />
            Đặt bàn
          </Button>
        </div>
      </div>

      {/* ── Timeline body ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Room labels (fixed left) ── */}
        <div className="shrink-0 border-r border-border bg-card overflow-hidden" style={{ width: ROOM_LABEL_WIDTH }}>
          {/* Corner: "PHÒNG/BÀN" */}
          <div
            className="flex items-center px-4 border-b border-border font-semibold text-xs text-muted-foreground uppercase tracking-wider"
            style={{ height: HEADER_HEIGHT }}
          >
            Phòng / Bàn
          </div>

          {/* Room labels */}
          {visibleRows.map((row, i) => {
            if (row.type === 'group') {
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between px-4 bg-muted/40 border-b border-border cursor-pointer hover:bg-muted/60 transition-colors"
                  style={{ height: GROUP_HEADER_HEIGHT }}
                  onClick={() => toggleGroup(row.key)}
                >
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {row.label}
                  </span>
                  <ChevronDown className={cn(
                    'w-3.5 h-3.5 text-muted-foreground transition-transform',
                    collapsedGroups[row.key] && '-rotate-90'
                  )} />
                </div>
              )
            }
            return (
              <div
                key={row.room.id}
                className="flex items-center px-4 border-b border-border/50 hover:bg-muted/20 transition-colors"
                style={{ height: ROW_HEIGHT }}
              >
                <span className="text-sm font-medium text-foreground">{row.room.name}</span>
              </div>
            )
          })}
        </div>

        {/* ── Scrollable timeline ── */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="relative" style={{ width: TOTAL_HOURS * PX_PER_HOUR }}>

            {/* Hour header */}
            <div
              className="sticky top-0 z-10 flex border-b border-border bg-card"
              style={{ height: HEADER_HEIGHT }}
            >
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                const h = HOUR_START + i
                return (
                  <div
                    key={h}
                    className="flex-shrink-0 flex items-end"
                    style={{ width: PX_PER_HOUR }}
                  >
                    {/* Full hour cell */}
                    <div className="w-1/2 border-r border-border/50 h-full flex items-end pb-1 px-1.5">
                      <span className="text-xs font-bold text-foreground/70">{hourLabel(h)}</span>
                    </div>
                    {/* Half hour cell */}
                    <div className="w-1/2 border-r border-dashed border-border/30 h-full flex items-end pb-1 px-1.5">
                      <span className="text-[10px] text-muted-foreground/40">30</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rows */}
            {visibleRows.map((row) => {
              if (row.type === 'group') {
                return (
                  <div
                    key={`grid-${row.key}`}
                    className="bg-muted/20 border-b border-border"
                    style={{ height: GROUP_HEADER_HEIGHT }}
                  />
                )
              }

              // Show bars for this room + any bar being dragged TO this room
              const roomBars = bars.filter(b => {
                if (dragState?.bar.id === b.id && dragPreview) {
                  return dragPreview.roomId === row.room.id
                }
                return b.roomId === row.room.id
              })

              return (
                <div
                  key={`grid-${row.room.id}`}
                  className="relative border-b border-border/50 cursor-pointer flex"
                  style={{ height: ROW_HEIGHT }}
                  onClick={(e) => {
                    // Don't open create dialog if we just finished dragging
                    if (justDraggedRef.current) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const halfHours = Math.floor(x / (PX_PER_HOUR / 2))
                    const hour = HOUR_START + halfHours / 2
                    setCreateDialog({ roomId: row.room.id, hour })
                  }}
                >
                  {/* Half-hour cells background */}
                  {Array.from({ length: TOTAL_HOURS * 2 }).map((_, ci) => (
                    <div
                      key={ci}
                      className={cn(
                        'shrink-0 h-full hover:bg-primary/15 transition-colors',
                        ci % 2 === 0
                          ? 'border-r border-border/50'
                          : 'border-r border-dashed border-border/30'
                      )}
                      style={{ width: PX_PER_HOUR / 2 }}
                    />
                  ))}
                  {/* Bars */}
                  {roomBars.map(bar => {
                    const isDragging = dragState?.bar.id === bar.id
                    const displayStart = isDragging && dragPreview ? dragPreview.startH : bar.startH
                    const displayEnd = isDragging && dragPreview ? dragPreview.endH : bar.endH
                    const left = (displayStart - HOUR_START) * PX_PER_HOUR
                    const width = Math.max((displayEnd - displayStart) * PX_PER_HOUR, 40)

                    const isSession = bar.type === 'session'
                    const timeStr = timelineHourToTimeStr(displayStart)

                    return (
                      <div
                        key={bar.id}
                        className={cn(
                          'absolute top-1 bottom-1 rounded-md flex items-center gap-1.5 px-2.5 overflow-hidden z-10 group',
                          'transition-shadow',
                          isSession
                            ? 'bg-blue-500/90 cursor-default'
                            : 'bg-emerald-500/90 cursor-grab active:cursor-grabbing',
                          isDragging && !dragPreview?.hasConflict && 'opacity-80 shadow-lg ring-2 ring-white/30',
                          isDragging && dragPreview?.hasConflict && 'opacity-80 shadow-lg ring-2 ring-red-500 bg-red-500/80'
                        )}
                        style={{ left, width }}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => {
                          e.stopPropagation()
                          if (bar.type === 'booking') handleDragStart(e, bar, 'move')
                        }}
                      >
                        {/* Content */}
                        <span className="text-[11px] font-semibold text-white whitespace-nowrap">
                          {timeStr}
                        </span>
                        <span className="text-[11px] text-white/90 truncate font-medium">
                          {bar.label}
                        </span>
                        {bar.guestCount && (
                          <span className="flex items-center gap-0.5 text-white/80 shrink-0">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px]">{bar.guestCount}</span>
                          </span>
                        )}

                        {/* Edit icon (booking only) */}
                        {bar.type === 'booking' && (
                          <button
                            className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                            onClick={e => {
                              e.stopPropagation()
                              if (bar.booking) setSelectedBooking(bar.booking)
                            }}
                          >
                            <Pencil className="w-3 h-3 text-white" />
                          </button>
                        )}

                        {/* Resize handle (booking only) */}
                        {bar.type === 'booking' && (
                          <div
                            className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
                            onMouseDown={e => handleDragStart(e, bar, 'resize-end')}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* NOW line */}
            {isToday && nowHour >= HOUR_START && nowHour <= HOUR_END && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: nowLeft }}
              >
                {/* Triangle marker */}
                <div className="absolute -top-0 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-500" />
                {/* Line */}
                <div className="absolute top-1 bottom-0 left-0 w-px bg-red-500/70" style={{ left: -0.5 }} />
              </div>
            )}

            {/* Vertical hour lines (stronger) */}
            {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
              <div
                key={`vline-${i}`}
                className="absolute border-l border-border/60 pointer-events-none"
                style={{ left: i * PX_PER_HOUR, top: HEADER_HEIGHT, bottom: 0 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      {selectedBooking && (
        <BookingDetailDialog
          booking={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
      {createDialog && (
        <CreateBookingDialog
          roomId={createDialog.roomId}
          initialHour={createDialog.hour}
          date={dateStr}
          rooms={[...smallRooms, ...largeRooms]}
          open={!!createDialog}
          onClose={() => setCreateDialog(null)}
        />
      )}
    </div>
  )
}

// ── Booking Detail Dialog ────────────────────────────────────────────────────
function BookingDetailDialog({ booking, open, onClose }: { booking: Booking; open: boolean; onClose: () => void }) {
  const confirmMutation = useConfirmBooking()
  const cancelMutation = useCancelBooking()

  const bookingTime = new Date(booking.bookingTime)
  const timeStr = `${String(bookingTime.getHours()).padStart(2, '0')}:${String(bookingTime.getMinutes()).padStart(2, '0')}`

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chi tiết đặt phòng</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Row label="Phòng" value={booking.room.name} />
          <Row label="Khách" value={booking.customerName} bold />
          {booking.customerPhone && <Row label="SĐT" value={booking.customerPhone} />}
          <Row label="Giờ đến" value={timeStr} bold />
          {booking.durationHours && <Row label="Thời lượng" value={`${booking.durationHours}h`} />}
          {booking.depositAmount > 0 && (
            <Row label="Đặt cọc" value={formatCurrency(booking.depositAmount, true)} className="text-green-400" />
          )}
          {booking.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Ghi chú: </span>{booking.notes}
            </div>
          )}
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Trạng thái</span>
            <Badge variant={booking.status === 'PENDING' ? 'default' : 'secondary'}>
              {booking.status === 'PENDING' ? 'Chờ đến' : booking.status}
            </Badge>
          </div>
        </div>

        {booking.status === 'PENDING' && (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="destructive" size="sm"
              onClick={() => { cancelMutation.mutate({ id: booking.id }); onClose() }}
              disabled={cancelMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              size="sm" className="btn-gradient text-white"
              onClick={() => { confirmMutation.mutate(booking.id); onClose() }}
              disabled={confirmMutation.isPending}
            >
              Nhận khách
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && 'font-medium', className)}>{value}</span>
    </div>
  )
}

// ── Create Booking Dialog ────────────────────────────────────────────────────
function CreateBookingDialog({
  roomId, initialHour, date, rooms, open, onClose,
}: {
  roomId: number; initialHour: number; date: string; rooms: Room[]; open: boolean; onClose: () => void
}) {
  const createMutation = useCreateBooking()

  const actualHour = initialHour >= 24 ? initialHour - 24 : initialHour
  const defaultTime = `${String(actualHour).padStart(2, '0')}:00`

  const [form, setForm] = useState<CreateBookingPayload>({
    roomId,
    customerName: '',
    customerPhone: '',
    bookingDate: date,
    bookingTime: defaultTime,
    durationHours: 2,
    depositAmount: 0,
    notes: '',
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt bàn</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phòng</label>
            <select
              className="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
              value={form.roomId}
              onChange={e => set('roomId', Number(e.target.value))}
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.roomType.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tên khách *</label>
            <Input
              value={form.customerName}
              onChange={e => set('customerName', e.target.value)}
              placeholder="Nhập tên khách"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">SĐT</label>
            <Input
              value={form.customerPhone}
              onChange={e => set('customerPhone', e.target.value)}
              placeholder="0901234567"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Giờ đến</label>
              <Input type="time" value={form.bookingTime} onChange={e => set('bookingTime', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Thời lượng (giờ)</label>
              <Input
                type="number" min={1} max={12}
                value={form.durationHours}
                onChange={e => set('durationHours', Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Đặt cọc</label>
            <Input
              type="number" min={0} step={50000}
              value={form.depositAmount}
              onChange={e => set('depositAmount', Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ghi chú</label>
            <Input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Sinh nhật, trang trí..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            className="btn-gradient text-white"
            onClick={() => {
              if (!form.customerName.trim()) return
              createMutation.mutate(form, { onSuccess: onClose })
            }}
            disabled={!form.customerName.trim() || createMutation.isPending}
          >
            <CalendarPlus className="w-3.5 h-3.5 mr-1" />
            Đặt bàn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
