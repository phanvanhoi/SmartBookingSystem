import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy, Check, Loader2, Sparkles, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import PublicShell from './PublicShell'
import { publicService, type SpinResult } from '@/services/publicService'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'

const SPIN_DURATION_MS = 4200

/** Short labels for cramped wheel segments on small screens */
function shortLabel(label: string) {
  if (label.length <= 16) return label
  return label
    .replace('Giảm ', '-')
    .replace(' giờ hát', '')
    .replace('khô gà/bò', 'khô')
    .replace('nước suối', 'suối')
    .trim()
}

export default function SpinWheelPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tokenInput, setTokenInput] = useState(searchParams.get('token')?.toUpperCase() ?? '')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [copiedReward, setCopiedReward] = useState(false)

  const campaignQuery = useQuery({
    queryKey: ['public', 'spin-campaign', tokenInput || 'default'],
    queryFn: () =>
      publicService.getCampaign(
        tokenInput.length >= 6 ? { token: tokenInput } : undefined,
      ),
  })

  const tokenQuery = useQuery({
    queryKey: ['public', 'spin-token', tokenInput],
    queryFn: () => publicService.getToken(tokenInput),
    enabled: tokenInput.length >= 6,
    retry: false,
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
        void tokenQuery.refetch()
        // Keep result visible above sticky footer on mobile
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
    const q = searchParams.get('token')
    if (q) setTokenInput(q.toUpperCase())
  }, [searchParams])

  function handleApplyToken(e: React.FormEvent) {
    e.preventDefault()
    const next = tokenInput.trim().toUpperCase()
    setTokenInput(next)
    setResult(null)
    setSearchParams(next ? { token: next } : {})
  }

  function handleSpin() {
    if (!tokenInput || spinning || spinMutation.isPending) return
    setResult(null)
    spinMutation.mutate(tokenInput.trim().toUpperCase())
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

  const tokenStatus = tokenQuery.data
  const canSpin =
    !!tokenStatus &&
    tokenStatus.status === 'UNUSED' &&
    !spinning &&
    !spinMutation.isPending &&
    prizes.length > 0

  const showStickySpin = !!tokenStatus && tokenStatus.status === 'UNUSED'

  return (
    <PublicShell
      active="spin"
      footer={
        showStickySpin ? (
          <button
            type="button"
            className="cta w-full py-3.5 inline-flex items-center justify-center gap-2 text-base touch-manipulation"
            disabled={!canSpin}
            onClick={handleSpin}
          >
            {spinning || spinMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang quay...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Quay ngay
              </>
            )}
          </button>
        ) : undefined
      }
    >
      <section className="flex flex-col gap-5 w-full min-w-0">
        {/* Wheel first on mobile — visual anchor */}
        <div className="fade-up order-1 flex flex-col items-center w-full min-w-0">
          <div className="relative w-[min(78vw,300px)] aspect-square overflow-visible">
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
                    className="absolute inset-0 flex items-start justify-center pt-[12%] sm:pt-[14%]"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <span className="hidden sm:block text-[10px] sm:text-[11px] font-semibold text-white text-center max-w-[68px] leading-tight drop-shadow">
                      {shortLabel(p.label)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="absolute inset-[32%] sm:inset-[34%] rounded-full bg-[#0b1220] border border-[rgba(232,184,109,0.4)] flex items-center justify-center z-10 pointer-events-none">
              <span className="display text-xl sm:text-2xl text-[var(--promo-gold)]">SPIN</span>
            </div>
          </div>

          {/* Mobile-readable prize legend */}
          {prizes.length > 0 && (
            <div className="mt-4 w-full max-w-sm min-w-0 sm:hidden px-1">
              <div className="h-scroll">
                {prizes.map((p) => (
                  <span
                    key={p.id}
                    className="chip shrink-0 inline-flex items-center gap-1.5 !py-1.5 !px-2.5 text-[11px]"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: p.color }}
                    />
                    {shortLabel(p.label)}
                  </span>
                ))}
              </div>
            </div>
          )}

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

        <div className="fade-up-delay order-2 space-y-4 w-full min-w-0">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[var(--promo-gold)] text-xs font-semibold tracking-wide uppercase">
              {campaignQuery.data?.name ?? 'Vòng quay khuyến mãi'}
            </p>
            <h1 className="display text-[2.1rem] leading-[0.95]">
              Quay một vòng,
              <br />
              <span className="text-[var(--promo-gold)]">rinh quà liền tay</span>
            </h1>
          </div>

          <form
            onSubmit={handleApplyToken}
            className="panel rounded-2xl p-3 flex flex-col gap-2.5 w-full min-w-0"
          >
            <label className="text-sm text-[var(--promo-muted)]" htmlFor="spin-token">
              Mã quay thưởng
            </label>
            <div className="flex flex-col gap-2.5 w-full min-w-0">
              <input
                id="spin-token"
                className="field uppercase tracking-[0.14em] text-center"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                placeholder="MB-XXXXXX"
                maxLength={32}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button type="submit" className="cta px-5 py-3 touch-manipulation">
                Kiểm tra
              </button>
            </div>
          </form>

          {tokenQuery.isFetching && (
            <p className="text-sm text-[var(--promo-muted)] inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra mã...
            </p>
          )}

          {tokenQuery.isError && tokenInput.length >= 6 && !tokenQuery.isFetching && (
            <p className="text-sm text-rose-300">Mã không hợp lệ hoặc không tồn tại.</p>
          )}

          {tokenStatus && (
            <div className="panel rounded-2xl p-4 space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[var(--promo-muted)] text-xs">Khách</p>
                  <p className="font-semibold truncate">{tokenStatus.booking.customerName}</p>
                </div>
                <StatusBadge status={tokenStatus.status} />
              </div>
              <p className="text-[var(--promo-muted)]">
                {tokenStatus.booking.roomName} ·{' '}
                {new Date(tokenStatus.booking.bookingDate).toLocaleDateString('vi-VN')}
              </p>
              {tokenStatus.status === 'USED' && tokenStatus.resultLabel && (
                <p className="text-[var(--promo-gold)] leading-snug">
                  Đã trúng: {tokenStatus.resultLabel}
                  {tokenStatus.rewardCode ? (
                    <>
                      <br />
                      <span className="font-mono tracking-wider">Mã đổi: {tokenStatus.rewardCode}</span>
                    </>
                  ) : null}
                </p>
              )}
              {tokenStatus.status === 'EXPIRED' && (
                <p className="text-rose-300 text-xs">Mã đã hết hạn hoặc lịch đã hủy.</p>
              )}
            </div>
          )}

          {!tokenStatus && !tokenQuery.isFetching && (
            <p className="text-sm text-[var(--promo-muted)]">
              Chưa có mã?{' '}
              <Link to="/dat-lich" className="text-[var(--promo-gold)] underline underline-offset-2">
                Đặt lịch để nhận mã
              </Link>
            </p>
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
        </div>
      </section>
    </PublicShell>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold',
        status === 'UNUSED' && 'bg-emerald-500/20 text-emerald-300',
        status === 'USED' && 'bg-sky-500/20 text-sky-300',
        status === 'EXPIRED' && 'bg-rose-500/20 text-rose-300',
      )}
    >
      {status === 'UNUSED' ? 'Chưa quay' : status === 'USED' ? 'Đã quay' : 'Hết hạn'}
    </span>
  )
}
