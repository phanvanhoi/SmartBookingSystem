import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, Users, TrendingUp, Banknote, QrCode } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useOpenShift, useCloseShift } from '@/hooks/useStaff'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateTime } from '@/utils/formatTime'
import type { ShiftItem } from '@/services/staffService'

// ────────────────────────────────────────────────────────────────────────────
// Open Shift Dialog
// ────────────────────────────────────────────────────────────────────────────

interface OpenShiftDialogProps {
  open: boolean
  onClose: () => void
  currentUser?: { fullName: string; role: string }
}

export function OpenShiftDialog({ open, onClose, currentUser }: OpenShiftDialogProps) {
  const [openingCash, setOpeningCash] = useState('')
  const [notes, setNotes] = useState('')
  const openShiftMutation = useOpenShift()

  const handleOpen = async () => {
    const cash = parseFloat(openingCash.replace(/,/g, ''))
    if (isNaN(cash) || cash < 0) return

    try {
      await openShiftMutation.mutateAsync({ openingCash: cash, notes: notes || undefined })
      setOpeningCash('')
      setNotes('')
      onClose()
    } catch {
      // error handled by mutation
    }
  }

  const handleClose = () => {
    setOpeningCash('')
    setNotes('')
    onClose()
  }

  const now = new Date()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            MỞ CA LÀM VIỆC
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User info */}
          <div className="p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nhân viên:</span>
              <span className="text-foreground font-medium">
                {currentUser?.fullName ?? 'Không xác định'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Thời gian:</span>
              <span className="text-foreground">{formatDateTime(now)}</span>
            </div>
          </div>

          {/* Opening cash */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Tiền mặt đầu ca <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min={0}
              placeholder="2,000,000"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className=""
            />
            {openingCash && !isNaN(parseFloat(openingCash)) && (
              <p className="text-xs text-muted-foreground">
                = {formatCurrency(parseFloat(openingCash), true)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Ghi chú bàn giao từ ca trước
            </label>
            <textarea
              rows={3}
              placeholder="Phòng 3 đang hát, kiểm tra mic phòng 7..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Hủy
          </Button>
          <Button
            onClick={handleOpen}
            disabled={!openingCash || openShiftMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {openShiftMutation.isPending ? 'Đang mở...' : '✓ BẮT ĐẦU CA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Close Shift Dialog
// ────────────────────────────────────────────────────────────────────────────

interface CloseShiftDialogProps {
  open: boolean
  onClose: () => void
  currentShift: ShiftItem
}

export function CloseShiftDialog({ open, onClose, currentShift }: CloseShiftDialogProps) {
  const [closingCash, setClosingCash] = useState('')
  const [handoverNote, setHandoverNote] = useState('')
  const [liveResult, setLiveResult] = useState<{
    expectedCash: number
    difference: number
  } | null>(null)

  const closeShiftMutation = useCloseShift()

  // Tính toán live khi người dùng nhập tiền cuối ca
  useEffect(() => {
    const cashValue = parseFloat(closingCash.replace(/,/g, ''))
    if (!isNaN(cashValue)) {
      // expectedCash = openingCash + cashRevenue
      // Nhưng chúng ta chưa biết cashRevenue ở đây (chờ API)
      // Hiển thị live difference dựa trên summary nếu có
      if (currentShift) {
        // Ước tính dựa trên opening cash (sẽ được cập nhật sau close)
        const openingCash = currentShift.openingCash
        setLiveResult({
          expectedCash: openingCash,
          difference: cashValue - openingCash,
        })
      }
    } else {
      setLiveResult(null)
    }
  }, [closingCash, currentShift])

  const handleClose = async () => {
    const cash = parseFloat(closingCash.replace(/,/g, ''))
    if (isNaN(cash) || cash < 0) return

    try {
      await closeShiftMutation.mutateAsync({
        shiftId: currentShift.id,
        data: { closingCash: cash, handoverNote: handoverNote || undefined },
      })
      setClosingCash('')
      setHandoverNote('')
      onClose()
    } catch {
      // error handled
    }
  }

  const handleCancel = () => {
    setClosingCash('')
    setHandoverNote('')
    onClose()
  }

  const startTime = new Date(currentShift.startTime)
  const now = new Date()
  const diffMs = now.getTime() - startTime.getTime()
  const totalMinutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const durationStr = hours > 0
    ? `${hours}h ${minutes}p`
    : `${minutes}p`

  // Kết quả sau khi đóng ca
  const closeResult = closeShiftMutation.data?.data

  if (closeResult) {
    return (
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="bg-card text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              KẾT QUẢ ĐÓNG CA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Đóng ca thành công</span>
            </div>
            <div className="p-3 bg-muted rounded-lg border border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thời lượng ca:</span>
                <span className="text-foreground font-medium">{closeResult.duration}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng lượt khách:</span>
                <span className="text-foreground font-medium">{closeResult.summary.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng doanh thu:</span>
                <span className="text-foreground font-medium">{formatCurrency(closeResult.summary.totalRevenue, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground pl-3">Tiền mặt:</span>
                <span className="text-foreground">{formatCurrency(closeResult.summary.cashRevenue, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground pl-3">QR chuyển khoản:</span>
                <span className="text-foreground">{formatCurrency(closeResult.summary.qrRevenue, true)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kỳ vọng tiền mặt:</span>
                <span className="text-foreground">{formatCurrency(closeResult.summary.expectedCash, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiền mặt thực tế:</span>
                <span className="text-foreground">{formatCurrency(closeResult.summary.closingCash, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chênh lệch:</span>
                <span className={closeResult.summary.cashDifference < 0 ? 'text-destructive font-medium' : 'text-emerald-600 font-medium'}>
                  {closeResult.summary.cashDifference >= 0 ? '+' : ''}
                  {formatCurrency(closeResult.summary.cashDifference, true)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCancel}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const cashValue = parseFloat(closingCash.replace(/,/g, ''))
  const validCash = !isNaN(cashValue) && cashValue >= 0

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="bg-card text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            ĐÓNG CA LÀM VIỆC
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Shift info */}
          <div className="p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span>
                {formatDateTime(currentShift.startTime)} → Hiện tại ({durationStr})
              </span>
            </div>
            <div className="text-sm text-foreground font-medium">
              Nhân viên: {currentShift.openedByName}
            </div>
          </div>

          {/* Tổng kết ca section header */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              ── TỔNG KẾT CA ──
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Tiền đầu ca</span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(currentShift.openingCash, true)}
                </p>
              </div>
              <div className="p-2.5 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Doanh thu dự kiến</span>
                </div>
                <p className="text-sm font-semibold text-foreground">Xem sau đóng ca</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <Banknote className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs text-muted-foreground">Tiền mặt</span>
                </div>
                <p className="text-xs text-muted-foreground">Xem sau đóng ca</p>
              </div>
              <div className="p-2.5 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <QrCode className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-xs text-muted-foreground">QR chuyển khoản</span>
                </div>
                <p className="text-xs text-muted-foreground">Xem sau đóng ca</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Closing cash input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Tiền mặt thực tế cuối ca <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className=""
            />
            {validCash && (
              <p className="text-xs text-muted-foreground">
                = {formatCurrency(cashValue, true)}
              </p>
            )}
          </div>

          {/* Live difference preview */}
          {validCash && liveResult && (
            <div className={`p-3 rounded-lg border ${
              liveResult.difference < 0
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                {liveResult.difference < 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Chênh lệch sơ bộ: </span>
                  <span className={liveResult.difference < 0 ? 'text-destructive font-semibold' : 'text-emerald-600 font-semibold'}>
                    {liveResult.difference >= 0 ? '+' : ''}
                    {formatCurrency(liveResult.difference)}
                  </span>
                  {liveResult.difference < 0 && (
                    <p className="text-amber-600 text-xs mt-0.5">
                      Lưu ý: Con số thực tế sẽ được tính chính xác sau khi đóng ca
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Handover note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Ghi chú bàn giao ca sau
            </label>
            <textarea
              rows={3}
              placeholder="Phòng 3 khách đang hát, phòng 8 sắp checkout..."
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={closeShiftMutation.isPending}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Hủy
          </Button>
          <Button
            onClick={handleClose}
            disabled={!validCash || closeShiftMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {closeShiftMutation.isPending ? 'Đang đóng...' : '✓ XÁC NHẬN ĐÓNG CA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
