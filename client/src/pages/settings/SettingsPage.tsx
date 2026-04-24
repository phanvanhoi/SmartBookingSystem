import { useState, useRef } from 'react'
import {
  Settings,
  DollarSign,
  QrCode,
  Percent,
  Ticket,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useSettings,
  useUpdateSettings,
  useUploadQR,
  usePricingRules,
  useCreatePricingRule,
  useUpdatePricingRule,
  useDeletePricingRule,
  useSurcharges,
  useCreateSurcharge,
  useUpdateSurcharge,
  useDeleteSurcharge,
  useVouchers,
  useCreateVoucher,
  useUpdateVoucher,
  useDeleteVoucher,
} from '@/hooks/useSettings'
import { useRooms } from '@/hooks/useRooms'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatTime'
import { getErrorMessage } from '@/utils/error'
import type {
  PricingRuleItem,
  SurchargeItem,
  VoucherItem,
  CreatePricingRuleData,
  CreateSurchargeData,
  CreateVoucherData,
} from '@/services/settingService'
import toast from 'react-hot-toast'

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function DayBadges({ days }: { days: number[] }) {
  if (!days || days.length === 0) {
    return <span className="text-muted-foreground text-xs">Tất cả ngày</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {days.sort().map((d) => (
        <Badge key={d} variant="outline" className="text-xs px-1 py-0">
          {DAY_LABELS[d]}
        </Badge>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab Chung
// ────────────────────────────────────────────────────────────────────────────

function GeneralTab() {
  const { data: settingsData, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const settings = settingsData?.data ?? []

  function getValue(key: string, fallback = '') {
    const s = settings.find((x) => x.key === key)
    if (s === undefined) return fallback
    return String(s.value ?? fallback)
  }

  const [form, setForm] = useState({
    store_name: '',
    store_address: '',
    open_time: '',
    close_time: '',
    min_duration_minutes: '',
    warning_before_minutes: '',
    max_cashier_discount_percent: '',
  })
  const [initialized, setInitialized] = useState(false)

  if (!isLoading && !initialized && settings.length > 0) {
    setForm({
      store_name: getValue('store_name', 'Music Box Karaoke'),
      store_address: getValue('store_address'),
      open_time: getValue('open_time', '12:00'),
      close_time: getValue('close_time', '05:00'),
      min_duration_minutes: getValue('min_duration_minutes', '60'),
      warning_before_minutes: getValue('warning_before_minutes', '15'),
      max_cashier_discount_percent: getValue('max_cashier_discount_percent', '10'),
    })
    setInitialized(true)
  }

  function handleSave() {
    const payload = Object.entries(form).map(([key, value]) => ({
      key,
      value: ['min_duration_minutes', 'warning_before_minutes', 'max_cashier_discount_percent'].includes(key)
        ? Number(value)
        : value,
    }))

    updateSettings.mutate(payload, {
      onSuccess: () => toast.success('Lưu cài đặt thành công'),
      onError: () => toast.error('Lưu cài đặt thất bại'),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Tên quán</label>
          <Input
            value={form.store_name}
            onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
            placeholder="Music Box Karaoke"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Địa chỉ</label>
          <Input
            value={form.store_address}
            onChange={(e) => setForm((f) => ({ ...f, store_address: e.target.value }))}
            placeholder="123 Đường ABC, Quận X, TP.HCM"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Giờ mở cửa</label>
            <Input
              type="time"
              value={form.open_time}
              onChange={(e) => setForm((f) => ({ ...f, open_time: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Giờ đóng cửa</label>
            <Input
              type="time"
              value={form.close_time}
              onChange={(e) => setForm((f) => ({ ...f, close_time: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Thời gian hát tối thiểu (phút)
          </label>
          <Input
            type="number"
            min={0}
            value={form.min_duration_minutes}
            onChange={(e) => setForm((f) => ({ ...f, min_duration_minutes: e.target.value }))}
            placeholder="60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Cảnh báo trước khi hết giờ (phút)
          </label>
          <Input
            type="number"
            min={0}
            value={form.warning_before_minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, warning_before_minutes: e.target.value }))
            }
            placeholder="15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            % giảm giá tối đa cho thu ngân
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.max_cashier_discount_percent}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_cashier_discount_percent: e.target.value }))
            }
            placeholder="10"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateSettings.isPending}
        className="w-full"
      >
        {updateSettings.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Check className="w-4 h-4 mr-2" />
        )}
        Lưu cài đặt
      </Button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab Bảng giá
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_PRICING: CreatePricingRuleData = {
  roomTypeId: 0,
  name: '',
  timeStart: '12:00',
  timeEnd: '17:00',
  pricePerHour: 0,
  dayOfWeek: [],
  isActive: true,
}

function PricingTab() {
  const { data, isLoading } = usePricingRules()
  const { data: roomsData } = useRooms()
  const createMutation = useCreatePricingRule()
  const updateMutation = useUpdatePricingRule()
  const deleteMutation = useDeletePricingRule()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<PricingRuleItem | null>(null)
  const [form, setForm] = useState<CreatePricingRuleData>(EMPTY_PRICING)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Collect unique room types from rooms
  const roomTypes = Array.from(
    new Map(
      (roomsData ?? []).map((r) => [r.roomType.id, r.roomType])
    ).values()
  )

  function openCreate() {
    setEditItem(null)
    setForm({ ...EMPTY_PRICING, roomTypeId: roomTypes[0]?.id ?? 0 })
    setDialogOpen(true)
  }

  function openEdit(item: PricingRuleItem) {
    setEditItem(item)
    setForm({
      roomTypeId: item.roomTypeId,
      name: item.name,
      timeStart: item.timeStart,
      timeEnd: item.timeEnd,
      pricePerHour: item.pricePerHour,
      dayOfWeek: item.dayOfWeek,
      isActive: item.isActive,
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name || !form.roomTypeId) return

    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id, data: form },
        {
          onSuccess: () => {
            toast.success('Cập nhật khung giờ thành công')
            setDialogOpen(false)
          },
          onError: () => toast.error('Cập nhật thất bại'),
        }
      )
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          toast.success('Thêm khung giờ thành công')
          setDialogOpen(false)
        },
        onError: () => toast.error('Thêm thất bại'),
      })
    }
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Xóa khung giờ thành công')
        setDeleteConfirm(null)
      },
      onError: () => toast.error('Xóa thất bại'),
    })
  }

  function toggleDay(day: number) {
    const days = form.dayOfWeek ?? []
    setForm((f) => ({
      ...f,
      dayOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    }))
  }

  const rules = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Khung giờ & Bảng giá</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Thêm khung giờ
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Chưa có khung giờ nào</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Khung giờ</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại phòng</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Giá/giờ</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">TT</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {rule.timeStart} – {rule.timeEnd}
                  </td>
                  <td className="px-4 py-3">{rule.roomTypeName}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(rule.pricePerHour)} đ
                  </td>
                  <td className="px-4 py-3">
                    <DayBadges days={rule.dayOfWeek} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'On' : 'Off'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Sửa bảng giá ${rule.name}`}
                        onClick={() => openEdit(rule)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={`Xóa bảng giá ${rule.name}`}
                        onClick={() => setDeleteConfirm(rule.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Sửa khung giờ' : 'Thêm khung giờ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tên khung giờ</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Vd: Giờ thấp điểm phòng nhỏ"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Loại phòng</label>
              <Select
                value={String(form.roomTypeId)}
                onValueChange={(v) => setForm((f) => ({ ...f, roomTypeId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại phòng" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={String(rt.id)}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Giờ bắt đầu</label>
                <Input
                  type="time"
                  value={form.timeStart}
                  onChange={(e) => setForm((f) => ({ ...f, timeStart: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Giờ kết thúc</label>
                <Input
                  type="time"
                  value={form.timeEnd}
                  onChange={(e) => setForm((f) => ({ ...f, timeEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Giá / giờ (VNĐ)</label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={form.pricePerHour}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pricePerHour: Number(e.target.value) }))
                }
                placeholder="150000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ngày áp dụng (bỏ trống = tất cả)</label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, idx) => {
                  const active = (form.dayOfWeek ?? []).includes(idx)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Bạn chắc chắn muốn xóa khung giờ này?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab QR Code
// ────────────────────────────────────────────────────────────────────────────

function QRCodeTab() {
  const { data: settingsData, isLoading } = useSettings()
  const uploadQR = useUploadQR()
  const fileInputRef1 = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)

  const settings = settingsData?.data ?? []
  const qr1Path = settings.find((s) => s.key === 'qr_code_1')?.value as string | undefined
  const qr2Path = settings.find((s) => s.key === 'qr_code_2')?.value as string | undefined

  function handleUpload(qrType: 'QR1' | 'QR2', file: File) {
    uploadQR.mutate(
      { qrType, file },
      {
        onSuccess: () => toast.success(`Upload QR ${qrType} thành công`),
        onError: () => toast.error('Upload thất bại'),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  function QRCard({
    qrType,
    title,
    subtitle,
    imagePath,
    fileRef,
  }: {
    qrType: 'QR1' | 'QR2'
    title: string
    subtitle: string
    imagePath: string | undefined
    fileRef: React.RefObject<HTMLInputElement>
  }) {
    return (
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div>
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        <div className="aspect-square max-w-[200px] mx-auto border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center bg-muted/30">
          {imagePath ? (
            <img
              src={imagePath}
              alt={title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Chưa có ảnh QR</p>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(qrType, file)
            e.target.value = ''
          }}
        />

        <Button
          variant="outline"
          className="w-full"
          disabled={uploadQR.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {uploadQR.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload ảnh mới
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
      <QRCard
        qrType="QR1"
        title="QR Mã 1"
        subtitle="Sử dụng: 12:00 → 23:59 (trước nửa đêm)"
        imagePath={qr1Path}
        fileRef={fileInputRef1}
      />
      <QRCard
        qrType="QR2"
        title="QR Mã 2"
        subtitle="Sử dụng: 00:00 → 11:59 (từ nửa đêm)"
        imagePath={qr2Path}
        fileRef={fileInputRef2}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab Phụ thu
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_SURCHARGE: CreateSurchargeData = {
  name: '',
  type: 'custom',
  percentage: 0,
  startDate: undefined,
  endDate: undefined,
  dayOfWeek: [],
  isActive: true,
}

const SURCHARGE_TYPES = [
  { value: 'weekend', label: 'Cuối tuần' },
  { value: 'holiday', label: 'Ngày lễ' },
  { value: 'custom', label: 'Tùy chỉnh' },
]

function SurchargesTab() {
  const { data, isLoading } = useSurcharges()
  const createMutation = useCreateSurcharge()
  const updateMutation = useUpdateSurcharge()
  const deleteMutation = useDeleteSurcharge()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<SurchargeItem | null>(null)
  const [form, setForm] = useState<CreateSurchargeData>(EMPTY_SURCHARGE)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  function openCreate() {
    setEditItem(null)
    setForm({ ...EMPTY_SURCHARGE })
    setDialogOpen(true)
  }

  function openEdit(item: SurchargeItem) {
    setEditItem(item)
    setForm({
      name: item.name,
      type: item.type,
      percentage: item.percentage,
      startDate: item.startDate ? item.startDate.split('T')[0] : undefined,
      endDate: item.endDate ? item.endDate.split('T')[0] : undefined,
      dayOfWeek: item.dayOfWeek,
      isActive: item.isActive,
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name) return

    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id, data: form },
        {
          onSuccess: () => {
            toast.success('Cập nhật phụ thu thành công')
            setDialogOpen(false)
          },
          onError: () => toast.error('Cập nhật thất bại'),
        }
      )
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          toast.success('Thêm phụ thu thành công')
          setDialogOpen(false)
        },
        onError: () => toast.error('Thêm thất bại'),
      })
    }
  }

  function toggleDay(day: number) {
    const days = form.dayOfWeek ?? []
    setForm((f) => ({
      ...f,
      dayOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    }))
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Xóa phụ thu thành công')
        setDeleteConfirm(null)
      },
      onError: () => toast.error('Xóa thất bại'),
    })
  }

  const surcharges = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Phụ thu</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Thêm
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : surcharges.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Chưa có phụ thu nào</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">%</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">TT</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {surcharges.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {SURCHARGE_TYPES.find((t) => t.value === s.type)?.label ?? s.type}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-500">
                    +{s.percentage}%
                  </td>
                  <td className="px-4 py-3">
                    {s.startDate && s.endDate ? (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.startDate)} – {formatDate(s.endDate)}
                      </span>
                    ) : (
                      <DayBadges days={s.dayOfWeek} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={s.isActive ? 'default' : 'secondary'}>
                      {s.isActive ? 'On' : 'Off'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Sửa phụ thu ${s.name}`}
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={`Xóa phụ thu ${s.name}`}
                        onClick={() => setDeleteConfirm(s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Sửa phụ thu' : 'Thêm phụ thu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tên phụ thu</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Vd: Phụ thu cuối tuần"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Loại</label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURCHARGE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phần trăm (%)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.percentage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, percentage: Number(e.target.value) }))
                  }
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Từ ngày</label>
                <Input
                  type="date"
                  value={form.startDate ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value || undefined }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Đến ngày</label>
                <Input
                  type="date"
                  value={form.endDate ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value || undefined }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ngày trong tuần (bỏ trống = tất cả)</label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, idx) => {
                  const active = (form.dayOfWeek ?? []).includes(idx)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Bạn chắc chắn muốn xóa phụ thu này?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab Voucher
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_VOUCHER: CreateVoucherData = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: 0,
  maxDiscount: undefined,
  maxUses: undefined,
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  isActive: true,
}

