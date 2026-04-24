import { useState } from 'react'
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
import { formatCurrency } from '@/utils/formatCurrency'
import { getErrorMessage } from '@/utils/error'
import { useMenu, useCreateOrder } from '@/hooks/useOrders'
import { useOrderStore } from '@/stores/orderStore'
import MenuGrid from './MenuGrid'
import type { MenuItem } from '@/types/order'

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
  const [orderNote, setOrderNote] = useState('')

  const { data: menuCategories, isLoading: menuLoading } = useMenu()
  const createOrder = useCreateOrder()

  const { cart, addToCart, removeFromCart, updateQuantity, setItemNote, clearCart, getCartTotal } =
    useOrderStore()

  const handleAddItem = (item: MenuItem) => {
    addToCart(item, 1)
  }

  const cartTotal = getCartTotal()
  const hasItems = cart.length > 0

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

  const defaultTab = menuCategories?.[0]?.id.toString()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg tracking-tight">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Order — {roomName}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* LEFT: Menu */}
          <div className="flex flex-col flex-1 overflow-hidden border-b md:border-b-0 md:border-r border-border">
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
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-card data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:border-primary/40"
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
                          onAddItem={handleAddItem}
                          cart={cart}
                          onUpdateQuantity={updateQuantity}
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

          {/* RIGHT: Cart */}
          <div className="flex flex-col w-full md:w-72 lg:w-80 shrink-0">
            <div className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Giỏ hàng
              {hasItems && (
                <span className="ml-1 text-primary tabular-nums">({cart.length} món)</span>
              )}
            </div>

            <ScrollArea className="flex-1 px-4">
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
                          onClick={() => removeFromCart(cartItem.menuItem.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            aria-label="Giảm số lượng"
                            onClick={() =>
                              updateQuantity(cartItem.menuItem.id, cartItem.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-bold w-5 text-center tabular-nums">
                            {cartItem.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            aria-label="Tăng số lượng"
                            onClick={() =>
                              updateQuantity(cartItem.menuItem.id, cartItem.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-foreground font-bold tabular-nums">
                          {formatCurrency(cartItem.menuItem.price * cartItem.quantity)}
                        </span>
                      </div>

                      {/* Per-item note */}
                      <Input
                        placeholder="Ghi chú món..."
                        value={cartItem.notes ?? ''}
                        onChange={(e) => setItemNote(cartItem.menuItem.id, e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-border px-4 pt-3 pb-4 space-y-3 bg-muted/30">
              {/* Order note */}
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                <Input
                  placeholder="Ghi chú order..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Total */}
              {hasItems && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Tổng:</span>
                  <span className="text-primary text-lg font-bold tabular-nums">
                    {formatCurrency(cartTotal, true)}
                  </span>
                </div>
              )}

              {/* Submit */}
              <Button
                className="w-full h-10 font-bold tracking-wide disabled:opacity-40"
                disabled={!hasItems || createOrder.isPending}
                onClick={handleSubmit}
              >
                {createOrder.isPending ? 'Đang gửi...' : 'XÁC NHẬN ORDER'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
