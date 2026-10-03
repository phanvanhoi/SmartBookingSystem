/**
 * Full invoice on one scrollable dialog (no tabs).
 * OWNER can edit times/items/discount/payments/void inline;
 * other roles get the same layout read-only.
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2,
  AlertTriangle,
  Trash2,
  Plus,
  Clock,
  User,
  DoorOpen,
  Receipt,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { formatDateTime, formatDuration } from '@/utils/formatTime'
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
  /** Non-OWNER: view breakdown only, no mutate controls. */
  readOnly?: boolean
}

const PAY_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  QR_TRANSFER: 'QR',
  DEBT: 'Ghi nợ',
}

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  PAID: { text: 'Đã trả', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIAL: { text: 'Còn nợ', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING: { text: 'Chờ', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  VOID: { text: 'Đã hủy', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

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

type Inv = NonNullable<ReturnType<typeof useInvoice>['data']>

export default function InvoiceEditDialog({ invoiceId, open, onClose, readOnly = false }: Props) {
  const { data: invoice, isLoading } = useInvoice(invoiceId)

  if (!open || !invoiceId) return null

  const status = invoice ? STATUS_BADGE[invoice.status] : null
  const canEdit = !readOnly && invoice?.status !== 'VOID'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[92dvh] max-md:dialog-mobile-full max-md:!max-w-none overflow-hidden !p-0 flex flex-col gap-0">
        <DialogHeader className="px-5 py-3 pr-12 border-b border-border shrink-0">
          <DialogTitle className="text-base flex flex-wrap items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span>{readOnly ? 'Chi tiết hóa đơn' : 'Hóa đơn'}</span>
            <span className="font-mono text-muted-foreground font-normal text-sm">
              {invoice?.invoiceNumber ?? '...'}
            </span>
            {status && (
              <Badge variant="outline" className={status.cls}>
                {status.text}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !invoice ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="p-4 sm:p-5 space-y-5">
              {invoice.status === 'VOID' && (
                <Banner
                  tone="danger"
                  text="Hóa đơn đã hủy — chỉ xem, không chỉnh sửa."
                />
              )}

              <MetaBlock invoice={invoice} />

              <TimesBlock invoice={invoice} canEdit={!!canEdit} />

              <ItemsBlock invoice={invoice} canEdit={!!canEdit} />

              <TotalsBlock invoice={invoice} />

              <DiscountBlock invoice={invoice} canEdit={!!canEdit} />

              <PaymentsBlock invoice={invoice} canEdit={!!canEdit} />

              {canEdit && <VoidBlock invoice={invoice} onClose={onClose} />}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Shared bits ────────────────────────────────────────────────────────────

function Banner({ tone, text }: { tone: 'danger' | 'muted' | 'warn'; text: string }) {
  const cls =
    tone === 'danger'
      ? 'bg-rose-50 border-rose-200 text-rose-700'
      : tone === 'warn'
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-muted/40 border-border text-muted-foreground'
  return <div className={`px-3 py-2 rounded-md border text-sm ${cls}`}>{text}</div>
}

function Section({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

// ── Meta ───────────────────────────────────────────────────────────────────

function MetaBlock({ invoice }: { invoice: Inv }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <MetaCard
        icon={<User className="w-3.5 h-3.5" />}
        label="Khách"
        value={
          invoice.session.customerPhone
            ? `${invoice.session.customerName || '—'} · ${invoice.session.customerPhone}`
            : invoice.session.customerName || '—'
        }
      />
      <MetaCard
        icon={<DoorOpen className="w-3.5 h-3.5" />}
        label="Phòng"
        value={invoice.session.room.name}
      />
      <MetaCard
        icon={<Receipt className="w-3.5 h-3.5" />}
        label="Tổng"
        value={formatCurrency(invoice.grandTotal, true)}
        highlight
      />
      <MetaCard
        icon={<Clock className="w-3.5 h-3.5" />}
        label="Còn nợ"
        value={invoice.debtAmount > 0 ? formatCurrency(invoice.debtAmount, true) : '—'}
        danger={invoice.debtAmount > 0}
      />
    </div>
  )
}

function MetaCard({
  icon,
  label,
  value,
  highlight,
  danger,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <div className="px-2.5 py-2 rounded-md border border-border bg-muted/30 min-w-0">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground leading-none mb-1">
        {icon}
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

// ── Times ──────────────────────────────────────────────────────────────────

function TimesBlock({ invoice, canEdit }: { invoice: Inv; canEdit: boolean }) {
  const [checkIn, setCheckIn] = useState(isoToLocalInput(invoice.session.checkInTime))
  const [checkOut, setCheckOut] = useState(isoToLocalInput(invoice.session.checkOutTime))
  const editTimes = useEditInvoiceTimes()

  useEffect(() => {
    setCheckIn(isoToLocalInput(invoice.session.checkInTime))
    setCheckOut(isoToLocalInput(invoice.session.checkOutTime))
  }, [invoice.session.checkInTime, invoice.session.checkOutTime])

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
    <Section title="Ca hát">
      {canEdit ? (
        <div className="rounded-md border border-border p-3 space-y-3 bg-card">
          <p className="text-xs text-muted-foreground">
            Đổi giờ sẽ tính lại tiền phòng theo bảng giá hiện tại.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <Field label="Check-in">
              <Input
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </Field>
            <Field label="Check-out">
              <Input
                type="datetime-local"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </Field>
            <Button onClick={save} disabled={editTimes.isPending} className="sm:mb-0.5">
              {editTimes.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu giờ'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-border px-3 py-2.5 text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
          <p>
            Vào:{' '}
            <span className="font-medium">{formatDateTime(invoice.session.checkInTime)}</span>
          </p>
          <p>
            Ra:{' '}
            <span className="font-medium">
              {invoice.session.checkOutTime
                ? formatDateTime(invoice.session.checkOutTime)
                : '—'}
            </span>
          </p>
        </div>
      )}
    </Section>
  )
}

// ── Items ──────────────────────────────────────────────────────────────────

function ItemsBlock({ invoice, canEdit }: { invoice: Inv; canEdit: boolean }) {
  const { data: menu } = useMenu()
  const [menuItemId, setMenuItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const addItem = useAddInvoiceItem()
  const removeItem = useRemoveInvoiceItem()

  const allItems = (invoice.session.orders ?? []).flatMap((o) =>
    o.items.map((i) => ({ ...i, orderId: o.id })),
  )
  const flatMenu = (menu ?? []).flatMap((c) =>
    c.items.map((i) => ({ id: i.id, name: i.name, price: i.price })),
  )

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

  return (
    <Section title={`Món (${allItems.length})`}>
      <div className="rounded-md border border-border overflow-hidden">
        {allItems.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground italic">Chưa có món</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Món</th>
                <th className="text-center px-2 py-2 font-medium w-12">SL</th>
                <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">Đơn giá</th>
                <th className="text-right px-3 py-2 font-medium">Thành tiền</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allItems.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{it.menuItem.name}</div>
                    {it.notes && (
                      <div className="text-[11px] text-muted-foreground">{it.notes}</div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">{it.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                    {formatCurrency(it.unitPrice)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatCurrency(it.subtotal)}
                  </td>
                  {canEdit && (
                    <td className="px-1 py-2 text-right">
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
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canEdit && (
        <div className="grid grid-cols-[1fr_72px_auto] gap-2">
          <Select value={menuItemId} onValueChange={setMenuItemId}>
            <SelectTrigger>
              <SelectValue placeholder="Thêm món..." />
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
            aria-label="Số lượng"
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
      )}
    </Section>
  )
}

// ── Totals ─────────────────────────────────────────────────────────────────

function formatHoursLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours === 0) return `${mins} phút`
  if (mins === 0) return `${hours} giờ`
  return `${hours} giờ ${mins} phút`
}

function TotalsBlock({ invoice }: { invoice: Inv }) {
  const isVoid = invoice.status === 'VOID'
  const voidReason =
    isVoid && invoice.discountReason?.startsWith('[HỦY]')
      ? invoice.discountReason.replace(/^\[HỦY\]\s*/, '')
      : null
  const showDiscount =
    invoice.discountAmount > 0 && !(isVoid && invoice.discountReason?.startsWith('[HỦY]'))

  const roomSegments = invoice.roomChargeBreakdown?.segments ?? []

  const rows: Array<{ label: string; value: string; muted?: boolean; strong?: boolean }> = [
    { label: 'Tiền món', value: formatCurrency(invoice.orderTotal, true) },
    { label: 'Tạm tính', value: formatCurrency(invoice.subtotal, true) },
  ]
  if (showDiscount) {
    rows.push({
      label: invoice.discountReason
        ? `Giảm giá (${invoice.discountReason})`
        : 'Giảm giá',
      value: `−${formatCurrency(invoice.discountAmount, true)}`,
      muted: true,
    })
  }
  if (invoice.voucherCode) {
    rows.push({ label: 'Voucher', value: invoice.voucherCode, muted: true })
  }
  if (invoice.surchargeAmount > 0) {
    rows.push({
      label: 'Phụ thu',
      value: `+${formatCurrency(invoice.surchargeAmount, true)}`,
    })
  }
  if (invoice.depositApplied > 0) {
    rows.push({
      label: 'Cọc trừ',
      value: `−${formatCurrency(invoice.depositApplied, true)}`,
      muted: true,
    })
  }
  rows.push({
    label: 'Tổng thanh toán',
    value: formatCurrency(invoice.grandTotal, true),
    strong: true,
  })

  return (
    <Section title="Tổng kết">
      {voidReason && (
        <Banner tone="danger" text={`Lý do hủy: ${voidReason}`} />
      )}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-3 py-2 align-top" colSpan={2}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tiền phòng</span>
                  {roomSegments.length === 0 && (
                    <span className="font-medium tabular-nums">
                      {formatCurrency(invoice.roomCharge, true)}
                    </span>
                  )}
                </div>
                {roomSegments.length > 0 && (
                  <div className="mt-2 space-y-1.5 text-xs">
                    {roomSegments.map((seg, i) => (
                      <div
                        key={`${seg.start}-${seg.end}-${i}`}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                      >
                        <span>
                          <span className="font-medium text-foreground">
                            {seg.start} → {seg.end}
                          </span>
                          <span className="text-muted-foreground">
                            {' '}
                            · {formatHoursLabel(seg.minutes)} × {formatCurrency(seg.pricePerHour)}đ/giờ
                          </span>
                        </span>
                        <span className="tabular-nums font-medium text-foreground">
                          = {formatCurrency(seg.amount, true)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-sm">
                      <span className="text-muted-foreground">
                        Tổng phòng
                        {roomSegments.length > 1
                          ? ` (${formatDuration(
                              roomSegments.reduce((s, seg) => s + seg.minutes, 0),
                            )})`
                          : ''}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(invoice.roomCharge, true)}
                      </span>
                    </div>
                  </div>
                )}
              </td>
            </tr>
            {rows.map((r) => (
              <tr key={r.label} className={r.strong ? 'bg-muted/30' : ''}>
                <td className="px-3 py-2 text-muted-foreground">{r.label}</td>
                <td
                  className={
                    'px-3 py-2 text-right tabular-nums ' +
                    (r.strong
                      ? 'font-bold text-primary text-base'
                      : r.muted
                        ? 'text-emerald-700'
                        : 'font-medium')
                  }
                >
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

// ── Discount / surcharge ───────────────────────────────────────────────────

function DiscountBlock({ invoice, canEdit }: { invoice: Inv; canEdit: boolean }) {
  const [discount, setDiscount] = useState(String(invoice.discountAmount))
  const [discountReason, setDiscountReason] = useState(invoice.discountReason ?? '')
  const [surcharge, setSurcharge] = useState(String(invoice.surchargeAmount))
  const adjust = useAdjustDiscount()

  useEffect(() => {
    setDiscount(String(invoice.discountAmount))
    setDiscountReason(invoice.discountReason ?? '')
    setSurcharge(String(invoice.surchargeAmount))
  }, [invoice.discountAmount, invoice.discountReason, invoice.surchargeAmount])

  if (!canEdit) return null

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
    <Section title="Giảm giá / phụ thu">
      {invoice.voucherCode && (
        <div className="px-3 py-2 rounded-md border border-border bg-muted/30 text-sm">
          Voucher: <span className="font-mono font-semibold">{invoice.voucherCode}</span>
        </div>
      )}
      <div className="rounded-md border border-border p-3 space-y-3 bg-card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Field label="Giảm giá (VNĐ)">
            <Input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
          <Field label="Lý do">
            <Input
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Khách quen, sinh nhật..."
            />
          </Field>
          <Field label="Phụ thu (VNĐ)">
            <Input
              type="number"
              min={0}
              value={surcharge}
              onChange={(e) => setSurcharge(e.target.value)}
            />
          </Field>
        </div>
        <Button onClick={save} disabled={adjust.isPending} size="sm">
          {adjust.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu giảm giá / phụ thu'}
        </Button>
      </div>
    </Section>
  )
}

// ── Payments ───────────────────────────────────────────────────────────────

function PaymentsBlock({ invoice, canEdit }: { invoice: Inv; canEdit: boolean }) {
  const [debtAmount, setDebtAmount] = useState(String(invoice.debtAmount))
  const [debtMethod, setDebtMethod] = useState<'CASH' | 'QR_TRANSFER'>('CASH')
  const settle = useSettleDebt()
  const changeMethod = useChangePaymentMethod()

  useEffect(() => {
    setDebtAmount(String(invoice.debtAmount))
  }, [invoice.debtAmount])

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
    <Section title="Thanh toán">
      {invoice.payments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-1">Chưa có ghi nhận</p>
      ) : (
        <div className="space-y-1.5">
          {invoice.payments.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/20"
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <Badge variant="outline">{PAY_METHOD_LABEL[p.method] ?? p.method}</Badge>
                <span className="text-sm font-bold tabular-nums">
                  {formatCurrency(p.amount, true)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(p.createdAt)}
                </span>
              </div>
              {canEdit && p.method !== 'DEBT' && (
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

      {canEdit && invoice.debtAmount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Thu nợ · còn {formatCurrency(invoice.debtAmount, true)}
          </p>
          <div className="grid grid-cols-[1fr_120px_auto] gap-2">
            <Input
              type="number"
              min={0}
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              placeholder="Số tiền"
            />
            <Select
              value={debtMethod}
              onValueChange={(v) => setDebtMethod(v as 'CASH' | 'QR_TRANSFER')}
            >
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
    </Section>
  )
}

// ── Void (danger zone) ─────────────────────────────────────────────────────

function VoidBlock({ invoice, onClose }: { invoice: Inv; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const voidInvoice = useVoidInvoice()

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

  return (
    <Section
      title="Vùng nguy hiểm"
      action={
        !open ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 text-xs"
            onClick={() => setOpen(true)}
          >
            Hủy hóa đơn…
          </Button>
        ) : null
      }
    >
      {open && (
        <div className="rounded-md border border-rose-200 bg-rose-50/40 p-3 space-y-3">
          <div className="text-sm text-rose-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Hủy sẽ đặt VOID (không tính doanh thu), hoàn kho, và ghi audit log.
            </div>
          </div>
          <Field label="Lý do hủy (≥ 3 ký tự)">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Tính nhầm tiền, khách trả lại..."
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={reason.trim().length < 3 || voidInvoice.isPending}
            >
              {voidInvoice.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Xác nhận hủy'
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false)
                setReason('')
              }}
            >
              Đóng
            </Button>
          </div>
        </div>
      )}
    </Section>
  )
}
