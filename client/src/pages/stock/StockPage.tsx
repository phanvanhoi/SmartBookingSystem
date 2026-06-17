import { useEffect, useState } from 'react'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useProducts,
  useStockEntries,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useSuppliers,
  useLowStockAlerts,
} from '@/hooks/useStock'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateTime } from '@/utils/formatTime'
import type { Product, StockEntryType } from '@/types/stock'
import StockEntryForm from './StockEntryForm'
import InventoryCheckPage from './InventoryCheckPage'
import SupplierPage from './SupplierPage'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/utils/cn'

// ─── Product Form Dialog ──────────────────────────────────────────────────────

interface ProductFormData {
  name: string
  sku: string
  category: string
  unit: string
  packSize: string
  costPrice: string
  minStock: string
  supplierId: string
  isActive: boolean
}

// Radix Select không cho empty string làm value, dùng sentinel này cho
// option "không chọn nhà cung cấp"; convert về undefined trước khi gửi API.
const NO_SUPPLIER = 'none'

const emptyProductForm: ProductFormData = {
  name: '',
  sku: '',
  category: '',
  unit: 'lon',
  packSize: '24',
  costPrice: '0',
  minStock: '0',
  supplierId: NO_SUPPLIER,
  isActive: true,
}

function productToForm(product: Product): ProductFormData {
  return {
    name: product.name,
    sku: product.sku ?? '',
    category: product.category ?? '',
    unit: product.unit,
    packSize: String(product.packSize),
    costPrice: String(product.costPrice),
    minStock: String(product.minStock),
    supplierId: product.supplier ? String(product.supplier.id) : NO_SUPPLIER,
    isActive: product.isActive,
  }
}

interface ProductDialogProps {
  open: boolean
  onClose: () => void
  product?: Product | null
}

