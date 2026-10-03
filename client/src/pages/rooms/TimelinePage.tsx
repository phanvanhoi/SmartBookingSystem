import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarPlus, Pencil, Users, ChevronDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
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
const HEADER_HEIGHT = 32
const ROOM_LABEL_WIDTH_DESKTOP = 180
const ROOM_LABEL_WIDTH_MOBILE = 76
const ROW_HEIGHT_MAX = 56
const ROW_HEIGHT_MIN = 28
const ROW_HEIGHT_MIN_MOBILE = 40
const GROUP_HEADER_MAX = 26
const GROUP_HEADER_MIN = 20

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

/** Business day for a check-in (timeline day starts at HOUR_START). */
function businessDateISO(dt: Date | string): string {
  const d = new Date(dt)
  if (d.getHours() < HOUR_START) d.setDate(d.getDate() - 1)
  return formatDateISO(d)
}

function bookingDateLocalISO(bookingDate: string): string {
  return formatDateISO(new Date(bookingDate))
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
  isOnline?: boolean
  comboLabel?: string | null
  campaignName?: string | null
  spinStatus?: Booking['spinStatus']
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function TimelinePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const dateStr = formatDateISO(selectedDate)

  const isMobile = useIsMobile()
  const ROOM_LABEL_WIDTH = isMobile ? ROOM_LABEL_WIDTH_MOBILE : ROOM_LABEL_WIDTH_DESKTOP
  const rowHeightMin = isMobile ? ROW_HEIGHT_MIN_MOBILE : ROW_HEIGHT_MIN

  const { data: rooms = [] } = useRooms()
  const { data: bookingData } = useBookings(dateStr, { limit: 100 })
  const bookings: Booking[] = Array.isArray(bookingData) ? bookingData : bookingData?.bookings ?? []

  const [nowHour, setNowHour] = useState(getNowHour)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [createDialog, setCreateDialog] = useState<{ roomId: number; hour: number } | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const justDraggedRef = useRef(false)
  const [rowHeight, setRowHeight] = useState(ROW_HEIGHT_MAX)
  const [groupHeaderHeight, setGroupHeaderHeight] = useState(GROUP_HEADER_MAX)

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

  // Scroll to now on mount (horizontal)
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = (getNowHour() - HOUR_START - 1.5) * PX_PER_HOUR
      scrollRef.current.scrollLeft = Math.max(0, scrollTo)
    }
  }, [])

  // Sort & group rooms — Phòng lớn seed capacityMax=7, không dùng ngưỡng >8.
  const { smallRooms, largeRooms } = useMemo(() => {
    const small: Room[] = []
    const large: Room[] = []
    rooms.forEach((r) => {
      const isLarge =
        /lớn|lon|large/i.test(r.roomType.name) || r.roomType.capacityMax > 3
      if (isLarge) large.push(r)
      else small.push(r)
    })
    small.sort((a, b) => a.sortOrder - b.sortOrder)
    large.sort((a, b) => a.sortOrder - b.sortOrder)
    return { smallRooms: small, largeRooms: large }
  }, [rooms])

  // Fit all room rows into viewport — no vertical scrollbar.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const measure = () => {
      const available = el.clientHeight
      if (available <= 0) return

      const smallOpen = !collapsedGroups['small']
      const largeOpen = !collapsedGroups['large']
      const roomCount =
        (smallOpen ? smallRooms.length : 0) + (largeOpen ? largeRooms.length : 0)
      // Both group headers are always rendered in the grid
      const groupCount = 2

      if (roomCount <= 0) {
        setRowHeight(ROW_HEIGHT_MAX)
        setGroupHeaderHeight(GROUP_HEADER_MAX)
        return
      }

      let groupH = GROUP_HEADER_MAX
      let body = available - HEADER_HEIGHT - groupCount * groupH
      let rowH = Math.floor(body / roomCount)

      if (rowH < rowHeightMin) {
        groupH = GROUP_HEADER_MIN
        body = available - HEADER_HEIGHT - groupCount * groupH
        rowH = Math.floor(body / roomCount)
      }

      setGroupHeaderHeight(groupH)
      setRowHeight(Math.max(rowHeightMin, Math.min(ROW_HEIGHT_MAX, rowH)))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [collapsedGroups, smallRooms.length, largeRooms.length, rowHeightMin])

  // Build bars — chỉ hiện session/booking thuộc ngày đang xem
  const bars = useMemo(() => {
    const result: BarData[] = []
    for (const room of rooms) {
      if (room.currentSession) {
        const s = room.currentSession
        if (businessDateISO(s.checkInTime) !== dateStr) continue
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
    for (const b of bookings) {
      if (b.status !== 'PENDING') continue
      if (bookingDateLocalISO(b.bookingDate) !== dateStr) continue
      const startH = toTimelineHour(b.bookingTime)
      const duration = b.durationHours ? Number(b.durationHours) : 0
      const endH = duration > 0 ? startH + duration : startH + 1
      const guestFromNotes = b.notes?.match(/Số khách:\s*(\d+)/i)
      const isOnline = !!b.isOnline || /\[Đặt online\]/i.test(b.notes ?? '')
      result.push({
        id: `booking-${b.id}`,
        roomId: b.roomId,
        startH, endH,
        label: b.customerName,
        guestCount: guestFromNotes ? Number(guestFromNotes[1]) : undefined,
        type: 'booking',
        booking: b,
        isOnline,
        comboLabel: b.comboLabel ?? null,
        campaignName: b.campaignName ?? null,
        spinStatus: b.spinStatus ?? null,
      })
    }
    return result
  }, [rooms, bookings, nowHour, dateStr])

  const upcomingCount = bookings.filter(
    (b) => b.status === 'PENDING' && bookingDateLocalISO(b.bookingDate) === dateStr,
  ).length

  const isToday = formatDateISO(new Date()) === dateStr
  const prevDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
  const nextDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })

  const toggleGroup = (group: string) =>
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }))

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
        const roomSteps = Math.round(deltaY / rowHeight)
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
  }, [dragState, dragPreview, allRoomRows, updateBookingMutation, rowHeight, checkOverlap, checkBeforeNow])

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
    <div className="flex flex-col h-full min-h-0 overflow-hidden select-none">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 md:px-5 py-2 md:py-3 border-b border-border shrink-0 bg-card">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-foreground tracking-tight">Lịch đặt bàn</h1>
          </div>

          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-4 h-3 rounded-sm bg-emerald-500" /> Đã xếp
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-4 h-3 rounded-sm bg-sky-500" /> Đã nhận
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-4 h-3 rounded-sm bg-emerald-500 relative overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-1 bg-amber-300" />
              </span>
              Đặt online (viền vàng)
            </span>
            {upcomingCount > 0 && (
              <span className="text-emerald-700 font-semibold tabular-nums">
                {upcomingCount} sắp đến
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Date navigation */}
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Ngày trước" onClick={prevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className={cn(
              'px-3 h-9 max-md:h-11 rounded-md text-sm font-semibold transition-colors min-w-0 flex-1 md:flex-none md:min-w-[180px] text-center border',
              isToday
                ? 'bg-primary text-primary-foreground border-primary shadow-card'
                : 'bg-card text-foreground border-border hover:bg-muted'
            )}
          >
            {formatDateVN(selectedDate)}
          </button>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Ngày sau" onClick={nextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Đặt bàn button */}
          <Button
            className="text-sm h-9 px-3 md:px-4 md:ml-2 shrink-0"
            onClick={() => setCreateDialog({ roomId: smallRooms[0]?.id ?? 1, hour: Math.ceil(nowHour) })}
          >
            <CalendarPlus className="w-4 h-4 mr-1.5" />
            Đặt bàn
          </Button>
        </div>

        {/* Compact legend — phones (desktop legend is in the title row) */}
        <div className="flex md:hidden w-full flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2.5 rounded-sm bg-emerald-500" /> Đã xếp
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2.5 rounded-sm bg-sky-500" /> Đã nhận
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2.5 rounded-sm bg-emerald-500 relative overflow-hidden">
              <span className="absolute inset-y-0 left-0 w-1 bg-amber-300" />
            </span>
            Online
          </span>
          {upcomingCount > 0 && (
            <span className="text-emerald-700 font-semibold tabular-nums">{upcomingCount} sắp đến</span>
          )}
        </div>
      </div>

      {/* ── Timeline body: one scroll for X+Y (labels stay aligned; scrollbar won't clip rows) ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto md:overflow-y-hidden relative bg-card overscroll-contain">
        <div style={{ width: ROOM_LABEL_WIDTH + TOTAL_HOURS * PX_PER_HOUR, minHeight: '100%' }}>
          {/* Sticky header row */}
          <div className="sticky top-0 z-30 flex bg-card border-b border-border">
            <div
              className="sticky left-0 z-40 flex items-center px-2 md:px-4 border-r border-border font-semibold text-xs text-muted-foreground uppercase tracking-wider bg-card shrink-0"
              style={{ width: ROOM_LABEL_WIDTH, height: HEADER_HEIGHT }}
            >
              <span className="md:hidden">Phòng</span><span className="hidden md:inline">Phòng / Bàn</span>
            </div>
            <div className="flex shrink-0" style={{ height: HEADER_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                const h = HOUR_START + i
                return (
                  <div
                    key={h}
                    className="flex-shrink-0 flex items-end bg-card"
                    style={{ width: PX_PER_HOUR }}
                  >
                    <div className="w-1/2 border-r border-border/50 h-full flex items-end pb-1 px-1.5">
                      <span className="text-xs font-bold text-foreground/70">{hourLabel(h)}</span>
                    </div>
                    <div className="w-1/2 border-r border-dashed border-border/30 h-full flex items-end pb-1 px-1.5">
                      <span className="text-[10px] text-muted-foreground/40">30</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Body rows */}
          {visibleRows.map((row) => {
            if (row.type === 'group') {
              return (
                <div key={row.key} className="flex" style={{ height: groupHeaderHeight }}>
                  <div
                    className="sticky left-0 z-20 flex items-center justify-between px-2 md:px-4 bg-muted border-b border-r border-border cursor-pointer hover:bg-muted/80 transition-colors shrink-0"
                    style={{ width: ROOM_LABEL_WIDTH, height: groupHeaderHeight }}
                    onClick={() => toggleGroup(row.key)}
                  >
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {isMobile ? row.label.replace(/^PHÒNG\s*/, '') : row.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-muted-foreground transition-transform',
                        collapsedGroups[row.key] && '-rotate-90',
                      )}
                    />
                  </div>
                  <div
                    className="bg-muted/30 border-b border-border shrink-0"
                    style={{ width: TOTAL_HOURS * PX_PER_HOUR }}
                  />
                </div>
              )
            }

            const roomBars = bars.filter((b) => {
              if (dragState?.bar.id === b.id && dragPreview) {
                return dragPreview.roomId === row.room.id
              }
              return b.roomId === row.room.id
            })

            return (
              <div key={row.room.id} className="flex" style={{ height: rowHeight }}>
                <div
                  className="sticky left-0 z-10 flex items-center px-2 md:px-4 border-b border-r border-border/50 bg-card hover:bg-muted/20 transition-colors shrink-0"
                  style={{ width: ROOM_LABEL_WIDTH, height: rowHeight }}
                >
                  <span
                    className={cn(
                      'font-medium text-foreground truncate',
                      rowHeight < 36 ? 'text-xs' : 'text-sm',
                    )}
                  >
                    {isMobile ? row.room.name.replace(/^Phòng\s*/i, 'P.') : row.room.name}
                  </span>
                </div>

                <div
                  className="relative border-b border-border/50 cursor-pointer flex shrink-0"
                  style={{ width: TOTAL_HOURS * PX_PER_HOUR, height: rowHeight }}
                  onClick={(e) => {
                    if (justDraggedRef.current) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const halfHours = Math.floor(x / (PX_PER_HOUR / 2))
                    const hour = HOUR_START + halfHours / 2
                    setCreateDialog({ roomId: row.room.id, hour })
                  }}
                >
                  {Array.from({ length: TOTAL_HOURS * 2 }).map((_, ci) => (
                    <div
                      key={ci}
                      className={cn(
                        'shrink-0 h-full hover:bg-primary/15 transition-colors',
                        ci % 2 === 0
                          ? 'border-r border-border/50'
                          : 'border-r border-dashed border-border/30',
                      )}
                      style={{ width: PX_PER_HOUR / 2 }}
                    />
                  ))}

                  {roomBars.map((bar) => {
                    const isDragging = dragState?.bar.id === bar.id
                    const displayStart = isDragging && dragPreview ? dragPreview.startH : bar.startH
                    const displayEnd = isDragging && dragPreview ? dragPreview.endH : bar.endH
                    const left = (displayStart - HOUR_START) * PX_PER_HOUR
                    const width = Math.max((displayEnd - displayStart) * PX_PER_HOUR, 48)

                    const isSession = bar.type === 'session'
                    const timeStr = timelineHourToTimeStr(displayStart)
                    const comboHint =
                      bar.comboLabel ||
                      (bar.isOnline && bar.spinStatus === 'UNUSED'
                        ? 'Chưa quay'
                        : bar.isOnline && bar.campaignName
                          ? bar.campaignName
                          : null)
                    const compact = rowHeight < 40
                    const showMeta = !compact && width >= 140
                    const showCombo = !compact && rowHeight >= 48 && !!comboHint && width >= 110
                    const showNameLine = rowHeight >= 36

                    return (
                      <div
                        key={bar.id}
                        title={
                          [
                            bar.label,
                            `${timeStr}${bar.guestCount ? ` · ${bar.guestCount} khách` : ''}`,
                            bar.isOnline ? 'Đặt online' : null,
                            comboHint ? `Combo: ${comboHint}` : null,
                          ]
                            .filter(Boolean)
                            .join('\n')
                        }
                        className={cn(
                          'absolute rounded-md z-10 group overflow-hidden',
                          'flex flex-col justify-center gap-0 px-2 min-w-0',
                          'transition-shadow',
                          compact ? 'top-0.5 bottom-0.5' : 'top-1 bottom-1',
                          isSession
                            ? 'bg-blue-500/90 cursor-default'
                            : 'bg-emerald-500/90 cursor-grab active:cursor-grabbing',
                          bar.isOnline && !isSession && 'shadow-[inset_3px_0_0_0_#fbbf24]',
                          isDragging &&
                            !dragPreview?.hasConflict &&
                            'opacity-80 shadow-lg ring-2 ring-white/30',
                          isDragging &&
                            dragPreview?.hasConflict &&
                            'opacity-80 shadow-lg ring-2 ring-red-500 bg-red-500/80',
                        )}
                        style={{ left, width }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          if (bar.type === 'booking') handleDragStart(e, bar, 'move')
                        }}
                      >
                        {showNameLine ? (
                          <>
                            <div className="flex items-center gap-1 min-w-0 leading-none">
                              <span className="text-[10px] max-md:text-[11px] font-semibold text-white/90 tabular-nums shrink-0">
                                {timeStr}
                              </span>
                              {bar.isOnline && showMeta && (
                                <span className="text-[8px] font-bold uppercase tracking-wide text-amber-200 shrink-0">
                                  online
                                </span>
                              )}
                              {showMeta && bar.guestCount ? (
                                <span className="flex items-center gap-0.5 text-white/75 shrink-0 ml-auto">
                                  <Users className="w-2.5 h-2.5" />
                                  <span className="text-[9px] max-md:text-[10px]">{bar.guestCount}</span>
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 min-w-0 leading-tight">
                              <span
                                className={cn(
                                  'font-bold text-white truncate min-w-0 flex-1',
                                  compact ? 'text-[11px]' : 'text-[12px]',
                                )}
                              >
                                {bar.label}
                              </span>
                              {bar.type === 'booking' && (
                                <button
                                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (bar.booking) setSelectedBooking(bar.booking)
                                  }}
                                >
                                  <Pencil className="w-3 h-3 text-white" />
                                </button>
                              )}
                            </div>
                            {showCombo && (
                              <span className="text-[9px] text-amber-100/95 truncate leading-tight font-medium">
                                {comboHint}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 min-w-0 leading-none">
                            <span className="text-[9px] font-semibold text-white/90 tabular-nums shrink-0">
                              {timeStr}
                            </span>
                            <span className="text-[10px] font-bold text-white truncate min-w-0 flex-1">
                              {bar.label}
                            </span>
                          </div>
                        )}

                        {bar.type === 'booking' && (
                          <div
                            className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
                            onMouseDown={(e) => handleDragStart(e, bar, 'resize-end')}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {isToday && nowHour >= HOUR_START && nowHour <= HOUR_END && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: ROOM_LABEL_WIDTH + nowLeft,
                top: HEADER_HEIGHT,
                bottom: 0,
              }}
            >
              <div className="absolute -top-0 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-500" />
              <div className="absolute top-0 bottom-0 w-px bg-red-500/70" style={{ left: -0.5 }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      {selectedBooking && (
        <BookingDetailDialog
          booking={selectedBooking}
          rooms={[...smallRooms, ...largeRooms]}
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

// ── Booking Detail / Edit Dialog ─────────────────────────────────────────────
function BookingDetailDialog({
  booking,
  rooms,
  open,
  onClose,
}: {
  booking: Booking
  rooms: Room[]
  open: boolean
  onClose: () => void
}) {
  const confirmMutation = useConfirmBooking()
  const cancelMutation = useCancelBooking()
  const updateMutation = useUpdateBooking()
  const canEdit = booking.status === 'PENDING'

  const bookingTime = new Date(booking.bookingTime)
  const initialTime = `${String(bookingTime.getHours()).padStart(2, '0')}:${String(bookingTime.getMinutes()).padStart(2, '0')}`
  const initialDate = bookingDateLocalISO(booking.bookingDate)

  const [roomId, setRoomId] = useState(booking.roomId)
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [durationHours, setDurationHours] = useState(booking.durationHours ? Number(booking.durationHours) : 2)

  useEffect(() => {
    if (!open) return
    setRoomId(booking.roomId)
    setDate(bookingDateLocalISO(booking.bookingDate))
    const t = new Date(booking.bookingTime)
    setTime(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`)
    setDurationHours(booking.durationHours ? Number(booking.durationHours) : 2)
  }, [open, booking])

  const dirty =
    roomId !== booking.roomId ||
    date !== initialDate ||
    time !== initialTime ||
    durationHours !== (booking.durationHours ? Number(booking.durationHours) : 2)

  const handleSave = () => {
    const data: { roomId?: number; bookingDate?: string; bookingTime?: string; durationHours?: number } = {}
    if (roomId !== booking.roomId) data.roomId = roomId
    if (date !== initialDate) data.bookingDate = date
    if (time !== initialTime) data.bookingTime = time
    if (durationHours !== (booking.durationHours ? Number(booking.durationHours) : 2)) {
      data.durationHours = durationHours
    }
    // Changing date without time still needs bookingTime rebuilt on server — send time too
    if (data.bookingDate && data.bookingTime === undefined) data.bookingTime = time
    updateMutation.mutate({ id: booking.id, data }, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{canEdit ? 'Sửa đặt phòng' : 'Chi tiết đặt phòng'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {canEdit ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phòng</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
                  value={roomId}
                  onChange={(e) => setRoomId(Number(e.target.value))}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.roomType.name})
                    </option>
                  ))}
                </select>
              </div>
              <Row label="Khách" value={booking.customerName} bold />
              {booking.customerPhone && <Row label="SĐT" value={booking.customerPhone} />}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ngày</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Giờ đến</label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Thời lượng (giờ)</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <Row label="Phòng" value={booking.room.name} />
              {booking.room.roomType?.name && (
                <Row label="Loại phòng" value={booking.room.roomType.name} />
              )}
              <Row label="Khách" value={booking.customerName} bold />
              {booking.customerPhone && <Row label="SĐT" value={booking.customerPhone} />}
              <Row label="Ngày" value={initialDate.split('-').reverse().join('/')} />
              <Row label="Giờ đến" value={initialTime} bold />
              {booking.durationHours && <Row label="Thời lượng" value={`${booking.durationHours}h`} />}
            </>
          )}

          {booking.depositAmount > 0 && (
            <Row label="Đặt cọc" value={formatCurrency(booking.depositAmount, true)} className="text-emerald-600" />
          )}
          {(booking.isOnline || /\[Đặt online\]/i.test(booking.notes ?? '')) && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Nguồn</span>
              <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400">Đặt online</Badge>
            </div>
          )}
          {booking.campaignName && <Row label="Chiến dịch" value={booking.campaignName} />}
          {booking.spinCode && <Row label="Mã quay" value={booking.spinCode} />}
          <div className="flex justify-between text-sm items-center gap-3">
            <span className="text-muted-foreground shrink-0">Combo / quà</span>
            <span className="font-medium text-right">
              {booking.comboLabel
                ? booking.comboLabel
                : booking.spinStatus === 'UNUSED'
                  ? 'Chưa quay thưởng'
                  : booking.spinStatus === 'EXPIRED'
                    ? 'Mã quay hết hạn'
                    : '—'}
            </span>
          </div>
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

        {canEdit && (
          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                cancelMutation.mutate({ id: booking.id })
                onClose()
              }}
              disabled={cancelMutation.isPending || updateMutation.isPending}
            >
              Hủy đơn
            </Button>
            <div className="flex gap-2 ml-auto">
              {dirty && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Lưu
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  confirmMutation.mutate(booking.id)
                  onClose()
                }}
                disabled={confirmMutation.isPending || updateMutation.isPending || dirty}
              >
                Nhận khách
              </Button>
            </div>
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
              <label className="text-xs text-muted-foreground mb-1 block">Ngày</label>
              <Input type="date" value={form.bookingDate} onChange={e => set('bookingDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Giờ đến</label>
              <Input type="time" value={form.bookingTime} onChange={e => set('bookingTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Thời lượng (giờ)</label>
            <Input
              type="number" min={1} max={12}
              value={form.durationHours}
              onChange={e => set('durationHours', Number(e.target.value))}
            />
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
