import { useState } from 'react'
import {
  ShoppingCart,
  Clock,
  ArrowRightLeft,
  Merge,
  CreditCard,
  Phone,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatTime } from '@/utils/formatTime'
import { cn } from '@/utils/cn'
import { useRoom } from '@/hooks/useRooms'
import CountdownTimer from '@/components/CountdownTimer'
import CheckoutDialog from './CheckoutDialog'
import ExtendDialog from './ExtendDialog'
import TransferDialog from './TransferDialog'
import MergeDialog from './MergeDialog'
import OrderDialog from '../orders/OrderDialog'

interface RoomDetailPanelProps {
  roomId: number | null
  open: boolean
  onClose: () => void
}

const orderStatusLabel: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xử lý', color: 'text-amber-700' },
  PREPARING: { label: 'Đang pha chế', color: 'text-sky-700' },
  SERVED: { label: 'Đã phục vụ', color: 'text-emerald-700' },
  CANCELLED: { label: 'Đã hủy', color: 'text-rose-700' },
}

export default function RoomDetailPanel({ roomId, open, onClose }: RoomDetailPanelProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isExtendOpen, setIsExtendOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [isOrderOpen, setIsOrderOpen] = useState(false)

  const { data: room, isLoading } = useRoom(open ? roomId : null)
  const session = room?.currentSession ?? null

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-border"
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between pr-8">
              <div>
                <SheetTitle className="text-base font-bold tracking-tight">
                  {room?.name ?? 'Đang tải...'}
                </SheetTitle>
                {room && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {room.roomType.name}
                  </p>
                )}
              </div>
              {room?.status && (
                <Badge
                  variant={
                    room.status === 'OCCUPIED'
                      ? 'occupied'
                      : room.status === 'ENDING_SOON'
                        ? 'ending'
                        : 'available'
                  }
                >
                  {room.status === 'OCCUPIED'
                    ? 'Đang hát'
                    : room.status === 'ENDING_SOON'
                      ? 'Sắp trống'
                      : room.status}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !session ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Không có phiên đang hoạt động
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {/* Customer info — compact */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Khách hàng:</span>
                    <span className="text-foreground font-medium truncate">{session.customerName}</span>
                  </div>
                  {session.customerPhone && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> SĐT:
                      </span>
                      <span className="text-foreground">{session.customerPhone}</span>
                    </div>
                  )}
                  {session.guestCount && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Số người:
                      </span>
                      <span className="text-foreground">{session.guestCount}</span>
                    </div>
                  )}
                  {session.notes && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground w-20 flex items-center gap-1 mt-0.5">
                        <FileText className="w-3 h-3" /> Ghi chú:
                      </span>
                      <span className="text-foreground flex-1 line-clamp-2">{session.notes}</span>
                    </div>
                  )}
                </div>

                {/* Timer card — compact */}
                <div className="bg-muted/50 border border-border rounded-lg p-2.5 flex flex-col items-center gap-1.5">
                  <CountdownTimer
                    checkInTime={session.checkInTime}
                    estimatedEnd={session.estimatedEnd}
                  />
                  <div className="grid grid-cols-2 gap-3 w-full text-[11px] text-center">
                    <div>
                      <p className="text-muted-foreground leading-none">Check-in</p>
                      <p className="text-foreground font-semibold tabular-nums">{formatTime(session.checkInTime)}</p>
                    </div>
                    {session.estimatedEnd && (
                      <div>
                        <p className="text-muted-foreground leading-none">Dự kiến</p>
                        <p className="text-foreground font-semibold tabular-nums">
                          {formatTime(session.estimatedEnd)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing summary — compact */}
                <div>
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tạm tính</h4>
                  <div className="bg-muted/40 border border-border rounded-lg p-2.5 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tiền phòng</span>
                      <span className="text-foreground tabular-nums">
                        {formatCurrency(session.currentRoomCharge)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tiền order</span>
                      <span className="text-foreground tabular-nums">
                        {formatCurrency(session.currentOrderTotal)}
                      </span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-foreground font-bold text-xs">TỔNG</span>
                      <span className="text-primary font-bold text-base tabular-nums">
                        {formatCurrency(session.currentTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Orders list — compact */}
                {session.orders && session.orders.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Orders</h4>
                    <div className="space-y-1.5">
                      {session.orders.map((order) => {
                        const status = orderStatusLabel[order.status] ?? {
                          label: order.status,
                          color: 'text-muted-foreground',
                        }
                        return (
                          <div
                            key={order.id}
                            className="bg-muted/40 border border-border rounded-md p-2 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground tabular-nums">
                                #{order.id} · {formatTime(order.createdAt)}
                              </span>
                              <span className={cn('font-semibold', status.color)}>
                                {status.label}
                              </span>
                            </div>
                            {order.items?.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-muted-foreground truncate">
                                  <span className="tabular-nums font-semibold">{item.quantity}×</span> {item.name}
                                </span>
                                <span className="text-foreground tabular-nums">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Action buttons — compact */}
                <div>
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hành động</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 text-xs justify-start"
                      onClick={() => setIsOrderOpen(true)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Order thêm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 text-xs justify-start"
                      onClick={() => setIsExtendOpen(true)}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Gia hạn
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 text-xs justify-start"
                      onClick={() => setIsTransferOpen(true)}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Chuyển phòng
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 text-xs justify-start"
                      onClick={() => setIsMergeOpen(true)}
                    >
                      <Merge className="w-3.5 h-3.5" />
                      Gộp phòng
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Checkout button */}
          {session && (
            <div className="px-3 py-2.5 border-t border-border bg-muted/30">
              <Button
                className="w-full h-10 font-bold tracking-wide gap-2"
                onClick={() => setIsCheckoutOpen(true)}
              >
                <CreditCard className="w-4 h-4" />
                CHECKOUT
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout dialog */}
      <CheckoutDialog
        sessionId={session?.id ?? null}
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* Extend dialog */}
      <ExtendDialog
        sessionId={session?.id ?? null}
        open={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
      />

      {/* Transfer dialog */}
      <TransferDialog
        sessionId={session?.id ?? null}
        currentRoomId={room?.id ?? null}
        currentRoomName={room?.name ?? ''}
        open={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
      />

      {/* Merge dialog */}
      <MergeDialog
        primarySessionId={session?.id ?? null}
        primaryRoomName={room?.name ?? ''}
        open={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
      />

      {/* Order dialog */}
      {session && (
        <OrderDialog
          sessionId={session.id}
          roomName={room?.name ?? ''}
          open={isOrderOpen}
          onClose={() => setIsOrderOpen(false)}
        />
      )}
    </>
  )
}