function VouchersTab() {
  const { data, isLoading } = useVouchers()
  const createMutation = useCreateVoucher()
  const updateMutation = useUpdateVoucher()
  const deleteMutation = useDeleteVoucher()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<VoucherItem | null>(null)
  const [form, setForm] = useState<CreateVoucherData>(EMPTY_VOUCHER)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  function openCreate() {
    setEditItem(null)
    setForm({ ...EMPTY_VOUCHER })
    setDialogOpen(true)
  }

  function openEdit(item: VoucherItem) {
    setEditItem(item)
    setForm({
      code: item.code,
      discountType: item.discountType,
      discountValue: item.discountValue,
      maxDiscount: item.maxDiscount ?? undefined,
      maxUses: item.maxUses ?? undefined,
      validFrom: item.validFrom.split('T')[0],
      validUntil: item.validUntil.split('T')[0],
      isActive: item.isActive,
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.code) return

    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id, data: form },
        {
          onSuccess: () => {
            toast.success('Cập nhật voucher thành công')
            setDialogOpen(false)
          },
          onError: (err) => {
            toast.error(getErrorMessage(err, 'Cập nhật thất bại'))
          },
        }
      )
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          toast.success('Tạo voucher thành công')
          setDialogOpen(false)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, 'Tạo thất bại'))
        },
      })
    }
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Xóa voucher thành công')
        setDeleteConfirm(null)
      },
      onError: () => toast.error('Xóa thất bại'),
    })
  }

  const vouchers = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Voucher giảm giá</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Thêm voucher
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Chưa có voucher nào</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mã</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại giảm</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Giá trị</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Đã dùng/Tối đa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hiệu lực</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">TT</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                      {v.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {v.discountType === 'PERCENTAGE' ? 'Phần trăm' : 'Số tiền'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-500">
                    {v.discountType === 'PERCENTAGE'
                      ? `-${v.discountValue}%`
                      : `-${formatCurrency(v.discountValue)} đ`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.usedCount}/{v.maxUses ?? '∞'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(v.validFrom)} – {formatDate(v.validUntil)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={v.isActive ? 'default' : 'secondary'}>
                      {v.isActive ? 'On' : 'Off'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Sửa voucher ${v.code}`}
                        onClick={() => openEdit(v)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={`Xóa voucher ${v.code}`}
                        onClick={() => setDeleteConfirm(v.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Sửa voucher' : 'Thêm voucher'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Mã voucher</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="GIAMGIA20"
                  className="uppercase font-mono"
                  disabled={!!editItem}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Loại giảm giá</label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, discountType: v as 'PERCENTAGE' | 'FIXED_AMOUNT' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Phần trăm (%)</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Số tiền (VNĐ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Giá trị {form.discountType === 'PERCENTAGE' ? '(%)' : '(VNĐ)'}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Giảm tối đa (VNĐ)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxDiscount ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxDiscount: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Không giới hạn"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Số lần dùng tối đa</label>
              <Input
                type="number"
                min={1}
                value={form.maxUses ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxUses: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="Không giới hạn"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hiệu lực từ</label>
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hiệu lực đến</label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Bạn chắc chắn muốn xóa voucher này?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab Phòng
// ────────────────────────────────────────────────────────────────────────────

function RoomsTab() {
  const { data: rooms, isLoading } = useRooms()

  // Collect room types
  const roomTypes = Array.from(
    new Map((rooms ?? []).map((r) => [r.roomType.id, r.roomType])).values()
  )

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTypeId, setEditTypeId] = useState<number>(0)

  function startEdit(room: { id: number; name: string; roomType: { id: number } }) {
    setEditingId(room.id)
    setEditName(room.name)
    setEditTypeId(room.roomType.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditTypeId(0)
  }

  // Room editing via API would require a rooms PUT endpoint
  // For now, show the list with read-only display and note about editing
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  const allRooms = rooms ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Danh sách phòng ({allRooms.length} phòng)</h3>
      </div>

      {allRooms.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Chưa có phòng nào</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">STT</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên phòng</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại phòng</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allRooms.map((room, idx) => (
                <tr key={room.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    {editingId === room.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{room.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === room.id ? (
                      <Select
                        value={String(editTypeId)}
                        onValueChange={(v) => setEditTypeId(Number(v))}
                      >
                        <SelectTrigger className="h-7 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roomTypes.map((rt) => (
                            <SelectItem key={rt.id} value={String(rt.id)}>
                              {rt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{room.roomType.name}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={room.status === 'AVAILABLE' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {room.status === 'AVAILABLE'
                        ? 'Trống'
                        : room.status === 'OCCUPIED'
                        ? 'Đang hát'
                        : room.status === 'ENDING_SOON'
                        ? 'Sắp hết giờ'
                        : 'Bảo trì'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === room.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-500"
                          aria-label="Lưu tên phòng"
                          onClick={() => {
                            toast('Sửa tên phòng cần gọi API PUT /rooms/:id', { icon: 'ℹ️' })
                            cancelEdit()
                          }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label="Hủy chỉnh sửa"
                          onClick={cancelEdit}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 float-right"
                        aria-label={`Sửa ${room.name}`}
                        onClick={() => startEdit(room)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main SettingsPage
// ────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Cài đặt</h1>
          <p className="text-sm text-muted-foreground">Quản lý cài đặt hệ thống</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-2xl">
          <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" />
            Chung
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs">
            <DollarSign className="w-3.5 h-3.5" />
            Bảng giá
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="flex items-center gap-1.5 text-xs">
            <QrCode className="w-3.5 h-3.5" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="surcharges" className="flex items-center gap-1.5 text-xs">
            <Percent className="w-3.5 h-3.5" />
            Phụ thu
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="flex items-center gap-1.5 text-xs">
            <Ticket className="w-3.5 h-3.5" />
            Voucher
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            Phòng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingTab />
        </TabsContent>

        <TabsContent value="qrcode">
          <QRCodeTab />
        </TabsContent>

        <TabsContent value="surcharges">
          <SurchargesTab />
        </TabsContent>

        <TabsContent value="vouchers">
          <VouchersTab />
        </TabsContent>

        <TabsContent value="rooms">
          <RoomsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
