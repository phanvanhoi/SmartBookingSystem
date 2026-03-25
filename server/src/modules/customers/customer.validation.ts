import { z } from 'zod'

// ── Vietnam phone number regex ──
// Accepts: 0[3|5|7|8|9]xxxxxxxx (10 digits) or +84 prefix
const vietnamPhoneRegex = /^(0[35789]\d{8}|(\\+84)[35789]\d{8})$/

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Tên khách hàng không được để trống').max(100, 'Tên không quá 100 ký tự'),
  phone: z
    .string()
    .min(1, 'Số điện thoại không được để trống')
    .regex(vietnamPhoneRegex, 'Số điện thoại không hợp lệ (định dạng Việt Nam)'),
  birthday: z
    .string()
    .date('Ngày sinh không hợp lệ (YYYY-MM-DD)')
    .optional(),
  notes: z.string().max(500, 'Ghi chú không quá 500 ký tự').optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Tên khách hàng không được để trống').max(100, 'Tên không quá 100 ký tự').optional(),
  phone: z
    .string()
    .min(1, 'Số điện thoại không được để trống')
    .regex(vietnamPhoneRegex, 'Số điện thoại không hợp lệ (định dạng Việt Nam)')
    .optional(),
  birthday: z
    .string()
    .date('Ngày sinh không hợp lệ (YYYY-MM-DD)')
    .optional(),
  notes: z.string().max(500, 'Ghi chú không quá 500 ký tự').optional(),
})

export const blacklistSchema = z
  .object({
    isBlacklisted: z.boolean({ required_error: 'isBlacklisted là bắt buộc' }),
    blacklistReason: z.string().max(300, 'Lý do không quá 300 ký tự').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isBlacklisted && !data.blacklistReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blacklistReason'],
        message: 'Lý do blacklist là bắt buộc khi đánh dấu blacklist',
      })
    }
  })

export const redeemPointsSchema = z.object({
  points: z
    .number({ required_error: 'Số điểm là bắt buộc' })
    .int('Số điểm phải là số nguyên')
    .positive('Số điểm phải lớn hơn 0'),
  reason: z.string().max(300, 'Lý do không quá 300 ký tự').optional(),
})

export const lookupQuerySchema = z.object({
  phone: z
    .string()
    .min(1, 'Số điện thoại không được để trống')
    .regex(vietnamPhoneRegex, 'Số điện thoại không hợp lệ'),
})

export const getCustomersQuerySchema = z.object({
  search: z.string().optional(),
  tier: z.enum(['REGULAR', 'SILVER', 'GOLD', 'VIP']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type BlacklistInput = z.infer<typeof blacklistSchema>
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>
export type LookupQuery = z.infer<typeof lookupQuerySchema>
export type GetCustomersQuery = z.infer<typeof getCustomersQuerySchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
