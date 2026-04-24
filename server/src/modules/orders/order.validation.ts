import { z } from 'zod'

// Hard caps prevent crafted requests with multi-MB notes from blowing up
// JSON parsing or DB writes. Generous enough for any realistic kitchen note.
const NOTE_MAX = 500
const REASON_MAX = 300
const ITEMS_MAX = 50

export const createOrderSchema = z.object({
  sessionId: z.number().int().positive('sessionId phải là số nguyên dương'),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive('menuItemId phải là số nguyên dương'),
        quantity: z.number().int().min(1, 'Số lượng phải ít nhất là 1').max(999),
        notes: z.string().max(NOTE_MAX, `Ghi chú tối đa ${NOTE_MAX} ký tự`).optional(),
      }),
    )
    .min(1, 'Phải có ít nhất 1 món')
    .max(ITEMS_MAX, `Tối đa ${ITEMS_MAX} món mỗi order`),
  notes: z.string().max(NOTE_MAX, `Ghi chú tối đa ${NOTE_MAX} ký tự`).optional(),
})

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'SERVED'], {
    errorMap: () => ({ message: 'Trạng thái không hợp lệ. Chấp nhận: PENDING, PREPARING, SERVED' }),
  }),
})

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .min(3, 'Lý do hủy phải có ít nhất 3 ký tự')
    .max(REASON_MAX, `Lý do tối đa ${REASON_MAX} ký tự`),
})

export const updateItemSchema = z.object({
  quantity: z.number().int().min(0, 'Số lượng phải >= 0 (0 = xóa món)').max(999),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
