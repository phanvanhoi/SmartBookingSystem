import { useState, useEffect } from 'react'
import {
  CreditCard, Banknote, QrCode, FileText, CheckCircle2,
  Clock, User, DoorOpen, Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatTime, formatDuration } from '@/utils/formatTime'
import { useCheckout } from '@/hooks/useRooms'
import { useProcessCheckout } from '@/hooks/useCheckout'
import { useRoomStore } from '@/stores/roomStore'
import QRDisplay from '@/components/QRDisplay'
import { getErrorMessage } from '@/utils/error'
import type { CheckoutData } from '@/types/room'
import type {
  CheckoutData as ProcessCheckoutPayload,
  PaymentItem,
} from '@/services/checkoutService'

interface CheckoutDialogProps {
  sessionId: number | null
  open: boolean
  onClose: () => void
}

export default function CheckoutDialog({ sessionId, open, onClose }: CheckoutDialogProps) {
  const [billData, setBillData] = useState<CheckoutData | null>(null)
  const [isLoadingBill, setIsLoadingBill] = useState(false)
  const [discountValue, setDiscountValue] = useState('')
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'debt'>('cash')
  const [cashGiven, setCashGiven] = useState('')
  const [qrConfirmed, setQrConfirmed] = useState(false)

  const checkout = useCheckout()
  const processCheckout = useProcessCheckout()
  const closeAll = useRoomStore((s) => s.closeAll)

  async function handleConfirmPayment() {
    if (!billData || !sessionId) return

    // Map UI state → server payload. Server expects payments as a list so we
    // can support split-pay later; here it's always one entry.
    const payments: PaymentItem[] = (() => {
      if (paymentMethod === 'cash') {
        const received = cashGiven ? parseFloat(cashGiven) : finalTotal
        return [
          {
            method: 'CASH',
            amount: finalTotal,
            cashReceived: received,
          },
        ]
      }
      if (paymentMethod === 'qr') {
        return [{ method: 'QR_TRANSFER', amount: finalTotal }]
      }
      // DEBT: ghi nợ toàn bộ — server tự đánh PARTIAL
      return [{ method: 'DEBT', amount: finalTotal }]
    })()

    const payload: ProcessCheckoutPayload = {
      sessionId,
      payments,
      ...(discountAmount > 0
        ? {
            discountAmount,
            discountReason:
              discountType === 'percent' ? `Giảm ${discountValue}%` : 'Giảm thủ công',
          }
        : {}),
    }

    try {
      await processCheckout.mutateAsync(payload)
      toast.success('Thanh toán thành công!')
      closeAll()
      handleClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Thanh toán thất bại'))
    }
  }

  useEffect(() => {
    if (open && sessionId) {
      setIsLoadingBill(true)
      checkout.mutateAsync(sessionId)
        .then((data) => { setBillData(data); setIsLoadingBill(false) })
        .catch(() => { toast.error('Không thể tải thông tin thanh toán'); setIsLoadingBill(false); onClose() })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId])

  const handleClose = () => {
    setBillData(null)
    setDiscountValue('')
    setCashGiven('')
    setQrConfirmed(false)
    setPaymentMethod('cash')
    onClose()
  }

  if (!billData && !isLoadingBill) return null

  const discountAmount = (() => {
    if (!billData || !discountValue) return 0
    const val = parseFloat(discountValue)
    if (isNaN(val)) return 0
    return discountType === 'percent' ? Math.round((billData.grandTotal * val) / 100) : val
  })()

  const finalTotal = billData ? Math.max(0, billData.grandTotal - discountAmount) : 0
  const cashChange = cashGiven ? parseFloat(cashGiven) - finalTotal : 0

  const canConfirm = (() => {
    if (paymentMethod === 'cash') return !cashGiven || parseFloat(cashGiven) >= finalTotal
    if (paymentMethod === 'qr') return qrConfirmed
    return true
  })()

  const totalMinutes = billData ? billData.duration.hours * 60 + billData.duration.minutes : 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      {/*
        Compact layout: wider modal (5xl) + tighter spacing so the bill +
        payment side fits the viewport without an inner scroll. Outer cap
        max-h-[95vh] is a safety net only — `overflow-y-auto` is on the
        DialogContent itself (not a child) so scroll only kicks in on very
        small screens.
      */}
      <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto !p-0">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span>Thanh toán</span>
                {billData && (
                  <span className="text-muted-foreground font-normal"> — {billData.roomName}</span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {isLoadingBill ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Đang tính tiền...</span>
            </div>
          </div>
        ) : billData ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px]">

            {/* ═══ CỘT TRÁI: HÓA ĐƠN ═══ */}
            <div className="p-4 space-y-3 border-r border-border">

              {/* Thông tin khách + thời gian — 4 cột để chiếm 1 dòng */}
              <div className="grid grid-cols-4 gap-2">
                <InfoCard icon={User} label="Khách" value={billData.customerName} />
                <InfoCard icon={Clock} label="Thời gian" value={formatDuration(totalMinutes)} />
                <InfoCard icon={DoorOpen} label="Vào" value={formatTime(billData.checkInTime)} />
                <InfoCard icon={DoorOpen} label="Ra" value={formatTime(billData.checkOutTime)} />
              </div>

              {/* Tiền phòng */}
              <Section title="Tiền phòng">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted-foreground">
                      <th className="text-left font-medium pb-1">Khung giờ</th>
                      <th className="text-right font-medium pb-1">Đơn giá</th>
                      <th className="text-right font-medium pb-1">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billData.roomCharge.segments.map((seg, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="py-1">
                          <span className="font-medium">{seg.start} → {seg.end}</span>
                          <span className="text-muted-foreground text-[11px] ml-1.5">({seg.minutes}p)</span>
                        </td>
                        <td className="py-1 text-right text-muted-foreground">
                          {formatCurrency(seg.pricePerHour)}/h
                        </td>
                        <td className="py-1 text-right font-medium">
                          {formatCurrency(seg.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-semibold">
                      <td colSpan={2} className="py-1">Tổng phòng</td>
                      <td className="py-1 text-right">{formatCurrency(billData.roomCharge.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Section>

              {/* Đồ uống / ăn */}
              {billData.orders.length > 0 && (
                <Section title="Đồ uống / Ăn">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-muted-foreground">
                        <th className="text-left font-medium pb-1">Món</th>
                        <th className="text-center font-medium pb-1">SL</th>
                        <th className="text-right font-medium pb-1">Đơn giá</th>
                        <th className="text-right font-medium pb-1">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billData.orders.flatMap((order) =>
                        order.items.map((item, i) => (
                          <tr key={`${order.id}-${i}`} className="border-t border-border/30">
                            <td className="py-1">{item.name}</td>
                            <td className="py-1 text-center text-muted-foreground">{item.quantity}</td>
                            <td className="py-1 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-1 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border font-semibold">
                        <td colSpan={3} className="py-1">Tổng order</td>
                        <td className="py-1 text-right">{formatCurrency(billData.orderTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </Section>
              )}

              {/* Tổng hợp */}
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                <SummaryRow label="Tạm tính" value={formatCurrency(billData.subtotal)} />
                {discountAmount > 0 && (
                  <SummaryRow label="Giảm giá" value={`-${formatCurrency(discountAmount)}`} className="text-emerald-600" />
                )}
                {billData.roomCharge.surcharge > 0 && (
                  <SummaryRow label="Phụ thu" value={`+${formatCurrency(billData.roomCharge.surcharge)}`} className="text-amber-600" />
                )}
                <div className="border-t border-border pt-2 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">TỔNG THANH TOÁN</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(finalTotal, true)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ CỘT PHẢI: THANH TOÁN ═══ */}
            <div className="p-4 space-y-3 bg-muted/20">

              {/* Giảm giá */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Giảm giá
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                    className="rounded-md border border-input bg-card px-2 h-9 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="amount">VNĐ</option>
                    <option value="percent">%</option>
                  </select>
                  <Input
                    placeholder={discountType === 'percent' ? '10' : 'Số tiền'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    type="number"
                    min="0"
                    className="flex-1 h-9"
                  />
                </div>
              </div>

              {/* Phương thức */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Phương thức
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <MethodButton
                    active={paymentMethod === 'cash'}
                    onClick={() => setPaymentMethod('cash')}
                    icon={Banknote}
                    label="Tiền mặt"
                  />
                  <MethodButton
                    active={paymentMethod === 'qr'}
                    onClick={() => setPaymentMethod('qr')}
                    icon={QrCode}
                    label="QR Code"
                  />
                  <MethodButton
                    active={paymentMethod === 'debt'}
                    onClick={() => setPaymentMethod('debt')}
                    icon={FileText}
                    label="Ghi nợ"
                  />
                </div>
              </div>

              {/* Payment details */}
              <div>
                {paymentMethod === 'cash' && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Khách đưa</label>
                      <Input
                        placeholder={formatCurrency(finalTotal)}
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value)}
                        type="number"
                        min="0"
                        autoFocus
                        className="text-base font-semibold h-10"
                      />
                    </div>
                    {/* Quick amounts */}
                    <div className="grid grid-cols-3 gap-1">
                      {getQuickAmounts(finalTotal).map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setCashGiven(String(amt))}
                          className={cn(
                            'py-1.5 rounded-md border text-[11px] font-medium transition-colors',
                            cashGiven === String(amt)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted/50 text-foreground'
                          )}
                        >
                          {formatCurrency(amt)}
                        </button>
                      ))}
                    </div>
                    {cashGiven && parseFloat(cashGiven) > 0 && (
                      <div className={cn(
                        'flex justify-between items-center px-3 py-2 rounded-md border',
                        cashChange >= 0
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-rose-50 border-rose-200'
                      )}>
                        <span className="text-xs text-muted-foreground">
                          {cashChange >= 0 ? 'Tiền thừa' : 'Còn thiếu'}
                        </span>
                        <span className={cn(
                          'text-base font-bold tabular-nums',
                          cashChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        )}>
                          {formatCurrency(Math.abs(cashChange), true)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'qr' && (
                  <div className="flex flex-col items-center gap-2">
                    <QRDisplay amount={finalTotal} />
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors w-full">
                      <input
                        type="checkbox"
                        checked={qrConfirmed}
                        onChange={(e) => setQrConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-xs">Đã nhận được tiền</span>
                    </label>
                  </div>
                )}

                {paymentMethod === 'debt' && (
                  <div className="px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700">
                      ⚠️ Ghi nợ <strong>{formatCurrency(finalTotal, true)}</strong> cho{' '}
                      <strong>{billData.customerName}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm button */}
              <div className="pt-1">
                <Button
                  className="w-full h-11 font-bold text-sm tracking-wide gap-2"
                  onClick={handleConfirmPayment}
                  disabled={!billData || !canConfirm || processCheckout.isPending}
                >
                  {processCheckout.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ĐANG XỬ LÝ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      XÁC NHẬN THANH TOÁN
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full mt-1 h-8 text-xs"
                  onClick={handleClose}
                  disabled={processCheckout.isPending}
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border border-border min-w-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
        <p className="text-xs font-bold truncate tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</h4>
      <div className="border border-border rounded-lg p-2 bg-card">
        {children}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex justify-between text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function MethodButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: any; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all text-xs font-semibold',
        active
          ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary shadow-card'
          : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

/** Generate quick cash amount buttons */
function getQuickAmounts(total: number): number[] {
  const rounded = Math.ceil(total / 10000) * 10000
  const amounts = new Set<number>()
  amounts.add(rounded)
  amounts.add(rounded + 50000)
  amounts.add(rounded + 100000)
  if (total <= 100000) amounts.add(100000)
  if (total <= 200000) amounts.add(200000)
  amounts.add(500000)
  // Return top 6, sorted
  return [...amounts].sort((a, b) => a - b).slice(0, 6)
}
