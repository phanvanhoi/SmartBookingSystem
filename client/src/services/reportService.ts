import api from '@/services/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RevenueFilters {
  period?: 'today' | 'week' | 'month' | 'year' | 'custom'
  dateFrom?: string
  dateTo?: string
  groupBy?: 'day' | 'week' | 'month'
}

export interface DateRangeFilters {
  period?: 'today' | 'week' | 'month' | 'year' | 'custom'
  dateFrom?: string
  dateTo?: string
}

export interface RevenueChartPoint {
  date: string
  revenue: number
  roomRevenue: number
  orderRevenue: number
}

export interface RevenueReport {
  summary: {
    totalRevenue: number
    roomRevenue: number
    orderRevenue: number
    totalSessions: number
    avgRevenuePerSession: number
    comparison: {
      previousPeriod: number
      changePercent: number
    }
  }
  chart: RevenueChartPoint[]
}

export interface RoomReportItem {
  roomId: number
  roomName: string
  roomType: string
  totalSessions: number
  totalHours: number
  occupancyRate: number
  totalRevenue: number
  avgSessionDuration: number
}

export interface PeakHourItem {
  hour: number
  sessionCount: number
  avgDuration: number
  revenue: number
}

export interface StockReportItem {
  productId: number
  name: string
  totalSold: number
  revenue: number
  cost: number
  profit: number
}

export interface StockReport {
  topSelling: StockReportItem[]
  profitability: StockReportItem[]
  slowMoving: StockReportItem[]
}

export interface ShiftReportItem {
  shiftId: number
  staffName: string
  date: string
  startTime: string
  endTime: string | null
  duration: number
  totalRevenue: number
  cashRevenue: number
  qrRevenue: number
  openingCash: number
  closingCash: number | null
  cashDifference: number | null
}

export interface ShiftReport {
  shifts: ShiftReportItem[]
  summary: {
    totalShifts: number
    avgRevenue: number
  }
}

export interface ActiveRoomDetail {
  roomId: number
  roomName: string
  status: string
  customerName: string
  elapsedMinutes: number
  currentTotal: number
}

export interface Warning {
  type: 'ROOM_ENDING' | 'STOCK_LOW'
  message: string
  roomId?: number
  roomName?: string
  productId?: number
  productName?: string
  stockQuantity?: number
  minStock?: number
}

export interface RecentActivity {
  id: number
  action: string
  entityType: string
  entityId: number
  details: unknown
  userName: string
  createdAt: string
}

export interface DashboardData {
  today: {
    revenue: number
    roomRevenue: number
    orderRevenue: number
    revenueChangePercent: number
    guestCount: number
    guestChangeCount: number
    avgDurationHours: number
  }
  rooms: {
    active: number
    total: number
    list: ActiveRoomDetail[]
  }
  warnings: Warning[]
  recentActivity: RecentActivity[]
  revenueChart: RevenueChartPoint[]
}

// ── API Calls ─────────────────────────────────────────────────────────────────

export const reportService = {
  getDashboard(): Promise<DashboardData> {
    return api.get('/reports/dashboard').then((res) => res.data.data)
  },

  getRevenueReport(filters?: RevenueFilters): Promise<RevenueReport> {
    return api.get('/reports/revenue', { params: filters }).then((res) => res.data.data)
  },

  getRoomReport(filters?: DateRangeFilters): Promise<RoomReportItem[]> {
    return api.get('/reports/rooms', { params: filters }).then((res) => res.data.data)
  },

  getPeakHoursReport(filters?: DateRangeFilters): Promise<PeakHourItem[]> {
    return api.get('/reports/peak-hours', { params: filters }).then((res) => res.data.data)
  },

  getStockReport(filters?: DateRangeFilters): Promise<StockReport> {
    return api.get('/reports/stock', { params: filters }).then((res) => res.data.data)
  },

  getShiftReport(filters?: DateRangeFilters): Promise<ShiftReport> {
    return api.get('/reports/shifts', { params: filters }).then((res) => res.data.data)
  },

  exportReport(params: {
    type: 'revenue' | 'rooms' | 'stock' | 'shifts'
    format: 'xlsx' | 'pdf'
    dateFrom?: string
    dateTo?: string
  }): Promise<unknown> {
    return api.get('/reports/export', { params }).then((res) => res.data.data)
  },
}
