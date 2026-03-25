import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  staffService,
  type CreateStaffData,
  type UpdateStaffData,
  type GetShiftsParams,
  type GetAuditLogsParams,
} from '@/services/staffService'

// ────────────────────────────────────────────────────────────────────────────
// Staff Hooks
// ────────────────────────────────────────────────────────────────────────────

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => staffService.getStaff(),
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStaffData) => staffService.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateStaffData }) =>
      staffService.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      staffService.resetPassword(id, newPassword),
  })
}

export function useToggleStaffActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => staffService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Shift Hooks
// ────────────────────────────────────────────────────────────────────────────

export function useCurrentShift() {
  return useQuery({
    queryKey: ['currentShift'],
    queryFn: () => staffService.getCurrentShift(),
    refetchInterval: 30_000, // Refetch mỗi 30 giây
  })
}

export function useShifts(params: GetShiftsParams = {}) {
  return useQuery({
    queryKey: ['shifts', params],
    queryFn: () => staffService.getShifts(params),
  })
}

export function useOpenShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { openingCash: number; notes?: string }) => staffService.openShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentShift'] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      shiftId,
      data,
    }: {
      shiftId: number
      data: { closingCash: number; handoverNote?: string }
    }) => staffService.closeShift(shiftId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentShift'] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Audit Log Hooks
// ────────────────────────────────────────────────────────────────────────────

export function useAuditLogs(params: GetAuditLogsParams = {}) {
  return useQuery({
    queryKey: ['auditLogs', params],
    queryFn: () => staffService.getAuditLogs(params),
  })
}
