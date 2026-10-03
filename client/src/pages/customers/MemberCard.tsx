import { useState } from 'react'
import toast from 'react-hot-toast'
import { Coins, Crown, Plus, ArrowDownLeft, ArrowUpRight, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCoinWallet, useSetMembership, useTopUpCoin } from '@/hooks/useCustomers'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatDateTime } from '@/utils/formatTime'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'
import type { CoinTransaction } from '@/types/customer'

const PRESETS = [100_000, 200_000, 500_000, 1_000_000]

const formatCoin = (n: number) => `${n.toLocaleString('vi-VN')} coin`

const TX_META: Record<CoinTransaction['type'], { label: string; cls: string; Icon: typeof Plus }> = {
  TOPUP: { label: 'Nạp coin', cls: 'text-emerald-700', Icon: ArrowDownLeft },
  SPEND: { label: 'Thanh toán', cls: 'text-rose-600', Icon: ArrowUpRight },
  REFUND: { label: 'Hoàn coin', cls: 'text-sky-700', Icon: Undo2 },
}

interface MemberCardProps {
  customerId: number
}

export default function MemberCard({ customerId }: MemberCardProps) {
  const role = useAuthStore((s) => s.user?.role)
  const canTopUp = role === 'OWNER' || role === 'MANAGER'

  const { data, isLoading } = useCoinWallet(customerId)
  const setMembership = useSetMembership()
  const wallet = data?.data

  const [showTopUp, setShowTopUp] = useState(false)

  const handleToggle = async (next: boolean) => {
    try {
      await setMembership.mutateAsync({ id: customerId, isMember: next })
      toast.success(next ? 'Đã đăng ký hội viên' : 'Đã tắt hội viên')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không cập nhật được hội viên'))
    }
  }

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />
  }

  if (!wallet?.isMember) {
    return (
      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Chưa là hội viên</p>
              <p className="text-sm text-muted-foreground">
                Hội viên nạp coin trả trước và được giảm 25% tiền giờ hát từ thứ 2 đến thứ 6.
              </p>
            </div>
          </div>
          <Button onClick={() => handleToggle(true)} disabled={setMembership.isPending}>
            Đăng ký hội viên
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-amber-200">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="w-5 h-5 text-amber-600" />
              Hội viên
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                Giảm 25% giờ hát T2–T6
              </Badge>
            </CardTitle>
            {wallet.memberSince && (
              <span className="text-xs text-muted-foreground">
                Từ {formatDate(wallet.memberSince)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Số dư</p>
              <p className="text-3xl font-bold tabular-nums text-foreground flex items-center gap-2">
                <Coins className="w-6 h-6 text-amber-500" />
                {wallet.coinBalance.toLocaleString('vi-VN')}
                <span className="text-base font-medium text-muted-foreground">coin</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">1 coin = 1đ, dùng để thanh toán trực tiếp</p>
            </div>
            <div className="flex items-center gap-2">
              {canTopUp ? (
                <Button onClick={() => setShowTopUp(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Nạp coin
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Chỉ quản lý được nạp coin</span>
              )}
              {wallet.coinBalance === 0 && (
                <Button
                  variant="outline"
                  onClick={() => handleToggle(false)}
                  disabled={setMembership.isPending}
                >
                  Tắt hội viên
                </Button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Lịch sử coin
            </p>
            {wallet.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">Chưa có giao dịch coin</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {wallet.transactions.map((t) => {
                  const meta = TX_META[t.type]
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                      <meta.Icon className={cn('w-4 h-4 shrink-0', meta.cls)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {meta.label}
                          {t.paymentMethod && (
                            <span className="text-xs font-normal text-muted-foreground">
                              {' '}
                              · {t.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDateTime(t.createdAt)}
                          {t.createdByName ? ` · ${t.createdByName}` : ''}
                          {t.note ? ` · ${t.note}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-sm font-bold tabular-nums', t.amount >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                          {t.amount >= 0 ? '+' : ''}
                          {t.amount.toLocaleString('vi-VN')}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          Còn {t.balanceAfter.toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <TopUpDialog
        customerId={customerId}
        open={showTopUp}
        currentBalance={wallet.coinBalance}
        onClose={() => setShowTopUp(false)}
      />
    </>
  )
}

function TopUpDialog({
  customerId,
  open,
  currentBalance,
  onClose,
}: {
  customerId: number
  open: boolean
  currentBalance: number
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'CASH' | 'QR_TRANSFER'>('CASH')
  const [note, setNote] = useState('')
  const topUp = useTopUpCoin()

  const value = parseInt(amount.replace(/\D/g, ''), 10)
  const valid = Number.isFinite(value) && value > 0

  const handleClose = () => {
    setAmount('')
    setNote('')
    setMethod('CASH')
    onClose()
  }

  const handleSubmit = async () => {
    if (!valid) return
    try {
      const res = await topUp.mutateAsync({
        id: customerId,
        amount: value,
        method,
        note: note.trim() || undefined,
      })
      toast.success(`Đã nạp ${formatCoin(value)}. Số dư mới: ${formatCoin(res.data.coinBalance)}`)
      handleClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Nạp coin thất bại'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nạp coin</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Số coin (1 coin = 1đ)</label>
            <Input
              inputMode="numeric"
              placeholder="Nhập số coin..."
              value={amount ? Number(amount.replace(/\D/g, '') || 0).toLocaleString('vi-VN') : ''}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              className="text-right tabular-nums text-lg font-semibold"
              autoFocus
            />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className={cn(
                    'h-10 rounded-md border text-xs font-semibold transition-colors',
                    value === p
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  {p >= 1_000_000 ? `${p / 1_000_000}tr` : `${p / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Khách thanh toán bằng</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['CASH', 'Tiền mặt'],
                  ['QR_TRANSFER', 'Chuyển khoản'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={cn(
                    'h-11 rounded-md border text-sm font-semibold transition-colors',
                    method === key
                      ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Ghi chú (tùy chọn)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>

          {valid && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số dư hiện tại</span>
                <span className="tabular-nums">{formatCoin(currentBalance)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Sau khi nạp</span>
                <span className="tabular-nums text-emerald-700">{formatCoin(currentBalance + value)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={topUp.isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || topUp.isPending}>
            {topUp.isPending ? 'Đang xử lý...' : 'Xác nhận nạp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
