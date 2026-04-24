import { useState } from 'react'
import {
  Users,
  Plus,
  Pencil,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  Clock,
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Shield,
  User,
  UserCheck,
  Loader2,
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
import { Separator } from '@/components/ui/separator'
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useResetStaffPassword,
  useToggleStaffActive,
  useShifts,
  useAuditLogs,
} from '@/hooks/useStaff'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateTime, formatDate } from '@/utils/formatTime'
import { getErrorMessage } from '@/utils/error'
import type { StaffItem, StaffRole, GetShiftsParams, GetAuditLogsParams } from '@/services/staffService'

// ────────────────────────────────────────────────────────────────────────────
// Role Helpers
// ────────────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: 'Chủ quán',
  MANAGER: 'Quản lý',
  CASHIER: 'Thu ngân',
  STAFF: 'Phục vụ',
}

const ROLE_COLORS: Record<StaffRole, string> = {
  OWNER: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  MANAGER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CASHIER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  STAFF: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Create / Edit Staff Dialog
// ────────────────────────────────────────────────────────────────────────────

interface StaffFormData {
  username: string
  password: string
  fullName: string
  role: 'MANAGER' | 'CASHIER' | 'STAFF'
  phone: string
}

const emptyForm: StaffFormData = {
  username: '',
  password: '',
  fullName: '',
  role: 'CASHIER',
  phone: '',
}

interface StaffFormDialogProps {
  open: boolean
  onClose: () => void
  editingStaff?: StaffItem | null
}

function StaffFormDialog({ open, onClose, editingStaff }: StaffFormDialogProps) {
  const isEdit = !!editingStaff
  const [form, setForm] = useState<StaffFormData>(() =>
    editingStaff
      ? {
          username: editingStaff.username,
          password: '',
          fullName: editingStaff.fullName,
          role: (editingStaff.role as 'MANAGER' | 'CASHIER' | 'STAFF') ?? 'CASHIER',
          phone: editingStaff.phone ?? '',
        }
      : emptyForm
  )
  const [errors, setErrors] = useState<Partial<StaffFormData>>({})

  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff()
  const isPending = createMutation.isPending || updateMutation.isPending

  const validate = (): boolean => {
    const newErrors: Partial<StaffFormData> = {}
    if (!isEdit && form.username.length < 3) newErrors.username = 'Tối thiểu 3 ký tự'
    if (!form.fullName.trim()) newErrors.fullName = 'Bắt buộc'
    if (!isEdit && form.password.length < 6) newErrors.password = 'Tối thiểu 6 ký tự'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      if (isEdit && editingStaff) {
        await updateMutation.mutateAsync({
          id: editingStaff.id,
          data: {
            fullName: form.fullName,
            role: form.role,
            phone: form.phone || undefined,
          },
        })
      } else {
        await createMutation.mutateAsync({
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          phone: form.phone || undefined,
        })
      }
      onClose()
    } catch {
      // errors surface via mutation state
    }
  }

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const serverError = createMutation.isError
    ? getErrorMessage(createMutation.error)
    : updateMutation.isError
      ? getErrorMessage(updateMutation.error)
      : undefined

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#111118] border-[#2a2a3a] text-[#f0f0f5] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#f0f0f5]">
            {isEdit ? 'SỬA THÔNG TIN NHÂN VIÊN' : 'THÊM NHÂN VIÊN MỚI'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {serverError && (
            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Username (chỉ khi tạo mới) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#f0f0f5]">
                Tên đăng nhập <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="thu_ngan_02"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
              />
              {errors.username && <p className="text-xs text-red-400">{errors.username}</p>}
            </div>
          )}

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Họ và tên <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
            />
            {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
          </div>

          {/* Password (chỉ khi tạo mới) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#f0f0f5]">
                Mật khẩu <span className="text-red-400">*</span>
              </label>
              <Input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
              />
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Vai trò <span className="text-red-400">*</span>
            </label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as 'MANAGER' | 'CASHIER' | 'STAFF' }))}
            >
              <SelectTrigger className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] focus:border-[#6c5ce7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-[#2a2a3a]">
                <SelectItem value="MANAGER" className="text-[#f0f0f5] focus:bg-[#2a2a3a]">Quản lý</SelectItem>
                <SelectItem value="CASHIER" className="text-[#f0f0f5] focus:bg-[#2a2a3a]">Thu ngân</SelectItem>
                <SelectItem value="STAFF" className="text-[#f0f0f5] focus:bg-[#2a2a3a]">Phục vụ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Số điện thoại</label>
            <Input
              placeholder="0901234567"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] text-white hover:opacity-90"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEdit ? 'Đang lưu...' : 'Đang tạo...'}</>
            ) : (
              isEdit ? 'Lưu thay đổi' : 'Tạo nhân viên'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Reset Password Dialog
// ────────────────────────────────────────────────────────────────────────────

interface ResetPasswordDialogProps {
  open: boolean
  onClose: () => void
  staff: StaffItem | null
}

function ResetPasswordDialog({ open, onClose, staff }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const resetMutation = useResetStaffPassword()

  const handleSubmit = async () => {
    setError('')
    if (newPassword.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    try {
      await resetMutation.mutateAsync({ id: staff!.id, newPassword })
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch {
      setError('Đặt lại mật khẩu thất bại')
    }
  }

  const handleClose = () => {
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#111118] border-[#2a2a3a] text-[#f0f0f5] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#f0f0f5]">
            ĐẶT LẠI MẬT KHẨU
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {staff && (
            <p className="text-sm text-[#8888a0]">
              Đặt lại mật khẩu cho: <span className="text-[#f0f0f5] font-medium">{staff.fullName}</span>
            </p>
          )}

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Mật khẩu mới</label>
            <Input
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Xác nhận mật khẩu</label>
            <Input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={resetMutation.isPending}
            className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] text-white hover:opacity-90"
          >
            {resetMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang đặt lại...</>
            ) : 'Đặt lại mật khẩu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Staff Tab
// ────────────────────────────────────────────────────────────────────────────

function StaffTab() {
  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null)
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffItem | null>(null)
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null)

  const { data, isLoading } = useStaff()
  const toggleActiveMutation = useToggleStaffActive()

  const allStaff = data?.data ?? []
  const filteredStaff = allStaff.filter(
    (s) =>
      !search ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? '').includes(search)
  )

  const confirmToggleStaff = allStaff.find((s) => s.id === confirmToggleId)

  const handleToggleActive = async (id: number) => {
    await toggleActiveMutation.mutateAsync(id)
    setConfirmToggleId(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555568]" />
          <Input
            placeholder="Tìm theo tên, username, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568]"
          />
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] text-white hover:opacity-90 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Thêm nhân viên
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#2a2a3a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a1a24] border-b border-[#2a2a3a]">
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Tên đăng nhập</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Họ tên</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Vai trò</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">SĐT</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Trạng thái</th>
              <th className="text-right px-4 py-3 text-[#8888a0] font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#2a2a3a]">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full bg-[#1a1a24]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#555568]">
                  {search ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào'}
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => (
                <tr
                  key={staff.id}
                  className="border-b border-[#2a2a3a] hover:bg-[#1a1a24] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[#f0f0f5]">{staff.username}</td>
                  <td className="px-4 py-3 text-[#f0f0f5] font-medium">{staff.fullName}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={staff.role as StaffRole} />
                  </td>
                  <td className="px-4 py-3 text-[#8888a0]">{staff.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    {staff.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        <UserCheck className="w-3 h-3" />
                        Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        <User className="w-3 h-3" />
                        Không hoạt động
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingStaff(staff)}
                        className="p-1.5 rounded hover:bg-[#2a2a3a] text-[#8888a0] hover:text-[#f0f0f5] transition-colors"
                        title="Sửa thông tin"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setResetPasswordStaff(staff)}
                        className="p-1.5 rounded hover:bg-[#2a2a3a] text-[#8888a0] hover:text-yellow-400 transition-colors"
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmToggleId(staff.id)}
                        className={`p-1.5 rounded hover:bg-[#2a2a3a] transition-colors ${
                          staff.isActive ? 'text-green-400 hover:text-red-400' : 'text-gray-400 hover:text-green-400'
                        }`}
                        title={staff.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      >
                        {staff.isActive ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <StaffFormDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
      <StaffFormDialog
        open={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        editingStaff={editingStaff}
      />
      <ResetPasswordDialog
        open={!!resetPasswordStaff}
        onClose={() => setResetPasswordStaff(null)}
        staff={resetPasswordStaff}
      />

      {/* Confirm toggle active dialog */}
      <Dialog open={!!confirmToggleId} onOpenChange={() => setConfirmToggleId(null)}>
        <DialogContent className="bg-[#111118] border-[#2a2a3a] text-[#f0f0f5] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#f0f0f5]">
              Xác nhận thay đổi trạng thái
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8888a0] py-2">
            {confirmToggleStaff?.isActive
              ? `Bạn có chắc muốn vô hiệu hóa tài khoản "${confirmToggleStaff?.fullName}"?`
              : `Bạn có chắc muốn kích hoạt lại tài khoản "${confirmToggleStaff?.fullName}"?`}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmToggleId(null)}
              className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
            >
              Hủy
            </Button>
            <Button
              onClick={() => confirmToggleId && handleToggleActive(confirmToggleId)}
              disabled={toggleActiveMutation.isPending}
              className={
                confirmToggleStaff?.isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              {toggleActiveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang xử lý...</>
              ) : confirmToggleStaff?.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Shifts Tab
// ────────────────────────────────────────────────────────────────────────────

function ShiftsTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const filters: GetShiftsParams = {
    page,
    limit,
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  }

  const { data, isLoading } = useShifts(filters)
  const shifts = data?.data ?? []
  const pagination = data?.pagination

  const handleFilter = () => {
    setPage(1)
  }

  const handleClearFilter = () => {
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#8888a0]">Từ ngày:</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40 bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#8888a0]">Đến ngày:</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40 bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5]"
          />
        </div>
        <Button
          onClick={handleFilter}
          size="sm"
          className="bg-[#6c5ce7] hover:bg-[#5a4bc4] text-white"
        >
          Lọc
        </Button>
        {(dateFrom || dateTo) && (
          <Button
            onClick={handleClearFilter}
            size="sm"
            variant="outline"
            className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#2a2a3a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a1a24] border-b border-[#2a2a3a]">
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Ngày</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Nhân viên</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Thời gian</th>
              <th className="text-right px-4 py-3 text-[#8888a0] font-medium">Tiền đầu ca</th>
              <th className="text-right px-4 py-3 text-[#8888a0] font-medium">Tiền cuối ca</th>
              <th className="text-right px-4 py-3 text-[#8888a0] font-medium">Chênh lệch</th>
              <th className="text-right px-4 py-3 text-[#8888a0] font-medium">Doanh thu</th>
              <th className="text-center px-4 py-3 text-[#8888a0] font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#2a2a3a]">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full bg-[#1a1a24]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#555568]">
                  Chưa có lịch sử ca làm việc
                </td>
              </tr>
            ) : (
              shifts.map((shift) => {
                const diff = shift.summary?.cashDifference
                const diffColor =
                  diff === undefined
                    ? 'text-[#8888a0]'
                    : diff < 0
                    ? 'text-red-400'
                    : diff === 0
                    ? 'text-[#8888a0]'
                    : 'text-green-400'

                return (
                  <tr
                    key={shift.id}
                    className="border-b border-[#2a2a3a] hover:bg-[#1a1a24] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#f0f0f5]">
                      {formatDate(shift.startTime)}
                    </td>
                    <td className="px-4 py-3 text-[#f0f0f5]">
                      {shift.openedByName}
                    </td>
                    <td className="px-4 py-3 text-[#8888a0] text-xs">
                      <div>{new Date(shift.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                      {shift.endTime && (
                        <div>→ {new Date(shift.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                      {shift.duration && (
                        <div className="text-[#555568]">({shift.duration})</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[#f0f0f5]">
                      {formatCurrency(shift.openingCash)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#f0f0f5]">
                      {shift.closingCash != null ? formatCurrency(shift.closingCash) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${diffColor}`}>
                      {diff !== undefined
                        ? `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[#f0f0f5]">
                      {shift.summary ? formatCurrency(shift.summary.totalRevenue) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {shift.status === 'OPEN' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          Đang mở
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          Đã đóng
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#8888a0]">
            Tổng: {pagination.total} ca
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-[#f0f0f5]">
              {page} / {pagination.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Audit Log Tab
// ────────────────────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterAction, setFilterAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data: staffData } = useStaff()
  const allStaff = staffData?.data ?? []

  const filters: GetAuditLogsParams = {
    page,
    limit,
    ...(filterUserId && { userId: parseInt(filterUserId, 10) }),
    ...(filterAction && { action: filterAction }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  }

  const { data, isLoading } = useAuditLogs(filters)
  const logs = data?.data ?? []
  const pagination = data?.pagination

  const handleClearFilter = () => {
    setFilterUserId('')
    setFilterAction('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Nhân viên dropdown */}
        <Select value={filterUserId} onValueChange={(v) => { setFilterUserId(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48 bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5]">
            <SelectValue placeholder="Tất cả nhân viên" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a24] border-[#2a2a3a]">
            <SelectItem value="all" className="text-[#f0f0f5] focus:bg-[#2a2a3a]">Tất cả nhân viên</SelectItem>
            {allStaff.map((s) => (
              <SelectItem key={s.id} value={String(s.id)} className="text-[#f0f0f5] focus:bg-[#2a2a3a]">
                {s.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action filter */}
        <Input
          placeholder="Lọc theo hành động..."
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
          className="w-44 bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568]"
        />

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-40 bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5]"
          />
          <span className="text-[#555568] text-sm">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-40 bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5]"
          />
        </div>

        {(filterUserId || filterAction || dateFrom || dateTo) && (
          <Button
            onClick={handleClearFilter}
            size="sm"
            variant="outline"
            className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#2a2a3a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a1a24] border-b border-[#2a2a3a]">
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Thời gian</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Nhân viên</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Hành động</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Loại</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">ID</th>
              <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#2a2a3a]">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full bg-[#1a1a24]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#555568]">
                  Không có nhật ký nào
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[#2a2a3a] hover:bg-[#1a1a24] transition-colors"
                >
                  <td className="px-4 py-3 text-[#8888a0] text-xs whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[#f0f0f5]">{log.userFullName}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 bg-[#1a1a24] rounded border border-[#2a2a3a] text-[#a855f7]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8888a0] text-xs">{log.entityType}</td>
                  <td className="px-4 py-3 text-[#8888a0] text-xs">{log.entityId}</td>
                  <td className="px-4 py-3 text-[#8888a0] text-xs max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#8888a0]">
            Tổng: {pagination.total} bản ghi
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-[#f0f0f5]">
              {page} / {pagination.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main StaffPage
// ────────────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f5] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#6c5ce7]" />
            Quản lý nhân sự
          </h1>
          <p className="text-sm text-[#8888a0] mt-0.5">
            Quản lý nhân viên, ca làm việc và nhật ký hoạt động
          </p>
        </div>
      </div>

      <Separator className="bg-[#2a2a3a]" />

      {/* Tabs */}
      <Tabs defaultValue="staff">
        <TabsList className="bg-[#1a1a24] border border-[#2a2a3a]">
          <TabsTrigger
            value="staff"
            className="data-[state=active]:bg-[#6c5ce7] data-[state=active]:text-white text-[#8888a0]"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Nhân viên
          </TabsTrigger>
          <TabsTrigger
            value="shifts"
            className="data-[state=active]:bg-[#6c5ce7] data-[state=active]:text-white text-[#8888a0]"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Ca làm
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="data-[state=active]:bg-[#6c5ce7] data-[state=active]:text-white text-[#8888a0]"
          >
            <ScrollText className="w-4 h-4 mr-1.5" />
            Nhật ký
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-6">
          <StaffTab />
        </TabsContent>

        <TabsContent value="shifts" className="mt-6">
          <ShiftsTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
