import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'

interface QRDisplayProps {
  amount: number
  className?: string
}

export default function QRDisplay({ amount, className }: QRDisplayProps) {
  const currentHour = new Date().getHours()
  // 0-11 → QR Mã 2 (sau nửa đêm), 12-23 → QR Mã 1 (trước nửa đêm)
  const isAfterMidnight = currentHour < 12
  const qrLabel = isAfterMidnight ? 'QR Mã 2 (sau 00:00)' : 'QR Mã 1 (trước 00:00)'
  const qrFile = isAfterMidnight
    ? '/uploads/qr/qr_after_midnight.png'
    : '/uploads/qr/qr_before_midnight.png'

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <p className="text-sm text-muted-foreground">
        Đang sử dụng: <span className="text-foreground font-medium">{qrLabel}</span>
      </p>

      <div className="w-48 h-48 bg-muted rounded-lg overflow-hidden flex items-center justify-center border border-border">
        <img
          src={qrFile}
          alt={qrLabel}
          className="w-full h-full object-contain"
          onError={(e) => {
            const target = e.currentTarget
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent && !parent.querySelector('.qr-placeholder')) {
              const placeholder = document.createElement('div')
              placeholder.className =
                'qr-placeholder flex flex-col items-center justify-center text-center p-4'
              placeholder.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground mb-2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
                </svg>
                <span style="color: hsl(240 5% 55%); font-size: 12px;">Chưa cài đặt mã QR</span>
              `
              parent.appendChild(placeholder)
            }
          }}
        />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Số tiền cần chuyển</p>
        <p className="text-xl font-bold text-primary tabular-nums">
          {formatCurrency(amount, true)}
        </p>
      </div>
    </div>
  )
}
