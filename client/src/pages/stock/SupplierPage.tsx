import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '@/hooks/useStock'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/utils/cn'
import type { Supplier } from '@/types/stock'

interface SupplierFormData {
  name: string
  phone: string
  address: string
  notes: string
}

const emptyForm: SupplierFormData = { name: '', phone: '', address: '', notes: '' }

export default function SupplierPage() {
  const isMobile = useIsMobile()
  const { data: suppliersData, isLoading } = useSuppliers()
  const suppliers = suppliersData?.data ?? []

  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierFormData>(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null)

  const openCreate = () => {
    setEditingSupplier(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name,
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      notes: supplier.notes ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    }

    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, data: payload })
    } else {
      await createSupplier.mutateAsync(payload)
    }
    setDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    await deleteSupplier.mutateAsync(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const isSaving = createSupplier.isPending || updateSupplier.isPending

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="min-h-[44px]" size={isMobile ? 'sm' : 'default'}>
          <Plus className="h-4 w-4" />
          {isMobile ? 'Thêm' : 'Thêm NCC'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={cn('w-full', isMobile ? 'h-24 rounded-xl' : 'h-14')} />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Chưa có nhà cung cấp nào</p>
          <Button variant="outline" className="mt-3 min-h-[44px]" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm NCC đầu tiên
          </Button>
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{supplier.name}</p>
                  {supplier.phone && (
                    <p className="text-sm text-muted-foreground tabular-nums mt-0.5">{supplier.phone}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {supplier.productCount ?? 0} SP
                </span>
              </div>
              {supplier.address && (
                <p className="text-xs text-muted-foreground mb-1">{supplier.address}</p>
              )}
              {supplier.notes && (
                <p className="text-xs text-muted-foreground italic truncate">{supplier.notes}</p>
              )}
              <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/60">
                <Button variant="ghost" size="sm" className="min-h-[44px] flex-1" onClick={() => openEdit(supplier)}>
                  <Pencil className="h-4 w-4 mr-1" /> Sửa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirm(supplier)}
                >
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tên NCC</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">SĐT</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Địa chỉ</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium w-20">Số SP</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-foreground font-medium">{supplier.name}</span>
                    {supplier.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{supplier.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{supplier.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="truncate max-w-[180px] block">{supplier.address ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">{supplier.productCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(supplier)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(supplier)}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent className={cn(isMobile && 'dialog-mobile-full max-h-[100dvh]')}>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Tên NCC <span className="text-destructive">*</span></label>
              <Input
                placeholder="Tên nhà cung cấp"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Số điện thoại</label>
              <Input
                placeholder="0901 234 567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="text-base min-h-[44px]"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Địa chỉ</label>
              <Input
                placeholder="Địa chỉ..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Ghi chú</label>
              <Input
                placeholder="Ghi chú..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="text-base min-h-[44px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa nhà cung cấp</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-muted-foreground text-sm">
              Bạn có chắc muốn xóa <span className="text-foreground font-medium">{deleteConfirm?.name}</span>?
              Hành động này không thể hoàn tác.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSupplier.isPending}>
              {deleteSupplier.isPending ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
