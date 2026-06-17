import { useState } from 'react'
import { ClipboardCheck, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProducts, useInventoryCheck } from '@/hooks/useStock'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/utils/cn'
import type { InventoryResult } from '@/types/stock'

export default function InventoryCheckPage() {
  const isMobile = useIsMobile()
  const { data: productsData, isLoading } = useProducts({ limit: 500 })
  const products = (productsData?.data ?? []).filter((p) => p.isActive)

  const [actualQuantities, setActualQuantities] = useState<Record<number, string>>({})
  const [notes, setNotes] = useState('')
  const [results, setResults] = useState<InventoryResult[] | null>(null)
  const [checkMeta, setCheckMeta] = useState<{ totalItems: number; matchedItems: number; discrepancyItems: number } | null>(null)

  const inventoryCheck = useInventoryCheck()

  const handleQtyChange = (productId: number, value: string) => {
    setActualQuantities((prev) => ({ ...prev, [productId]: value }))
  }

  const getActual = (productId: number): number | null => {
    const val = actualQuantities[productId]
    if (val === undefined || val === '') return null
    const n = Number(val)
    return isNaN(n) ? null : n
  }

  const getDiff = (productId: number, systemQty: number): number | null => {
    const actual = getActual(productId)
    if (actual === null) return null
    return actual - systemQty
  }

  const handleSubmit = async () => {
    const items = products
      .filter((p) => getActual(p.id) !== null)
      .map((p) => ({
        productId: p.id,
        actualQuantity: getActual(p.id)!,
      }))

    if (items.length === 0) return

    const res = await inventoryCheck.mutateAsync({ items, notes: notes || undefined })
    setResults(res.data.discrepancies)
    setCheckMeta({
      totalItems: res.data.totalItems,
      matchedItems: res.data.matchedItems,
      discrepancyItems: res.data.discrepancyItems,
    })
  }

  const filledCount = products.filter((p) => getActual(p.id) !== null).length

  if (results) {
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{checkMeta?.totalItems}</div>
            <div className="text-sm text-muted-foreground mt-1">Tổng sản phẩm kiểm</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{checkMeta?.matchedItems}</div>
            <div className="text-sm text-muted-foreground mt-1">Khớp hệ thống</div>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
            <div className="text-2xl font-bold text-rose-700">{checkMeta?.discrepancyItems}</div>
            <div className="text-sm text-muted-foreground mt-1">Có chênh lệch</div>
          </div>
        </div>

        {/* Discrepancies */}
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-700 mb-3" />
            <p className="text-foreground font-medium">Tất cả sản phẩm khớp hệ thống!</p>
            <p className="text-muted-foreground text-sm mt-1">Không có chênh lệch nào được ghi nhận.</p>
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-xl border border-border p-4',
                  r.status !== 'MATCH' ? 'border-rose-200 bg-rose-50' : 'bg-card',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground">{r.product}</p>
                  {r.status === 'SHORTAGE' && <Badge variant="occupied">Thiếu</Badge>}
                  {r.status === 'SURPLUS' && <Badge variant="available">Thừa</Badge>}
                  {r.status === 'MATCH' && <Badge variant="secondary">Khớp</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Hệ thống</p>
                    <p className="font-semibold tabular-nums">{r.system}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Thực tế</p>
                    <p className="font-semibold tabular-nums">{r.actual}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Chênh lệch</p>
                    <p
                      className={cn(
                        'font-semibold tabular-nums',
                        r.diff < 0 ? 'text-rose-700' : r.diff > 0 ? 'text-emerald-700' : 'text-muted-foreground',
                      )}
                    >
                      {r.diff > 0 ? '+' : ''}{r.diff}
                    </p>
                  </div>
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
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Hệ thống</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Thực tế</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Chênh lệch</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r, i) => (
                  <tr key={i} className={r.status !== 'MATCH' ? 'bg-rose-50' : ''}>
                    <td className="px-4 py-3 text-foreground">{r.product}</td>
                    <td className="px-4 py-3 text-right text-foreground">{r.system}</td>
                    <td className="px-4 py-3 text-right text-foreground">{r.actual}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.diff < 0 ? 'text-rose-700' : r.diff > 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                      {r.diff > 0 ? '+' : ''}{r.diff}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'SHORTAGE' && <Badge variant="occupied">Thiếu</Badge>}
                      {r.status === 'SURPLUS' && <Badge variant="available">Thừa</Badge>}
                      {r.status === 'MATCH' && <Badge variant="secondary">Khớp</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-start">
          <Button variant="outline" onClick={() => { setResults(null); setCheckMeta(null); setActualQuantities({}) }}>
            Kiểm kê mới
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={cn('flex gap-2 text-muted-foreground text-sm', isMobile ? 'flex-col' : 'items-center justify-between')}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Điền số lượng thực tế. Ô trống sẽ được bỏ qua.</span>
        </div>
        <span className="shrink-0">{filledCount} / {products.length} đã nhập</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={cn('w-full', isMobile ? 'h-24 rounded-xl' : 'h-12')} />
          ))}
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {products.map((product) => {
            const diff = getDiff(product.id, product.stockQuantity)
            return (
              <div key={product.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3">
                  <p className="font-semibold text-foreground">{product.name}</p>
                  {product.category && (
                    <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Tồn HT: <span className="text-foreground font-medium tabular-nums">{product.stockQuantity} {product.unit}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Thực tế"
                    value={actualQuantities[product.id] ?? ''}
                    onChange={(e) => handleQtyChange(product.id, e.target.value)}
                    className="flex-1 text-base min-h-[44px] text-right"
                  />
                  <div className="w-16 text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Lệch</p>
                    <p
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        diff === null ? 'text-muted-foreground' :
                        diff < 0 ? 'text-rose-700' :
                        diff > 0 ? 'text-emerald-700' : 'text-muted-foreground',
                      )}
                    >
                      {diff === null ? '—' : diff > 0 ? `+${diff}` : String(diff)}
                    </p>
                  </div>
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Sản phẩm</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium w-32">Tồn kho (HT)</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium w-36">Thực tế</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium w-32">Chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => {
                const diff = getDiff(product.id, product.stockQuantity)
                return (
                  <tr key={product.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-foreground">{product.name}</span>
                      {product.category && (
                        <span className="ml-2 text-xs text-muted-foreground">{product.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">
                      {product.stockQuantity} {product.unit}
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={0}
                        placeholder="—"
                        value={actualQuantities[product.id] ?? ''}
                        onChange={(e) => handleQtyChange(product.id, e.target.value)}
                        className="h-8 text-right ml-auto w-28"
                      />
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium ${
                      diff === null ? 'text-muted-foreground' :
                      diff < 0 ? 'text-rose-700' :
                      diff > 0 ? 'text-emerald-700' : 'text-muted-foreground'
                    }`}>
                      {diff === null ? '—' : diff > 0 ? `+${diff}` : String(diff)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={cn('flex gap-3', isMobile ? 'flex-col' : 'items-center')}>
        <Input
          placeholder="Ghi chú kiểm kê..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn('text-base min-h-[44px]', isMobile ? 'w-full' : 'max-w-sm')}
        />
        <Button
          onClick={handleSubmit}
          disabled={inventoryCheck.isPending || filledCount === 0}
          className={cn('flex items-center gap-2 min-h-[44px]', isMobile && 'w-full justify-center')}
        >
          <ClipboardCheck className="h-4 w-4" />
          {inventoryCheck.isPending ? 'Đang xử lý...' : `Xác nhận kiểm kê (${filledCount} SP)`}
        </Button>
      </div>
    </div>
  )
}
