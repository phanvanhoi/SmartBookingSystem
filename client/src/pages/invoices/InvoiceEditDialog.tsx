/**
 * Owner-only invoice edit dialog. Five tabs, each calling a separate
 * mutation hook so the most common ops (settle a debt, void) can be done
 * with a single click and the rarer ones (recompute room charge) live
 * behind their own tab to avoid cluttering the primary path.
 *
 * Every action shows a toast on success/failure and re-uses the existing
 * useInvoice query to refresh the displayed invoice automatically.
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, AlertTriangle, Trash2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateTime } from '@/utils/formatTime'
import { getErrorMessage } from '@/utils/error'
import {
  useInvoice,
  useVoidInvoice,
  useSettleDebt,
  useAdjustDiscount,
  useChangePaymentMethod,
  useEditInvoiceTimes,
  useAddInvoiceItem,
  useRemoveInvoiceItem,
} from '@/hooks/useCheckout'
import { useMenu } from '@/hooks/useOrders'

interface Props {
  invoiceId: number | null
  open: boolean
  onClose: () => void
}

const PAY_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  QR_TRANSFER: 'QR',
  DEBT: 'Ghi nợ',
}

// HTML <input type="datetime-local"> wants "yyyy-MM-ddTHH:mm" in LOCAL time.
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToISO(local: string): string | undefined {
  if (!local) return undefined
  return new Date(local).toISOString()
}

export default function InvoiceEditDialog({ invoiceId, open, onClose }: Props) {
  const { data: invoice, isLoading } = useInvoice(invoiceId)

  if (!open || !invoiceId) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[92vh] overflow-y-auto !p-0">
        <DialogHeader className="px-5 py-3 border-b border-border">
          <DialogTitle className="text-base">
            Sửa hóa đơn{' '}
            <span className="font-mono text-muted-foreground font-normal">
              {invoice?.invoiceNumber ?? '...'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading || !invoice ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-4">
            {/* Summary header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <Card label="Khách" value={invoice.session.customerName || '—'} />
              <Card label="Phòng" value={invoice.session.room.name} />
              <Card label="Tổng" value={formatCurrency(invoice.grandTotal, true)} highlight />
              <Card
                label="Còn nợ"
                value={
                  invoice.debtAmount > 0 ? formatCurrency(invoice.debtAmount, true) : '—'
                }
                danger={invoice.debtAmount > 0}
              />
            </div>

            <Tabs defaultValue="discount">
              <TabsList className="grid grid-cols-5 mb-3 w-full h-auto">
                <TabsTrigger value="discount" className="text-xs">
                  Giảm giá / Phụ thu
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">
                  Thanh toán
                </TabsTrigger>
                <TabsTrigger value="items" className="text-xs">
                  Món
                </TabsTrigger>
                <TabsTrigger value="times" className="text-xs">
                  Thời gian
                </TabsTrigger>
                <TabsTrigger value="void" className="text-xs text-rose-600 data-[state=active]:bg-rose-50">
                  Hủy HĐ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discount">
                <DiscountTab invoice={invoice} />
              </TabsContent>
              <TabsContent value="payments">
                <PaymentsTab invoice={invoice} />
              </TabsContent>
              <TabsContent value="items">
                <ItemsTab invoice={invoice} />
              </TabsContent>
              <TabsContent value="times">
                <TimesTab invoice={invoice} />
              </TabsContent>
              <TabsContent value="void">
                <VoidTab invoice={invoice} onClose={onClose} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Card({
  label,
  value,
  highlight,
  danger,
}: {
  label: string
  value: string
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <div className="px-2 py-1.5 rounded-md border border-border bg-muted/30">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
        {label}
      </p>
      <p
        className={
          'text-sm font-bold tabular-nums truncate ' +
          (danger ? 'text-amber-700' : highlight ? 'text-primary' : 'text-foreground')
        }
      >
        {value}
      </p>
    </div>
  )
}

// ── Tab 1: Discount / Surcharge ────────────────────────────────────────────

type Inv = ReturnType<typeof useInvoice>['data']

function DiscountTab({ invoice }: { invoice: NonNullable<Inv> }) {
  const [discount, setDiscount] = useState(String(invoice.discountAmount))
  const [discountReason, setDiscountReason] = useState(invoice.discountReason ?? '')
  const [surcharge, setSurcharge] = useState(String(invoice.surchargeAmount))

  // Re-init when invoice updates (after a save)
  useEffect(() => {
    setDiscount(String(invoice.discountAmount))
    setDiscountReason(invoice.discountReason ?? '')
    setSurcharge(String(invoice.surchargeAmount))
  }, [invoice.discountAmount, invoice.discountReason, invoice.surchargeAmount])

  const adjust = useAdjustDiscount()

  async function save() {
    try {
      await adjust.mutateAsync({
        id: invoice.id,
        discountAmount: Number(discount) || 0,
        discountReason: discountReason || undefined,
        surchargeAmount: Number(surcharge) || 0,
      })
      toast.success('Đã cập nhật giảm giá / phụ thu')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Cập nhật thất bại'))
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Giảm giá (VNĐ)">
        <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </Field>
      <Field label="Lý do giảm giá">
        <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="VD: Khách quen, sinh nhật..." />
      </Field>
      <Field label="Phụ thu (VNĐ)">
        <Input type="number" min={0} value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
      </Field>
      <Button onClick={save} disabled={adjust.isPending} className="w-full">
        {adjust.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu thay đổi'}
      </Button>
    </div>
  )
}

// ── Tab 2: Payments ────────────────────────────────────────────────────────

function PaymentsTab({ invoice }: { invoice: NonNullable<Inv> }) {
  const [debtAmount, setDebtAmount] = useState(String(invoice.debtAmount))
  const [debtMethod, setDebtMethod] = useState<'CASH' | 'QR_TRANSFER'>('CASH')

  useEffect(() => {
    setDebtAmount(String(invoice.debtAmount))
  }, [invoice.debtAmount])

  const settle = useSettleDebt()
  const changeMethod = useChangePaymentMethod()

  async function handleSettle() {
    try {
      await settle.mutateAsync({
        id: invoice.id,
        amount: Number(debtAmount),
        method: debtMethod,
      })
      toast.success('Đã ghi nhận trả nợ')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Ghi nợ thất bại'))
    }
  }

  async function handleChangeMethod(paymentId: number, newMethod: 'CASH' | 'QR_TRANSFER') {
    try {
      await changeMethod.mutateAsync({ id: invoice.id, paymentId, method: newMethod })
      toast.success('Đã đổi phương thức')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Đổi phương thức thất bại'))
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing payments */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Lịch sử thanh toán
        </h4>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Chưa có ghi nhận</p>
        ) : (
          <div className="space-y-1.5">
            {invoice.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/20"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{PAY_METHOD_LABEL[p.method]}</Badge>
                  <span className="text-sm font-bold tabular-nums">
                    {formatCurrency(p.amount, true)}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</span>
                </div>
                {p.method !== 'DEBT' && (
                  <Select
                    value={p.method}
                    onValueChange={(v) =>
                      v !== p.method && handleChangeMethod(p.id, v as 'CASH' | 'QR_TRANSFER')
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Tiền mặt</SelectItem>
                      <SelectItem value="QR_TRANSFER">QR</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settle debt */}
      {invoice.debtAmount > 0 && (
        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Thu nợ
          </h4>
          <div className="grid grid-cols-[1fr_120px_120px] gap-2">
            <Input
              type="number"
              min={0}
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              placeholder="Số tiền"
            />
            <Select value={debtMethod} onValueChange={(v) => setDebtMethod(v as 'CASH' | 'QR_TRANSFER')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Tiền mặt</SelectItem>
                <SelectItem value="QR_TRANSFER">QR</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSettle} disabled={settle.isPending}>
              {settle.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ghi nhận'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Items ───────────────────────────────────────────────────────────

function ItemsTab({ invoice }: { invoice: NonNullable<Inv> }) {
  const { data: menu } = useMenu()
  const [menuItemId, setMenuItemId] = useState<string>('')
  const [quantity, setQuantity] = useState('1')

  const addItem = useAddInvoiceItem()
  const removeItem = useRemoveInvoiceItem()

  async function handleAdd() {
    if (!menuItemId) return
    try {
      await addItem.mutateAsync({
        id: invoice.id,
        menuItemId: Number(menuItemId),
        quantity: Number(quantity) || 1,
      })
      toast.success('Đã thêm món')
      setMenuItemId('')
      setQuantity('1')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Thêm món thất bại'))
    }
  }

  async function handleRemove(orderItemId: number) {
    if (!confirm('Xóa món này khỏi hóa đơn? Tiền sẽ được tính lại.')) return
    try {
      await removeItem.mutateAsync({ id: invoice.id, orderItemId })
      toast.success('Đã xóa món')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xóa món thất bại'))
    }
  }

  // Flatten all items from all orders
  const allItems = (invoice.session.orders ?? []).flatMap((o) =>
    o.items.map((i) => ({ ...i, orderId: o.id })),
  )

  // Flat menu items list for the picker
  const flatMenu = (menu ?? []).flatMap((c) =>
    c.items.map((i) => ({ id: i.id, name: i.name, price: i.price, category: c.name })),
  )

  return (
    <div className="space-y-4">
      {/* Item list */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Món trong hóa đơn ({allItems.length})
        </h4>
        {allItems.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Chưa có món</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">Món</th>
                  <th className="text-center px-2 py-1.5 font-medium">SL</th>
                  <th className="text-right px-3 py-1.5 font-medium">Đơn giá</th>
                  <th className="text-right px-3 py-1.5 font-medium">Thành tiền</th>
                  <th className="px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allItems.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-1.5">{it.menuItem.name}</td>
                    <td className="px-2 py-1.5 text-center tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(it.unitPrice)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                      {formatCurrency(it.subtotal)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        aria-label={`Xóa ${it.menuItem.name}`}
                        onClick={() => handleRemove(it.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add new item */}
      <div className="border-t border-border pt-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Thêm món</h4>
        <div className="grid grid-cols-[1fr_80px_120px] gap-2">
          <Select value={menuItemId} onValueChange={setMenuItemId}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn món..." />
            </SelectTrigger>
            <SelectContent>
              {flatMenu.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name} — {formatCurrency(m.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Button onClick={handleAdd} disabled={!menuItemId || addItem.isPending}>
            {addItem.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" /> Thêm
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Tab 4: Times ───────────────────────────────────────────────────────────

function TimesTab({ invoice }: { invoice: NonNullable<Inv> }) {
  const [checkIn, setCheckIn] = useState(isoToLocalInput(invoice.session.checkInTime))
  const [checkOut, setCheckOut] = useState(isoToLocalInput(invoice.session.checkOutTime))

  useEffect(() => {
    setCheckIn(isoToLocalInput(invoice.session.checkInTime))
    setCheckOut(isoToLocalInput(invoice.session.checkOutTime))
  }, [invoice.session.checkInTime, invoice.session.checkOutTime])

  const editTimes = useEditInvoiceTimes()

  async function save() {
    try {
      await editTimes.mutateAsync({
        id: invoice.id,
        checkInTime: localInputToISO(checkIn),
        checkOutTime: localInputToISO(checkOut),
      })
      toast.success('Đã cập nhật thời gian + tính lại tiền phòng')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Cập nhật thất bại'))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Khi đổi thời gian, hệ thống sẽ tính lại tiền phòng theo bảng giá hiện tại.
      </p>
      <Field label="Check-in">
        <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
      </Field>
      <Field label="Check-out">
        <Input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </Field>
      <Button onClick={save} disabled={editTimes.isPending} className="w-full">
        {editTimes.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu + tính lại'}
      </Button>
    </div>
  )
}

// ── Tab 5: Void ────────────────────────────────────────────────────────────

function VoidTab({ invoice, onClose }: { invoice: NonNullable<Inv>; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const voidInvoice = useVoidInvoice()
  const isVoid = invoice.status === 'VOID'

  async function handleVoid() {
    if (!confirm('Hủy hóa đơn này? Kho sẽ được hoàn lại. Hành động này không thể đảo ngược.'))
      return
    try {
      await voidInvoice.mutateAsync({ id: invoice.id, reason })
      toast.success('Đã hủy hóa đơn')
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Hủy hóa đơn thất bại'))
    }
  }

  if (isVoid) {
    return (
      <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        Hóa đơn này đã bị hủy.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          Hủy hóa đơn sẽ:
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Đặt trạng thái về VOID — không tính vào doanh thu</li>
            <li>Hoàn lại kho cho mọi sản phẩm trong hóa đơn</li>
            <li>Ghi audit log với lý do</li>
          </ul>
        </div>
      </div>
      <Field label="Lý do hủy (bắt buộc, ≥ 3 ký tự)">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="VD: Tính nhầm tiền, khách trả lại..."
        />
      </Field>
      <Button
        variant="destructive"
        onClick={handleVoid}
        disabled={reason.trim().length < 3 || voidInvoice.isPending}
        className="w-full"
      >
        {voidInvoice.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Xác nhận hủy hóa đơn'
        )}
      </Button>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
