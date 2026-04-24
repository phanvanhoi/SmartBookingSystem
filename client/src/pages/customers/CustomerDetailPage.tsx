import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Phone,
  Calendar,
  FileText,
  Clock,
  AlertTriangle,
  CreditCard,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useCustomer,
  useCustomerHistory,
  useCustomerPoints,
  useUpdateCustomer,
  useToggleBlacklist,
  useRedeemPoints,
} from '@/hooks/useCustomers'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate, formatDateTime, formatDuration, formatRelative } from '@/utils/formatTime'
import type { CustomerTier, CreateCustomerForm } from '@/types/customer'
import { cn } from '@/utils/cn'

const TIER_LABELS: Record<CustomerTier, string> = {
  REGULAR: 'Thường',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  VIP: 'VIP',
}

const TIER_CLASSES: Record<CustomerTier, string> = {
  REGULAR: 'border-transparent bg-gray-500/20 text-gray-400 border-gray-500/30',
  SILVER: 'border-transparent bg-slate-400/20 text-slate-300 border-slate-400/30',
  GOLD: 'border-transparent bg-amber-500/20 text-amber-400 border-amber-500/30',
  VIP: 'border-transparent bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const ACTION_CLASSES = {
  EARN: 'border-transparent bg-green-500/20 text-green-400 border-green-500/30',
  REDEEM: 'border-transparent bg-blue-500/20 text-blue-400 border-blue-500/30',
  ADJUST: 'border-transparent bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const ACTION_LABELS = {
  EARN: 'Tích điểm',
  REDEEM: 'Đổi điểm',
  ADJUST: 'Điều chỉnh',
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customerId = id ? parseInt(id, 10) : null

  const [historyPage, setHistoryPage] = useState(1)
  const [pointsPage, setPointsPage] = useState(1)

  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false)
  const [blacklistReason, setBlacklistReason] = useState('')

  const [showRedeemDialog, setShowRedeemDialog] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState('')
  const [redeemReason, setRedeemReason] = useState('')

  const [editForm, setEditForm] = useState<Partial<CreateCustomerForm>>({})
  const [isEditing, setIsEditing] = useState(false)

  const { data: customerData, isLoading } = useCustomer(customerId)
  const { data: historyData, isLoading: historyLoading } = useCustomerHistory(customerId, historyPage)
  const { data: pointsData, isLoading: pointsLoading } = useCustomerPoints(customerId, pointsPage)

  const updateMutation = useUpdateCustomer()
  const toggleBlacklistMutation = useToggleBlacklist()
  const redeemMutation = useRedeemPoints()

  const customer = customerData?.data
  const history = historyData?.data ?? []
  const historyPagination = historyData?.pagination
  const points = pointsData?.data ?? []
  const pointsPagination = pointsData?.pagination

  function startEdit() {
    if (!customer) return
    setEditForm({
      name: customer.name,
      phone: customer.phone ?? '',
      birthday: customer.birthday ?? '',
      notes: customer.notes ?? '',
    })
    setIsEditing(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) return
    await updateMutation.mutateAsync({ id: customerId, data: editForm })
    setIsEditing(false)
  }

  async function handleToggleBlacklist(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !customer) return
    await toggleBlacklistMutation.mutateAsync({
      id: customerId,
      isBlacklisted: !customer.isBlacklisted,
      reason: blacklistReason || undefined,
    })
    setShowBlacklistDialog(false)
    setBlacklistReason('')
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) return
    const pts = parseInt(redeemPoints, 10)
    if (isNaN(pts) || pts <= 0) return
    await redeemMutation.mutateAsync({ id: customerId, points: pts, reason: redeemReason || undefined })
    setShowRedeemDialog(false)
    setRedeemPoints('')
    setRedeemReason('')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy khách hàng</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/customers')}>
            Quay lại danh sách
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Blacklist Banner */}
      {customer.isBlacklisted && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-950/30 border border-red-500/40 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Khách hàng đang trong danh sách đen</p>
            {customer.blacklistReason && (
              <p className="text-sm mt-0.5 text-red-400/80">Lý do: {customer.blacklistReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/customers')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-xl font-bold text-foreground truncate">{customer.name}</h1>
          <Badge className={cn(TIER_CLASSES[customer.tier])}>{TIER_LABELS[customer.tier]}</Badge>
          {customer.isBlacklisted && (
            <Badge className="border-transparent bg-red-500/20 text-red-400 border-red-500/30">
              Blacklist
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={startEdit}>
            Sửa
          </Button>
          <Button
            variant={customer.isBlacklisted ? 'outline' : 'destructive'}
            size="sm"
            onClick={() => setShowBlacklistDialog(true)}
            className={customer.isBlacklisted ? 'border-green-600 text-green-400 hover:bg-green-950/30' : ''}
          >
            {customer.isBlacklisted ? 'Gỡ Blacklist' : 'Blacklist'}
          </Button>
        </div>
      </div>

      {/* Info Row */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Phone className="h-4 w-4" />
          <span>{customer.phone}</span>
        </div>
        {customer.birthday && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(customer.birthday)}</span>
          </div>
        )}
        {customer.notes && (
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>{customer.notes}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>Tham gia {formatDate(customer.createdAt)}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng chi tiêu</p>
                <p className="text-base font-bold text-foreground">
                  {formatCurrency(customer.totalSpent, true)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Số lần đến</p>
                <p className="text-base font-bold text-foreground">{customer.visitCount} lần</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CreditCard className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Điểm tích lũy</p>
                <p className="text-base font-bold text-foreground">{customer.totalPoints} điểm</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Star className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hạng thành viên</p>
                <p className="text-base font-bold text-foreground">{TIER_LABELS[customer.tier]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Lịch sử ghé thăm</TabsTrigger>
          <TabsTrigger value="points">Tích điểm</TabsTrigger>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
        </TabsList>

        {/* Tab: History */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lịch sử ghé thăm</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/30 border-y border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ngày</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phòng</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Thời lượng</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                        </tr>
                      ))
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-muted-foreground">
                          Chưa có lịch sử ghé thăm
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                          <td className="px-4 py-3 text-foreground">{formatDateTime(item.date)}</td>
                          <td className="px-4 py-3 text-foreground">{item.roomName}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {formatDuration(item.durationMinutes)}
                          </td>
                          <td className="px-4 py-3 text-right text-foreground">
                            {formatCurrency(item.totalAmount)} VNĐ
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {historyPagination && historyPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                  <span className="text-muted-foreground">Tổng {historyPagination.total} lượt</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      Trước
                    </Button>
                    <span className="text-muted-foreground px-2">
                      {historyPage} / {historyPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.min(historyPagination.totalPages, p + 1))}
                      disabled={historyPage === historyPagination.totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Points */}
        <TabsContent value="points" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lịch sử tích điểm</CardTitle>
              <Button size="sm" onClick={() => setShowRedeemDialog(true)}>
                Đổi điểm
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/30 border-y border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ngày</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Hành động</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Điểm</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        </tr>
                      ))
                    ) : points.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-muted-foreground">
                          Chưa có lịch sử tích điểm
                        </td>
                      </tr>
                    ) : (
                      points.map((item) => (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                          <td className="px-4 py-3 text-foreground">{formatDateTime(item.createdAt)}</td>
                          <td className="px-4 py-3">
                            <Badge className={cn(ACTION_CLASSES[item.action])}>
                              {ACTION_LABELS[item.action]}
                            </Badge>
                          </td>
                          <td className={cn(
                            'px-4 py-3 text-right font-medium',
                            item.action === 'EARN' ? 'text-green-400' :
                            item.action === 'REDEEM' ? 'text-blue-400' : 'text-orange-400'
                          )}>
                            {item.action === 'EARN' ? '+' : item.action === 'REDEEM' ? '-' : '±'}
                            {Math.abs(item.points)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{item.reason ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {pointsPagination && pointsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                  <span className="text-muted-foreground">Tổng {pointsPagination.total} giao dịch</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPointsPage((p) => Math.max(1, p - 1))}
                      disabled={pointsPage === 1}
                    >
                      Trước
                    </Button>
                    <span className="text-muted-foreground px-2">
                      {pointsPage} / {pointsPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPointsPage((p) => Math.min(pointsPagination.totalPages, p + 1))}
                      disabled={pointsPage === pointsPagination.totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Info / Edit */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thông tin khách hàng</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">Tên khách hàng</label>
                      <Input
                        value={editForm.name ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">Số điện thoại</label>
                      <Input
                        value={editForm.phone ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">Ngày sinh</label>
                      <Input
                        type="date"
                        value={editForm.birthday ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">Ghi chú</label>
                      <Input
                        value={editForm.notes ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Hủy
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Tên khách hàng" value={customer.name} />
                  <InfoRow label="Số điện thoại" value={customer.phone ?? '—'} />
                  <InfoRow
                    label="Ngày sinh"
                    value={customer.birthday ? formatDate(customer.birthday) : '—'}
                  />
                  <InfoRow label="Hạng thành viên" value={TIER_LABELS[customer.tier]} />
                  <InfoRow
                    label="Lần ghé thăm cuối"
                    value={customer.lastVisit ? formatRelative(customer.lastVisit) : '—'}
                  />
                  <InfoRow label="Ngày tạo" value={formatDate(customer.createdAt)} />
                  <div className="sm:col-span-2">
                    <InfoRow label="Ghi chú" value={customer.notes || '—'} />
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      Chỉnh sửa thông tin
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Blacklist Toggle Dialog */}
      <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {customer.isBlacklisted ? 'Gỡ khỏi danh sách đen' : 'Thêm vào danh sách đen'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleToggleBlacklist}>
            <div className="px-6 py-4 flex flex-col gap-4">
              {!customer.isBlacklisted && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Lý do (tùy chọn)</label>
                  <Input
                    placeholder="Nhập lý do blacklist..."
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                  />
                </div>
              )}
              {customer.isBlacklisted && (
                <p className="text-sm text-muted-foreground">
                  Bạn có chắc muốn gỡ <strong className="text-foreground">{customer.name}</strong> khỏi danh sách đen?
                </p>
              )}
              {!customer.isBlacklisted && (
                <p className="text-sm text-amber-400/80 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Khách sẽ bị đánh dấu trong hệ thống
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBlacklistDialog(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                variant={customer.isBlacklisted ? 'default' : 'destructive'}
                disabled={toggleBlacklistMutation.isPending}
              >
                {toggleBlacklistMutation.isPending
                  ? 'Đang xử lý...'
                  : customer.isBlacklisted
                  ? 'Gỡ Blacklist'
                  : 'Xác nhận Blacklist'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Redeem Points Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi điểm tích lũy</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRedeem}>
            <div className="px-6 py-4 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Số điểm hiện có:{' '}
                <span className="text-foreground font-semibold">{customer.totalPoints} điểm</span>
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Số điểm muốn đổi <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max={customer.totalPoints}
                  placeholder="Nhập số điểm"
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Lý do (tùy chọn)</label>
                <Input
                  placeholder="Nhập lý do đổi điểm..."
                  value={redeemReason}
                  onChange={(e) => setRedeemReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRedeemDialog(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  redeemMutation.isPending ||
                  !redeemPoints ||
                  parseInt(redeemPoints, 10) <= 0 ||
                  parseInt(redeemPoints, 10) > customer.totalPoints
                }
              >
                {redeemMutation.isPending ? 'Đang xử lý...' : 'Xác nhận đổi điểm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}
