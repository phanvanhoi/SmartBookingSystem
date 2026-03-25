import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export const menuItemSchema = z.object({
  categoryId: z.number().int().positive('categoryId phải là số nguyên dương'),
  name: z.string().min(1, 'Tên món không được để trống'),
  price: z.number().min(0, 'Giá phải >= 0'),
  productId: z.number().int().positive().optional(),
  sortOrder: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type MenuItemInput = z.infer<typeof menuItemSchema>
