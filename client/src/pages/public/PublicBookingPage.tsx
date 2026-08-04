import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Copy, Check, Loader2, PartyPopper, ChevronDown, Users, DoorOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import PublicShell from './PublicShell'
import {
  publicService,
  type PublicAvailabilityRoom,
  type PublicBookingResult,
  type PublicRoom,
} from '@/services/publicService'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DURATIONS = [1, 1.5, 2, 2.5, 3, 4]

type RoomTier = {
  roomTypeId: number
  name: string
  capacityMin: number
  capacityMax: number
  rooms: PublicRoom[]
  accent: 'small' | 'large'
}

function buildTiers(rooms: PublicRoom[]): RoomTier[] {
  const map = new Map<number, RoomTier>()
  for (const r of rooms) {
    let tier = map.get(r.roomTypeId)
    if (!tier) {
      const isSmall = /bé|nho|nhỏ|small/i.test(r.roomTypeName) || r.capacityMax <= 3
      tier = {
        roomTypeId: r.roomTypeId,
        name: r.roomTypeName,
        capacityMin: r.capacityMin,
        capacityMax: r.capacityMax,
        rooms: [],
        accent: isSmall ? 'small' : 'large',
      }
      map.set(r.roomTypeId, tier)
    }
    tier.rooms.push(r)
    tier.capacityMin = Math.min(tier.capacityMin, r.capacityMin)
    tier.capacityMax = Math.max(tier.capacityMax, r.capacityMax)
  }
  return Array.from(map.values()).sort((a, b) => a.capacityMax - b.capacityMax)
}

function roomFitsSlot(av: PublicAvailabilityRoom | undefined, time: string) {
  return !!time && !!av && av.availableSlots.includes(time)
}

