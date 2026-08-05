import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Copy,
  Check,
  Loader2,
  Sparkles,
  Trophy,
  CalendarPlus,
  Gift,
  UserRound,
  DoorOpen,
  CalendarDays,
  Clock3,
  Ticket,
  Percent,
  Flame,
  CupSoda,
  Cookie,
  Star,
  PartyPopper,
  MapPin,
  Phone,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PublicShell from './PublicShell'
import {
  publicService,
  type PublicStoreInfo,
  type SpinPrizeSegment,
  type SpinResult,
  type SpinTokenStatus,
} from '@/services/publicService'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'

const SPIN_DURATION_MS = 4200
const CONFETTI_COLORS = ['#ffe566', '#ff3d7a', '#3d9eff', '#c44dff', '#12d6a0', '#ff8a3d', '#ffffff']

function resolvePrizeType(p: Pick<SpinPrizeSegment, 'label' | 'prizeType'>) {
  if (p.prizeType) return p.prizeType
  if (/giảm|%|percent/i.test(p.label)) return 'PERCENT_OFF'
  if (/đồng|fixed|k\b/i.test(p.label)) return 'FIXED_OFF'
  return 'FREE_ITEM'
}

function percentOf(p: Pick<SpinPrizeSegment, 'label' | 'prizeValue' | 'prizeType'>) {
  if (resolvePrizeType(p) !== 'PERCENT_OFF') return 0
  const raw = (p.prizeValue ?? '').trim()
  if (raw && Number.isFinite(Number(raw))) return Number(raw)
  const m = p.label.match(/(\d+)\s*%/)
  return m ? Number(m[1]) : 0
}

/** Giảm % cao nhất trong campaign = jackpot (50% phòng bé / 25% phòng lớn). */
function maxPercentOff(prizes: SpinPrizeSegment[]) {
  const vals = prizes
    .filter((p) => String(p.prizeType) === 'PERCENT_OFF')
    .map(percentOf)
    .filter((n) => n > 0)
  return vals.length ? Math.max(...vals) : 0
}

/** Chỉ giải PERCENT_OFF đúng mức % cao nhất của campaign. */
function isJackpotPrize(
  prize: Pick<SpinPrizeSegment, 'label' | 'prizeValue' | 'prizeType'>,
  prizes: SpinPrizeSegment[],
) {
  if (String(prize.prizeType) !== 'PERCENT_OFF') return false
  const pct = percentOf(prize)
  if (pct <= 0) return false
  const max = maxPercentOff(prizes)
  if (max > 0) return pct === max
  // Fallback khi chưa load prizes: chỉ nhận 50% hoặc nhãn SIÊU HOT
  return pct === 50 || /siêu\s*hot/i.test(prize.label)
}

function prizePresentation(
  p: Pick<SpinPrizeSegment, 'label' | 'prizeValue' | 'prizeType'>,
  jackpotPct = 0,
) {
  const type = resolvePrizeType(p)
  const value = (p.prizeValue ?? '').trim()
  const pct = percentOf(p)
  const hot = type === 'PERCENT_OFF' && jackpotPct > 0 && pct === jackpotPct

  if (type === 'PERCENT_OFF') {
    const shown = value || String(pct || '?')
    return {
      type,
      hot,
      badge: hot ? 'SIÊU HOT' : 'GIẢM GIÁ',
      title: `Giảm ${shown}% tiền giờ hát`,
      subtitle: hot
        ? 'Giải thưởng lớn nhất vòng quay — áp dụng tự động khi thanh toán'
        : 'Áp dụng tự động trên tiền giờ hát khi checkout',
      wheelCaption: `-${shown}%`,
      Icon: hot ? Flame : Percent,
    }
  }

  if (type === 'FIXED_OFF') {
    return {
      type,
      hot: false,
      badge: 'TIỀN MẶT',
      title: p.label,
      subtitle: 'Trừ thẳng vào hóa đơn phòng khi thanh toán',
      wheelCaption: 'HOT',
      Icon: Star,
    }
  }

  const isDrink = /coca|suối|nước/i.test(p.label + value)
  const isSnack = /khô/i.test(p.label + value)
  return {
    type,
    hot: false,
    badge: 'COMBO FREE',
    title: p.label.replace(/^Combo miễn phí:\s*/i, 'Tặng ngay · '),
    subtitle: 'Nhận tại phòng khi check-in — trị giá combo menu',
    wheelCaption: 'FREE',
    Icon: isSnack && !isDrink ? Cookie : CupSoda,
  }
}

