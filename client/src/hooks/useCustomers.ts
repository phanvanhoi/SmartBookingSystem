import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { customerService, GetCustomersParams } from '@/services/customerService'
import type { CreateCustomerForm } from '@/types/customer'

export function useCustomers(filters: GetCustomersParams = {}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customerService.getCustomers(filters),
  })
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getCustomerById(id!),
    enabled: id !== null && id > 0,
  })
}

export function useCustomerHistory(id: number | null, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['customer-history', id, page, limit],
    queryFn: () => customerService.getCustomerHistory(id!, page, limit),
    enabled: id !== null && id > 0,
  })
}

export function useCustomerPoints(id: number | null, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['customer-points', id, page, limit],
    queryFn: () => customerService.getCustomerPoints(id!, page, limit),
    enabled: id !== null && id > 0,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomerForm) => customerService.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCustomerForm> }) =>
      customerService.updateCustomer(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
    },
  })
}

export function useToggleBlacklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      isBlacklisted,
      reason,
    }: {
      id: number
      isBlacklisted: boolean
      reason?: string
    }) => customerService.toggleBlacklist(id, { isBlacklisted, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
    },
  })
}

export function useRedeemPoints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, points, reason }: { id: number; points: number; reason?: string }) =>
      customerService.redeemPoints(id, points, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['customer-points', variables.id] })
    },
  })
}

export function useLookupPhone(phone: string) {
  const [debouncedPhone, setDebouncedPhone] = useState(phone)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPhone(phone), 400)
    return () => clearTimeout(timer)
  }, [phone])

  return useQuery({
    queryKey: ['customer-lookup', debouncedPhone],
    queryFn: () => customerService.lookupByPhone(debouncedPhone),
    enabled: debouncedPhone.length >= 10,
    retry: false,
  })
}

export function useBirthdayCustomers() {
  return useQuery({
    queryKey: ['birthdays'],
    queryFn: () => customerService.getBirthdayCustomers(),
  })
}
