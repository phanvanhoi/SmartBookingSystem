import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import { useQRCode } from '@/hooks/useCheckout'

interface QRDisplayProps {
  amount: number
  className?: string
}

export default function QRDisplay({ amount, className }: QRDisplayProps) {
  // Source of truth = backend setting (qr_code_1 / qr_code_2). Server picks
  // which QR to show based on current hour (≥12h → QR1, <12h → QR2) and
  // returns the actual image URL the owner uploaded via Settings → QR.
  // Hardcoding `/uploads/qr/qr_before_midnight.png` like before meant
  // newly uploaded QRs never showed up at checkout.
  const { data: qr, isLoading } = useQRCode()
  const imageUrl = qr?.imageUrl

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="w-48 h-48 bg-muted rounded-lg overflow-hidden flex items-center justify-center border border-border">
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="QR thanh toán"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent && !parent.querySelector('.qr-placeholder')) {
                const placeholder = document.createElement('div')
                placeholder.className =
                  'qr-placeholder flex flex-col items-center justify-center text-center p-4 text-muted-foreground'
                placeholder.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
                  </svg>
                  <span style="font-size: 12px; margin-top: 4px;">Chưa cài đặt mã QR</span>
                `
                parent.appendChild(placeholder)
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
            </svg>
            <span className="text-xs mt-1">Chưa cài đặt mã QR</span>
          </div>
        )}
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
