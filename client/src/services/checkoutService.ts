import api from './api'

// ─── Request types ─────────────────────────────────────────────────────────────

export interface PaymentItem {
  method: 'CASH' | 'QR_TRANSFER' | 'DEBT'
  amount: number
  cashReceived?: number
}

export interface CheckoutData {
  sessionId: number
  discountAmount?: number
  discountReason?: string
  voucherCode?: string
  depositApplied?: number
  payments: PaymentItem[]
  notes?: string
}

// ─── Response types ────────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: number
  method: 'CASH' | 'QR_TRANSFER' | 'DEBT'
  amount: number
  qrCodeUsed: string | null
  cashReceived: number | null
  cashChange: number | null
  createdAt: string
}

export interface OrderItemRecord {
  id: number
  menuItem: { id: number; name: string }
  quantity: number
  unitPrice: number
  subtotal: number
  notes: string | null
}

export interface OrderRecord {
  id: number
  status: string
  totalAmount: number
  notes: string | null
  createdAt: string
  items: OrderItemRecord[]
}

export interface InvoiceSession {
  id: number
  customerName: string
  customerPhone: string | null
  checkInTime: string
  checkOutTime: string | null
  room: { id: number; name: string }
  orders?: OrderRecord[]
}

export interface Invoice {
  id: number
  invoiceNumber: string
  roomCharge: number
  orderTotal: number
  subtotal: number
  discountAmount: number
  discountReason: string | null
  voucherCode: string | null
  surchargeAmount: number
  depositApplied: number
  grandTotal: number
  debtAmount: number
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'VOID'
  createdAt: string
  session: InvoiceSession
  payments: PaymentRecord[]
  createdBy: { id: number; fullName: string }
}

export interface QRCodeInfo {
  activeQR: 'QR1' | 'QR2'
  label: string
  imageUrl: string
  switchTime: string
  currentTime: string
  qr1: { key: string; imageUrl: string }
  qr2: { key: string; imageUrl: string }
}

export interface InvoiceListParams {
  page?: number
  limit?: number
  /** Bộ lọc nhanh theo cửa sổ business-day (mốc 5h sáng). */
  period?: 'day' | 'yesterday' | 'week' | 'month'
  dateFrom?: string
  dateTo?: string
  status?: 'PENDING' | 'PAID' | 'PARTIAL' | 'VOID'
  search?: string
}

export interface InvoiceSummary {
  totalRevenue: number
  totalDebt: number
  invoiceCount: number
}

export interface PaginatedInvoices {
  data: Invoice[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: InvoiceSummary
}

// ─── Service functions ─────────────────────────────────────────────────────────

export const checkoutService = {
  /**
   * Xử lý thanh toán cho một session
   */
  async processCheckout(data: CheckoutData): Promise<Invoice> {
    const response = await api.post<{ success: boolean; data: Invoice }>('/checkout', data)
    return response.data.data!
  },

  /**
   * Lấy thông tin mã QR hiện tại
   */
  async getQRCode(): Promise<QRCodeInfo> {
    const response = await api.get<{ success: boolean; data: QRCodeInfo }>('/checkout/qr')
    return response.data.data!
  },

  /**
   * Danh sách hóa đơn với bộ lọc
   */
  async getInvoices(params?: InvoiceListParams): Promise<PaginatedInvoices> {
    const response = await api.get<{
      success: boolean
      data: Invoice[]
      pagination: PaginatedInvoices['pagination']
      summary?: InvoiceSummary
    }>('/checkout/invoices', { params })
    return {
      data: response.data.data ?? [],
      pagination: response.data.pagination!,
      summary: response.data.summary ?? {
        totalRevenue: 0,
        totalDebt: 0,
        invoiceCount: 0,
      },
    }
  },

  /**
   * Chi tiết hóa đơn theo ID
   */
  async getInvoiceById(id: number): Promise<Invoice> {
    const response = await api.get<{ success: boolean; data: Invoice }>(`/checkout/invoices/${id}`)
    return response.data.data!
  },

  // ── Admin invoice editing (OWNER) ────────────────────────────────────────

  async voidInvoice(id: number, reason: string): Promise<void> {
    await api.post(`/checkout/invoices/${id}/void`, { reason })
  },

  async settleDebt(
    id: number,
    payload: { amount: number; method: 'CASH' | 'QR_TRANSFER'; cashReceived?: number },
  ): Promise<void> {
    await api.post(`/checkout/invoices/${id}/settle-debt`, payload)
  },

  async adjustDiscount(
    id: number,
    payload: {
      discountAmount?: number
      discountReason?: string
      surchargeAmount?: number
      surchargeReason?: string
    },
  ): Promise<void> {
    await api.patch(`/checkout/invoices/${id}/discount`, payload)
  },

  async changePaymentMethod(
    id: number,
    paymentId: number,
    method: 'CASH' | 'QR_TRANSFER',
  ): Promise<void> {
    await api.patch(`/checkout/invoices/${id}/payments/${paymentId}`, { method })
  },

  async editTimes(
    id: number,
    payload: { checkInTime?: string; checkOutTime?: string },
  ): Promise<void> {
    await api.patch(`/checkout/invoices/${id}/times`, payload)
  },

  async addItem(
    id: number,
    payload: { menuItemId: number; quantity: number; notes?: string },
  ): Promise<void> {
    await api.post(`/checkout/invoices/${id}/items`, payload)
  },

  async removeItem(id: number, orderItemId: number): Promise<void> {
    await api.delete(`/checkout/invoices/${id}/items/${orderItemId}`)
  },
}
