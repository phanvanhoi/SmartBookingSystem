import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockEntries,
  createStockEntry,
  inventoryCheck,
  getLowStockAlerts,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type StockEntryPayload,
  type InventoryCheckPayload,
} from '@/services/stockService'
import type { ProductFilters, StockEntryFilters, Product, Supplier } from '@/types/stock'

// Products
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// Stock Entries
export function useStockEntries(filters?: StockEntryFilters) {
  return useQuery({
    queryKey: ['stock-entries', filters],
    queryFn: () => getStockEntries(filters),
  })
}

export function useCreateStockEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StockEntryPayload) => createStockEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock'] })
    },
  })
}

// Inventory Check
export function useInventoryCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: InventoryCheckPayload) => inventoryCheck(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock'] })
    },
  })
}

// Low Stock Alerts
export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['low-stock'],
    queryFn: getLowStockAlerts,
    refetchInterval: 5 * 60 * 1000, // refetch every 5 minutes
  })
}

// Suppliers
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Supplier>) => createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Supplier> }) => updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}
