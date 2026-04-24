import { z } from 'zod'

export const checkinSchema = z.object({
  roomId: z.number({ required_error: 'roomId là bắt buộc' }).int().positive(),
  customerName: z.string({ required_error: 'Tên khách là bắt buộc' }).min(1, 'Tên khách không được trống'),
  customerPhone: z.string().optional(),
  guestCount: z.number().int().positive().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export const extendSchema = z.object({
  additionalMinutes: z
    .number({ required_error: 'additionalMinutes là bắt buộc' })
    .int()
    .min(15, 'Tối thiểu gia hạn 15 phút'),
})

export const transferSchema = z.object({
  targetRoomId: z.number({ required_error: 'targetRoomId là bắt buộc' }).int().positive(),
})

export const mergeSchema = z.object({
  primarySessionId: z.number({ required_error: 'primarySessionId là bắt buộc' }).int().positive(),
  secondarySessionId: z.number({ required_error: 'secondarySessionId là bắt buộc' }).int().positive(),
})

export const bookingSchema = z.object({
  roomId: z.number({ required_error: 'roomId là bắt buộc' }).int().positive(),
  customerName: z.string({ required_error: 'Tên khách là bắt buộc' }).min(1, 'Tên khách không được trống'),
  customerPhone: z.string().optional(),
  bookingDate: z
    .string({ required_error: 'bookingDate là bắt buộc' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'bookingDate phải có định dạng YYYY-MM-DD'),
  bookingTime: z
    .string({ required_error: 'bookingTime là bắt buộc' })
    .regex(/^\d{2}:\d{2}$/, 'bookingTime phải có định dạng HH:mm'),
  durationHours: z.number().positive().optional(),
  depositAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
})

export const waitingQueueSchema = z.object({
  customerName: z.string({ required_error: 'Tên khách là bắt buộc' }).min(1, 'Tên khách không được trống'),
  customerPhone: z.string().optional(),
  preferredType: z.number().int().positive().optional(),
  guestCount: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export const maintenanceSchema = z.object({
  maintenance: z.boolean({ required_error: 'maintenance là bắt buộc' }),
  reason: z.string().optional(),
})

export const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  roomTypeId: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
})

// Cap `limit` at 100 so a malicious or buggy client can't request a million rows
// and OOM the server. 100 is plenty for any UI list — deeper reads should paginate.
const pageField = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : 1))
  .pipe(z.number().int().min(1))
const limitField = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : 20))
  .pipe(z.number().int().min(1).max(100))

export const sessionQuerySchema = z.object({
  page: pageField,
  limit: limitField,
  roomId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  status: z.enum(['ACTIVE', 'COMPLETED', 'TRANSFERRED', 'MERGED']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
})

export const bookingQuerySchema = z.object({
  date: z.string().optional(),
  roomId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW']).optional(),
  page: pageField,
  limit: limitField,
})

export const queueQuerySchema = z.object({
  status: z.enum(['WAITING', 'ASSIGNED', 'CANCELLED', 'EXPIRED']).optional(),
})

export type CheckinInput = z.infer<typeof checkinSchema>
export type ExtendInput = z.infer<typeof extendSchema>
export type TransferInput = z.infer<typeof transferSchema>
export type MergeInput = z.infer<typeof mergeSchema>
export type BookingInput = z.infer<typeof bookingSchema>
export type WaitingQueueInput = z.infer<typeof waitingQueueSchema>
export type MaintenanceInput = z.infer<typeof maintenanceSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>
export type SessionQueryInput = z.infer<typeof sessionQuerySchema>
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>
export type QueueQueryInput = z.infer<typeof queueQuerySchema>
