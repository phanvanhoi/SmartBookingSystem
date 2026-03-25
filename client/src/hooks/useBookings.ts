import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as bookingService from '@/services/bookingService'
import toast from 'react-hot-toast'

export function useBookings(date?: string) {
  return useQuery({
    queryKey: ['bookings', date],
    queryFn: () => bookingService.getBookings({ date }),
    staleTime: 30_000,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: bookingService.createBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Đặt phòng thành công')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Lỗi đặt phòng')
    },
  })
}

export function useConfirmBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: bookingService.confirmBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Đã nhận khách từ booking')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Lỗi xác nhận booking')
    },
  })
}

export function useUpdateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { roomId?: number; bookingTime?: string; durationHours?: number } }) =>
      bookingService.updateBooking(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Cập nhật booking thành công')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Lỗi cập nhật booking')
    },
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      bookingService.cancelBooking(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Đã hủy booking')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Lỗi hủy booking')
    },
  })
}
