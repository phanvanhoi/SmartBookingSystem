import { z } from 'zod'

export const getNotificationsQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
})

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>
