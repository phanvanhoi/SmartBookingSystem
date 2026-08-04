import { z } from 'zod'

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/

export const publicBookingSchema = z.object({
  roomId: z.number({ required_error: 'Vui lòng chọn phòng' }).int().positive(),
  customerName: z
    .string({ required_error: 'Vui lòng nhập họ tên' })
    .trim()
    .min(2, 'Họ tên tối thiểu 2 ký tự')
    .max(80, 'Họ tên tối đa 80 ký tự'),
  customerPhone: z
    .string({ required_error: 'Vui lòng nhập số điện thoại' })
    .trim()
    .transform((v) => v.replace(/\s+/g, ''))
    .refine((v) => phoneRegex.test(v), 'Số điện thoại không hợp lệ'),
  bookingDate: z
    .string({ required_error: 'Vui lòng chọn ngày' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có định dạng YYYY-MM-DD'),
  bookingTime: z
    .string({ required_error: 'Vui lòng chọn giờ' })
    .regex(/^\d{2}:\d{2}$/, 'Giờ phải có định dạng HH:mm'),
  durationHours: z.number().positive().max(12).default(2),
  guestCount: z.number().int().positive().max(50).optional(),
  notes: z.string().trim().max(300).optional(),
})

export const publicSpinSchema = z.object({
  token: z
    .string({ required_error: 'Vui lòng nhập mã quay thưởng' })
    .trim()
    .toUpperCase()
    .min(4)
    .max(32),
})

export const publicTokenParamSchema = z.object({
  token: z.string().trim().toUpperCase().min(4).max(32),
})

export const updateSpinPrizeSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  weight: z.number().int().min(0).max(10_000).optional(),
  color: z.string().trim().min(4).max(20).optional(),
  isActive: z.boolean().optional(),
  stockLimit: z.number().int().positive().nullable().optional(),
  prizeValue: z.string().trim().max(80).nullable().optional(),
})

export type PublicBookingInput = z.infer<typeof publicBookingSchema>
export type PublicSpinInput = z.infer<typeof publicSpinSchema>
export type UpdateSpinPrizeInput = z.infer<typeof updateSpinPrizeSchema>
