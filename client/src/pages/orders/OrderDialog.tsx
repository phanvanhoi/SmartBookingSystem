import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ShoppingCart, Minus, Plus, Trash2, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/utils/formatCurrency'
import { getErrorMessage } from '@/utils/error'
import { cn } from '@/utils/cn'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMenu, useCreateOrder } from '@/hooks/useOrders'
import { useOrderStore } from '@/stores/orderStore'
import MenuGrid from './MenuGrid'
import type { MenuCategory, MenuItem } from '@/types/order'

interface OrderDialogProps {
  sessionId: number
  roomName: string
  open: boolean
  onClose: () => void
}

export default function OrderDialog({
  sessionId,
  roomName,
  open,
  onClose,
}: OrderDialogProps) {
  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu')
  const [orderNote, setOrderNote] = useState('')

  const { data: menuCategories, isLoading: menuLoading } = useMenu()
  const createOrder = useCreateOrder()

  const { cart, addToCart, removeFromCart, updateQuantity, setItemNote, clearCart, getCartTotal } =
    useOrderStore()

  useEffect(() => {
    if (open) setMobileTab('menu')
  }, [open])

  const handleAddItem = (item: MenuItem) => {
    addToCart(item, 1)
  }

  const cartTotal = getCartTotal()
  const hasItems = cart.length > 0
  const defaultTab = menuCategories?.[0]?.id.toString()

  const handleSubmit = async () => {
    if (!hasItems) return

    try {
      await createOrder.mutateAsync({
        sessionId,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          notes: c.notes,
        })),
        notes: orderNote.trim() || undefined,
      })
      clearCart()
      setOrderNote('')
      onClose()
      toast.success(`Order ${roomName} thành công!`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Tạo order thất bại'))
    }
  }

  const menuSection = (
    <MenuSection
      menuCategories={menuCategories}
      menuLoading={menuLoading}
      defaultTab={defaultTab}
      cart={cart}
      onAddItem={handleAddItem}
      onUpdateQuantity={updateQuantity}
      className={cn(
        'flex flex-col flex-1 overflow-hidden border-border',
        !isMobile && 'border-b md:border-b-0 md:border-r',
      )}
    />
  )

  const cartSection = (
    <CartSection
      cart={cart}
      hasItems={hasItems}
      cartTotal={cartTotal}
      orderNote={orderNote}
      setOrderNote={setOrderNote}
      createOrderPending={createOrder.isPending}
      onRemoveFromCart={removeFromCart}
      onUpdateQuantity={updateQuantity}
      onSetItemNote={setItemNote}
      onSubmit={handleSubmit}
      className={cn('flex flex-col shrink-0', isMobile ? 'flex-1 min-h-0' : 'w-full md:w-72 lg:w-80')}
      stickyFooter={isMobile}
    />
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'max-w-4xl w-full flex flex-col p-0 gap-0',
          isMobile ? 'dialog-mobile-full' : 'h-[90vh]',
        )}
      >
        <DialogHeader className="px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg tracking-tight">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Order — {roomName}
          </DialogTitle>
        </DialogHeader>

        {isMobile && (
          <div className="flex border-b border-border shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('menu')}
              className={cn(
                'flex-1 py-3 text-sm font-semibold transition-colors min-h-[44px]',
                mobileTab === 'menu'
                  ? 'text-primary border-b-2 border-primary bg-accent/30'
                  : 'text-muted-foreground',
              )}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={cn(
                'flex-1 py-3 text-sm font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2',
                mobileTab === 'cart'
                  ? 'text-primary border-b-2 border-primary bg-accent/30'
                  : 'text-muted-foreground',
              )}
            >
              Giỏ hàng
              {hasItems && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
                  {cart.length}
                </Badge>
              )}
            </button>
          </div>
        )}

        {isMobile ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {mobileTab === 'menu' ? menuSection : cartSection}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {menuSection}
            {cartSection}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Menu panel ──────────────────────────────────────────────────────────────

function MenuSection({
  menuCategories,
  menuLoading,
  defaultTab,
  cart,
  onAddItem,
  onUpdateQuantity,
  className,
}: {
  menuCategories: MenuCategory[] | undefined
  menuLoading: boolean
  defaultTab: string | undefined
  cart: ReturnType<typeof useOrderStore.getState>['cart']
  onAddItem: (item: MenuItem) => void
  onUpdateQuantity: (menuItemId: number, qty: number) => void
  className?: string
}) {
  return (
    <div className={className}>
      <div className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Menu
      </div>

      {menuLoading ? (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card shadow-card p-3 space-y-2">
              <Skeleton className="w-full aspect-square rounded-md" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      ) : menuCategories && menuCategories.length > 0 ? (
        <Tabs defaultValue={defaultTab} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pb-2">
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
              {menuCategories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id.toString()}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:border-primary/40 min-h-[36px]"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            {menuCategories.map((cat) => (
              <TabsContent
                key={cat.id}
                value={cat.id.toString()}
                className="h-full mt-0 data-[state=active]:flex flex-col"
              >
                <ScrollArea className="flex-1 px-4 pb-4">
                  <MenuGrid
                    items={cat.items}
                    onAddItem={onAddItem}
                    cart={cart}
                    onUpdateQuantity={onUpdateQuantity}
                  />
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Không có menu
        </div>
      )}
    </div>
  )
}

// ─── Cart panel ──────────────────────────────────────────────────────────────

function CartSection({
  cart,
  hasItems,
  cartTotal,
  orderNote,
  setOrderNote,
  createOrderPending,
  onRemoveFromCart,
  onUpdateQuantity,
  onSetItemNote,
  onSubmit,
  className,
  stickyFooter,
}: {
  cart: ReturnType<typeof useOrderStore.getState>['cart']
  hasItems: boolean
  cartTotal: number
  orderNote: string
  setOrderNote: (v: string) => void
  createOrderPending: boolean
  onRemoveFromCart: (id: number) => void
  onUpdateQuantity: (id: number, qty: number) => void
  onSetItemNote: (id: number, note: string) => void
  onSubmit: () => void
  className?: string
  stickyFooter?: boolean
}) {
  return (
    <div className={className}>
      <div className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
        Giỏ hàng
        {hasItems && (
          <span className="ml-1 text-primary tabular-nums">({cart.length} món)</span>
        )}
      </div>

      <ScrollArea className={cn('flex-1 px-4', stickyFooter && 'min-h-0')}>
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 opacity-20" />
            <p className="text-sm">Giỏ hàng trống</p>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {cart.map((cartItem) => (
              <div
                key={cartItem.menuItem.id}
                className="rounded-lg border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-tight flex-1">
                    {cartItem.menuItem.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(cartItem.menuItem.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                    aria-label="Xóa món"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      aria-label="Giảm số lượng"
                      onClick={() => onUpdateQuantity(cartItem.menuItem.id, cartItem.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-bold w-5 text-center tabular-nums">
                      {cartItem.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      aria-label="Tăng số lượng"
                      onClick={() => onUpdateQuantity(cartItem.menuItem.id, cartItem.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-xs text-foreground font-bold tabular-nums">
                    {formatCurrency(cartItem.menuItem.price * cartItem.quantity)}
                  </span>
                </div>

                <Input
                  placeholder="Ghi chú món..."
                  value={cartItem.notes ?? ''}
                  onChange={(e) => onSetItemNote(cartItem.menuItem.id, e.target.value)}
                  className="h-9 text-base md:text-xs"
                />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div
        className={cn(
          'border-t border-border px-4 pt-3 pb-4 space-y-3 bg-muted/30 shrink-0',
          stickyFooter && 'pb-safe',
        )}
      >
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
          <Input
            placeholder="Ghi chú order..."
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            className="h-9 text-base md:text-xs"
          />
        </div>

        {hasItems && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Tổng:</span>
            <span className="text-primary text-lg font-bold tabular-nums">
              {formatCurrency(cartTotal, true)}
            </span>
          </div>
        )}

        <Button
          className="w-full h-12 md:h-10 font-bold tracking-wide disabled:opacity-40"
          disabled={!hasItems || createOrderPending}
          onClick={onSubmit}
        >
          {createOrderPending ? 'Đang gửi...' : 'XÁC NHẬN ORDER'}
        </Button>
      </div>
    </div>
  )
}
