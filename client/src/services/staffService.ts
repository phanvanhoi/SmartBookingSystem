import api from './api'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF'

export interface StaffItem {
  id: number
  username: string
  fullName: string
  role: StaffRole
  phone: string | null
  isActive: boolean
  createdAt: string
}

export interface ShiftSummary {
  totalSessions: number
  totalRevenue: number
  cashRevenue: number
  qrRevenue: number
  openingCash: number
  closingCash: number
  expectedCash: number
  cashDifference: number
}

export interface ShiftItem {
  id: number
  openedById: number
  openedByName: string
  closedById: number | null
  closedByName: string | null
  startTime: string
  endTime: string | null
  openingCash: number
  closingCash: number | null
  status: 'OPEN' | 'CLOSED'
  notes: string | null
  handoverNote: string | null
  duration?: string
  summary?: ShiftSummary
}

export interface AuditLogItem {
  id: number
  userId: number
  userFullName: string
  action: string
  entityType: string
  entityId: number
  details: unknown
  ipAddress: string | null
  createdAt: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SingleResponse<T> {
  success: boolean
  data: T
  message?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Staff Params
// ────────────────────────────────────────────────────────────────────────────

export interface CreateStaffData {
  username: string
  password: string
  fullName: string
  role: 'MANAGER' | 'CASHIER' | 'STAFF'
  phone?: string
}

export interface UpdateStaffData {
  fullName?: string
  role?: 'MANAGER' | 'CASHIER' | 'STAFF'
  phone?: string
}

export interface GetShiftsParams {
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface GetAuditLogsParams {
  userId?: number
  action?: string
  entityType?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// ────────────────────────────────────────────────────────────────────────────
// staffService
// ────────────────────────────────────────────────────────────────────────────

export const staffService = {
  // ── Staff CRUD ──────────────────────────────────────────────────────────

  getStaff: async (): Promise<SingleResponse<StaffItem[]>> => {
    const res = await api.get<SingleResponse<StaffItem[]>>('/staff')
    return res.data
  },

  createStaff: async (data: CreateStaffData): Promise<SingleResponse<StaffItem>> => {
    const res = await api.post<SingleResponse<StaffItem>>('/staff', data)
    return res.data
  },

  updateStaff: async (id: number, data: UpdateStaffData): Promise<SingleResponse<StaffItem>> => {
    const res = await api.put<SingleResponse<StaffItem>>(`/staff/${id}`, data)
    return res.data
  },

  resetPassword: async (id: number, newPassword: string): Promise<SingleResponse<null>> => {
    const res = await api.patch<SingleResponse<null>>(`/staff/${id}/reset-password`, { newPassword })
    return res.data
  },

  toggleActive: async (id: number): Promise<SingleResponse<StaffItem>> => {
    const res = await api.patch<SingleResponse<StaffItem>>(`/staff/${id}/toggle-active`)
    return res.data
  },

  // ── Shifts ───────────────────────────────────────────────────────────────

  getCurrentShift: async (): Promise<SingleResponse<ShiftItem | null>> => {
    const res = await api.get<SingleResponse<ShiftItem | null>>('/shifts/current')
    return res.data
  },

  getShifts: async (params: GetShiftsParams = {}): Promise<PaginatedResponse<ShiftItem>> => {
    const searchParams: Record<string, string> = {}
    if (params.dateFrom) searchParams.dateFrom = params.dateFrom
    if (params.dateTo) searchParams.dateTo = params.dateTo
    if (params.page) searchParams.page = String(params.page)
    if (params.limit) searchParams.limit = String(params.limit)

    const query = new URLSearchParams(searchParams).toString()
    const res = await api.get<PaginatedResponse<ShiftItem>>(`/shifts${query ? `?${query}` : ''}`)
    return res.data
  },

  openShift: async (data: {
    openingCash: number
    notes?: string
  }): Promise<SingleResponse<ShiftItem>> => {
    const res = await api.post<SingleResponse<ShiftItem>>('/shifts/open', data)
    return res.data
  },

  closeShift: async (
    shiftId: number,
    data: { closingCash: number; handoverNote?: string }
  ): Promise<SingleResponse<{ shiftId: number; duration: string; summary: ShiftSummary }>> => {
    const res = await api.post(`/shifts/${shiftId}/close`, data)
    return res.data
  },

  // ── Audit Logs ──────────────────────────────────────────────────────────

  getAuditLogs: async (params: GetAuditLogsParams = {}): Promise<PaginatedResponse<AuditLogItem>> => {
    const searchParams: Record<string, string> = {}
    if (params.userId) searchParams.userId = String(params.userId)
    if (params.action) searchParams.action = params.action
    if (params.entityType) searchParams.entityType = params.entityType
    if (params.dateFrom) searchParams.dateFrom = params.dateFrom
    if (params.dateTo) searchParams.dateTo = params.dateTo
    if (params.page) searchParams.page = String(params.page)
    if (params.limit) searchParams.limit = String(params.limit)

    const query = new URLSearchParams(searchParams).toString()
    const res = await api.get<PaginatedResponse<AuditLogItem>>(
      `/staff/audit-logs${query ? `?${query}` : ''}`
    )
    return res.data
  },
}
