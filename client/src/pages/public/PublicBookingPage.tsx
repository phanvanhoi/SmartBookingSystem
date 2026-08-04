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

function roomStatusLabel(av: PublicAvailabilityRoom | undefined) {
  if (!av) return null
  if (av.isSinging) return { text: 'Đang hát', tone: 'busy' as const }
  if (av.busySlots.some((s) => s.reason === 'booking') && !av.hasAvailability) {
    return { text: 'Hết chỗ ngày này', tone: 'busy' as const }
  }
  if (av.busySlots.some((s) => s.reason === 'booking')) {
    return { text: 'Còn khung trống', tone: 'partial' as const }
  }
  if (av.hasAvailability) return { text: 'Trống', tone: 'free' as const }
  return { text: 'Không còn giờ', tone: 'busy' as const }
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
  const [guestCount, setGuestCount] = useState('')
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
  const selectedTier = useMemo(
    () => tiers.find((t) => t.roomTypeId === roomTypeId) ?? null,
    [tiers, roomTypeId],
  )
  const selectedRoom = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId])
  const selectedAvailability = roomId ? availabilityByRoom.get(Number(roomId)) : undefined

  const timeOptions = useMemo(() => {
    if (selectedAvailability) return selectedAvailability.availableSlots
    return availability?.timeSlots ?? []
  }, [selectedAvailability, availability])

  // Keep bookingTime valid when availability / room changes
  useEffect(() => {
    if (timeOptions.length === 0) {
      setBookingTime('')
      return
    }
    if (!timeOptions.includes(bookingTime)) {
      setBookingTime(timeOptions[0] ?? '')
    }
  }, [timeOptions, bookingTime])

  // If selected room loses all slots, clear room pick within tier
  useEffect(() => {
    if (!roomId) return
    const av = availabilityByRoom.get(Number(roomId))
    if (av && !av.hasAvailability) {
      const fallback = selectedTier?.rooms.find((r) => availabilityByRoom.get(r.id)?.hasAvailability)
      setRoomId(fallback?.id ?? '')
    }
  }, [availabilityByRoom, roomId, selectedTier])

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
    !!selectedAvailability?.availableSlots.includes(bookingTime)

  function selectTier(tier: RoomTier) {
    setRoomTypeId(tier.roomTypeId)
    setGuestCount('')
    const firstFree =
      tier.rooms.find((r) => availabilityByRoom.get(r.id)?.hasAvailability) ?? tier.rooms[0]
    setRoomId(firstFree ? firstFree.id : '')
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
      guestCount: guestCount ? Number(guestCount) : undefined,
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
            <h1 className="display text-3xl text-[var(--promo-gold)]">Đặt lịch thành công</h1>
            <p className="text-sm text-[var(--promo-muted)] leading-relaxed">
              {result.booking.roomName}
              <br />
              {result.booking.bookingDate} · {result.booking.bookingTime} ·{' '}
              {result.booking.durationHours}h
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[var(--promo-gold)] bg-[rgba(232,184,109,0.14)] px-4 py-6 space-y-3 shadow-[0_0_40px_rgba(232,184,109,0.18)]">
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
            <ol className="text-left text-xs text-[var(--promo-muted)] space-y-1.5 pt-2 border-t border-[rgba(232,184,109,0.25)]">
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
              setGuestCount('')
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
          <p className="text-[var(--promo-gold)] text-xs font-semibold tracking-wide uppercase">
            Đặt phòng online · nhận mã quay
          </p>
          <h1 className="display text-[2.1rem] leading-[0.95] sm:text-5xl">
            Giữ chỗ hát,
            <br />
            <span className="text-[var(--promo-gold)]">quay thưởng liền</span>
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="fade-up-delay panel rounded-2xl p-4 space-y-4 w-full min-w-0 shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
        >
          {/* Ngày + thời lượng trước để tính availability */}
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
          </div>

          {availability && (
            <p className="text-xs text-[var(--promo-muted)]">
              Giờ mở cửa {availability.operatingHours.open}–{availability.operatingHours.close}
              {' · '}Chỉ hiện khung trống (sau giờ hiện tại ≥{availability.minLeadMinutes} phút)
              {availabilityQuery.isFetching ? ' · đang cập nhật…' : ''}
            </p>
          )}
          {availabilityQuery.isError && (
            <p className="text-sm text-rose-300">Không tải được lịch trống. Thử lại sau.</p>
          )}

          <div className="space-y-2.5 min-w-0">
            <label className="text-sm text-[var(--promo-muted)]">Chọn hạng phòng</label>
            {roomsQuery.isLoading ? (
              <p className="text-sm text-[var(--promo-muted)] py-2">Đang tải phòng...</p>
            ) : roomsQuery.isError ? (
              <p className="text-sm text-rose-300 py-2">Không tải được danh sách phòng</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tiers.map((tier) => {
                  const active = roomTypeId === tier.roomTypeId
                  const isSmall = tier.accent === 'small'
                  const freeCount = tier.rooms.filter(
                    (r) => availabilityByRoom.get(r.id)?.hasAvailability,
                  ).length
                  return (
                    <button
                      key={tier.roomTypeId}
                      type="button"
                      onClick={() => selectTier(tier)}
                      className={cn(
                        'relative text-left rounded-2xl p-4 touch-manipulation transition-all border-2 min-w-0',
                        active
                          ? 'border-[var(--promo-gold)] bg-[rgba(232,184,109,0.16)] shadow-[0_0_28px_rgba(232,184,109,0.2)]'
                          : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(232,184,109,0.35)]',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                            isSmall
                              ? 'bg-[rgba(14,165,233,0.18)] text-sky-300'
                              : 'bg-[rgba(232,184,109,0.2)] text-[var(--promo-gold)]',
                          )}
                        >
                          {isSmall ? (
                            <DoorOpen className="w-5 h-5" />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="display text-xl leading-none text-[var(--promo-ink)]">
                            {tier.name}
                          </p>
                          <p className="mt-1.5 text-sm text-[var(--promo-muted)]">
                            {tier.capacityMin}–{tier.capacityMax} khách
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--promo-gold)]/90 leading-snug">
                            {isSmall
                              ? 'Combo KM: giảm 25–50% giờ hát · đồ uống'
                              : 'Combo KM: giảm 10–25% giờ hát · combo lớn'}
                          </p>
                          <p className="mt-2 text-[11px] text-[var(--promo-muted)] leading-snug">
                            {availability
                              ? `${freeCount}/${tier.rooms.length} phòng còn khung trống`
                              : `${tier.rooms.length} phòng`}
                          </p>
                        </div>
                      </div>
                      {active && (
                        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--promo-gold)]">
                          Đã chọn
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedTier && (
            <div className="space-y-2 min-w-0">
              <label className="text-sm text-[var(--promo-muted)]">
                Chọn phòng ({selectedTier.name})
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedTier.rooms.map((r) => {
                  const av = availabilityByRoom.get(r.id)
                  const status = roomStatusLabel(av)
                  const disabled = !!av && !av.hasAvailability
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={disabled}
                      className={cn(
                        'rounded-xl px-3 py-3 text-sm font-medium touch-manipulation border transition-colors text-left min-w-0',
                        roomId === r.id
                          ? 'border-[var(--promo-gold)] bg-[rgba(232,184,109,0.2)] text-[var(--promo-gold)]'
                          : 'border-[rgba(255,255,255,0.1)] text-[var(--promo-ink)] bg-[rgba(0,0,0,0.2)]',
                        disabled && 'opacity-45 cursor-not-allowed',
                      )}
                      onClick={() => !disabled && setRoomId(r.id)}
                    >
                      <span className="block">{r.name}</span>
                      {status && (
                        <span
                          className={cn(
                            'block text-[10px] mt-1 font-medium',
                            status.tone === 'free' && 'text-emerald-400',
                            status.tone === 'partial' && 'text-amber-300',
                            status.tone === 'busy' && 'text-rose-300',
                          )}
                        >
                          {status.text}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedAvailability?.isSinging && (
                <p className="text-xs text-amber-300/90">
                  Phòng đang hát
                  {selectedAvailability.sessionEndsAt
                    ? ` · dự kiến đến ${new Date(selectedAvailability.sessionEndsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                  . Chỉ chọn giờ sau khi kết thúc.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5 min-w-0">
            <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-time">
              Giờ bắt đầu
            </label>
            {!roomId ? (
              <p className="text-sm text-[var(--promo-muted)] py-2">Chọn phòng để xem giờ trống</p>
            ) : timeOptions.length === 0 ? (
              <p className="text-sm text-rose-300 py-2">
                Không còn khung giờ phù hợp cho phòng này. Đổi ngày, thời lượng hoặc phòng khác.
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

          <div className="space-y-1.5 min-w-0">
            <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-guests">
              Số khách <span className="opacity-60">(tuỳ chọn)</span>
            </label>
            <input
              id="bk-guests"
              type="number"
              min={selectedRoom?.capacityMin ?? selectedTier?.capacityMin ?? 1}
              max={selectedRoom?.capacityMax ?? selectedTier?.capacityMax ?? 50}
              className="field"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder={
                selectedTier
                  ? `${selectedTier.capacityMin}–${selectedTier.capacityMax}`
                  : 'VD: 3'
              }
              inputMode="numeric"
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
