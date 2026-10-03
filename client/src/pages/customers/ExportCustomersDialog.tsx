import { useState } from 'react'
import { Download, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExportPreview } from '@/hooks/useCustomers'
import { exportCSV } from '@/utils/exportCSV'
import { formatDate } from '@/utils/formatTime'
import { cn } from '@/utils/cn'
import type { ExportSegment } from '@/types/customer'

const SEGMENTS: Array<{ key: ExportSegment; label: string; hint: string }> = [
  { key: 'all', label: 'Tất cả khách', hint: 'Mọi khách có số di động hợp lệ' },
  { key: 'frequent', label: 'Khách thân thiết', hint: 'Đã đến từ 3 lần trở lên' },
  { key: 'recent', label: 'Đến gần đây', hint: 'Có lần đến trong 30 ngày qua' },
  { key: 'lapsed', label: 'Lâu không đến', hint: 'Đã từng đến, lần gần nhất hơn 60 ngày trước' },
  { key: 'members', label: 'Hội viên', hint: 'Đã đăng ký hội viên' },
  { key: 'nonMembers', label: 'Chưa là hội viên', hint: 'Mục tiêu giới thiệu thẻ hội viên' },
  { key: 'birthdayMonth', label: 'Sinh nhật tháng này', hint: 'Dựa trên ngày sinh đã lưu' },
]

const TIER_LABEL: Record<string, string> = {
  REGULAR: 'Thường',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  VIP: 'VIP',
}

interface ExportCustomersDialogProps {
  open: boolean
  onClose: () => void
}

export default function ExportCustomersDialog({ open, onClose }: ExportCustomersDialogProps) {
  const [segment, setSegment] = useState<ExportSegment>('all')
  const { data, isLoading, isError } = useExportPreview(segment, open)
  const result = data?.data

  const handleDownload = () => {
    if (!result || result.rows.length === 0) return
    exportCSV(
      `khach-hang-${segment}-${new Date().toISOString().slice(0, 10)}`,
      ['Họ tên', 'SĐT', 'SĐT (84)', 'Hạng', 'Số lần đến', 'Lần đến gần nhất', 'Tổng chi tiêu', 'Hội viên'],
      result.rows.map((r) => [
        r.name,
        r.phone,
        r.phone84,
        TIER_LABEL[r.tier] ?? r.tier,
        r.visitCount,
        r.lastVisit ? formatDate(r.lastVisit) : '',
        r.totalSpent,
        r.isMember ? 'Có' : 'Không',
      ]),
    )
    toast.success(`Đã tải ${result.rows.length} số điện thoại`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Xuất danh sách để gửi tin</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSegment(s.key)}
                className={cn(
                  'text-left rounded-lg border p-3 transition-colors',
                  segment === s.key
                    ? 'border-primary bg-accent ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/50',
                )}
              >
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.hint}</p>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : isError || !result ? (
              <p className="text-sm text-rose-600">Không tải được danh sách. Thử lại sau.</p>
            ) : (
              <>
                <p className="text-sm">
                  <strong className="text-2xl tabular-nums text-foreground">
                    {result.total.toLocaleString('vi-VN')}
                  </strong>{' '}
                  <span className="text-muted-foreground">số điện thoại sẽ được xuất</span>
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {result.optedOut > 0 && (
                    <li>{result.optedOut} khách đã từ chối nhận tin quảng cáo (đã loại)</li>
                  )}
                  {result.skippedInvalidPhone > 0 && (
                    <li>{result.skippedInvalidPhone} số không phải di động hợp lệ (đã loại)</li>
                  )}
                  {result.duplicatePhones > 0 && (
                    <li>{result.duplicatePhones} số bị trùng (chỉ giữ một)</li>
                  )}
                  <li>Khách trong danh sách đen cũng không có trong file</li>
                </ul>
              </>
            )}
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <p>
              Chỉ gửi tin quảng cáo cho khách đã đồng ý nhận và luôn kèm cách từ chối. Khi khách
              từ chối, mở hồ sơ khách và bật "Từ chối nhận tin" để họ không xuất hiện ở lần sau.
              Mỗi lần xuất đều được ghi nhật ký.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!result || result.rows.length === 0}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            Tải file CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
