import { z } from 'zod'

// ── Update Settings ───────────────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string({ required_error: 'Key là bắt buộc' }).min(1, 'Key không được để trống'),
        value: z.any(),
      })
    )
    .min(1, 'Cần ít nhất 1 setting để cập nhật'),
})

// ── Pricing Rule ──────────────────────────────────────────────────────────────

export const pricingRuleSchema = z.object({
  roomTypeId: z
    .number({ required_error: 'Loại phòng là bắt buộc' })
    .int()
    .positive('roomTypeId phải là số nguyên dương'),
  name: z
    .string({ required_error: 'Tên khung giờ là bắt buộc' })
    .min(1, 'Tên không được để trống')
    .max(100, 'Tên không quá 100 ký tự'),
  timeStart: z
    .string({ required_error: 'Giờ bắt đầu là bắt buộc' })
    .regex(/^\d{2}:\d{2}$/, 'Giờ bắt đầu phải có định dạng HH:mm'),
  timeEnd: z
    .string({ required_error: 'Giờ kết thúc là bắt buộc' })
    .regex(/^\d{2}:\d{2}$/, 'Giờ kết thúc phải có định dạng HH:mm'),
  pricePerHour: z
    .number({ required_error: 'Giá/giờ là bắt buộc' })
    .min(0, 'Giá/giờ không được âm'),
  dayOfWeek: z
    .array(z.number().int().min(0).max(6))
    .optional(),
  isActive: z.boolean().optional(),
})

// ── Surcharge ─────────────────────────────────────────────────────────────────

export const surchargeSchema = z.object({
  name: z
    .string({ required_error: 'Tên phụ thu là bắt buộc' })
    .min(1, 'Tên không được để trống')
    .max(100, 'Tên không quá 100 ký tự'),
  type: z
    .string({ required_error: 'Loại phụ thu là bắt buộc' })
    .min(1, 'Loại không được để trống'),
  percentage: z
    .number({ required_error: 'Phần trăm phụ thu là bắt buộc' })
    .min(0, 'Phần trăm không được âm')
    .max(999.99, 'Phần trăm không hợp lệ'),
  startDate: z
    .string()
    .date('startDate không hợp lệ (YYYY-MM-DD)')
    .optional(),
  endDate: z
    .string()
    .date('endDate không hợp lệ (YYYY-MM-DD)')
    .optional(),
  dayOfWeek: z
    .array(z.number().int().min(0).max(6))
    .optional(),
  isActive: z.boolean().optional(),
})

// ── Voucher ───────────────────────────────────────────────────────────────────

export const voucherSchema = z.object({
  code: z
    .string({ required_error: 'Mã voucher là bắt buộc' })
    .min(1, 'Mã không được để trống')
    .max(50, 'Mã không quá 50 ký tự')
    .toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT'], {
    required_error: 'Loại giảm giá là bắt buộc',
    invalid_type_error: 'Loại giảm giá không hợp lệ (PERCENTAGE hoặc FIXED_AMOUNT)',
  }),
  discountValue: z
    .number({ required_error: 'Giá trị giảm là bắt buộc' })
    .positive('Giá trị giảm phải lớn hơn 0'),
  maxDiscount: z.number().positive('Giảm tối đa phải lớn hơn 0').optional(),
  maxUses: z.number().int().positive('Số lần dùng tối đa phải lớn hơn 0').optional(),
  validFrom: z
    .string({ required_error: 'Ngày bắt đầu là bắt buộc' })
    .date('validFrom không hợp lệ (YYYY-MM-DD)'),
  validUntil: z
    .string({ required_error: 'Ngày kết thúc là bắt buộc' })
    .date('validUntil không hợp lệ (YYYY-MM-DD)'),
  isActive: z.boolean().optional(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type PricingRuleInput = z.infer<typeof pricingRuleSchema>
export type SurchargeInput = z.infer<typeof surchargeSchema>
export type VoucherInput = z.infer<typeof voucherSchema>
