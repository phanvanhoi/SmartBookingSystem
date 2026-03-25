import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  settingService,
  type UpdateSettingEntry,
  type CreatePricingRuleData,
  type CreateSurchargeData,
  type CreateVoucherData,
} from '@/services/settingService'

// ────────────────────────────────────────────────────────────────────────────
// Settings Hooks
// ────────────────────────────────────────────────────────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings(),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: UpdateSettingEntry[]) => settingService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useUploadQR() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ qrType, file }: { qrType: 'QR1' | 'QR2'; file: File }) =>
      settingService.uploadQR(qrType, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Pricing Rules Hooks
// ────────────────────────────────────────────────────────────────────────────

export function usePricingRules() {
  return useQuery({
    queryKey: ['settings', 'pricing'],
    queryFn: () => settingService.getPricingRules(),
  })
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePricingRuleData) => settingService.createPricingRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'pricing'] })
    },
  })
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePricingRuleData> }) =>
      settingService.updatePricingRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'pricing'] })
    },
  })
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => settingService.deletePricingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'pricing'] })
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Surcharges Hooks
// ────────────────────────────────────────────────────────────────────────────

export function useSurcharges() {
  return useQuery({
    queryKey: ['settings', 'surcharges'],
    queryFn: () => settingService.getSurcharges(),
  })
}

export function useCreateSurcharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSurchargeData) => settingService.createSurcharge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'surcharges'] })
    },
  })
}

export function useUpdateSurcharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSurchargeData> }) =>
      settingService.updateSurcharge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'surcharges'] })
    },
  })
}

export function useDeleteSurcharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => settingService.deleteSurcharge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'surcharges'] })
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Vouchers Hooks
// ────────────────────────────────────────────────────────────────────────────

export function useVouchers() {
  return useQuery({
    queryKey: ['settings', 'vouchers'],
    queryFn: () => settingService.getVouchers(),
  })
}

export function useCreateVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVoucherData) => settingService.createVoucher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'vouchers'] })
    },
  })
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateVoucherData> }) =>
      settingService.updateVoucher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'vouchers'] })
    },
  })
}

export function useDeleteVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => settingService.deleteVoucher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'vouchers'] })
    },
  })
}
