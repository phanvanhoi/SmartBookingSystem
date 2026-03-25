import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  useRevenueReport,
  useRoomReport,
  useStockReport,
  useShiftReport,
} from '@/hooks/useReports'
import { reportService } from '@/services/reportService'
import type { RevenueFilters, DateRangeFilters } from '@/services/reportService'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDuration } from '@/utils/formatTime'
import { exportCSV } from '@/utils/exportCSV'
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import RevenueChart from './RevenueChart'
import RoomUsageChart from './RoomUsageChart'

// ── Period Selector ───────────────────────────────────────────────────────────

type Period = 'week' | 'today' | 'month' | 'year' | 'custom'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn' },
]

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  trend,
  loading,
}: {
  label: string
  icon: string
  value: string
  trend?: number | null
  loading?: boolean
}) {
  const isPositive = (trend ?? 0) > 0
  const isNegative = (trend ?? 0) < 0

  return (
    <Card className="bg-[#111118] border-[#2a2a3a]">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{icon}</span>
          <p className="text-sm text-[#8888a0]">{label}</p>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-28 bg-[#1a1a24]" />
        ) : (
          <div className="flex items-end gap-2">
            <p className="text-xl font-bold text-foreground">{value}</p>
            {trend != null && (
              <div
                className={`flex items-center gap-1 text-xs mb-0.5 ${
                  isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-[#8888a0]'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : isNegative ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {isPositive ? '+' : ''}{trend}%
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────

function RevenueTab({ filters }: { filters: RevenueFilters }) {
  const { data, isLoading } = useRevenueReport(filters)
  const summary = data?.summary

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon="💰"
          label="Tổng doanh thu"
          value={formatCurrency(summary?.totalRevenue ?? 0, true)}
          loading={isLoading}
        />
        <SummaryCard
          icon="🚪"
          label="Doanh thu phòng"
          value={formatCurrency(summary?.roomRevenue ?? 0, true)}
          loading={isLoading}
        />
        <SummaryCard
          icon="🍺"
          label="Doanh thu order"
          value={formatCurrency(summary?.orderRevenue ?? 0, true)}
          loading={isLoading}
        />
        <SummaryCard
          icon="📈"
          label="So kỳ trước"
          value={`${(summary?.comparison.changePercent ?? 0) > 0 ? '+' : ''}${summary?.comparison.changePercent ?? 0}%`}
          trend={summary?.comparison.changePercent ?? null}
          loading={isLoading}
        />
      </div>

      {/* Chart */}
      <Card className="bg-[#111118] border-[#2a2a3a]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Biểu đồ doanh thu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full bg-[#1a1a24]" />
          ) : (
            <RevenueChart data={data?.chart ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#111118] border-[#2a2a3a]">
          <CardContent className="p-4">
            <p className="text-sm text-[#8888a0] mb-1">Tổng lượt khách</p>
            {isLoading ? (
              <Skeleton className="h-6 w-16 bg-[#1a1a24]" />
            ) : (
              <p className="text-xl font-bold text-foreground">{summary?.totalSessions ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-[#111118] border-[#2a2a3a]">
          <CardContent className="p-4">
            <p className="text-sm text-[#8888a0] mb-1">TB doanh thu/lượt</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24 bg-[#1a1a24]" />
            ) : (
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(summary?.avgRevenuePerSession ?? 0, true)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Room Tab ──────────────────────────────────────────────────────────────────

function RoomTab({ filters }: { filters: DateRangeFilters }) {
  const { data, isLoading } = useRoomReport(filters)
  const rooms = data ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top phòng chart */}
        <Card className="bg-[#111118] border-[#2a2a3a]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Top 5 phòng (Tỉ lệ lấp đầy)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full bg-[#1a1a24]" />
            ) : (
              <RoomUsageChart data={rooms} />
            )}
          </CardContent>
        </Card>

        {/* Room Stats Table */}
        <Card className="bg-[#111118] border-[#2a2a3a]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Chi tiết phòng
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-[#1a1a24]" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-center text-[#555568] py-6 text-sm">Không có dữ liệu</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#555568] text-xs border-b border-[#2a2a3a]">
                      <th className="text-left pb-2 px-2">Phòng</th>
                      <th className="text-right pb-2 px-2">Lượt</th>
                      <th className="text-right pb-2 px-2">Lấp đầy</th>
                      <th className="text-right pb-2 px-2">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.slice(0, 8).map((room) => (
                      <tr
                        key={room.roomId}
                        className="border-b border-[#1a1a24] hover:bg-[#1a1a24]/50 transition-colors"
                      >
                        <td className="py-2 px-2">
                          <p className="font-medium text-foreground">{room.roomName}</p>
                          <p className="text-xs text-[#555568]">{room.roomType}</p>
                        </td>
                        <td className="text-right py-2 px-2 text-[#8888a0]">
                          {room.totalSessions}
                        </td>
                        <td className="text-right py-2 px-2">
                          <span
                            className={`${
                              room.occupancyRate >= 60
                                ? 'text-green-400'
                                : room.occupancyRate >= 30
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {room.occupancyRate}%
                          </span>
                        </td>
                        <td className="text-right py-2 px-2 text-foreground font-medium">
                          {formatCurrency(room.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Stock Tab ─────────────────────────────────────────────────────────────────

function StockTab({ filters }: { filters: DateRangeFilters }) {
  const { data, isLoading } = useStockReport(filters)
  const topSelling = data?.topSelling ?? []

  return (
    <div className="space-y-4">
      <Card className="bg-[#111118] border-[#2a2a3a]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Top sản phẩm bán chạy
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-[#1a1a24]" />
              ))}
            </div>
          ) : topSelling.length === 0 ? (
            <p className="text-center text-[#555568] py-8 text-sm">Không có dữ liệu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#555568] text-xs border-b border-[#2a2a3a]">
                    <th className="text-left pb-2 px-2">#</th>
                    <th className="text-left pb-2 px-2">Sản phẩm</th>
                    <th className="text-right pb-2 px-2">Đã bán</th>
                    <th className="text-right pb-2 px-2">Doanh thu</th>
                    <th className="text-right pb-2 px-2">Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {topSelling.map((item, idx) => (
                    <tr
                      key={item.productId}
                      className="border-b border-[#1a1a24] hover:bg-[#1a1a24]/50 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-[#555568]">{idx + 1}</td>
                      <td className="py-2.5 px-2 text-foreground font-medium">{item.name}</td>
                      <td className="text-right py-2.5 px-2 text-[#8888a0]">{item.totalSold}</td>
                      <td className="text-right py-2.5 px-2 text-foreground">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="text-right py-2.5 px-2">
                        <span className={item.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatCurrency(item.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Shift Tab ─────────────────────────────────────────────────────────────────

function ShiftTab({ filters }: { filters: DateRangeFilters }) {
  const { data, isLoading } = useShiftReport(filters)
  const shifts = data?.shifts ?? []
  const summary = data?.summary

  return (
    <div className="space-y-4">
      {/* Summary */}
      {!isLoading && summary && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#111118] border-[#2a2a3a]">
            <CardContent className="p-4">
              <p className="text-sm text-[#8888a0] mb-1">Tổng số ca</p>
              <p className="text-xl font-bold text-foreground">{summary.totalShifts}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111118] border-[#2a2a3a]">
            <CardContent className="p-4">
              <p className="text-sm text-[#8888a0] mb-1">TB doanh thu/ca</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(summary.avgRevenue, true)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shifts Table */}
      <Card className="bg-[#111118] border-[#2a2a3a]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Chi tiết ca làm</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-[#1a1a24]" />
              ))}
            </div>
          ) : shifts.length === 0 ? (
            <p className="text-center text-[#555568] py-8 text-sm">Không có dữ liệu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#555568] text-xs border-b border-[#2a2a3a]">
                    <th className="text-left pb-2 px-2">Nhân viên</th>
                    <th className="text-left pb-2 px-2">Ngày</th>
                    <th className="text-right pb-2 px-2">Thời lượng</th>
                    <th className="text-right pb-2 px-2">Tổng DT</th>
                    <th className="text-right pb-2 px-2">Tiền mặt</th>
                    <th className="text-right pb-2 px-2">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr
                      key={shift.shiftId}
                      className="border-b border-[#1a1a24] hover:bg-[#1a1a24]/50 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-foreground font-medium">{shift.staffName}</td>
                      <td className="py-2.5 px-2 text-[#8888a0]">{shift.date}</td>
                      <td className="text-right py-2.5 px-2 text-[#8888a0]">
                        {formatDuration(shift.duration)}
                      </td>
                      <td className="text-right py-2.5 px-2 text-foreground">
                        {formatCurrency(shift.totalRevenue)}
                      </td>
                      <td className="text-right py-2.5 px-2 text-[#8888a0]">
                        {formatCurrency(shift.cashRevenue)}
                      </td>
                      <td className="text-right py-2.5 px-2">
                        {shift.cashDifference != null ? (
                          <span
                            className={
                              shift.cashDifference < 0
                                ? 'text-red-400'
                                : shift.cashDifference > 0
                                  ? 'text-green-400'
                                  : 'text-[#8888a0]'
                            }
                          >
                            {shift.cashDifference > 0 ? '+' : ''}
                            {formatCurrency(shift.cashDifference)}
                          </span>
                        ) : (
                          <span className="text-[#555568]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Reports Page ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [activeTab, setActiveTab] = useState('revenue')

  const filters: DateRangeFilters = { period }
  const revenueFilters: RevenueFilters = { period, groupBy: 'day' }

  const revenueData = useRevenueReport(revenueFilters)
  const roomData = useRoomReport(filters)
  const stockData = useStockReport(filters)
  const shiftData = useShiftReport(filters)

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10)

    if (activeTab === 'revenue' && revenueData.data?.chart) {
      exportCSV(`doanh-thu-${today}`, ['Ngày', 'Tổng DT', 'Phòng', 'Order'], revenueData.data.chart.map((r: any) => [r.date, r.revenue, r.roomRevenue, r.orderRevenue]))
    } else if (activeTab === 'rooms' && roomData.data) {
      const rooms = Array.isArray(roomData.data) ? roomData.data : []
      exportCSV(`phong-${today}`, ['Phòng', 'Loại', 'Lượt', 'Giờ', 'Lấp đầy %', 'Doanh thu'], rooms.map((r: any) => [r.roomName, r.roomType, r.totalSessions, r.totalHours?.toFixed(1), r.occupancyRate?.toFixed(1), r.totalRevenue]))
    } else if (activeTab === 'stock' && stockData.data) {
      const items = stockData.data.topSelling ?? []
      exportCSV(`kho-${today}`, ['Sản phẩm', 'Số lượng bán', 'Doanh thu', 'Chi phí', 'Lợi nhuận'], items.map((r: any) => [r.name, r.totalSold, r.revenue, r.cost, r.profit]))
    } else if (activeTab === 'shifts' && shiftData.data) {
      const shifts = Array.isArray(shiftData.data) ? shiftData.data : shiftData.data.shifts ?? []
      exportCSV(`ca-lam-${today}`, ['Ngày', 'Nhân viên', 'Doanh thu', 'Tiền mặt', 'QR', 'Chênh lệch'], shifts.map((r: any) => [r.date, r.staffName, r.totalRevenue, r.cashRevenue, r.qrRevenue, r.cashDifference]))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Báo cáo</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tab Bar + Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <TabsList className="bg-secondary border border-border h-9 p-1 flex-shrink-0">
            <TabsTrigger
              value="revenue"
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Doanh thu
            </TabsTrigger>
            <TabsTrigger
              value="rooms"
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Phòng
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Kho
            </TabsTrigger>
            <TabsTrigger
              value="shifts"
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Ca làm
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="h-9 w-36 bg-[#111118] border-[#2a2a3a] text-foreground text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-[#2a2a3a]">
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-foreground focus:bg-[#2a2a3a]"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-9 border-[#2a2a3a] bg-[#111118] text-[#8888a0] hover:text-foreground hover:bg-[#1a1a24]"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Tab Contents */}
        <TabsContent value="revenue" className="mt-0">
          <RevenueTab filters={revenueFilters} />
        </TabsContent>

        <TabsContent value="rooms" className="mt-0">
          <RoomTab filters={filters} />
        </TabsContent>

        <TabsContent value="stock" className="mt-0">
          <StockTab filters={filters} />
        </TabsContent>

        <TabsContent value="shifts" className="mt-0">
          <ShiftTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
