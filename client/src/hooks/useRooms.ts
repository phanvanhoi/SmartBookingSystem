import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomService } from '@/services/roomService'
import type { CheckinForm } from '@/types/room'

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: roomService.getRooms,
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}

export function useRoom(id: number | null) {
  return useQuery({
    queryKey: ['room', id],
    queryFn: () => roomService.getRoomById(id!),
    enabled: id !== null,
  })
}

export function useCheckin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CheckinForm) => roomService.checkin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}

export function useCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => roomService.checkout(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}

export function useExtendSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      additionalMinutes,
    }: {
      sessionId: number
      additionalMinutes: number
    }) => roomService.extendSession(sessionId, additionalMinutes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room'] })
    },
  })
}

export function useMergeSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      primarySessionId,
      secondarySessionId,
    }: {
      primarySessionId: number
      secondarySessionId: number
    }) => roomService.mergeSessions(primarySessionId, secondarySessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room'] })
    },
  })
}

export function useTransferSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      targetRoomId,
    }: {
      sessionId: number
      targetRoomId: number
    }) => roomService.transferSession(sessionId, targetRoomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}