function BigWinCelebration({
  open,
  percent,
  guestName,
  label,
  onClose,
}: {
  open: boolean
  percent: number
  guestName: string
  label: string
  onClose: () => void
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        id: i,
        left: `${(i * 19 + 3) % 100}%`,
        delay: `${(i % 14) * 0.07}s`,
        duration: `${2.4 + (i % 6) * 0.28}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        drift: `${((i % 9) - 4) * 18}px`,
        width: 6 + (i % 5) * 2,
        height: 8 + (i % 4) * 3,
        radius: i % 3 === 0 ? '999px' : '2px',
      })),
    [],
  )

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const shortName = guestName.trim().split(/\s+/).filter(Boolean).slice(-1)[0] ?? ''

  return createPortal(
    <div
      className="bigwin-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bigwin-title"
    >
      <div className="bigwin-confetti" aria-hidden>
        {pieces.map((p) => (
          <span
            key={p.id}
            className="bigwin-piece"
            style={{
              left: p.left,
              width: p.width,
              height: p.height,
              borderRadius: p.radius,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
              ['--drift' as string]: p.drift,
              boxShadow: `0 0 8px ${p.color}`,
            }}
          />
        ))}
      </div>
      <div className="bigwin-burst" aria-hidden />

      <div className="bigwin-panel">
        <div className="bigwin-card space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[rgba(255,229,102,0.18)] text-[#ffe566] mx-auto border border-[rgba(255,229,102,0.45)] shadow-[0_0_28px_rgba(255,229,102,0.35)]">
            <PartyPopper className="w-7 h-7" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#ffe566]">
            Giải thưởng lớn nhất
          </p>
          <h2 id="bigwin-title" className="display text-2xl sm:text-3xl text-white leading-tight">
            Chúc mừng{shortName ? ` ${shortName}` : ''}!
          </h2>
          <p className="bigwin-pct display text-[clamp(2.8rem,14vw,4rem)] leading-none">
            -{percent}%
          </p>
          <p className="text-sm text-white/95 font-semibold leading-snug px-1">{label}</p>
          <p className="text-xs text-[#9bb0d0] leading-relaxed">
            Bạn đã trúng mức giảm cao nhất vòng quay · Ưu đãi tự áp dụng khi thanh toán giờ hát.
          </p>
        </div>

        <div className="bigwin-actions">
          <button type="button" className="bigwin-cta" onClick={onClose}>
            Tuyệt vời!
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function CongratsSheet({
  open,
  result,
  guestName,
  isJackpot,
  resultPercent,
  store,
  showReplay,
  onReplay,
  onClose,
}: {
  open: boolean
  result: SpinResult
  guestName: string
  isJackpot: boolean
  resultPercent: number
  store?: PublicStoreInfo
  showReplay: boolean
  onReplay: () => void
  onClose: () => void
}) {
  const shortName = guestName.trim().split(/\s+/).filter(Boolean).slice(-1)[0] ?? ''
  const storeName = store?.name || 'IKA Music Box'
  const hours =
    store?.operatingHours?.open && store?.operatingHours?.close
      ? `${store.operatingHours.open}–${store.operatingHours.close}`
      : null
  const phoneHref = store?.phone ? `tel:${store.phone.replace(/\s+/g, '')}` : null
  const prize = prizePresentation(result.prize, isJackpot ? resultPercent : 0)
  const PrizeIcon = prize.Icon

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="ika-sheet-root" role="dialog" aria-modal="true" aria-labelledby="congrats-title">
      <button type="button" className="ika-sheet-scrim" aria-label="Đóng" onClick={onClose} />
      <div className={cn('ika-sheet-panel', isJackpot && 'result-jackpot')}>
        <div className="ika-sheet-handle" aria-hidden />
        <div className="ika-sheet-body">
          <div className="ika-gold-mark" aria-hidden>
            <span>IKA</span>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-[#5a4200]">
              {storeName}
            </p>
            <h2
              id="congrats-title"
              className="display text-[1.85rem] sm:text-[2.15rem] leading-[1.05] text-[#1a1200]"
            >
              {result.prize.prizeType === 'NO_PRIZE'
                ? 'Kết quả vòng quay'
                : `Chúc mừng${shortName ? ` ${shortName}` : ''}!`}
            </h2>
          </div>

          <div
            className="rounded-2xl px-3 py-3.5 space-y-2 border border-[rgba(26,18,0,0.18)]"
            style={{ background: 'rgba(255,255,255,0.28)' }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1200] text-[#ffe566] shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
              <PrizeIcon className="w-6 h-6" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-[#7a5800]">
              {prize.badge}
            </p>
            {isJackpot && resultPercent > 0 ? (
              <p className="display text-[clamp(2.4rem,12vw,3.2rem)] leading-none text-[#1a1200]">
                -{resultPercent}%
              </p>
            ) : null}
            <p className="display text-lg sm:text-xl leading-snug text-[#1a1200] px-1">
              {prize.title}
            </p>
            <p className="text-xs font-medium text-[#5a4200] leading-relaxed px-1">
              {prize.subtitle}
            </p>
          </div>

          <div
            className="h-px w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(26,18,0,0.35), transparent)',
            }}
          />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#1a1200] leading-relaxed">
              Hẹn bạn tại cửa hàng
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              {store?.mapsUrl ? (
                <a
                  href={store.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ika-gold-btn ika-gold-btn-outline"
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  Chỉ đường
                </a>
              ) : null}
              {phoneHref ? (
                <a href={phoneHref} className="ika-gold-btn ika-gold-btn-dark">
                  <Phone className="w-4 h-4 shrink-0" />
                  {store?.phone}
                </a>
              ) : null}
            </div>

            {(store?.address || hours) && (
              <div className="space-y-0.5 text-[11px] font-medium text-[#5a4200]">
                {store?.address ? <p>{store.address}</p> : null}
                {hours ? <p>Giờ mở cửa {hours}</p> : null}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {showReplay && (
              <button type="button" className="ika-gold-btn ika-gold-btn-outline" onClick={onReplay}>
                <Sparkles className="w-4 h-4" /> Xem lại hiệu ứng
              </button>
            )}
            <button type="button" className="ika-gold-btn ika-gold-btn-dark" onClick={onClose}>
              <X className="w-4 h-4" /> Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'IKA'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

function formatBookingDate(value: string) {
  const raw = value.includes('T') ? value : `${value}T00:00:00`
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatBookingTime(value: string | Date) {
  if (typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value)) {
    return value.slice(0, 5)
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function tokenStatusMeta(status: SpinTokenStatus['status']) {
  if (status === 'UNUSED') {
    return {
      label: 'Sẵn sàng quay',
      className: 'bg-[rgba(52,211,153,0.16)] text-emerald-300 border-emerald-400/30',
    }
  }
  if (status === 'USED') {
    return {
      label: 'Đã quay',
      className: 'bg-[rgba(61,158,255,0.16)] text-[var(--promo-blue)] border-[rgba(61,158,255,0.35)]',
    }
  }
  return {
    label: 'Hết hạn',
    className: 'bg-[rgba(251,113,133,0.16)] text-rose-300 border-rose-400/30',
  }
}

export default function SpinWheelPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = (searchParams.get('token') ?? '').trim().toUpperCase()

  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [showBigWin, setShowBigWin] = useState(false)
  const [congratsDismissed, setCongratsDismissed] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const revealTimerRef = useRef<number | null>(null)

  const hasToken = tokenFromUrl.length >= 6

  const tokenQuery = useQuery({
    queryKey: ['public', 'spin-token', tokenFromUrl],
    queryFn: () => publicService.getToken(tokenFromUrl),
    enabled: hasToken,
    retry: false,
  })

  const campaignQuery = useQuery({
    queryKey: ['public', 'spin-campaign', hasToken ? tokenFromUrl : 'default'],
    queryFn: () =>
      publicService.getCampaign(hasToken ? { token: tokenFromUrl } : undefined),
  })

  const storeQuery = useQuery({
    queryKey: ['public', 'store-info'],
    queryFn: () => publicService.getStoreInfo(),
    staleTime: 5 * 60_000,
  })

  const token = tokenQuery.data
  const store = storeQuery.data
  const guestName = token?.booking.customerName?.trim() || result?.customerName?.trim() || ''
  const tokenAlreadyUsed = token?.status === 'USED'
  const tokenExpired = token?.status === 'EXPIRED'

  const prizes = campaignQuery.data?.prizes ?? []
  const prizesRef = useRef(prizes)
  prizesRef.current = prizes
  const jackpotPct = useMemo(() => maxPercentOff(prizes), [prizes])
  const segmentAngle = prizes.length > 0 ? 360 / prizes.length : 360
  const segmentAngleRef = useRef(segmentAngle)
  segmentAngleRef.current = segmentAngle
  const resultIsJackpot = !!result && isJackpotPrize(result.prize, prizes)
  const resultPercent = result ? percentOf(result.prize) : 0

  // Solid slices + hairline dividers (không gradient từng ô).
  const conicGradient = useMemo(() => {
    if (prizes.length === 0) return 'conic-gradient(#1a2440 0deg 360deg)'
    const gap = Math.min(1.2, segmentAngle * 0.04)
    const stops: string[] = []
    for (let i = 0; i < prizes.length; i++) {
      const start = i * segmentAngle
      const end = (i + 1) * segmentAngle
      stops.push(`${prizes[i]!.color} ${start}deg ${end - gap}deg`)
      stops.push(`#070d1c ${end - gap}deg ${end}deg`)
    }
    return `conic-gradient(from -${segmentAngle / 2}deg, ${stops.join(', ')})`
  }, [prizes, segmentAngle])

  useEffect(() => {
    return () => {
      if (revealTimerRef.current != null) window.clearTimeout(revealTimerRef.current)
    }
  }, [])

  const spinMutation = useMutation({
    mutationFn: (code: string) => publicService.spin(code),
    onSuccess: (data) => {
      const angle = segmentAngleRef.current
      const targetIndex = data.prizeIndex
      const segmentCenter = targetIndex * angle
      const base = 360 * 5
      const finalRotation = base + (360 - segmentCenter)
      setSpinning(true)
      setResult(null)
      setShowBigWin(false)
      setCongratsDismissed(false)
      setRotation((prev) => prev + finalRotation)
      scrollWheelToCenter()
      // Chỉ lộ kết quả + refetch token SAU khi animation vòng quay kết thúc
      // (refetch sớm khiến "Kết quả đã quay" hiện giữa chừng → mất hồi hộp).
      if (revealTimerRef.current != null) window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null
        setSpinning(false)
        setResult(data)
        void tokenQuery.refetch()
        const jackpot = isJackpotPrize(data.prize, prizesRef.current)
        setShowBigWin(jackpot)
      }, SPIN_DURATION_MS)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Không thể quay')),
  })

  useEffect(() => {
    setResult(null)
    setRotation(0)
    setShowBigWin(false)
    setCongratsDismissed(false)
  }, [tokenFromUrl])

  function scrollWheelToCenter() {
    const el = wheelRef.current
    if (!el) return

    const header = document.querySelector('.public-promo header')
    const footerBar = document.querySelector('.public-promo [data-public-footer]')
    const headerH =
      header instanceof HTMLElement ? header.getBoundingClientRect().height : 72
    const footerH =
      footerBar instanceof HTMLElement ? footerBar.getBoundingClientRect().height : 96

    const rect = el.getBoundingClientRect()
    const visibleMid = headerH + (window.innerHeight - headerH - footerH) / 2
    const delta = rect.top + rect.height / 2 - visibleMid
    if (Math.abs(delta) < 8) return

    const scrollingEl =
      document.scrollingElement ?? document.documentElement
    const currentTop = scrollingEl.scrollTop
    scrollingEl.scrollTo({ top: Math.max(0, currentTop + delta), behavior: 'smooth' })
  }

  function handleSpin() {
    if (!hasToken || spinning || spinMutation.isPending) return
    if (tokenExpired || tokenAlreadyUsed) return
    if (prizes.length === 0) {
      toast.error('Vòng quay chưa sẵn sàng')
      return
    }
    setResult(null)
    setShowBigWin(false)
    // Cuộn ngay khi bấm; gọi lại sau frame để layout ổn định trên mobile.
    scrollWheelToCenter()
    requestAnimationFrame(() => scrollWheelToCenter())
    spinMutation.mutate(tokenFromUrl)
  }

  async function copyTokenCode() {
    try {
      await navigator.clipboard.writeText(tokenFromUrl)
      setCopiedToken(true)
      toast.success('Đã sao chép mã quay')
      setTimeout(() => setCopiedToken(false), 2000)
    } catch {
      toast.error('Không sao chép được')
    }
  }

  const busy = spinning || spinMutation.isPending
  const canSpin =
    hasToken &&
    !busy &&
    prizes.length > 0 &&
    !result &&
    !tokenAlreadyUsed &&
    !tokenExpired &&
    tokenQuery.isSuccess

  const statusMeta = token ? tokenStatusMeta(token.status) : null

  return (
    <PublicShell
      active="spin"
      footer={
        hasToken ? (
          <button
            type="button"
            className="cta w-full py-3.5 inline-flex items-center justify-center gap-2 text-base touch-manipulation"
            disabled={
              result && congratsDismissed && !showBigWin && !spinning
                ? false
                : !canSpin
            }
            onClick={() => {
              if (result && congratsDismissed && !showBigWin && !spinning) {
                setCongratsDismissed(false)
                return
              }
              handleSpin()
            }}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang quay...
              </>
            ) : result && congratsDismissed && !showBigWin ? (
              <>
                <Gift className="w-4 h-4" /> Xem phần thưởng
              </>
            ) : tokenAlreadyUsed || result ? (
              <>
                <Trophy className="w-4 h-4" /> Đã quay xong
              </>
            ) : tokenExpired ? (
              <>Hết hạn quay</>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Quay ngay
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="cta w-full py-3.5 inline-flex items-center justify-center gap-2 text-base touch-manipulation"
            onClick={() => navigate('/dat-lich')}
          >
            <CalendarPlus className="w-4 h-4" /> Đặt phòng để quay thưởng
          </button>
        )
      }
    >
      <section className="flex flex-col gap-5 w-full min-w-0">
        <div className="fade-up space-y-1.5 min-w-0 text-center sm:text-left">
          <p className="text-[var(--promo-blue)] text-xs font-semibold tracking-[0.14em] uppercase">
            {token?.campaignName ?? campaignQuery.data?.name ?? 'IKA · Cổng quay vũ trụ'}
          </p>
          <h1 className="display text-[1.85rem] leading-[1.05] sm:text-[2.4rem]">
            {hasToken ? (
              guestName ? (
                <>
                  Xin chào{' '}
                  <span className="text-[var(--promo-gold)]">{guestName.split(/\s+/).slice(-1)[0]}</span>
                  ,
                  <br />
                  <span className="text-[var(--promo-ink)]">cổng thưởng đang mở</span>
                </>
              ) : (
                <>
                  Cổng thưởng mở,
                  <br />
                  <span className="text-[var(--promo-gold)]">chúc bạn may mắn</span>
                </>
              )
            ) : (
              <>
                Quay thưởng khi
                <br />
                <span className="text-[var(--promo-gold)]">đặt phòng IKA</span>
              </>
            )}
          </h1>
          {!hasToken && (
            <p className="text-sm text-[var(--promo-muted)] leading-relaxed pt-1">
              Đặt lịch Music Box → nhận mã → quay trúng giảm giờ hát hoặc combo đồ uống.
            </p>
          )}
        </div>

        {/* Guest passport card */}
        {hasToken && (
          <div className="fade-up relative overflow-hidden rounded-2xl border border-[rgba(255,229,102,0.35)] bg-[rgba(10,16,36,0.85)] shadow-[0_0_40px_rgba(196,77,255,0.14),0_0_28px_rgba(255,229,102,0.1)]">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,229,102,0.9), rgba(61,158,255,0.7), rgba(196,77,255,0.8), transparent)',
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-40"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,229,102,0.35), transparent 70%)',
              }}
              aria-hidden
            />

            {tokenQuery.isLoading ? (
              <div className="p-5 flex items-center gap-2 text-sm text-[var(--promo-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thông tin khách...
              </div>
            ) : tokenQuery.isError ? (
              <div className="p-5 space-y-2">
                <p className="display text-lg text-rose-300">Không tìm thấy mã quay</p>
                <p className="text-sm text-[var(--promo-muted)]">
                  Kiểm tra lại mã hoặc{' '}
                  <Link to="/dat-lich" className="text-[var(--promo-gold)] underline underline-offset-2">
                    đặt lịch mới
                  </Link>
                  .
                </p>
                <p className="font-mono text-sm tracking-wider text-[var(--promo-gold)]">{tokenFromUrl}</p>
              </div>
            ) : token ? (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="shrink-0 w-14 h-14 rounded-full grid place-items-center border-2 border-[var(--promo-gold)] bg-[rgba(255,229,102,0.1)] shadow-[0_0_20px_rgba(255,229,102,0.35)]"
                    aria-hidden
                  >
                    <span className="display text-sm text-[var(--promo-gold)] leading-none">
                      {initials(guestName || 'IKA')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--promo-muted)] font-semibold">
                      Khách IKA Music Box
                    </p>
                    <p className="display text-[1.55rem] sm:text-2xl leading-none text-[var(--promo-ink)] truncate">
                      {guestName || 'Khách'}
                    </p>
                    {statusMeta && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          statusMeta.className,
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                  <UserRound className="w-5 h-5 text-[var(--promo-gold)]/70 shrink-0 mt-1" aria-hidden />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[rgba(157,190,255,0.16)] bg-[rgba(4,10,24,0.55)] px-3 py-2.5 min-w-0">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--promo-muted)]">
                      <DoorOpen className="w-3 h-3" /> Phòng
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--promo-ink)] truncate">
                      {token.booking.roomName}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[rgba(157,190,255,0.16)] bg-[rgba(4,10,24,0.55)] px-3 py-2.5 min-w-0">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--promo-muted)]">
                      <CalendarDays className="w-3 h-3" /> Ngày hát
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--promo-ink)] truncate">
                      {formatBookingDate(String(token.booking.bookingDate))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[rgba(157,190,255,0.16)] bg-[rgba(4,10,24,0.55)] px-3 py-2.5 min-w-0">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--promo-muted)]">
                      <Clock3 className="w-3 h-3" /> Giờ
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--promo-ink)] truncate">
                      {formatBookingTime(token.booking.bookingTime as unknown as string)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[rgba(255,229,102,0.28)] bg-[rgba(255,229,102,0.08)] px-3 py-2.5 min-w-0">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--promo-gold)]">
                      <Ticket className="w-3 h-3" /> Mã quay
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 min-w-0">
                      <p className="font-mono text-sm font-semibold tracking-wider text-[var(--promo-gold)] truncate">
                        {token.code}
                      </p>
                      <button
                        type="button"
                        className="shrink-0 p-1 rounded-md text-[var(--promo-gold)] touch-manipulation"
                        onClick={copyTokenCode}
                        aria-label="Sao chép mã quay"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {tokenAlreadyUsed && token.resultLabel && !result && !spinning && !spinMutation.isPending && (
                  <div className="rounded-xl border border-[rgba(61,158,255,0.3)] bg-[rgba(61,158,255,0.1)] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--promo-blue)] font-semibold">
                      Kết quả đã quay
                    </p>
                    <p className="mt-1 display text-lg text-[var(--promo-ink)] leading-none">
                      {token.resultLabel}
                    </p>
                    {token.rewardCode && (
                      <p className="mt-1.5 text-xs text-[var(--promo-muted)]">
                        Mã đổi:{' '}
                        <span className="font-mono text-[var(--promo-gold)]">{token.rewardCode}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Wheel */}
        <div
          ref={wheelRef}
          id="spin-wheel"
          className="fade-up flex flex-col items-center w-full min-w-0 scroll-mt-4"
        >
          <div
            className={cn(
              'relative w-[min(90vw,340px)] aspect-square overflow-visible',
              spinning && 'animate-pulse',
            )}
          >
            <div
              className="pointer-events-none absolute -inset-4 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,229,102,0.22) 0%, rgba(61,158,255,0.2) 35%, rgba(196,77,255,0.12) 55%, transparent 70%)',
                filter: 'blur(8px)',
              }}
              aria-hidden
            />
            {/* Outer studded ring */}
            <div
              className="absolute inset-0 rounded-full border-[10px] border-[#1a2440] shadow-[0_0_0_3px_rgba(255,229,102,0.55),0_0_48px_rgba(255,229,102,0.25),0_0_72px_rgba(196,77,255,0.2)]"
              aria-hidden
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-1 z-30"
              style={{
                width: 0,
                height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: '26px solid var(--promo-gold)',
                filter: 'drop-shadow(0 0 10px rgba(255,229,102,0.95))',
              }}
              aria-hidden
            />

            <div
              className="absolute inset-[10px] rounded-full overflow-hidden"
              style={{
                background: conicGradient,
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.75, 0.08, 1)`
                  : 'none',
                boxShadow: 'inset 0 0 28px rgba(0,0,0,0.45)',
              }}
            >
              {prizes.map((p, i) => {
                const angle = i * segmentAngle
                const view = prizePresentation(p, jackpotPct)
                const Icon = view.Icon
                return (
                  <div
                    key={p.id}
                    className="absolute inset-0 flex items-start justify-center pt-[11%] sm:pt-[12%]"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center border-2 bg-[#0a1228]/95 shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
                        style={{ borderColor: 'rgba(255,255,255,0.55)' }}
                      >
                        <Icon
                          className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                          style={{ color: p.color, filter: `drop-shadow(0 0 6px ${p.color})` }}
                          strokeWidth={2.25}
                        />
                      </div>
                      <span
                        className="text-[9px] sm:text-[10px] font-extrabold text-white tracking-wide"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                      >
                        {view.wheelCaption}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="absolute inset-[31%] sm:inset-[32%] rounded-full bg-[#050b1a] border-2 border-[rgba(255,229,102,0.65)] flex flex-col items-center justify-center z-10 pointer-events-none shadow-[inset_0_0_28px_rgba(61,158,255,0.3),0_0_24px_rgba(255,229,102,0.2)]">
              <Sparkles className="w-4 h-4 text-[var(--promo-gold)] mb-0.5 opacity-90" />
              <span className="display text-lg sm:text-xl text-[var(--promo-gold)] leading-none">
                IKA
              </span>
              <span className="text-[8px] uppercase tracking-[0.18em] text-[var(--promo-muted)] mt-1">
                Jackpot
              </span>
            </div>
          </div>

          {campaignQuery.isLoading && (
            <p className="mt-3 text-sm text-[var(--promo-muted)] inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải vòng quay...
            </p>
          )}
          {campaignQuery.isError && (
            <p className="mt-3 text-sm text-rose-300 text-center px-4">
              Chương trình vòng quay chưa sẵn sàng.
            </p>
          )}
        </div>

        {prizes.length > 0 && !tokenAlreadyUsed && (
          <div className="fade-up-delay space-y-3 w-full min-w-0">
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-center gap-2 text-[var(--promo-gold)] min-w-0">
                <Gift className="w-4 h-4 shrink-0" />
                <h2 className="text-sm font-semibold tracking-[0.08em] uppercase truncate">
                  Kho quà IKA
                </h2>
              </div>
              <p className="text-[10px] text-[var(--promo-muted)] shrink-0">100% có thưởng</p>
            </div>
            <ul className="grid grid-cols-1 gap-2.5">
              {prizes.map((p) => {
                const view = prizePresentation(p, jackpotPct)
                const Icon = view.Icon
                return (
                  <li
                    key={p.id}
                    className={cn(
                      'relative overflow-hidden rounded-2xl border px-3.5 py-3.5 min-w-0',
                      'bg-[rgba(10,16,36,0.88)]',
                      view.hot
                        ? 'border-[rgba(255,61,122,0.45)] shadow-[0_0_28px_rgba(255,61,122,0.18)]'
                        : 'border-[rgba(157,190,255,0.18)]',
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 w-1"
                      style={{ background: p.color, boxShadow: `0 0 16px ${p.color}` }}
                      aria-hidden
                    />
                    <div className="flex items-start gap-3 pl-1.5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-2 bg-[#0a1228]"
                        style={{
                          borderColor: p.color,
                          boxShadow: `0 0 14px ${p.color}55`,
                          color: p.color,
                        }}
                      >
                        <Icon className="w-5 h-5" strokeWidth={2.25} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide',
                              view.hot
                                ? 'bg-[rgba(255,61,122,0.2)] text-[#ff7aa8]'
                                : view.badge === 'COMBO FREE'
                                  ? 'bg-[rgba(255,197,61,0.18)] text-[var(--promo-gold)]'
                                  : 'bg-[rgba(18,214,160,0.16)] text-[#5dffc8]',
                            )}
                          >
                            {view.badge}
                          </span>
                          {view.hot && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#ff7aa8]">
                              <Flame className="w-3 h-3" /> Hiếm
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[15px] font-bold text-[var(--promo-ink)] leading-snug">
                          {view.title}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--promo-muted)] leading-relaxed">
                          {view.subtitle}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            {campaignQuery.data?.roomTypeName && (
              <p className="text-xs text-[var(--promo-muted)] text-center sm:text-left">
                Kho quà theo {campaignQuery.data.roomTypeName}
                {campaignQuery.data.capacityMin != null && campaignQuery.data.capacityMax != null
                  ? ` (${campaignQuery.data.capacityMin}–${campaignQuery.data.capacityMax} khách)`
                  : ''}
              </p>
            )}
          </div>
        )}

        {!hasToken && (
          <div className="fade-up panel rounded-2xl p-4 space-y-3 !border-[rgba(255,229,102,0.4)] shadow-[0_0_32px_rgba(196,77,255,0.12)]">
            <p className="display text-lg sm:text-xl text-[var(--promo-gold)] leading-snug">
              Đặt phòng Music Box → nhận lượt quay
            </p>
            <ol className="text-sm text-[var(--promo-muted)] space-y-2 text-left">
              <li className="flex gap-2">
                <span className="text-[var(--promo-gold)] font-semibold shrink-0">1.</span>
                Chọn phòng & giờ hát trên trang đặt lịch
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--promo-gold)] font-semibold shrink-0">2.</span>
                Nhận mã quay ngay sau khi đặt thành công
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--promo-gold)] font-semibold shrink-0">3.</span>
                Quay thưởng — giảm giờ hát hoặc combo miễn phí
              </li>
            </ol>
            <Link
              to="/dat-lich"
              className="cta w-full py-3.5 inline-flex items-center justify-center gap-2 text-base touch-manipulation !no-underline"
            >
              <CalendarPlus className="w-4 h-4" /> Đặt phòng hát ngay
            </Link>
          </div>
        )}

        {result && !spinning && (
          <CongratsSheet
            open={!showBigWin && !congratsDismissed}
            result={result}
            guestName={guestName}
            isJackpot={resultIsJackpot}
            resultPercent={resultPercent}
            store={store}
            showReplay={resultIsJackpot}
            onReplay={() => {
              setCongratsDismissed(true)
              setShowBigWin(true)
            }}
            onClose={() => setCongratsDismissed(true)}
          />
        )}

        <BigWinCelebration
          open={!!showBigWin && resultIsJackpot && !spinning}
          percent={resultPercent}
          guestName={guestName}
          label={result?.prize.label ?? ''}
          onClose={() => {
            setShowBigWin(false)
            setCongratsDismissed(false)
          }}
        />
      </section>
    </PublicShell>
  )
}
