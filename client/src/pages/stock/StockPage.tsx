import { useState } from 'react'
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
} from '@/hooks/useStock'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateTime } from '@/utils/formatTime'
import type { Product, StockEntryType } from '@/types/stock'
import StockEntryForm from './StockEntryForm'
import InventoryCheckPage from './InventoryCheckPage'
import SupplierPage from './SupplierPage'

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

const emptyProductForm: ProductFormData = {
  name: '',
  sku: '',
  category: '',
  unit: 'lon',
  packSize: '24',
  costPrice: '0',
  minStock: '0',
  supplierId: '',
  isActive: true,
}

interface ProductDialogProps {
  open: boolean
  onClose: () => void
  product?: Product | null
}

function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const { data: suppliersData } = useSuppliers()
  const suppliers = suppliersData?.data ?? []

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const [form, setForm] = useState<ProductFormData>(() =>
    product
      ? {
          name: product.name,
          sku: product.sku ?? '',
          category: product.category ?? '',
          unit: product.unit,
          packSize: String(product.packSize),
          costPrice: String(product.costPrice),
          minStock: String(product.minStock),
          supplierId: product.supplier ? String(product.supplier.id) : '',
          isActive: product.isActive,
        }
      : emptyProductForm
  )

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
      supplierId: form.supplierId ? Number(form.supplierId) : undefined,
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
      <DialogContent className="max-w-lg">
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
                  <SelectItem value="">— Không có —</SelectItem>
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Kho hàng</h1>
            <p className="text-xs text-muted-foreground">Quản lý tồn kho & nhập xuất</p>
          </div>
        </div>
        <Button onClick={() => setStockEntryOpen(true)}>
          <Plus className="h-4 w-4" />
          Nhập kho
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 pt-4 shrink-0">
            <TabsList>
              <TabsTrigger value="inventory">Tồn kho</TabsTrigger>
              <TabsTrigger value="history">Nhập/Xuất kho</TabsTrigger>
              <TabsTrigger value="check">Kiểm kê</TabsTrigger>
              <TabsTrigger value="suppliers">Nhà cung cấp</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab: Tồn kho ─────────────────────────────────── */}
          <TabsContent value="inventory" className="flex-1 overflow-auto px-6 pb-6 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                <SelectTrigger className="w-40">
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
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
                Thêm SP
              </Button>
            </div>

            {/* Table */}
            {productsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Không có sản phẩm nào</p>
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
          <TabsContent value="history" className="flex-1 overflow-auto px-6 pb-6 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={entryTypeFilter} onValueChange={(v) => { setEntryTypeFilter(v); setEntryPage(1) }}>
                <SelectTrigger className="w-40">
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
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setEntryPage(1) }}
                  className="w-36"
                />
                <span className="text-muted-foreground text-sm">→</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setEntryPage(1) }}
                  className="w-36"
                />
              </div>
            </div>

            {/* Table */}
            {entriesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Chưa có lịch sử nhập/xuất</p>
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
          <TabsContent value="check" className="flex-1 overflow-auto px-6 pb-6 mt-4">
            <InventoryCheckPage />
          </TabsContent>

          {/* ── Tab: Nhà cung cấp ───────────────────────────── */}
          <TabsContent value="suppliers" className="flex-1 overflow-auto px-6 pb-6 mt-4">
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
