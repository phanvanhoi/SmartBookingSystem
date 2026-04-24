import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/utils/formatCurrency'
import { useOrders } from '@/hooks/useOrders'
import type { OrderStatus } from '@/types/order'

interface OrderHistoryProps {
  sessionId: number
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Chờ',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PREPARING: {
    label: 'Đang làm',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  SERVED: {
    label: 'Đã phục vụ',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

export default function OrderHistory({ sessionId }: OrderHistoryProps) {
  const { data: orders, isLoading } = useOrders(sessionId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Chưa có order nào
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 pr-2">
        {orders.map((order) => {
          const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING

          return (
            <div
              key={order.id}
              className="rounded-lg border border-border bg-card p-3 space-y-2 shadow-card"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(order.createdAt), 'HH:mm dd/MM', { locale: vi })}
                  {order.createdBy && (
                    <span className="ml-1 text-foreground/60">
                      — {order.createdBy.fullName}
                    </span>
                  )}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 font-semibold ${statusCfg.className}`}
                >
                  {statusCfg.label}
                </Badge>
              </div>

              {/* Items */}
              <ul className="space-y-1">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-xs">
                    <span className="text-foreground/85">
                      <span className="tabular-nums font-semibold">{item.quantity}×</span> {item.name}
                      {item.notes && (
                        <span className="text-muted-foreground ml-1 italic">
                          ({item.notes})
                        </span>
                      )}
                    </span>
                    <span className="text-foreground/70 ml-2 shrink-0 tabular-nums">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Divider + total */}
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {order.cancelReason && (
                    <span className="text-destructive italic">Lý do hủy: {order.cancelReason}</span>
                  )}
                </span>
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {formatCurrency(order.totalAmount)} VNĐ
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
