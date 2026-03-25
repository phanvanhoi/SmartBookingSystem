import { z } from 'zod'

// ── Create Staff ──────────────────────────────────────────────────────────────

export const createStaffSchema = z.object({
  username: z
    .string({ required_error: 'Tên đăng nhập là bắt buộc' })
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(50, 'Tên đăng nhập không quá 50 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ, số và dấu _'),
  password: z
    .string({ required_error: 'Mật khẩu là bắt buộc' })
    .min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  fullName: z
    .string({ required_error: 'Họ tên là bắt buộc' })
    .min(1, 'Họ tên không được để trống')
    .max(100, 'Họ tên không quá 100 ký tự'),
  role: z.enum(['MANAGER', 'CASHIER', 'STAFF'], {
    required_error: 'Vai trò là bắt buộc',
    invalid_type_error: 'Vai trò không hợp lệ',
  }),
  phone: z.string().max(20, 'Số điện thoại không quá 20 ký tự').optional(),
})

// ── Update Staff ──────────────────────────────────────────────────────────────

export const updateStaffSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Họ tên không được để trống')
    .max(100, 'Họ tên không quá 100 ký tự')
    .optional(),
  role: z.enum(['MANAGER', 'CASHIER', 'STAFF']).optional(),
  phone: z.string().max(20, 'Số điện thoại không quá 20 ký tự').optional(),
})

// ── Reset Password ────────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  newPassword: z
    .string({ required_error: 'Mật khẩu mới là bắt buộc' })
    .min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})

// ── Audit Log Filters ─────────────────────────────────────────────────────────

export const getAuditLogsQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().date('dateFrom không hợp lệ (YYYY-MM-DD)').optional(),
  dateTo: z.string().date('dateTo không hợp lệ (YYYY-MM-DD)').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type GetAuditLogsQuery = z.infer<typeof getAuditLogsQuerySchema>
