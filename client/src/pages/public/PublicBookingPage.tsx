import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Copy,
  Check,
  Loader2,
  PartyPopper,
  ChevronDown,
  Sparkles,
  Clock3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PublicShell from './PublicShell'
import {
  publicService,
  type NoRoomAvailableDetails,
  type PublicBookingResult,
} from '@/services/publicService'
import { getErrorCode, getErrorDetails, getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Hiển thị chỉ ngày/tháng từ ISO yyyy-mm-dd */
function formatDayMonth(iso: string) {
  const parts = iso.split('-')
  if (parts.length < 3) return iso
  const [, m, d] = parts
  return `${d}/${m}`
}

function formatNextFreeLabel(details: NoRoomAvailableDetails) {
  if (details.nextFreeTime) return details.nextFreeTime
  if (details.nextFreeAt) {
    return new Date(details.nextFreeAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return null
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.POSITIVE_INFINITY
  return h * 60 + m
}

/** Phút trên timeline ca mở cửa (qua đêm): giờ < open → +24h. */
function timelineMinutes(hm: string, openHm: string) {
  const mins = timeToMinutes(hm)
  const open = timeToMinutes(openHm)
  if (!Number.isFinite(mins) || !Number.isFinite(open)) return mins
  return mins < open ? mins + 24 * 60 : mins
}

/** Gợi ý khung trống gần nhất trên timeline qua đêm (ưu tiên giờ sau nếu cùng |Δ|). */
function nearestAvailableTimes(
  preferred: string,
  options: string[],
  openHm: string,
  limit = 5,
) {
  const pref = timelineMinutes(preferred, openHm)
  return [...options]
    .filter((t) => t !== preferred)
    .sort((a, b) => {
      const ma = timelineMinutes(a, openHm)
      const mb = timelineMinutes(b, openHm)
      const da = Math.abs(ma - pref)
      const db = Math.abs(mb - pref)
      if (da !== db) return da - db
      return ma - mb
    })
    .slice(0, limit)
}

const DURATIONS = [1, 1.5, 2, 2.5, 3, 4]

export default function PublicBookingPage() {
  const navigate = useNavigate()
  const contactSectionRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const prevContactGuideKeyRef = useRef('')
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
  const [guideStep, setGuideStep] = useState<'idle' | 'contact'>('idle')
  const [fullDetails, setFullDetails] = useState<NoRoomAvailableDetails | null>(null)

  const guestCountNum = useMemo(() => {
    const n = Number(guestCount)
    return Number.isInteger(n) && n > 0 ? n : 0
  }, [guestCount])

  const availabilityQuery = useQuery({
    queryKey: ['public', 'availability', bookingDate, durationHours, guestCountNum || null],
    queryFn: () =>
      publicService.getAvailability({
        date: bookingDate,
        durationHours,
        guestCount: guestCountNum || undefined,
      }),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(bookingDate),
    refetchInterval: 60_000,
  })

  const availability = availabilityQuery.data

  // Giờ chọn = khung có ≥1 phòng trống (đã lọc theo số khách nếu có).
  const timeOptions = useMemo(() => {
    if (!availability) return []
    if (availability.availableTimeSlots?.length) return availability.availableTimeSlots
    const free = new Set<string>()
    for (const r of availability.rooms) {
      for (const slot of r.availableSlots) free.add(slot)
    }
    return availability.timeSlots.filter((t) => free.has(t))
  }, [availability])

  const matchingRoomCount = useMemo(() => {
    if (!bookingTime || !availability) return 0
    return availability.rooms.filter((r) => r.availableSlots.includes(bookingTime)).length
  }, [availability, bookingTime])

  const selectedTimeAvailable = !bookingTime || timeOptions.includes(bookingTime)
  const openHm = availability?.operatingHours?.open ?? '12:00'
  const nearbyFreeTimes = useMemo(() => {
    if (!bookingTime || selectedTimeAvailable || timeOptions.length === 0) return []
    return nearestAvailableTimes(bookingTime, timeOptions, openHm, 5)
  }, [bookingTime, openHm, selectedTimeAvailable, timeOptions])

  // Giữ giờ khách đã chọn — không tự đổi sang khung trống khác khi lọc theo số người.
  const notifiedMismatchRef = useRef('')
  useEffect(() => {
    if (!bookingTime || selectedTimeAvailable) {
      notifiedMismatchRef.current = ''
      return
    }
    if (availabilityQuery.isLoading || availabilityQuery.isFetching) return

    const key = `${bookingDate}|${bookingTime}|${guestCountNum}|${durationHours}|${nearbyFreeTimes.join(',')}`
    if (notifiedMismatchRef.current === key) return
    notifiedMismatchRef.current = key

    if (nearbyFreeTimes.length > 0) {
      toast.error(
        `Giờ ${bookingTime} hết phòng${guestCountNum ? ` cho ${guestCountNum} khách` : ''}. Còn trống lúc ${nearbyFreeTimes[0]}.`,
        { id: 'booking-time-unavailable' },
      )
      return
    }

    toast.error(
      guestCountNum
        ? `Giờ ${bookingTime} hết phòng cho ${guestCountNum} khách. Đổi ngày hoặc thời lượng.`
        : `Giờ ${bookingTime} hết phòng. Đổi ngày hoặc thời lượng.`,
      { id: 'booking-time-unavailable' },
    )
  }, [
    availabilityQuery.isFetching,
    availabilityQuery.isLoading,
    bookingDate,
    bookingTime,
    durationHours,
    guestCountNum,
    nearbyFreeTimes,
    selectedTimeAvailable,
  ])

  // Sau khi nhập số người (+ giờ còn phòng) → kéo xuống họ tên / SĐT.
  const contactGuideKey =
    guestCountNum > 0 && bookingTime && selectedTimeAvailable
      ? `${guestCountNum}|${bookingTime}`
      : ''
  useEffect(() => {
    if (!contactGuideKey || contactGuideKey === prevContactGuideKeyRef.current) return
    prevContactGuideKeyRef.current = contactGuideKey
    setGuideStep('contact')
    const t = window.setTimeout(() => {
      contactSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nameInputRef.current?.focus({ preventScroll: true })
    }, 220)
    return () => window.clearTimeout(t)
  }, [contactGuideKey])

  useEffect(() => {
    if (!guestCountNum || !bookingTime || !selectedTimeAvailable) {
      setGuideStep('idle')
    }
  }, [guestCountNum, bookingTime, selectedTimeAvailable])

  useEffect(() => {
    if (
      guideStep === 'contact' &&
      customerName.trim().length >= 2 &&
      customerPhone.trim().length >= 9
    ) {
      setGuideStep('idle')
    }
  }, [guideStep, customerName, customerPhone])

  useEffect(() => {
    setFullDetails(null)
  }, [bookingDate, bookingTime, durationHours, guestCountNum])

  const bookMutation = useMutation({
    mutationFn: publicService.createBooking,
    onSuccess: (data) => {
      setFullDetails(null)
      setResult(data)
      toast.success('Đặt lịch thành công!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: (err) => {
      if (getErrorCode(err) === 'NO_ROOM_AVAILABLE') {
        const details = getErrorDetails<NoRoomAvailableDetails>(err)
        setFullDetails(details)
        toast.error(getErrorMessage(err, 'Hết phòng cho khung giờ này'))
        return
      }
      setFullDetails(null)
      toast.error(getErrorMessage(err, 'Không thể đặt lịch'))
    },
  })

  const canSubmit =
    !!bookingTime &&
    guestCountNum > 0 &&
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 9 &&
    !bookMutation.isPending &&
    timeOptions.includes(bookingTime)

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit || !bookingTime || !guestCountNum) return
    setFullDetails(null)
    bookMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      bookingDate,
      bookingTime,
      durationHours,
      guestCount: guestCountNum,
      notes: notes.trim() || undefined,
    })
  }

  function applyAlternative(time: string) {
    setBookingTime(time)
    setFullDetails(null)
    toast.success(`Đã chọn giờ ${time}`)
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
              IKA Music Box · hệ thống xếp {result.booking.roomName}
              {result.booking.roomTypeName ? ` (${result.booking.roomTypeName})` : ''}
              <br />
              {formatDayMonth(result.booking.bookingDate)} · {result.booking.bookingTime} ·{' '}
              {result.booking.durationHours}h
              {result.booking.guestCount ? ` · ${result.booking.guestCount} khách` : ''}
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
              setGuestCount('')
              setNotesOpen(false)
              setGuideStep('idle')
              setFullDetails(null)
              prevContactGuideKeyRef.current = ''
            }}
          >
            Đặt lịch khác
          </button>
        </section>
      </PublicShell>
    )
  }

  const nextFreeLabel = fullDetails ? formatNextFreeLabel(fullDetails) : null

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
            Không gian karaoke kiểu studio vũ trụ — đặt lịch, nhận mã quay khuyến mãi. Hệ thống tự
            xếp phòng phù hợp.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="fade-up-delay panel rounded-2xl p-4 space-y-4 w-full min-w-0"
        >
          <div className="space-y-3 min-w-0 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.18)] p-3">
            <div className="field-grid">
              <div className="space-y-1.5 min-w-0">
                <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-date">
                  Ngày
                </label>
                <div className="relative min-w-0">
                  <div className="field flex items-center pointer-events-none" aria-hidden>
                    {formatDayMonth(bookingDate)}
                  </div>
                  <input
                    id="bk-date"
                    type="date"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    min={todayISO()}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    aria-label={`Ngày ${formatDayMonth(bookingDate)}`}
                  />
                </div>
              </div>
              <div className="space-y-1.5 min-w-0">
                <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-time">
                  Giờ bắt đầu
                </label>
                {timeOptions.length === 0 && selectedTimeAvailable ? (
                  <p className="text-sm text-rose-300 py-2.5 leading-snug">
                    {availabilityQuery.isLoading
                      ? 'Đang tải khung giờ…'
                      : guestCountNum
                        ? 'Không còn khung giờ phù hợp số khách. Đổi ngày hoặc thời lượng.'
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
                    <option value="" disabled>
                      Chọn giờ
                    </option>
                    {bookingTime && !timeOptions.includes(bookingTime) ? (
                      <option value={bookingTime}>
                        {bookingTime} (hết phòng)
                      </option>
                    ) : null}
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
              <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-guests">
                Số người
              </label>
              <input
                id="bk-guests"
                type="number"
                min={1}
                max={50}
                className="field"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="VD: 4"
                inputMode="numeric"
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
            {availability && (
              <p className="text-xs text-[var(--promo-muted)]">
                Giờ mở cửa {availability.operatingHours.open}–{availability.operatingHours.close}
                {' · '}Khung {availability.slotStepMinutes ?? 15} phút
                {availability.earliestSlot ? ` · sớm nhất từ ${availability.earliestSlot}` : ''}
                {guestCountNum ? ` · lọc theo ${guestCountNum} khách` : ''}
                {bookingTime && guestCountNum
                  ? matchingRoomCount > 0
                    ? ` · ~${matchingRoomCount} phòng lúc ${bookingTime}`
                    : ` · hết phòng lúc ${bookingTime}`
                  : ''}
                {availabilityQuery.isFetching ? ' · đang cập nhật…' : ''}
              </p>
            )}
            {availabilityQuery.isError && (
              <p className="text-sm text-rose-300">Không tải được lịch trống. Thử lại sau.</p>
            )}
          </div>

          {bookingTime && !selectedTimeAvailable && (
            <div
              className="rounded-2xl border border-[rgba(251,191,36,0.45)] bg-[rgba(251,191,36,0.1)] px-4 py-4 space-y-3 reveal-section"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <Clock3 className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="display text-lg text-[var(--promo-gold)] leading-snug">
                    Giờ {bookingTime} hết phòng
                    {guestCountNum ? ` cho ${guestCountNum} khách` : ''}
                  </p>
                  <p className="text-sm text-[var(--promo-muted)] leading-relaxed">
                    {nearbyFreeTimes.length > 0
                      ? `Vẫn giữ giờ bạn chọn. Gợi ý khung còn trống gần đó (bấm để đổi):`
                      : 'Không còn khung giờ trống phù hợp. Đổi ngày, thời lượng hoặc số khách.'}
                  </p>
                </div>
              </div>
              {nearbyFreeTimes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {nearbyFreeTimes.map((time) => {
                    const roomCount =
                      availability?.rooms.filter((r) => r.availableSlots.includes(time)).length ?? 0
                    return (
                      <button
                        key={time}
                        type="button"
                        className="chip shrink-0 touch-manipulation !border-amber-300/40 !text-amber-100"
                        onClick={() => applyAlternative(time)}
                      >
                        {time}
                        {roomCount > 0 ? (
                          <span className="opacity-70 text-[10px]">· {roomCount} phòng</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {fullDetails && (
            <div
              className="rounded-2xl border border-[rgba(251,191,36,0.45)] bg-[rgba(251,191,36,0.1)] px-4 py-4 space-y-3 reveal-section"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <Clock3 className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="display text-lg text-[var(--promo-gold)] leading-snug">
                    Hết phòng cho khung giờ này
                  </p>
                  <p className="text-sm text-[var(--promo-muted)] leading-relaxed">
                    {nextFreeLabel
                      ? `Gợi ý gần nhất: ${nextFreeLabel} (cùng ngày). Bấm khung bên dưới để đổi.`
                      : 'Hôm nay không còn khung giờ trống phù hợp số khách.'}
                  </p>
                </div>
              </div>
              {fullDetails.alternatives.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-amber-200/90">
                    Gợi ý giờ gần còn phòng
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fullDetails.alternatives.map((alt) => (
                      <button
                        key={alt.bookingTime}
                        type="button"
                        className="chip shrink-0 touch-manipulation !border-amber-300/40 !text-amber-100"
                        onClick={() => applyAlternative(alt.bookingTime)}
                      >
                        {alt.bookingTime}
                        <span className="opacity-70 text-[10px]">· {alt.roomCount} phòng</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            ref={contactSectionRef}
            className={cn(
              'space-y-3 min-w-0 scroll-mt-28 transition-all duration-500',
              guestCountNum > 0 && bookingTime && selectedTimeAvailable
                ? 'reveal-section opacity-100'
                : 'opacity-55',
              guideStep === 'contact' && 'guide-target',
            )}
          >
            {guideStep === 'contact' && guestCountNum > 0 && bookingTime && selectedTimeAvailable ? (
              <div className="guide-banner" role="status">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Điền tên & SĐT — hệ thống tự xếp phòng</span>
                <ChevronDown className="w-4 h-4 shrink-0 guide-chevron" />
              </div>
            ) : null}

            <div className="space-y-1.5 min-w-0">
              <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-name">
                Họ và tên
              </label>
              <input
                ref={nameInputRef}
                id="bk-name"
                className={cn('field', guideStep === 'contact' && 'nudge-field')}
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
                className={cn(
                  'field',
                  guideStep === 'contact' && customerName.trim().length >= 2 && 'nudge-field',
                )}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                required
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="done"
              />
            </div>
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
