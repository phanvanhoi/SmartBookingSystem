import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import type { RevenueFilters, DateRangeFilters } from '@/services/reportService'

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: reportService.getDashboard,
    refetchInterval: 30_000,
    staleTime: 25_000,
  })
}

// ── Revenue Report ────────────────────────────────────────────────────────────

export function useRevenueReport(filters?: RevenueFilters) {
  return useQuery({
    queryKey: ['revenue-report', filters],
    queryFn: () => reportService.getRevenueReport(filters),
    staleTime: 60_000,
  })
}

// ── Room Report ───────────────────────────────────────────────────────────────

export function useRoomReport(filters?: DateRangeFilters) {
  return useQuery({
    queryKey: ['room-report', filters],
    queryFn: () => reportService.getRoomReport(filters),
    staleTime: 60_000,
  })
}

// ── Stock Report ──────────────────────────────────────────────────────────────

export function useStockReport(filters?: DateRangeFilters) {
  return useQuery({
    queryKey: ['stock-report', filters],
    queryFn: () => reportService.getStockReport(filters),
    staleTime: 60_000,
  })
}

// ── Shift Report ──────────────────────────────────────────────────────────────

export function useShiftReport(filters?: DateRangeFilters) {
  return useQuery({
    queryKey: ['shift-report', filters],
    queryFn: () => reportService.getShiftReport(filters),
    staleTime: 60_000,
  })
}

// ── Peak Hours Report ─────────────────────────────────────────────────────────

export function usePeakHoursReport(filters?: DateRangeFilters) {
  return useQuery({
    queryKey: ['peak-hours-report', filters],
    queryFn: () => reportService.getPeakHoursReport(filters),
    staleTime: 60_000,
  })
}
