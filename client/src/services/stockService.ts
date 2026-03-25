import api from './api'
import type {
  Product,
  Supplier,
  StockEntry,
  InventoryResult,
  ProductFilters,
  StockEntryFilters,
} from '@/types/stock'

// Products
export async function getProducts(params?: ProductFilters): Promise<{ data: Product[]; pagination?: any }> {
  const response = await api.get('/stock/products', { params })
  return response.data
}

export async function createProduct(data: Partial<Product>): Promise<{ data: Product }> {
  const response = await api.post('/stock/products', data)
  return response.data
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<{ data: Product }> {
  const response = await api.put(`/stock/products/${id}`, data)
  return response.data
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/stock/products/${id}`)
}

// Stock Entries
export interface StockEntryPayload {
  type?: 'IN' | 'OUT_MANUAL' | 'ADJUSTMENT'
  supplierId?: number
  items: Array<{
    productId: number
    quantity: number
    unitCost?: number
    reason?: string
  }>
  notes?: string
}

export async function createStockEntry(data: StockEntryPayload): Promise<{ data: any }> {
  const response = await api.post('/stock/entries', data)
  return response.data
}

export async function getStockEntries(params?: StockEntryFilters): Promise<{ data: StockEntry[]; pagination?: any }> {
  const response = await api.get('/stock/entries', { params })
  return response.data
}

// Inventory Check
export interface InventoryCheckPayload {
  items: Array<{ productId: number; actualQuantity: number }>
  notes?: string
}

export interface InventoryCheckResponse {
  checkId: number
  discrepancies: InventoryResult[]
  totalItems: number
  matchedItems: number
  discrepancyItems: number
}

export async function inventoryCheck(data: InventoryCheckPayload): Promise<{ data: InventoryCheckResponse }> {
  const response = await api.post('/stock/inventory-check', data)
  return response.data
}

// Alerts
export async function getLowStockAlerts(): Promise<{ data: Product[] }> {
  const response = await api.get('/stock/alerts')
  return response.data
}

// Suppliers
export async function getSuppliers(): Promise<{ data: Supplier[] }> {
  const response = await api.get('/stock/suppliers')
  return response.data
}

export async function createSupplier(data: Partial<Supplier>): Promise<{ data: Supplier }> {
  const response = await api.post('/stock/suppliers', data)
  return response.data
}

export async function updateSupplier(id: number, data: Partial<Supplier>): Promise<{ data: Supplier }> {
  const response = await api.put(`/stock/suppliers/${id}`, data)
  return response.data
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/stock/suppliers/${id}`)
}
