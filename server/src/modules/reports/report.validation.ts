import { z } from 'zod'

// ── Revenue Report Query ─────────────────────────────────────────────────────
export const revenueQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
})

export type RevenueQueryInput = z.infer<typeof revenueQuerySchema>

// ── Export Query ─────────────────────────────────────────────────────────────
export const exportQuerySchema = z.object({
  type: z.enum(['revenue', 'rooms', 'stock', 'shifts']),
  format: z.enum(['xlsx', 'pdf']),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export type ExportQueryInput = z.infer<typeof exportQuerySchema>

// ── Generic Date Range Query ─────────────────────────────────────────────────
export const dateRangeQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export type DateRangeQueryInput = z.infer<typeof dateRangeQuerySchema>
