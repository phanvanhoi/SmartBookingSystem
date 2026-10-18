import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  CalendarPlus,
  Check,
  Clock3,
  Copy,
  DoorOpen,
  Loader2,
  Pause,
  Ticket,
  UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PublicShell from './PublicShell'
import { publicService, type SpinTokenStatus } from '@/services/publicService'
import { cn } from '@/utils/cn'

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

function shortNameOf(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(-1)[0] ?? ''
}

function chipFor(status: SpinTokenStatus['status']) {
  if (status === 'UNUSED') {
    return {
      label: 'Chưa dùng được',
      className: 'bg-[rgba(255,229,102,0.16)] text-[var(--promo-gold)] border-[rgba(255,229,102,0.35)]',
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

export default function SpinPausedView() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = (searchParams.get('token') ?? '').trim().toUpperCase()
  const hasToken = tokenFromUrl.length >= 6
  const [copiedToken, setCopiedToken] = useState(false)

  const tokenQuery = useQuery({
    queryKey: ['public', 'spin-token', tokenFromUrl],
    queryFn: () => publicService.getToken(tokenFromUrl),
    enabled: hasToken,
    retry: false,
  })

  const token = tokenQuery.data
  const guestName = token?.booking.customerName?.trim() || ''
  const shortName = shortNameOf(guestName)
  const status = token?.status

  async function copyTokenCode() {
    try {
      await navigator.clipboard.writeText(token?.code || tokenFromUrl)
      setCopiedToken(true)
      toast.success('Đã sao chép mã')
      setTimeout(() => setCopiedToken(false), 2000)
    } catch {
      toast.error('Không sao chép được')
    }
  }

  const missing = hasToken && tokenQuery.isError
  const used = status === 'USED'
  const expired = status === 'EXPIRED'
  const footerLabel = !hasToken || missing || expired ? 'Đặt phòng hát' : 'Về trang đặt lịch'

  return (
    <PublicShell
      active="spin"
      footer={
        <Link
          to="/dat-lich"
          className="cta w-full py-3.5 inline-flex items-center justify-center gap-2 text-base touch-manipulation !no-underline"
        >
          <CalendarPlus className="w-4 h-4" /> {footerLabel}
        </Link>
      }
    >
      <section className="flex flex-col gap-5 w-full min-w-0">
        <header className="fade-up space-y-1.5 min-w-0 text-center sm:text-left">
          <p className="text-[var(--promo-blue)] text-xs font-semibold tracking-[0.14em] uppercase">
            {missing
              ? 'IKA · Mã không hợp lệ'
              : used
                ? 'IKA · Kết quả đã lưu'
                : expired
                  ? 'IKA · Mã hết hạn'
                  : 'IKA · Ưu đãi tạm dừng'}
          </p>
          <h1 className="display text-[1.85rem] leading-[1.05] sm:text-[2.4rem]">
            {missing ? (
              <>Không tìm thấy mã quay</>
            ) : used ? (
              shortName ? (
                <>
                  Xin chào <span className="text-[var(--promo-gold)]">{shortName}</span>,
                  <br />
                  <span className="text-[var(--promo-ink)]">phần thưởng của bạn</span>
                </>
              ) : (
                <>Phần thưởng của bạn</>
              )
            ) : expired ? (
              <>Mã này đã hết hạn</>
            ) : hasToken ? (
              shortName ? (
                <>
                  Xin chào <span className="text-[var(--promo-gold)]">{shortName}</span>,
                  <br />
                  <span className="text-[var(--promo-ink)]">mã vẫn được giữ</span>
                </>
              ) : (
                <>Mã vẫn được giữ</>
              )
            ) : (
              <>Vòng quay đang tạm dừng</>
            )}
          </h1>
          <p className="text-sm text-[var(--promo-muted)] leading-relaxed pt-1">
            {missing
              ? 'Kiểm tra lại mã, hoặc đặt lịch mới. Đặt phòng vẫn nhận lịch bình thường.'
              : used
                ? 'Vòng quay đang tạm dừng. Kết quả dưới đây đã chốt, dùng khi thanh toán.'
                : expired
                  ? 'Không quay được với mã này. Đặt phòng vẫn hoạt động. Mã mới lúc này cũng chưa quay được.'
                  : hasToken
                    ? 'Cổng quay đang tạm dừng. Mã này chưa dùng được lúc này và không bị xóa.'
                    : 'Đặt phòng vẫn nhận lịch bình thường. Lượt quay chưa mở lại.'}
          </p>
        </header>

        {!hasToken && (
          <div className="fade-up rounded-2xl border border-[rgba(255,229,102,0.35)] bg-[rgba(10,16,36,0.85)] px-4 py-5 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full grid place-items-center border border-[rgba(255,229,102,0.45)] text-[var(--promo-gold)]">
              <Pause className="w-5 h-5" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--promo-muted)] font-semibold">
              Trạng thái
            </p>
            <p className="display text-2xl text-[var(--promo-gold)] leading-none">Tạm dừng</p>
            <p className="text-sm text-[var(--promo-muted)]">Không có nút quay trên trang này.</p>
          </div>
        )}

        {hasToken && tokenQuery.isLoading && (
          <div className="fade-up rounded-2xl border border-[rgba(255,229,102,0.35)] bg-[rgba(10,16,36,0.85)] p-5 flex items-center gap-2 text-sm text-[var(--promo-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thông tin khách...
          </div>
        )}

        {missing && (
          <div className="fade-up rounded-2xl border border-rose-400/30 bg-[rgba(10,16,36,0.85)] p-5 space-y-2">
            <p className="text-sm text-[var(--promo-muted)]">
              <Link to="/dat-lich" className="text-[var(--promo-gold)] underline underline-offset-2">
                Đặt lịch mới
              </Link>
            </p>
            <p className="font-mono text-sm tracking-wider text-[var(--promo-gold)]">{tokenFromUrl}</p>
          </div>
        )}

        {used && token?.resultLabel && (
          <div className="fade-up rounded-2xl border border-[rgba(61,158,255,0.45)] bg-[rgba(61,158,255,0.1)] px-4 py-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-[var(--promo-blue)] font-semibold">
              Phần thưởng đã trúng
            </p>
            <p className="display text-[1.65rem] leading-tight text-[var(--promo-ink)]">{token.resultLabel}</p>
            {token.rewardCode ? (
              <p className="text-sm text-[var(--promo-muted)]">
                Mã đổi{' '}
                <span className="font-mono text-[var(--promo-gold)]">{token.rewardCode}</span>
              </p>
            ) : null}
            <p className="text-xs text-[var(--promo-muted)]">Đưa màn hình này cho nhân viên khi thanh toán.</p>
          </div>
        )}

        {token && (
          <div className="fade-up relative overflow-hidden rounded-2xl border border-[rgba(255,229,102,0.35)] bg-[rgba(10,16,36,0.85)] shadow-[0_0_40px_rgba(196,77,255,0.14),0_0_28px_rgba(255,229,102,0.1)]">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,229,102,0.9), rgba(61,158,255,0.7), rgba(196,77,255,0.8), transparent)',
              }}
              aria-hidden
            />
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="shrink-0 w-14 h-14 rounded-full grid place-items-center border-2 border-[var(--promo-gold)] bg-[rgba(255,229,102,0.1)]"
                  aria-hidden
                >
                  <span className="display text-sm text-[var(--promo-gold)] leading-none">
                    {initials(guestName || 'IKA')}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--promo-muted)] font-semibold">
                    Khách IKA Music Box
                  </p>
                  <p className="display text-[1.55rem] sm:text-2xl leading-none text-[var(--promo-ink)] truncate">
                    {guestName || 'Khách'}
                  </p>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      chipFor(token.status).className,
                    )}
                  >
                    {chipFor(token.status).label}
                  </span>
                </div>
                <UserRound className="w-5 h-5 text-[var(--promo-gold)]/70 shrink-0 mt-1" aria-hidden />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[rgba(157,190,255,0.16)] bg-[rgba(4,10,24,0.55)] px-3 py-2.5 min-w-0">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--promo-muted)]">
                    <DoorOpen className="w-3 h-3" /> Phòng
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--promo-ink)] truncate">
                    {token.booking.roomName}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(157,190,255,0.16)] bg-[rgba(4,10,24,0.55)] px-3 py-2.5 min-w-0">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--promo-muted)]">
                    <CalendarDays className="w-3 h-3" /> Ngày hát
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--promo-ink)] truncate">
                    {formatBookingDate(String(token.booking.bookingDate))}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(157,190,255,0.16)] bg-[rgba(4,10,24,0.55)] px-3 py-2.5 min-w-0">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--promo-muted)]">
                    <Clock3 className="w-3 h-3" /> Giờ
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--promo-ink)] truncate">
                    {formatBookingTime(token.booking.bookingTime)}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(255,229,102,0.28)] bg-[rgba(255,229,102,0.08)] px-3 py-2.5 min-w-0">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--promo-gold)]">
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

              {status === 'UNUSED' && (
                <p className="text-sm text-[var(--promo-gold)]">Tạm dừng — giữ mã, chưa quay được.</p>
              )}
              {expired && (
                <p className="text-sm text-rose-300">Hết hạn — không gia hạn, không quay lại.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  )
}
