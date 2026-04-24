import { useState } from 'react'
import { Plus, Trash2, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProducts, useSuppliers, useCreateStockEntry } from '@/hooks/useStock'
import { formatCurrency } from '@/utils/formatCurrency'

interface EntryItem {
  productId: number | null
  quantity: number
  unitCost: number
}

interface StockEntryFormProps {
  open: boolean
  onClose: () => void
}

export default function StockEntryForm({ open, onClose }: StockEntryFormProps) {
  const [type, setType] = useState<'IN' | 'OUT_MANUAL'>('IN')
  const [supplierId, setSupplierId] = useState<string>('')
  const [items, setItems] = useState<EntryItem[]>([{ productId: null, quantity: 1, unitCost: 0 }])
  const [notes, setNotes] = useState('')

  const { data: productsData } = useProducts({ limit: 200 })
  const { data: suppliersData } = useSuppliers()
  const createEntry = useCreateStockEntry()

  const products = productsData?.data ?? []
  const suppliers = suppliersData?.data ?? []

  const addItem = () => {
    setItems([...items, { productId: null, quantity: 1, unitCost: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof EntryItem, value: number | null) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    // Auto-fill costPrice when product selected
    if (field === 'productId' && value !== null) {
      const product = products.find((p) => p.id === value)
      if (product) {
        updated[index].unitCost = product.costPrice
      }
    }
    setItems(updated)
  }

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

  const handleSubmit = async () => {
    const validItems = items.filter((i) => i.productId !== null)
    if (validItems.length === 0) return

    await createEntry.mutateAsync({
      type,
      supplierId: type === 'IN' && supplierId ? Number(supplierId) : undefined,
      items: validItems.map((i) => ({
        productId: i.productId!,
        quantity: type === 'OUT_MANUAL' ? -Math.abs(i.quantity) : i.quantity,
        unitCost: type === 'IN' ? i.unitCost : undefined,
      })),
      notes: notes || undefined,
    })

    // Reset form
    setType('IN')
    setSupplierId('')
    setItems([{ productId: null, quantity: 1, unitCost: 0 }])
    setNotes('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-primary" />
            Nhập / Xuất kho
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Type + Supplier row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Loại giao dịch</label>
              <Select value={type} onValueChange={(v) => setType(v as 'IN' | 'OUT_MANUAL')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Nhập kho</SelectItem>
                  <SelectItem value="OUT_MANUAL">Xuất kho thủ công</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'IN' && (
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Nhà cung cấp</label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn NCC..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Items table */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Sản phẩm</label>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Sản phẩm</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium w-24">Số lượng</th>
                    {type === 'IN' && (
                      <>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium w-28">Đơn giá</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium w-28">Thành tiền</th>
                      </>
                    )}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <Select
                          value={item.productId ? String(item.productId) : ''}
                          onValueChange={(v) => updateItem(index, 'productId', Number(v))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Chọn sản phẩm..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          className="h-8 text-right"
                        />
                      </td>
                      {type === 'IN' && (
                        <>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              value={item.unitCost}
                              onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
                              className="h-8 text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-foreground font-medium">
                            {formatCurrency(item.quantity * item.unitCost)}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label="Xóa dòng sản phẩm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" className="mt-2" onClick={addItem}>
              <Plus className="h-4 w-4" />
              Thêm sản phẩm
            </Button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Ghi chú</label>
            <Input
              placeholder="Ghi chú..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Total */}
          {type === 'IN' && (
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-border">
              <span className="text-muted-foreground">Tổng tiền nhập:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalCost, true)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createEntry.isPending || items.every((i) => i.productId === null)}
          >
            {createEntry.isPending ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
