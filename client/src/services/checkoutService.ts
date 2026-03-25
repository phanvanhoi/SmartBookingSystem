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
  dateFrom?: string
  dateTo?: string
  status?: 'PENDING' | 'PAID' | 'PARTIAL' | 'VOID'
  search?: string
}

export interface PaginatedInvoices {
  data: Invoice[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
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
    }>('/checkout/invoices', { params })
    return {
      data: response.data.data ?? [],
      pagination: response.data.pagination!,
    }
  },

  /**
   * Chi tiết hóa đơn theo ID
   */
  async getInvoiceById(id: number): Promise<Invoice> {
    const response = await api.get<{ success: boolean; data: Invoice }>(`/checkout/invoices/${id}`)
    return response.data.data!
  },
}
