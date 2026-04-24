import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatRelative } from '@/utils/formatTime'
import type { CustomerTier, CreateCustomerForm } from '@/types/customer'
import { cn } from '@/utils/cn'

const TIER_LABELS: Record<CustomerTier, string> = {
  REGULAR: 'Thường',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  VIP: 'VIP',
}

const TIER_CLASSES: Record<CustomerTier, string> = {
  REGULAR: 'bg-slate-50 text-slate-700 border border-slate-200',
  SILVER: 'bg-zinc-100 text-zinc-700 border border-zinc-300',
  GOLD: 'bg-amber-50 text-amber-700 border border-amber-200',
  VIP: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
}

const ITEMS_PER_PAGE = 20

export default function CustomerListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<CustomerTier | ''>('')
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const [form, setForm] = useState<CreateCustomerForm>({ name: '', phone: '', birthday: '', notes: '' })
  const [formErrors, setFormErrors] = useState<Partial<CreateCustomerForm>>({})

  const { data, isLoading } = useCustomers({ search, tier, page, limit: ITEMS_PER_PAGE })
  const createMutation = useCreateCustomer()

  const customers = data?.data ?? []
  const pagination = data?.pagination

  function handleTierChange(val: string) {
    setTier(val === 'ALL' ? '' : (val as CustomerTier))
    setPage(1)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  function validateForm(): boolean {
    const errors: Partial<CreateCustomerForm> = {}
    if (!form.name.trim()) errors.name = 'Vui lòng nhập tên'
    if (!form.phone.trim()) errors.phone = 'Vui lòng nhập SĐT'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    await createMutation.mutateAsync({
      name: form.name.trim(),
      phone: form.phone.trim(),
      birthday: form.birthday || undefined,
      notes: form.notes || undefined,
    })
    setShowCreateDialog(false)
    setForm({ name: '', phone: '', birthday: '', notes: '' })
    setFormErrors({})
  }

  function handleCloseDialog() {
    setShowCreateDialog(false)
    setForm({ name: '', phone: '', birthday: '', notes: '' })
    setFormErrors({})
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Khách hàng</h1>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm khách
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Select value={tier || 'ALL'} onValueChange={handleTierChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Hạng thành viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả hạng</SelectItem>
            <SelectItem value="REGULAR">Thường</SelectItem>
            <SelectItem value="SILVER">Bạc</SelectItem>
            <SelectItem value="GOLD">Vàng</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Tên khách</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Số điện thoại</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Hạng</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Số lần đến</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Tổng chi tiêu</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">Lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Chưa có khách hàng nào</p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className={cn(
                      'border-b border-border last:border-0 cursor-pointer transition-colors',
                      customer.isBlacklisted
                        ? 'bg-rose-50 hover:bg-rose-100'
                        : 'hover:bg-muted/40'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{customer.name}</span>
                        {customer.isBlacklisted && (
                          <Badge className="bg-rose-100 text-rose-700 border border-rose-200 text-[10px] px-1.5 py-0 font-semibold">
                            Blacklist
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{customer.phone}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('font-semibold', TIER_CLASSES[customer.tier])}>
                        {TIER_LABELS[customer.tier]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">{customer.visitCount}</td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">
                      {formatCurrency(customer.totalSpent)} VNĐ
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {customer.lastVisit ? formatRelative(customer.lastVisit) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Tổng {pagination.total} khách hàng
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Trước
            </Button>
            <span className="text-muted-foreground px-2">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm khách hàng mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Tên khách hàng <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Nhập tên khách hàng"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Số điện thoại <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Nhập số điện thoại"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={formErrors.phone ? 'border-destructive' : ''}
                />
                {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Ngày sinh</label>
                <Input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Ghi chú</label>
                <Input
                  placeholder="Ghi chú về khách hàng..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Đang lưu...' : 'Thêm khách'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
