import { z } from 'zod'

// ── Open Shift ────────────────────────────────────────────────────────────────

export const openShiftSchema = z.object({
  openingCash: z
    .number({ required_error: 'Tiền đầu ca là bắt buộc' })
    .min(0, 'Tiền đầu ca không được âm'),
  notes: z.string().max(500, 'Ghi chú không quá 500 ký tự').optional(),
})

// ── Close Shift ───────────────────────────────────────────────────────────────

export const closeShiftSchema = z.object({
  closingCash: z
    .number({ required_error: 'Tiền cuối ca là bắt buộc' })
    .min(0, 'Tiền cuối ca không được âm'),
  handoverNote: z.string().max(1000, 'Ghi chú bàn giao không quá 1000 ký tự').optional(),
})

// ── Get Shifts (filters) ──────────────────────────────────────────────────────

export const getShiftsQuerySchema = z.object({
  dateFrom: z.string().date('dateFrom không hợp lệ (YYYY-MM-DD)').optional(),
  dateTo: z.string().date('dateTo không hợp lệ (YYYY-MM-DD)').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type OpenShiftInput = z.infer<typeof openShiftSchema>
export type CloseShiftInput = z.infer<typeof closeShiftSchema>
export type GetShiftsQuery = z.infer<typeof getShiftsQuerySchema>
