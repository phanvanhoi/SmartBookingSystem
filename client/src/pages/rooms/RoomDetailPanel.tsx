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
  Plus,
  Minus,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatTime } from '@/utils/formatTime'
import { cn } from '@/utils/cn'
import { useRoom } from '@/hooks/useRooms'
import { useUpdateOrderItem } from '@/hooks/useOrders'
import { getErrorMessage } from '@/utils/error'
import CountdownTimer from '@/components/CountdownTimer'
import { useIsMobile } from '@/hooks/useIsMobile'
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
  const isMobile = useIsMobile()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isExtendOpen, setIsExtendOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [isOrderOpen, setIsOrderOpen] = useState(false)

  const { data: room, isLoading } = useRoom(open ? roomId : null)
  const session = room?.currentSession ?? null

  const updateItem = useUpdateOrderItem()
  // Track which item id is being mutated so only its row disables, not all of
  // them. updateItem.isPending alone is global to the hook.
  const [busyItemId, setBusyItemId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    orderId: number
    itemId: number
    name: string
    orderStatus: string
  } | null>(null)

  const MAX_QTY = 999

  const handleItemQty = (orderId: number, itemId: number, nextQty: number) => {
    if (nextQty < 0 || nextQty > MAX_QTY) return
    setBusyItemId(itemId)
    updateItem.mutate(
      { orderId, itemId, quantity: nextQty },
      {
        onSuccess: () => {
          if (nextQty === 0) toast.success('Đã xóa món')
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, 'Cập nhật món thất bại'))
        },
        onSettled: () => setBusyItemId(null),
      },
    )
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    handleItemQty(deleteTarget.orderId, deleteTarget.itemId, 0)
    setDeleteTarget(null)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={cn(
            'p-0 flex flex-col bg-card border-border',
            isMobile
              ? 'h-[85vh] max-h-[85vh] rounded-t-2xl border-t [&>button.absolute]:top-3'
              : 'w-full sm:max-w-md border-l',
          )}
        >
          {isMobile && (
            <div className="flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
          )}

          {/* Header */}
          <SheetHeader className={cn('px-4 py-3 border-b border-border', isMobile && 'pt-1')}>
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

                {/* Orders list — compact, with editable items when order is editable */}
                {session.orders && session.orders.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Orders</h4>
                    <div className="space-y-1.5">
                      {session.orders.map((order) => {
                        const status = orderStatusLabel[order.status] ?? {
                          label: order.status,
                          color: 'text-muted-foreground',
                        }
                        // Backend cho phép sửa item khi order ở PENDING hoặc PREPARING.
                        const editable =
                          order.status === 'PENDING' || order.status === 'PREPARING'
                        return (
                          <div
                            key={order.id}
                            className="bg-muted/40 border border-border rounded-md p-2 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground tabular-nums">
                                #{order.id} · {formatTime(order.createdAt)}
                              </span>
                              <span className={cn('font-semibold', status.color)}>
                                {status.label}
                              </span>
                            </div>
                            {order.items?.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 text-xs"
                              >
                                {editable ? (
                                  <ItemQtyControls
                                    quantity={item.quantity}
                                    busy={busyItemId === item.id}
                                    canIncrement={item.quantity < MAX_QTY}
                                    onDec={() =>
                                      handleItemQty(order.id, item.id, item.quantity - 1)
                                    }
                                    onInc={() =>
                                      handleItemQty(order.id, item.id, item.quantity + 1)
                                    }
                                    onRemove={() =>
                                      setDeleteTarget({
                                        orderId: order.id,
                                        itemId: item.id,
                                        name: item.name,
                                        orderStatus: order.status,
                                      })
                                    }
                                  />
                                ) : (
                                  <span className="tabular-nums font-semibold w-8 text-center">
                                    {item.quantity}×
                                  </span>
                                )}
                                <span className="text-muted-foreground truncate flex-1">
                                  {item.name}
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
                  <div className={cn('grid gap-1.5', isMobile ? 'grid-cols-2' : 'grid-cols-2')}>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'gap-1.5 text-xs justify-start',
                        isMobile ? 'h-11 col-span-1' : 'h-9',
                      )}
                      onClick={() => setIsOrderOpen(true)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Order thêm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('h-9 gap-1.5 text-xs justify-start', isMobile && 'h-11')}
                      onClick={() => setIsExtendOpen(true)}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Gia hạn
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('h-9 gap-1.5 text-xs justify-start', isMobile && 'h-11')}
                      onClick={() => setIsTransferOpen(true)}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Chuyển phòng
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('h-9 gap-1.5 text-xs justify-start', isMobile && 'h-11')}
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
            <div className="px-3 py-2.5 border-t border-border bg-muted/30 pb-safe">
              <Button
                className={cn(
                  'w-full font-bold tracking-wide gap-2',
                  isMobile ? 'h-12 text-base' : 'h-10',
                )}
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

      {/* Confirm delete order item */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa món khỏi order?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground py-2 space-y-2">
            <p>
              Bạn có chắc muốn xóa{' '}
              <span className="text-foreground font-semibold">
                {deleteTarget?.name}
              </span>{' '}
              khỏi order?
            </p>
            {deleteTarget?.orderStatus === 'PREPARING' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                ⚠️ Order đang được pha chế. Hãy xác nhận với bếp/bar trước khi xóa.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={busyItemId !== null}
            >
              Xóa món
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Order item qty controls ─────────────────────────────────────────────────

function ItemQtyControls({
  quantity,
  busy,
  canIncrement,
  onDec,
  onInc,
  onRemove,
}: {
  quantity: number
  busy: boolean
  canIncrement: boolean
  onDec: () => void
  onInc: () => void
  onRemove: () => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 border border-border rounded-md bg-card overflow-hidden">
      <button
        type="button"
        onClick={onDec}
        disabled={busy || quantity <= 1}
        aria-label={quantity <= 1 ? 'Dùng nút xóa để xóa món' : 'Giảm số lượng'}
        title={quantity <= 1 ? 'Dùng nút xóa' : 'Giảm số lượng'}
        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="text-xs font-bold tabular-nums w-5 text-center">{quantity}</span>
      <button
        type="button"
        onClick={onInc}
        disabled={busy || !canIncrement}
        aria-label="Tăng số lượng"
        title={canIncrement ? 'Tăng số lượng' : 'Đã đạt mức tối đa'}
        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
      <span className="w-px h-4 bg-border" />
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        aria-label="Xóa món"
        title="Xóa món"
        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}
