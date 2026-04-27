import { useState, type ReactNode } from 'react'
import { Receipt, Search, Filter, CalendarRange, Wallet, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInvoices } from '@/hooks/useCheckout'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateTime } from '@/utils/formatTime'
import InvoiceEditDialog from './InvoiceEditDialog'

type PeriodKey = 'day' | 'yesterday' | 'week' | 'month' | 'all'
type StatusKey = 'all' | 'PAID' | 'PARTIAL' | 'PENDING' | 'VOID'

const PERIOD_LABEL: Record<PeriodKey, string> = {
  day: 'Hôm nay',
  yesterday: 'Hôm qua',
  week: 'Tuần này',
  month: 'Tháng này',
  all: 'Tất cả',
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PAID: { text: 'Đã trả', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIAL: { text: 'Còn nợ', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING: { text: 'Chờ', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  VOID: { text: 'Đã hủy', cls: 'bg-rose-50 text-rose-700 border-rose-200 line-through' },
}

const EMPTY_SUMMARY = { totalRevenue: 0, totalDebt: 0, invoiceCount: 0 }

function SummaryCard({
  icon,
  label,
  value,
  isLoading,
  valueClassName = '',
  skeletonWidth = 'w-32',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  isLoading: boolean
  valueClassName?: string
  skeletonWidth?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      {isLoading ? (
        <Skeleton className={`h-7 ${skeletonWidth} mt-1.5`} />
      ) : (
        <div className={`text-2xl font-bold tabular-nums mt-1 ${valueClassName}`}>{value}</div>
      )}
    </div>
  )
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusKey>('all')
  const [period, setPeriod] = useState<PeriodKey>('day')
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data, isLoading } = useInvoices({
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    period: period === 'all' ? undefined : period,
    limit: 50,
  })

  const invoices = data?.data ?? []
  const summary = data?.summary ?? EMPTY_SUMMARY

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Hóa đơn
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Xem và chỉnh sửa hóa đơn (chỉ chủ quán)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo số hóa đơn hoặc tên khách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-full sm:w-40 h-10">
            <CalendarRange className="w-4 h-4 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PERIOD_LABEL) as [PeriodKey, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusKey)}>
          <SelectTrigger className="w-full sm:w-44 h-10">
            <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="PAID">Đã trả</SelectItem>
            <SelectItem value="PARTIAL">Còn nợ</SelectItem>
            <SelectItem value="VOID">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<Wallet className="w-3.5 h-3.5" />}
          label={`Doanh thu ${PERIOD_LABEL[period].toLowerCase()}`}
          value={formatCurrency(summary.totalRevenue)}
          isLoading={isLoading}
        />
        <SummaryCard
          icon={<Receipt className="w-3.5 h-3.5" />}
          label="Số hóa đơn"
          value={summary.invoiceCount}
          isLoading={isLoading}
          skeletonWidth="w-16"
        />
        <SummaryCard
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          label="Còn nợ"
          value={formatCurrency(summary.totalDebt)}
          isLoading={isLoading}
          valueClassName={summary.totalDebt > 0 ? 'text-amber-700' : ''}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Số HĐ</th>
                <th className="text-left px-4 py-2.5 font-medium">Khách</th>
                <th className="text-left px-4 py-2.5 font-medium">Phòng</th>
                <th className="text-left px-4 py-2.5 font-medium">Thời gian</th>
                <th className="text-right px-4 py-2.5 font-medium">Tổng</th>
                <th className="text-right px-4 py-2.5 font-medium">Còn nợ</th>
                <th className="text-center px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    Không có hóa đơn phù hợp
                  </td>
                </tr>
              )}
              {!isLoading &&
                invoices.map((inv) => {
                  const st = STATUS_LABEL[inv.status] ?? { text: inv.status, cls: '' }
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium truncate max-w-[180px]">
                          {inv.session.customerName || '—'}
                        </div>
                        {inv.session.customerPhone && (
                          <div className="text-xs text-muted-foreground">
                            {inv.session.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">{inv.session.room.name}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {formatDateTime(inv.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {inv.debtAmount > 0 ? (
                          <span className="text-amber-700 font-semibold">
                            {formatCurrency(inv.debtAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="outline" className={st.cls}>
                          {st.text}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => setEditingId(inv.id)}
                        >
                          Sửa
                        </Button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <InvoiceEditDialog
        invoiceId={editingId}
        open={editingId !== null}
        onClose={() => setEditingId(null)}
      />
    </div>
  )
}
