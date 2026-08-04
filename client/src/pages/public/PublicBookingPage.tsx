import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Copy, Check, Loader2, PartyPopper, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import PublicShell from './PublicShell'
import { publicService, type PublicBookingResult } from '@/services/publicService'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const total = 12 * 60 + i * 30
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const DURATIONS = [1, 1.5, 2, 2.5, 3, 4]

export default function PublicBookingPage() {
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState<number | ''>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [bookingDate, setBookingDate] = useState(todayISO())
  const [bookingTime, setBookingTime] = useState('19:00')
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

  const rooms = roomsQuery.data ?? []
  const selectedRoom = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId])

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
    !!roomId && customerName.trim().length >= 2 && customerPhone.trim().length >= 9 && !bookMutation.isPending

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit || !roomId) return
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

          {/* Mã quay — khối nổi bật nhất */}
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

          <div className="space-y-2 min-w-0">
            <label className="text-sm text-[var(--promo-muted)]">Phòng</label>
            {roomsQuery.isLoading ? (
              <p className="text-sm text-[var(--promo-muted)] py-2">Đang tải phòng...</p>
            ) : roomsQuery.isError ? (
              <p className="text-sm text-rose-300 py-2">Không tải được danh sách phòng</p>
            ) : (
              <div className="h-scroll">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={cn('chip shrink-0 touch-manipulation text-left')}
                    data-active={roomId === r.id}
                    onClick={() => setRoomId(r.id)}
                  >
                    <span className="block text-[var(--promo-ink)]">{r.name}</span>
                    <span className="block text-[10px] font-medium opacity-80 mt-0.5">
                      {r.roomTypeName} · {r.capacityMin}–{r.capacityMax} khách
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedRoom ? (
              <p className="text-xs text-[var(--promo-muted)]">
                {selectedRoom.roomTypeName}: {selectedRoom.capacityMin}–{selectedRoom.capacityMax}{' '}
                người · mỗi loại phòng có combo quay thưởng riêng
              </p>
            ) : rooms.length > 0 ? (
              <p className="text-xs text-amber-300/90">Vuốt ngang và chọn một phòng</p>
            ) : null}
          </div>

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
                Giờ
              </label>
              <select
                id="bk-time"
                className="field"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                required
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 min-w-0">
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

          <div className="space-y-1.5 min-w-0">
            <label className="text-sm text-[var(--promo-muted)]" htmlFor="bk-guests">
              Số khách <span className="opacity-60">(tuỳ chọn)</span>
            </label>
            <input
              id="bk-guests"
              type="number"
              min={selectedRoom?.capacityMin ?? 1}
              max={selectedRoom?.capacityMax ?? 50}
              className="field"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder={
                selectedRoom
                  ? `${selectedRoom.capacityMin}–${selectedRoom.capacityMax}`
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
            Đã có mã?{' '}
            <Link
              to="/quay-thuong"
              className="text-[var(--promo-gold)] underline underline-offset-2"
            >
              Vào quay thưởng
            </Link>
          </p>
        </form>
      </section>
    </PublicShell>
  )
}
