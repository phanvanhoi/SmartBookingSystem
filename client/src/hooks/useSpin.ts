import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicService } from '@/services/publicService'

export function useAdminSpinCampaign() {
  return useQuery({
    queryKey: ['settings', 'spin-campaign'],
    queryFn: () => publicService.getAdminCampaign(),
  })
}

export function useUpdateSpinPrize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<{
        label: string
        weight: number
        color: string
        isActive: boolean
        stockLimit: number | null
        prizeValue: string | null
      }>
    }) => publicService.updatePrize(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'spin-campaign'] })
    },
  })
}

export function useRecentSpins() {
  return useQuery({
    queryKey: ['settings', 'spin-recent'],
    queryFn: () => publicService.getRecentSpins(40),
  })
}
