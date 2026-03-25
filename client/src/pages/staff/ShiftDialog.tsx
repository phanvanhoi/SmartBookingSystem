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
      <DialogContent className="bg-[#111118] border-[#2a2a3a] text-[#f0f0f5] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#f0f0f5]">
            MỞ CA LÀM VIỆC
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User info */}
          <div className="p-3 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8888a0]">Nhân viên:</span>
              <span className="text-[#f0f0f5] font-medium">
                {currentUser?.fullName ?? 'Không xác định'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-[#8888a0]">Thời gian:</span>
              <span className="text-[#f0f0f5]">{formatDateTime(now)}</span>
            </div>
          </div>

          {/* Opening cash */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Tiền mặt đầu ca <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              min={0}
              placeholder="2,000,000"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
            />
            {openingCash && !isNaN(parseFloat(openingCash)) && (
              <p className="text-xs text-[#8888a0]">
                = {formatCurrency(parseFloat(openingCash), true)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Ghi chú bàn giao từ ca trước
            </label>
            <textarea
              rows={3}
              placeholder="Phòng 3 đang hát, kiểm tra mic phòng 7..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-[#2a2a3a] bg-[#1a1a24] px-3 py-2 text-sm text-[#f0f0f5] placeholder:text-[#555568] focus:outline-none focus:border-[#6c5ce7] resize-none"
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
            onClick={handleOpen}
            disabled={!openingCash || openShiftMutation.isPending}
            className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] text-white hover:opacity-90"
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
        <DialogContent className="bg-[#111118] border-[#2a2a3a] text-[#f0f0f5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#f0f0f5]">
              KẾT QUẢ ĐÓNG CA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Đóng ca thành công</span>
            </div>
            <div className="p-3 bg-[#1a1a24] rounded-lg border border-[#2a2a3a] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8888a0]">Thời lượng ca:</span>
                <span className="text-[#f0f0f5] font-medium">{closeResult.duration}</span>
              </div>
              <Separator className="bg-[#2a2a3a]" />
              <div className="flex justify-between">
                <span className="text-[#8888a0]">Tổng lượt khách:</span>
                <span className="text-[#f0f0f5] font-medium">{closeResult.summary.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8888a0]">Tổng doanh thu:</span>
                <span className="text-[#f0f0f5] font-medium">{formatCurrency(closeResult.summary.totalRevenue, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8888a0] pl-3">Tiền mặt:</span>
                <span className="text-[#f0f0f5]">{formatCurrency(closeResult.summary.cashRevenue, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8888a0] pl-3">QR chuyển khoản:</span>
                <span className="text-[#f0f0f5]">{formatCurrency(closeResult.summary.qrRevenue, true)}</span>
              </div>
              <Separator className="bg-[#2a2a3a]" />
              <div className="flex justify-between">
                <span className="text-[#8888a0]">Kỳ vọng tiền mặt:</span>
                <span className="text-[#f0f0f5]">{formatCurrency(closeResult.summary.expectedCash, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8888a0]">Tiền mặt thực tế:</span>
                <span className="text-[#f0f0f5]">{formatCurrency(closeResult.summary.closingCash, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8888a0]">Chênh lệch:</span>
                <span className={closeResult.summary.cashDifference < 0 ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                  {closeResult.summary.cashDifference >= 0 ? '+' : ''}
                  {formatCurrency(closeResult.summary.cashDifference, true)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCancel}
              className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] text-white hover:opacity-90"
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
      <DialogContent className="bg-[#111118] border-[#2a2a3a] text-[#f0f0f5] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#f0f0f5]">
            ĐÓNG CA LÀM VIỆC
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Shift info */}
          <div className="p-3 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
            <div className="flex items-center gap-2 text-sm text-[#8888a0] mb-1">
              <Clock className="w-4 h-4" />
              <span>
                {formatDateTime(currentShift.startTime)} → Hiện tại ({durationStr})
              </span>
            </div>
            <div className="text-sm text-[#f0f0f5] font-medium">
              Nhân viên: {currentShift.openedByName}
            </div>
          </div>

          {/* Tổng kết ca section header */}
          <div>
            <p className="text-sm font-semibold text-[#8888a0] uppercase tracking-wider mb-2">
              ── TỔNG KẾT CA ──
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-[#6c5ce7]" />
                  <span className="text-xs text-[#8888a0]">Tiền đầu ca</span>
                </div>
                <p className="text-sm font-semibold text-[#f0f0f5]">
                  {formatCurrency(currentShift.openingCash, true)}
                </p>
              </div>
              <div className="p-2.5 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-[#8888a0]">Doanh thu dự kiến</span>
                </div>
                <p className="text-sm font-semibold text-[#f0f0f5]">Xem sau đóng ca</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Banknote className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs text-[#8888a0]">Tiền mặt</span>
                </div>
                <p className="text-xs text-[#8888a0]">Xem sau đóng ca</p>
              </div>
              <div className="p-2.5 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
                <div className="flex items-center gap-1.5 mb-1">
                  <QrCode className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-[#8888a0]">QR chuyển khoản</span>
                </div>
                <p className="text-xs text-[#8888a0]">Xem sau đóng ca</p>
              </div>
            </div>
          </div>

          <Separator className="bg-[#2a2a3a]" />

          {/* Closing cash input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Tiền mặt thực tế cuối ca <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#555568] focus:border-[#6c5ce7]"
            />
            {validCash && (
              <p className="text-xs text-[#8888a0]">
                = {formatCurrency(cashValue, true)}
              </p>
            )}
          </div>

          {/* Live difference preview */}
          {validCash && liveResult && (
            <div className={`p-3 rounded-lg border ${
              liveResult.difference < 0
                ? 'bg-red-950/30 border-red-800/50'
                : 'bg-green-950/30 border-green-800/50'
            }`}>
              <div className="flex items-center gap-2">
                {liveResult.difference < 0 ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                )}
                <div className="text-sm">
                  <span className="text-[#8888a0]">Chênh lệch sơ bộ: </span>
                  <span className={liveResult.difference < 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                    {liveResult.difference >= 0 ? '+' : ''}
                    {formatCurrency(liveResult.difference)}
                  </span>
                  {liveResult.difference < 0 && (
                    <p className="text-yellow-400 text-xs mt-0.5">
                      Lưu ý: Con số thực tế sẽ được tính chính xác sau khi đóng ca
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Handover note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Ghi chú bàn giao ca sau
            </label>
            <textarea
              rows={3}
              placeholder="Phòng 3 khách đang hát, phòng 8 sắp checkout..."
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              className="w-full rounded-md border border-[#2a2a3a] bg-[#1a1a24] px-3 py-2 text-sm text-[#f0f0f5] placeholder:text-[#555568] focus:outline-none focus:border-[#6c5ce7] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={closeShiftMutation.isPending}
            className="border-[#2a2a3a] text-[#8888a0] hover:bg-[#1a1a24] hover:text-[#f0f0f5]"
          >
            Hủy
          </Button>
          <Button
            onClick={handleClose}
            disabled={!validCash || closeShiftMutation.isPending}
            className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white hover:opacity-90"
          >
            {closeShiftMutation.isPending ? 'Đang đóng...' : '✓ XÁC NHẬN ĐÓNG CA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
