export interface Product {
  id: number
  name: string
  sku?: string
  category?: string
  unit: string
  packSize: number
  costPrice: number
  stockQuantity: number
  minStock: number
  isLowStock: boolean
  supplier?: { id: number; name: string }
  lastEntry?: string
  isActive: boolean
}

export interface Supplier {
  id: number
  name: string
  phone?: string
  address?: string
  notes?: string
  productCount?: number
}

export interface StockEntry {
  id: number
  productId: number
  product: { name: string }
  type: StockEntryType
  quantity: number
  unitCost?: number
  totalCost?: number
  reason?: string
  supplier?: { name: string }
  createdBy: { fullName: string }
  createdAt: string
}

export type StockEntryType = 'IN' | 'OUT_SALE' | 'OUT_MANUAL' | 'ADJUSTMENT'

export interface InventoryCheckItem {
  productId: number
  productName: string
  systemQty: number
  actualQuantity: number
}

export interface InventoryResult {
  product: string
  system: number
  actual: number
  diff: number
  status: 'SHORTAGE' | 'SURPLUS' | 'MATCH'
}

export interface ProductFilters {
  page?: number
  limit?: number
  category?: string
  lowStock?: boolean
  search?: string
}

export interface StockEntryFilters {
  productId?: number
  type?: StockEntryType
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
