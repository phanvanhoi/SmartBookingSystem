import { z } from 'zod'

// ── Product ──────────────────────────────────────────────
export const productSchema = z.object({
  name: z.string({ required_error: 'Tên sản phẩm là bắt buộc' }).min(1, 'Tên sản phẩm không được trống'),
  sku: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default('cái'),
  packSize: z.number().int().positive().default(1),
  costPrice: z.number({ required_error: 'Giá nhập là bắt buộc' }).min(0, 'Giá nhập không được âm'),
  minStock: z.number().int().min(0).default(0),
  supplierId: z.number().int().positive().optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expiryDate phải có định dạng YYYY-MM-DD')
    .optional(),
})

export const updateProductSchema = productSchema.partial()

// ── Stock Entry ───────────────────────────────────────────
export const stockEntryItemSchema = z.object({
  productId: z.number({ required_error: 'productId là bắt buộc' }).int().positive(),
  quantity: z.number({ required_error: 'quantity là bắt buộc' }).int().positive('Số lượng phải lớn hơn 0'),
  unitCost: z.number().min(0).optional(),
  reason: z.string().optional(),
})

export const stockEntrySchema = z.object({
  type: z.enum(['IN', 'OUT_MANUAL'], {
    required_error: 'type là bắt buộc',
    invalid_type_error: "type chỉ được là 'IN' hoặc 'OUT_MANUAL'",
  }),
  items: z
    .array(stockEntryItemSchema)
    .min(1, 'Phải có ít nhất một sản phẩm'),
  supplierId: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

// ── Inventory Check ───────────────────────────────────────
export const inventoryCheckItemSchema = z.object({
  productId: z.number({ required_error: 'productId là bắt buộc' }).int().positive(),
  actualQuantity: z
    .number({ required_error: 'actualQuantity là bắt buộc' })
    .int()
    .min(0, 'Số lượng thực tế không được âm'),
})

export const inventoryCheckSchema = z.object({
  items: z
    .array(inventoryCheckItemSchema)
    .min(1, 'Phải có ít nhất một sản phẩm để kiểm kê'),
  notes: z.string().optional(),
})

// ── Supplier ──────────────────────────────────────────────
export const supplierSchema = z.object({
  name: z.string({ required_error: 'Tên nhà cung cấp là bắt buộc' }).min(1, 'Tên nhà cung cấp không được trống'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const updateSupplierSchema = supplierSchema.partial()

// ── Query Schemas ─────────────────────────────────────────
export const productQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20)),
  category: z.string().optional(),
  lowStock: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  search: z.string().optional(),
})

export const stockEntryQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20)),
  productId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  type: z.enum(['IN', 'OUT_SALE', 'OUT_MANUAL', 'ADJUSTMENT']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// ── Inferred Types ────────────────────────────────────────
export type ProductInput = z.infer<typeof productSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type StockEntryInput = z.infer<typeof stockEntrySchema>
export type InventoryCheckInput = z.infer<typeof inventoryCheckSchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type ProductQueryInput = z.infer<typeof productQuerySchema>
export type StockEntryQueryInput = z.infer<typeof stockEntryQuerySchema>
