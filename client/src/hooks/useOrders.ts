import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orderService'
import type { OrderStatus } from '@/types/order'

export function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: orderService.getMenu,
    staleTime: 60_000,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useOrders(sessionId: number | null) {
  return useQuery({
    queryKey: ['orders', sessionId],
    queryFn: () => orderService.getOrdersBySession(sessionId!),
    enabled: sessionId !== null,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      orderService.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      quantity,
    }: {
      orderId: number
      itemId: number
      quantity: number
    }) => orderService.updateOrderItem(orderId, itemId, quantity),
    onSuccess: () => {
      // Order list, room session totals (currentTotal), kitchen view all
      // include item-level data — invalidate them all so the UI reflects
      // the new totalAmount and remaining items immediately.
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

export function useKitchenOrders() {
  return useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: orderService.getKitchenOrders,
    refetchInterval: 10_000,
  })
}