function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const isMobile = useIsMobile()
  const { data: suppliersData } = useSuppliers()
  const suppliers = suppliersData?.data ?? []

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const [form, setForm] = useState<ProductFormData>(emptyProductForm)

  // Dialog được mount thường trú; khi prop product đổi (click Edit sản
  // phẩm khác, hoặc chuyển giữa Add/Edit) phải reset form thủ công vì
  // useState initializer chỉ chạy lần đầu.
  useEffect(() => {
    if (open) {
      setForm(product ? productToForm(product) : emptyProductForm)
    }
  }, [open, product])

  const isSaving = createProduct.isPending || updateProduct.isPending

  const handleSave = async () => {
    const payload = {
      name: form.name,
      sku: form.sku || undefined,
      category: form.category || undefined,
      unit: form.unit,
      packSize: Number(form.packSize),
      costPrice: Number(form.costPrice),
      minStock: Number(form.minStock),
      supplierId:
        form.supplierId && form.supplierId !== NO_SUPPLIER
          ? Number(form.supplierId)
          : undefined,
      isActive: form.isActive,
    }

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, data: payload })
    } else {
      await createProduct.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn('max-w-lg', isMobile && 'dialog-mobile-full max-h-[100dvh]')}>
        <DialogHeader>
          <DialogTitle>{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm text-muted-foreground mb-1.5 block">Tên sản phẩm <span className="text-destructive">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Bia Tiger, Coca Cola..."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">SKU</label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="BEER-TGR-01"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Danh mục</label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Bia, Nước ngọt..."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Đơn vị</label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="lon, chai, hộp..."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Pack size</label>
              <Input
                type="number"
                min={1}
                value={form.packSize}
                onChange={(e) => setForm({ ...form, packSize: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Giá nhập (VNĐ)</label>
              <Input
                type="number"
                min={0}
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Tồn kho tối thiểu</label>
              <Input
                type="number"
                min={0}
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-muted-foreground mb-1.5 block">Nhà cung cấp</label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn NCC..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>— Không có —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || isSaving}>
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Entry Type Label ─────────────────────────────────────────────────────────

const ENTRY_TYPE_LABELS: Record<StockEntryType, { label: string; color: string }> = {
  IN: { label: 'Nhập kho', color: 'text-emerald-600' },
  OUT_SALE: { label: 'Xuất bán', color: 'text-amber-600' },
  OUT_MANUAL: { label: 'Xuất thủ công', color: 'text-rose-600' },
  ADJUSTMENT: { label: 'Điều chỉnh', color: 'text-sky-600' },
}

// ─── Main StockPage ───────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20

export default function StockPage() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('inventory')
  const [stockEntryOpen, setStockEntryOpen] = useState(false)

  // Inventory tab state
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)

  // Product edit/delete
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)

  const deleteProduct = useDeleteProduct()
  const { data: lowStockAlerts } = useLowStockAlerts()
  const lowStockTotal = lowStockAlerts?.data?.length ?? 0

  // History tab filters
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [entryPage, setEntryPage] = useState(1)

  // Products query
  const { data: productsData, isLoading: productsLoading } = useProducts({
    search: search || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    lowStock: lowStockOnly || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  })
  const products = productsData?.data ?? []
  const totalProducts = productsData?.pagination?.total ?? products.length
  const totalPages = productsData?.pagination?.totalPages ?? Math.ceil(totalProducts / ITEMS_PER_PAGE)

  // Stock entries query
  const { data: entriesData, isLoading: entriesLoading } = useStockEntries({
    type: entryTypeFilter !== 'all' ? (entryTypeFilter as StockEntryType) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: entryPage,
    limit: ITEMS_PER_PAGE,
  })
  const entries = entriesData?.data ?? []
  const totalEntries = entriesData?.pagination?.total ?? entries.length
  const totalEntryPages = entriesData?.pagination?.totalPages ?? Math.ceil(totalEntries / ITEMS_PER_PAGE)

  const openEditProduct = (product: Product) => {
    setEditProduct(product)
    setProductDialogOpen(true)
  }

  const handleDeleteProduct = async () => {
    if (!deleteConfirm) return
    await deleteProduct.mutateAsync(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  // Collect unique categories
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-foreground tracking-tight truncate">Kho hàng</h1>
            {!isMobile && (
              <p className="text-xs text-muted-foreground">Quản lý tồn kho & nhập xuất</p>
            )}
          </div>
        </div>
        <Button onClick={() => setStockEntryOpen(true)} className="shrink-0 min-h-[44px]" size={isMobile ? 'sm' : 'default'}>
          <Plus className="h-4 w-4" />
          {isMobile ? 'Nhập' : 'Nhập kho'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 md:px-6 pt-3 md:pt-4 shrink-0 overflow-x-auto">
            <TabsList className={cn(isMobile && 'inline-flex w-max min-w-full')}>
              <TabsTrigger value="inventory" className={cn(isMobile && 'text-xs px-3')}>Tồn kho</TabsTrigger>
              <TabsTrigger value="history" className={cn(isMobile && 'text-xs px-3')}>N/X kho</TabsTrigger>
              <TabsTrigger value="check" className={cn(isMobile && 'text-xs px-3')}>Kiểm kê</TabsTrigger>
              <TabsTrigger value="suppliers" className={cn(isMobile && 'text-xs px-3')}>NCC</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab: Tồn kho ─────────────────────────────────── */}
          <TabsContent value="inventory" className="flex-1 overflow-auto px-4 md:px-6 pb-6 mt-3 md:mt-4">
            {/* Low stock banner */}
            {lowStockTotal > 0 && !lowStockOnly && (
              <button
                type="button"
                onClick={() => { setLowStockOnly(true); setPage(1) }}
                className="w-full mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 min-h-[44px]"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>{lowStockTotal}</strong> sản phẩm sắp hết — chạm để lọc
                </span>
              </button>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 text-base md:text-sm min-h-[44px] md:min-h-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                <SelectTrigger className={cn('w-full sm:w-40', isMobile && 'min-h-[44px]')}>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1) }}
                  className="accent-primary"
                />
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Sắp hết
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProductDialogOpen(true)}
                className="shrink-0 min-h-[44px] md:min-h-9"
              >
                <Plus className="h-4 w-4" />
                Thêm SP
              </Button>
            </div>

            {/* List */}
            {productsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className={cn('w-full', isMobile ? 'h-24 rounded-xl' : 'h-14')} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Không có sản phẩm nào</p>
              </div>
            ) : isMobile ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEditProduct(product)}
                    onKeyDown={(e) => e.key === 'Enter' && openEditProduct(product)}
                    className={cn(
                      'rounded-xl border border-border bg-card p-4 shadow-card transition-colors',
                      product.isLowStock ? 'border-rose-200 bg-rose-50' : 'hover:border-primary/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {product.isLowStock && (
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                          <p className="font-semibold text-foreground truncate">{product.name}</p>
                        </div>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
                        )}
                        {product.category && (
                          <Badge variant="secondary" className="mt-1.5 text-[10px]">{product.category}</Badge>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-xl font-bold tabular-nums', product.isLowStock ? 'text-rose-600' : 'text-foreground')}>
                          {product.stockQuantity}
                        </p>
                        <p className="text-xs text-muted-foreground">{product.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Giá nhập: {formatCurrency(product.costPrice)}</span>
                      {product.supplier?.name && <span className="truncate ml-2">{product.supplier.name}</span>}
                    </div>
                    {product.isLowStock && (
                      <p className="text-xs text-rose-600 mt-2">Dưới mức tối thiểu: {product.minStock}</p>
                    )}
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="min-h-[44px] flex-1" onClick={() => openEditProduct(product)}>
                        <Pencil className="h-4 w-4 mr-1" /> Sửa
                      </Button>
                      <Button variant="ghost" size="sm" className="min-h-[44px] text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(product)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Sản phẩm</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Loại</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Tồn kho</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Đ.vị</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Giá nhập</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">NCC</th>
                      <th className="w-20 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className={`hover:bg-secondary/20 transition-colors cursor-pointer ${product.isLowStock ? 'bg-rose-50' : ''}`}
                        onClick={() => openEditProduct(product)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {product.isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            )}
                            <div>
                              <span className="text-foreground font-medium">{product.name}</span>
                              {product.sku && (
                                <span className="ml-2 text-xs text-muted-foreground">{product.sku}</span>
                              )}
                              {product.isLowStock && (
                                <p className="text-xs text-rose-600 mt-0.5">Dưới mức tối thiểu: {product.minStock}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {product.category ? (
                            <Badge variant="secondary">{product.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${product.isLowStock ? 'text-rose-600' : 'text-foreground'}`}>
                            {product.stockQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{product.unit}</td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {formatCurrency(product.costPrice)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">
                          {product.supplier?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label={`Sửa ${product.name}`}
                              onClick={() => openEditProduct(product)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              aria-label={`Xóa ${product.name}`}
                              onClick={() => setDeleteConfirm(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">Tổng: {totalProducts} sản phẩm</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = i + 1
                    return (
                      <Button
                        key={p}
                        variant={page === p ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Nhập/Xuất kho ──────────────────────────── */}
          <TabsContent value="history" className="flex-1 overflow-auto px-4 md:px-6 pb-6 mt-3 md:mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={entryTypeFilter} onValueChange={(v) => { setEntryTypeFilter(v); setEntryPage(1) }}>
                <SelectTrigger className={cn('w-full sm:w-40', isMobile && 'min-h-[44px]')}>
                  <SelectValue placeholder="Tất cả loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="IN">Nhập kho</SelectItem>
                  <SelectItem value="OUT_SALE">Xuất bán</SelectItem>
                  <SelectItem value="OUT_MANUAL">Xuất thủ công</SelectItem>
                  <SelectItem value="ADJUSTMENT">Điều chỉnh</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setEntryPage(1) }}
                  className={cn('flex-1 sm:w-36', isMobile && 'min-h-[44px] text-base')}
                />
                <span className="text-muted-foreground text-sm">→</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setEntryPage(1) }}
                  className={cn('flex-1 sm:w-36', isMobile && 'min-h-[44px] text-base')}
                />
              </div>
            </div>

            {/* List */}
            {entriesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className={cn('w-full', isMobile ? 'h-20 rounded-xl' : 'h-12')} />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Chưa có lịch sử nhập/xuất</p>
              </div>
            ) : isMobile ? (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const typeInfo = ENTRY_TYPE_LABELS[entry.type]
                  return (
                    <div key={entry.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-foreground">{entry.product.name}</p>
                        <span className={cn('flex items-center gap-1 text-xs font-medium shrink-0', typeInfo.color)}>
                          {entry.type === 'IN' ? (
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                          )}
                          {typeInfo.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className={cn('font-bold tabular-nums', entry.quantity > 0 ? 'text-emerald-700' : 'text-rose-700')}>
                          {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                        </span>
                        {entry.unitCost != null && (
                          <span className="text-muted-foreground">{formatCurrency(entry.unitCost)}/đv</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
                        <span>{formatDateTime(entry.createdAt)}</span>
                        <span>{entry.createdBy.fullName}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ngày</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Sản phẩm</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Loại</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Số lượng</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Đơn giá</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Người thực hiện</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.map((entry) => {
                      const typeInfo = ENTRY_TYPE_LABELS[entry.type]
                      return (
                        <tr key={entry.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-foreground">{entry.product.name}</td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1.5 font-medium ${typeInfo.color}`}>
                              {entry.type === 'IN' ? (
                                <ArrowDownCircle className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpCircle className="h-3.5 w-3.5" />
                              )}
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-foreground font-medium">
                            {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {entry.unitCost ? formatCurrency(entry.unitCost) : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {entry.createdBy.fullName}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalEntryPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">Tổng: {totalEntries} giao dịch</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={entryPage <= 1}
                    onClick={() => setEntryPage(entryPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalEntryPages, 5) }, (_, i) => {
                    const p = i + 1
                    return (
                      <Button
                        key={p}
                        variant={entryPage === p ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setEntryPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={entryPage >= totalEntryPages}
                    onClick={() => setEntryPage(entryPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Kiểm kê ────────────────────────────────── */}
          <TabsContent value="check" className="flex-1 overflow-auto px-4 md:px-6 pb-6 mt-3 md:mt-4">
            <InventoryCheckPage />
          </TabsContent>

          {/* ── Tab: Nhà cung cấp ───────────────────────────── */}
          <TabsContent value="suppliers" className="flex-1 overflow-auto px-4 md:px-6 pb-6 mt-3 md:mt-4">
            <SupplierPage />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <StockEntryForm open={stockEntryOpen} onClose={() => setStockEntryOpen(false)} />

      <ProductDialog
        open={productDialogOpen}
        onClose={() => { setProductDialogOpen(false); setEditProduct(null) }}
        product={editProduct}
      />

      {/* Delete product confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa sản phẩm</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-muted-foreground text-sm">
              Bạn có chắc muốn xóa <span className="text-foreground font-medium">{deleteConfirm?.name}</span>?
              Hành động này không thể hoàn tác.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
