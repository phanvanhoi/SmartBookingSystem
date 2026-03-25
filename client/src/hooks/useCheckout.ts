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
