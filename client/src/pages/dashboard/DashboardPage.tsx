import { useDashboard } from '@/hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DoorOpen,
  Users,
  Clock,
  AlertTriangle,
  Package,
  Activity,
  LayoutDashboard,
} from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDuration, formatTime } from '@/utils/formatTime'
import { cn } from '@/utils/cn'
import RevenueChart from '@/pages/reports/RevenueChart'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  trend?: number | null
  trendLabel?: string
  loading?: boolean
}

function KpiCard({ icon, label, value, sub, trend, trendLabel, loading }: KpiCardProps) {
  const isPositive = (trend ?? 0) > 0
  const isNegative = (trend ?? 0) < 0
  const isNeutral = trend === 0 || trend == null

  return (
    <Card className="bg-card border border-border shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-accent text-accent-foreground">{icon}</div>
          {trend != null && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : isNegative
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : isNegative ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              <span className="tabular-nums">
                {isNeutral ? '0%' : `${isPositive ? '+' : ''}${trend}${trendLabel ?? '%'}`}
              </span>
            </div>
          )}
        </div>
        {loading ? (
          <>
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-foreground mb-0.5 tabular-nums tracking-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{sub ?? label}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Active Room Item ──────────────────────────────────────────────────────────

function ActiveRoomItem({
  roomName,
  customerName,
  elapsedMinutes,
  currentTotal,
  status,
}: {
  roomName: string
  customerName: string
  elapsedMinutes: number
  currentTotal: number
  status: string
}) {
  const isEndingSoon = status === 'ENDING_SOON'

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full flex-shrink-0',
              isEndingSoon ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            )}
          />
          <span className="text-sm font-semibold text-foreground">{roomName}</span>
          {isEndingSoon && (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0 font-semibold">
              Sắp hết giờ
            </Badge>
          )}
        </div>
        <span className="text-sm font-bold text-primary tabular-nums">
          {formatCurrency(currentTotal, true)}
        </span>
      </div>
      <div className="flex items-center justify-between pl-4">
        <span className="text-xs text-muted-foreground truncate">{customerName}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          Đã hát: {formatDuration(elapsedMinutes)}
        </span>
      </div>
    </div>
  )
}

// ── Activity Item ─────────────────────────────────────────────────────────────

function activityLabel(action: string, entityType: string): string {
  const map: Record<string, string> = {
    CHECKIN: 'Check-in',
    CHECKOUT: 'Checkout',
    ORDER_CREATE: 'Đặt order',
    ORDER_CANCEL: 'Hủy order',
    STOCK_IN: 'Nhập kho',
    STOCK_OUT: 'Xuất kho',
    SHIFT_OPEN: 'Mở ca',
    SHIFT_CLOSE: 'Đóng ca',
  }
  return map[action] ?? `${action} (${entityType})`
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  const today = data?.today
  const rooms = data?.rooms
  const warnings = data?.warnings ?? []
  const recentActivity = data?.recentActivity ?? []
  const revenueChart = data?.revenueChart ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tổng quan</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<span className="text-lg">💰</span>}
          label="Doanh thu hôm nay"
          value={isLoading ? '...' : formatCurrency(today?.revenue ?? 0, true)}
          sub="so với hôm qua"
          trend={isLoading ? null : (today?.revenueChangePercent ?? 0)}
          loading={isLoading}
        />
        <KpiCard
          icon={<DoorOpen className="w-5 h-5" />}
          label="Phòng đang hát"
          value={isLoading ? '...' : `${rooms?.active ?? 0}/${rooms?.total ?? 0}`}
          sub="phòng đang sử dụng"
          loading={isLoading}
        />
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="Lượt khách hôm nay"
          value={isLoading ? '...' : String(today?.guestCount ?? 0)}
          sub="lượt khách"
          trend={isLoading ? null : (today?.guestChangeCount ?? 0)}
          trendLabel=""
          loading={isLoading}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label="TB giờ/lượt"
          value={isLoading ? '...' : `${today?.avgDurationHours ?? 0}h`}
          sub="thời gian trung bình"
          loading={isLoading}
        />
      </div>

      {/* Charts + Active Rooms Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-3 bg-card border border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground tracking-tight">
              Doanh thu 7 ngày qua
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <RevenueChart data={revenueChart} />
            )}
          </CardContent>
        </Card>

        {/* Active Rooms Panel */}
        <Card className="lg:col-span-2 bg-card border border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2 tracking-tight">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
              Phòng đang hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-2">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : rooms?.list.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Không có phòng nào đang hoạt động
              </div>
            ) : (
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {rooms?.list.map((room) => (
                  <ActiveRoomItem
                    key={room.roomId}
                    roomName={room.roomName}
                    customerName={room.customerName}
                    elapsedMinutes={room.elapsedMinutes}
                    currentTotal={room.currentTotal}
                    status={room.status}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings + Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Warnings */}
        <Card className="bg-card border border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2 tracking-tight">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Cảnh báo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : warnings.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Không có cảnh báo nào
              </div>
            ) : (
              <div className="space-y-2">
                {warnings.map((warn, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      warn.type === 'ROOM_ENDING'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-sky-50 border-sky-200'
                    )}
                  >
                    {warn.type === 'ROOM_ENDING' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Package className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p
                      className={cn(
                        'text-sm',
                        warn.type === 'ROOM_ENDING' ? 'text-amber-800' : 'text-sky-800'
                      )}
                    >
                      {warn.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2 tracking-tight">
              <Activity className="w-4 h-4 text-primary" />
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Chưa có hoạt động nào
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {recentActivity.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">
                          {activityLabel(log.action, log.entityType)}
                        </p>
                        <p className="text-xs text-muted-foreground">{log.userName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2 tabular-nums">
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
