import { z } from 'zod'

// ─── Checkout Schema ──────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  sessionId: z.number({ required_error: 'sessionId là bắt buộc' }).int().positive(),

  discountAmount: z.number().min(0).default(0).optional(),
  discountReason: z.string().trim().optional(),

  voucherCode: z.string().trim().toUpperCase().optional(),

  depositApplied: z.number().min(0).default(0).optional(),

  payments: z
    .array(
      z.object({
        method: z.enum(['CASH', 'QR_TRANSFER', 'DEBT']),
        amount: z.number().min(0),
        cashReceived: z.number().min(0).optional(),
      }),
    )
    .min(1, 'Phải có ít nhất 1 phương thức thanh toán'),

  notes: z.string().trim().optional(),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

// ─── Invoice Query Schema ─────────────────────────────────────────────────────

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'PARTIAL', 'VOID']).optional(),
  search: z.string().trim().optional(),
})

export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>

// ─── Voucher Query Schema ─────────────────────────────────────────────────────

export const voucherQuerySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
})

export type VoucherQueryInput = z.infer<typeof voucherQuerySchema>
