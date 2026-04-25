import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  checkoutService,
  type CheckoutData,
  type InvoiceListParams,
} from '@/services/checkoutService'

// ─── useProcessCheckout ───────────────────────────────────────────────────────

/**
 * Mutation để xử lý thanh toán.
 * onSuccess: invalidate 'rooms' để cập nhật trạng thái phòng.
 */
export function useProcessCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CheckoutData) => checkoutService.processCheckout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

// ─── useQRCode ────────────────────────────────────────────────────────────────

/**
 * Query lấy thông tin QR code hiện tại.
 * Refetch mỗi 60 giây để cập nhật khi chuyển ca QR (0h / 12h).
 */
export function useQRCode() {
  return useQuery({
    queryKey: ['qr-code'],
    queryFn: checkoutService.getQRCode,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// ─── useInvoices ──────────────────────────────────────────────────────────────

/**
 * Query danh sách hóa đơn với bộ lọc.
 */
export function useInvoices(filters?: InvoiceListParams) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => checkoutService.getInvoices(filters),
    staleTime: 30_000,
  })
}

// ─── useInvoice ───────────────────────────────────────────────────────────────

/**
 * Query chi tiết một hóa đơn theo ID.
 */
export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => checkoutService.getInvoiceById(id!),
    enabled: id !== null && id > 0,
    staleTime: 60_000,
  })
}

// ─── Admin invoice edit mutations ────────────────────────────────────────────

function useInvoiceInvalidator() {
  const qc = useQueryClient()
  return (id: number) => {
    qc.invalidateQueries({ queryKey: ['invoice', id] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['rooms'] })
    qc.invalidateQueries({ queryKey: ['reports'] })
  }
}

export function useVoidInvoice() {
  const invalidate = useInvoiceInvalidator()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      checkoutService.voidInvoice(id, reason),
    onSuccess: (_d, v) => invalidate(v.id),
  })
}

export function useSettleDebt() {
  const invalidate = useInvoiceInvalidator()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: number; amount: number; method: 'CASH' | 'QR_TRANSFER'; cashReceived?: number }) =>
      checkoutService.settleDebt(id, payload),
    onSuccess: (_d, v) => invalidate(v.id),
  })
}

export function useAdjustDiscount() {
  const invalidate = useInvoiceInvalidator()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number
      discountAmount?: number
      discountReason?: string
      surchargeAmount?: number
      surchargeReason?: string
    }) => checkoutService.adjustDiscount(id, payload),
    onSuccess: (_d, v) => invalidate(v.id),
  })
}

export function useChangePaymentMethod() {
  const invalidate = useInvoiceInvalidator()
  return useMutation({
    mutationFn: ({
      id,
      paymentId,
      method,
    }: { id: number; paymentId: number; method: 'CASH' | 'QR_TRANSFER' }) =>
      checkoutService.changePaymentMethod(id, paymentId, method),
    onSuccess: (_d, v) => invalidate(v.id),
  })
}

export function useEditInvoiceTimes() {
  const invalidate = useInvoiceInvalidator()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: number; checkInTime?: string; checkOutTime?: string }) =>
      checkoutService.editTimes(id, payload),
    onSuccess: (_d, v) => invalidate(v.id),
  })
}

export function useAddInvoiceItem() {
  const invalidate = useInvoiceInvalidator()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: number; menuItemId: number; quantity: number; notes?: string }) =>
      checkoutService.addItem(id, payload),
    onSuccess: (_d, v) => invalidate(v.id),
  })
}

export function useRemoveInvoiceItem() {
  const invalidate = useInvoiceInvalidator()
  return useMutation({
    mutationFn: ({ id, orderItemId }: { id: number; orderItemId: number }) =>
      checkoutService.removeItem(id, orderItemId),
    onSuccess: (_d, v) => invalidate(v.id),
  })
}