/** Status khách được xem — không hiện “hết chỗ / bận”. */
function publicRoomHint(av: PublicAvailabilityRoom, time: string) {
  if (av.isSinging && av.sessionEndsAt) {
    const endLabel = new Date(av.sessionEndsAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return {
      badge: 'Sắp trống',
      detail: `Dự kiến trống từ ${endLabel}`,
      tone: 'soon' as const,
    }
  }

  const laterSlots = av.availableSlots.filter((s) => s > time).slice(0, 2)
  if (laterSlots.length > 0) {
    return {
      badge: 'Sẵn sàng',
      detail: `Khung ${time} · còn ${laterSlots.join(', ')}`,
      tone: 'free' as const,
    }
  }

  return {
    badge: 'Sẵn sàng',
    detail: `Trống khung ${time}`,
    tone: 'free' as const,
  }
}

export default function PublicBookingPage() {
  const navigate = useNavigate()
  const [roomTypeId, setRoomTypeId] = useState<number | ''>('')
  const [roomId, setRoomId] = useState<number | ''>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [bookingDate, setBookingDate] = useState(todayISO())
  const [bookingTime, setBookingTime] = useState('')
  const [durationHours, setDurationHours] = useState(2)
  const [notes, setNotes] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [result, setResult] = useState<PublicBookingResult | null>(null)
  const [copied, setCopied] = useState(false)

  const roomsQuery = useQuery({
    queryKey: ['public', 'rooms'],
    queryFn: () => publicService.getRooms(),
  })

  const availabilityQuery = useQuery({
    queryKey: ['public', 'availability', bookingDate, durationHours],
    queryFn: () =>
      publicService.getAvailability({ date: bookingDate, durationHours }),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(bookingDate),
    refetchInterval: 60_000,
  })

  const rooms = roomsQuery.data ?? []
  const availability = availabilityQuery.data
  const availabilityByRoom = useMemo(() => {
    const map = new Map<number, PublicAvailabilityRoom>()
    for (const r of availability?.rooms ?? []) map.set(r.id, r)
    return map
  }, [availability])

  const tiers = useMemo(() => buildTiers(rooms), [rooms])
  const selectedAvailability = roomId ? availabilityByRoom.get(Number(roomId)) : undefined

  // Giờ chọn = khung có ÍT NHẤT 1 phòng trống (không phụ thuộc phòng đã chọn).
  const timeOptions = useMemo(() => {
    if (!availability) return []
    const free = new Set<string>()
    for (const r of availability.rooms) {
      for (const slot of r.availableSlots) free.add(slot)
    }
    return availability.timeSlots.filter((t) => free.has(t))
  }, [availability])

  // Chỉ chỉnh giờ khi ngày/thời lượng làm khung hiện tại hết chỗ — không đụng khi đổi phòng.
  useEffect(() => {
    setBookingTime((prev) => {
      if (timeOptions.length === 0) return ''
      if (prev && timeOptions.includes(prev)) return prev
      return timeOptions[0] ?? ''
    })
  }, [timeOptions])

  // Đổi giờ / availability → bỏ phòng không còn khớp khung đã chọn.
  useEffect(() => {
    if (!roomId || !bookingTime) return
    const av = availabilityByRoom.get(Number(roomId))
    if (av && !av.availableSlots.includes(bookingTime)) {
      setRoomId('')
    }
  }, [bookingTime, availabilityByRoom, roomId])

  const roomsMatchingSlot = useMemo(() => {
    if (!bookingTime) return []
    return rooms.filter((r) => roomFitsSlot(availabilityByRoom.get(r.id), bookingTime))
  }, [rooms, availabilityByRoom, bookingTime])

  const availableTiers = useMemo(() => {
    if (!bookingTime) return []
    return tiers
      .map((tier) => ({
        ...tier,
        rooms: tier.rooms.filter((r) => roomFitsSlot(availabilityByRoom.get(r.id), bookingTime)),
      }))
      .filter((tier) => tier.rooms.length > 0)
  }, [tiers, availabilityByRoom, bookingTime])

  const selectedTier = useMemo(
    () => availableTiers.find((t) => t.roomTypeId === roomTypeId) ?? null,
    [availableTiers, roomTypeId],
  )

  // Hạng / phòng đã chọn mà hết chỗ → bỏ chọn (ẩn UI hết chỗ).
  useEffect(() => {
    if (!bookingTime) return
    if (roomTypeId && !availableTiers.some((t) => t.roomTypeId === roomTypeId)) {
      setRoomTypeId('')
      setRoomId('')
      return
    }
    if (roomId && !roomsMatchingSlot.some((r) => r.id === roomId)) {
      setRoomId('')
    }
  }, [bookingTime, availableTiers, roomTypeId, roomId, roomsMatchingSlot])

  const bookMutation = useMutation({
    mutationFn: publicService.createBooking,
    onSuccess: (data) => {
      setResult(data)
      toast.success('Đặt lịch thành công!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Không thể đặt lịch')),
  })

  const canSubmit =
    !!roomId &&
    !!bookingTime &&
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 9 &&
    !bookMutation.isPending &&
    roomFitsSlot(selectedAvailability, bookingTime)

  function selectRoom(room: PublicRoom) {
    setRoomTypeId(room.roomTypeId)
    setRoomId(room.id)
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit || !roomId || !bookingTime) return
    bookMutation.mutate({
      roomId: Number(roomId),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      bookingDate,
      bookingTime,
      durationHours,
      notes: notes.trim() || undefined,
    })
  }

  async function copyToken() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.spinToken.code)
      setCopied(true)
      toast.success('Đã sao chép mã')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không sao chép được — hãy giữ mã trên màn hình')
    }
  }

  if (result) {
    return (
      <PublicShell
        active="book"
        footer={
          <div className="flex flex-col gap-2 w-full min-w-0">
            <button
              type="button"
              className="cta py-3.5 gap-2 text-base touch-manipulation"
              onClick={() =>
                navigate(`/quay-thuong?token=${encodeURIComponent(result.spinToken.code)}`)
              }
            >
              Quay thưởng ngay
            </button>
            <button
              type="button"
              className="cta-ghost py-3 gap-2 touch-manipulation"
              onClick={copyToken}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Sao chép mã
            </button>
          </div>
        }
      >
        <section className="fade-up w-full min-w-0 space-y-4 text-center">
          <div className="panel rounded-2xl p-5 space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(34,197,94,0.15)] text-emerald-400 mx-auto">
              <PartyPopper className="w-6 h-6" />
            </div>
            <h1 className="display text-2xl sm:text-3xl text-[var(--promo-gold)]">Đặt lịch thành công</h1>
            <p className="text-sm text-[var(--promo-muted)] leading-relaxed">
              IKA Music Box · {result.booking.roomName}
              <br />
              {result.booking.bookingDate} · {result.booking.bookingTime} ·{' '}
              {result.booking.durationHours}h
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[var(--promo-gold)] bg-[rgba(255,229,102,0.1)] px-4 py-6 space-y-3 shadow-[0_0_40px_rgba(255,229,102,0.2),0_0_60px_rgba(196,77,255,0.12)]">
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[var(--promo-gold)]">
              Mã quay thưởng của bạn
            </p>
            <p
              className="display text-[clamp(2rem,10vw,3rem)] text-[var(--promo-ink)] tracking-[0.12em] break-all leading-none select-all"
              aria-label={`Mã quay thưởng ${result.spinToken.code}`}
            >
              {result.spinToken.code}
            </p>
            <p className="text-xs text-[var(--promo-muted)] leading-relaxed">
              Chụp màn hình hoặc sao chép mã · Hạn{' '}
              {new Date(result.spinToken.expiresAt).toLocaleString('vi-VN')}
            </p>
            {result.campaignName ? (
              <p className="text-xs text-[var(--promo-gold)]/90">{result.campaignName}</p>
            ) : null}
            <ol className="text-left text-xs text-[var(--promo-muted)] space-y-1.5 pt-2 border-t border-[rgba(255,229,102,0.25)]">
              <li>
                <span className="text-[var(--promo-gold)] font-semibold">1.</span> Giữ mã này
              </li>
              <li>
                <span className="text-[var(--promo-gold)] font-semibold">2.</span> Bấm “Quay thưởng
                ngay” bên dưới
              </li>
              <li>
                <span className="text-[var(--promo-gold)] font-semibold">3.</span> Nhân viên xác nhận
                lịch khi bạn đến quán
              </li>
            </ol>
          </div>

          <button
            type="button"
            className="text-sm text-[var(--promo-gold)] underline underline-offset-4 py-2 touch-manipulation"
            onClick={() => {
              setResult(null)
              setCustomerName('')
              setCustomerPhone('')
              setNotes('')
              setNotesOpen(false)
              setRoomTypeId('')
              setRoomId('')
            }}
          >
            Đặt lịch khác
          </button>
        </section>
      </PublicShell>
    )
  }

  return (
    <PublicShell
      active="book"
      footer={
        <button
          type="button"
          className="cta py-3.5 text-base gap-2 touch-manipulation"
          disabled={!canSubmit}
          onClick={() => handleSubmit()}
        >
          {bookMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
            </>
          ) : (
            'Đặt lịch & nhận mã quay'
          )}
        </button>
      }
    >
      <section className="w-full min-w-0 space-y-4">
        <div className="fade-up space-y-2 min-w-0">
          <p className="text-[var(--promo-blue)] text-xs font-semibold tracking-[0.14em] uppercase">
            IKA Music Box · đặt phòng online
          </p>
          <h1 className="display text-[1.85rem] leading-[1.05] sm:text-[2.6rem]">
            Giữ phòng riêng tư,
            <br />
            <span className="text-[var(--promo-gold)]">quay thưởng liền</span>
          </h1>
          <p className="text-sm text-[var(--promo-muted)] leading-relaxed">
            Không gian karaoke kiểu studio vũ trụ — đặt lịch, nhận mã quay khuyến mãi.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="fade-up-delay panel rounded-2xl p-4 space-y-4 w-full min-w-0"
        >
          {/* Ngày · Giờ · Thời lượng */}
          <div className="space-y-3 min-w-0 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.18)] p-3">
            <div className="field-grid">
              <div className="space-y-1.5 min-w-0">
                <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-date">
                  Ngày
                </label>
                <input
                  id="bk-date"
                  type="date"
                  className="field"
                  min={todayISO()}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-time">
                  Giờ bắt đầu
                </label>
                {timeOptions.length === 0 ? (
                  <p className="text-sm text-rose-300 py-2.5 leading-snug">
                    {availabilityQuery.isLoading
                      ? 'Đang tải khung giờ…'
                      : 'Không còn khung giờ. Đổi ngày hoặc thời lượng.'}
                  </p>
                ) : (
                  <select
                    id="bk-time"
                    className="field"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <label className="text-sm text-[var(--promo-muted)]">Thời lượng</label>
              <div className="h-scroll">
                {DURATIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="chip shrink-0 touch-manipulation"
                    data-active={durationHours === h}
                    onClick={() => setDurationHours(h)}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
            {availability && (
              <p className="text-xs text-[var(--promo-muted)]">
                Giờ mở cửa {availability.operatingHours.open}–{availability.operatingHours.close}
                {' · '}Chỉ hiện giờ còn ít nhất 1 phòng trống (≥{availability.minLeadMinutes} phút)
                {availabilityQuery.isFetching ? ' · đang cập nhật…' : ''}
              </p>
            )}
            {availabilityQuery.isError && (
              <p className="text-sm text-rose-300">Không tải được lịch trống. Thử lại sau.</p>
            )}
          </div>

          <div className="space-y-3 min-w-0">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-sm text-[var(--promo-muted)]">Phòng trống</label>
              {bookingTime ? (
                <p className="text-xs text-[var(--promo-gold)]/90">
                  {bookingDate} · {bookingTime} · {durationHours}h
                  {roomsMatchingSlot.length > 0
                    ? ` · ${roomsMatchingSlot.length} phòng sẵn sàng`
                    : ' · chưa có phòng trống'}
                </p>
              ) : (
                <p className="text-xs text-[var(--promo-muted)]">
                  Chọn ngày, giờ và thời lượng để xem phòng phù hợp.
                </p>
              )}
            </div>

            {!bookingTime ? null : roomsQuery.isLoading || availabilityQuery.isLoading ? (
              <p className="text-sm text-[var(--promo-muted)] py-2 inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải phòng trống...
              </p>
            ) : roomsQuery.isError || availabilityQuery.isError ? (
              <p className="text-sm text-rose-300 py-2">Không tải được danh sách phòng</p>
            ) : availableTiers.length === 0 ? (
              <div className="panel rounded-2xl px-4 py-5 text-center space-y-1">
                <p className="display text-lg text-[var(--promo-gold)]">Hết phòng khung này</p>
                <p className="text-sm text-[var(--promo-muted)]">
                  Thử giờ khác hoặc đổi thời lượng — chỉ hiện phòng còn chỗ.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableTiers.map((tier) => {
                  const isSmall = tier.accent === 'small'
                  return (
                    <div key={tier.roomTypeId} className="space-y-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="display text-base text-[var(--promo-ink)] truncate">
                            {tier.name}
                          </p>
                          <p className="text-[11px] text-[var(--promo-muted)]">
                            {tier.capacityMin}–{tier.capacityMax} khách · {tier.rooms.length} phòng
                            trống
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border',
                            isSmall
                              ? 'border-[rgba(61,158,255,0.4)] text-[var(--promo-blue)] bg-[rgba(61,158,255,0.12)]'
                              : 'border-[rgba(196,77,255,0.4)] text-[var(--promo-purple)] bg-[rgba(196,77,255,0.12)]',
                          )}
                        >
                          {isSmall ? 'Phòng bé' : 'Phòng lớn'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {tier.rooms.map((r) => {
                          const av = availabilityByRoom.get(r.id)
                          if (!av) return null
                          const hint = publicRoomHint(av, bookingTime)
                          const active = roomId === r.id
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => selectRoom(r)}
                              className={cn(
                                'relative text-left rounded-2xl p-3.5 touch-manipulation transition-all border min-w-0 overflow-hidden',
                                'bg-[rgba(12,20,42,0.75)] backdrop-blur-sm',
                                active
                                  ? 'border-[var(--promo-gold)] shadow-[0_0_28px_rgba(255,229,102,0.22),0_0_40px_rgba(61,158,255,0.12)]'
                                  : 'border-[rgba(157,190,255,0.16)] hover:border-[rgba(196,77,255,0.45)]',
                              )}
                            >
                              <div
                                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                                style={{
                                  background: isSmall
                                    ? 'linear-gradient(90deg, transparent, rgba(61,158,255,0.7), transparent)'
                                    : 'linear-gradient(90deg, transparent, rgba(196,77,255,0.7), transparent)',
                                }}
                                aria-hidden
                              />
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                                    isSmall
                                      ? 'bg-[rgba(61,158,255,0.14)] text-[var(--promo-blue)] border-[rgba(61,158,255,0.3)]'
                                      : 'bg-[rgba(196,77,255,0.14)] text-[var(--promo-purple)] border-[rgba(196,77,255,0.3)]',
                                  )}
                                >
                                  {isSmall ? (
                                    <DoorOpen className="w-5 h-5" />
                                  ) : (
                                    <Users className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="display text-lg leading-none text-[var(--promo-ink)] truncate">
                                      {r.name}
                                    </p>
                                    {active && (
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--promo-gold)] shrink-0">
                                        Đã chọn
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1.5 text-[11px] text-[var(--promo-muted)]">
                                    {av.capacityMin}–{av.capacityMax} khách
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={cn(
                                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                        hint.tone === 'soon'
                                          ? 'bg-[rgba(251,191,36,0.15)] text-amber-300'
                                          : 'bg-[rgba(52,211,153,0.15)] text-emerald-300',
                                      )}
                                    >
                                      {hint.badge}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-[11px] text-[var(--promo-muted)] leading-snug">
                                    {hint.detail}
                                  </p>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                <p className="text-[11px] text-[var(--promo-muted)] text-center">
                  {selectedTier
                    ? `Combo ${selectedTier.name}: ${
                        selectedTier.accent === 'small'
                          ? 'giảm 25–50% giờ hát · đồ uống'
                          : 'giảm 10–25% giờ hát · combo lớn'
                      }`
                    : 'Chọn phòng để xem combo khuyến mãi tương ứng'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-name">
              Họ và tên
            </label>
            <input
              id="bk-name"
              className="field"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              autoComplete="name"
              enterKeyHint="next"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-phone">
              Số điện thoại
            </label>
            <input
              id="bk-phone"
              className="field"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              required
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
            />
          </div>

          <div className="min-w-0">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-[var(--promo-muted)] touch-manipulation py-1"
              onClick={() => setNotesOpen((o) => !o)}
              aria-expanded={notesOpen}
            >
              Ghi chú
              <ChevronDown
                className={cn('w-4 h-4 transition-transform', notesOpen && 'rotate-180')}
              />
            </button>
            {notesOpen && (
              <textarea
                className="field min-h-[80px] resize-y mt-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sinh nhật, yêu cầu đặc biệt..."
                maxLength={300}
              />
            )}
          </div>

          <p className="text-center text-xs text-[var(--promo-muted)] pb-1">
            Xem phần thưởng?{' '}
            <Link
              to="/quay-thuong"
              className="text-[var(--promo-gold)] underline underline-offset-2"
            >
              Vòng quay khuyến mãi
            </Link>
          </p>
        </form>
      </section>
    </PublicShell>
  )
}
