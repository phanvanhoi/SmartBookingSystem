import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy, Check, Loader2, Sparkles, Trophy, CalendarPlus, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import PublicShell from './PublicShell'
import { publicService, type SpinResult } from '@/services/publicService'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'

const SPIN_DURATION_MS = 4200

function shortLabel(label: string) {
  return label
    .replace('Giảm ', '-')
    .replace(' giờ hát', '')
    .replace('khô gà/bò', 'khô')
    .replace('nước suối', 'suối')
    .replace(' + ', '+')
    .trim()
}

export default function SpinWheelPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = (searchParams.get('token') ?? '').trim().toUpperCase()

  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [copiedReward, setCopiedReward] = useState(false)

  const hasToken = tokenFromUrl.length >= 6

  const campaignQuery = useQuery({
    queryKey: ['public', 'spin-campaign', hasToken ? tokenFromUrl : 'default'],
    queryFn: () =>
      publicService.getCampaign(hasToken ? { token: tokenFromUrl } : undefined),
  })

  const prizes = campaignQuery.data?.prizes ?? []
  const segmentAngle = prizes.length > 0 ? 360 / prizes.length : 360

  const conicGradient = useMemo(() => {
    if (prizes.length === 0) return 'conic-gradient(#334155 0deg 360deg)'
    const stops = prizes.map((p, i) => {
      const start = i * segmentAngle
      const end = (i + 1) * segmentAngle
      return `${p.color} ${start}deg ${end}deg`
    })
    return `conic-gradient(from -${segmentAngle / 2}deg, ${stops.join(', ')})`
  }, [prizes, segmentAngle])

  const spinMutation = useMutation({
    mutationFn: (token: string) => publicService.spin(token),
    onSuccess: (data) => {
      const targetIndex = data.prizeIndex
      const segmentCenter = targetIndex * segmentAngle
      const base = 360 * 5
      const finalRotation = base + (360 - segmentCenter)
      setSpinning(true)
      setResult(null)
      setRotation((prev) => prev + finalRotation)
      window.setTimeout(() => {
        setSpinning(false)
        setResult(data)
        window.setTimeout(() => {
          document.getElementById('spin-result')?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          })
        }, 80)
      }, SPIN_DURATION_MS)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Không thể quay')),
  })

  useEffect(() => {
    setResult(null)
    setRotation(0)
  }, [tokenFromUrl])

  function handleSpin() {
    if (!hasToken || spinning || spinMutation.isPending) return
    if (prizes.length === 0) {
      toast.error('Vòng quay chưa sẵn sàng')
      return
    }
    setResult(null)
    spinMutation.mutate(tokenFromUrl)
  }

  async function copyReward() {
    if (!result?.rewardCode) return
    try {
      await navigator.clipboard.writeText(result.rewardCode)
      setCopiedReward(true)
      toast.success('Đã sao chép mã đổi thưởng')
      setTimeout(() => setCopiedReward(false), 2000)
    } catch {
      toast.error('Không sao chép được')
    }
  }

  const busy = spinning || spinMutation.isPending
  const canSpin = hasToken && !busy && prizes.length > 0 && !result

  return (
    <PublicShell
      active="spin"
      footer={
        hasToken ? (
          <button
            type="button"
            className="cta w-full py-3.5 inline-flex items-center justify-center gap-2 text-base touch-manipulation"
            disabled={!canSpin}
            onClick={handleSpin}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang quay...
              </>
            ) : result ? (
              <>
                <Trophy className="w-4 h-4" /> Đã quay xong
              </>
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
        {/* Hero copy */}
        <div className="fade-up space-y-1.5 min-w-0 text-center sm:text-left">
          <p className="text-[var(--promo-gold)] text-xs font-semibold tracking-wide uppercase">
            {campaignQuery.data?.name ?? 'Vòng quay khuyến mãi'}
          </p>
          <h1 className="display text-[2.1rem] leading-[0.95]">
            {hasToken ? (
              <>
                Sẵn sàng quay,
                <br />
                <span className="text-[var(--promo-gold)]">chúc bạn may mắn</span>
              </>
            ) : (
              <>
                Quay thưởng khi
                <br />
                <span className="text-[var(--promo-gold)]">đặt phòng hát</span>
              </>
            )}
          </h1>
          {!hasToken && (
            <p className="text-sm text-[var(--promo-muted)] leading-relaxed pt-1">
              Đặt lịch online → nhận mã quay → quay trúng giảm giờ hát hoặc combo đồ uống.
            </p>
          )}
          {hasToken && (
            <p className="text-sm text-[var(--promo-muted)] pt-1 font-mono tracking-wider text-[var(--promo-gold)]">
              Mã: {tokenFromUrl}
            </p>
          )}
        </div>

        {/* Wheel */}
        <div className="fade-up order-1 flex flex-col items-center w-full min-w-0">
          <div className="relative w-[min(86vw,320px)] aspect-square overflow-visible">
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-0.5 z-20 w-0 h-0"
              style={{
                borderLeft: '11px solid transparent',
                borderRight: '11px solid transparent',
                borderTop: '20px solid var(--promo-gold)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              }}
              aria-hidden
            />

            <div
              className="absolute inset-0 rounded-full border-[5px] sm:border-[6px] border-[rgba(232,184,109,0.55)] shadow-[0_0_48px_rgba(232,184,109,0.16)]"
              style={{
                background: conicGradient,
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.75, 0.08, 1)`
                  : 'none',
              }}
            >
              {prizes.map((p, i) => {
                const angle = i * segmentAngle
                return (
                  <div
                    key={p.id}
                    className="absolute inset-0 flex items-start justify-center pt-[11%] sm:pt-[13%]"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <span
                      className="block text-[9px] sm:text-[11px] font-bold text-white text-center max-w-[4.6rem] sm:max-w-[72px] leading-[1.15] px-0.5"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                    >
                      {shortLabel(p.label)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="absolute inset-[30%] sm:inset-[32%] rounded-full bg-[#0b1220] border border-[rgba(232,184,109,0.4)] flex items-center justify-center z-10 pointer-events-none">
              <span className="display text-xl sm:text-2xl text-[var(--promo-gold)]">SPIN</span>
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

        {/* Prize highlights */}
        {prizes.length > 0 && (
          <div className="fade-up-delay space-y-3 w-full min-w-0">
            <div className="flex items-center gap-2 text-[var(--promo-gold)]">
              <Gift className="w-4 h-4 shrink-0" />
              <h2 className="text-sm font-semibold tracking-wide uppercase">Phần thưởng</h2>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {prizes.map((p) => (
                <li
                  key={p.id}
                  className="panel rounded-xl px-3.5 py-3 flex items-center gap-3 min-w-0"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10"
                    style={{ background: p.color }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-[var(--promo-ink)] leading-snug">
                    {p.label}
                  </span>
                </li>
              ))}
            </ul>
            {campaignQuery.data?.roomTypeName && (
              <p className="text-xs text-[var(--promo-muted)] text-center sm:text-left">
                Combo theo {campaignQuery.data.roomTypeName}
                {campaignQuery.data.capacityMin != null && campaignQuery.data.capacityMax != null
                  ? ` (${campaignQuery.data.capacityMin}–${campaignQuery.data.capacityMax} khách)`
                  : ''}
              </p>
            )}
          </div>
        )}

        {/* CTA card when no token */}
        {!hasToken && (
          <div className="fade-up panel rounded-2xl p-4 space-y-3 border-[rgba(232,184,109,0.35)]">
            <p className="display text-xl text-[var(--promo-gold)] leading-none">
              Đặt phòng → nhận lượt quay
            </p>
            <ol className="text-sm text-[var(--promo-muted)] space-y-2 text-left">
              <li className="flex gap-2">
                <span className={cn('text-[var(--promo-gold)] font-semibold shrink-0')}>1.</span>
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
          <div
            id="spin-result"
            className="fade-up panel rounded-2xl p-4 sm:p-5 border-[rgba(232,184,109,0.35)] space-y-3"
          >
            <div className="flex items-center gap-2 text-[var(--promo-gold)]">
              <Trophy className="w-5 h-5 shrink-0" />
              <span className="font-semibold">
                {result.prize.prizeType === 'NO_PRIZE' ? 'Kết quả' : 'Chúc mừng!'}
              </span>
            </div>
            <p className="display text-2xl sm:text-3xl leading-none">{result.prize.label}</p>
            {result.rewardCode && (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm">
                  Mã đổi:{' '}
                  <span className="font-mono tracking-wider text-[var(--promo-gold)]">
                    {result.rewardCode}
                  </span>
                </p>
                <button
                  type="button"
                  className="cta-ghost px-3 py-1.5 text-xs inline-flex items-center gap-1 touch-manipulation !min-h-0"
                  onClick={copyReward}
                >
                  {copiedReward ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Sao chép
                </button>
              </div>
            )}
            <p className="text-sm text-[var(--promo-muted)] leading-relaxed">{result.redeemHint}</p>
          </div>
        )}
      </section>
    </PublicShell>
  )
}
