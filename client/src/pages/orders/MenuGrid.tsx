import { Plus, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import type { MenuItem, CartItem } from '@/types/order'

interface MenuGridProps {
  items: MenuItem[]
  onAddItem: (item: MenuItem) => void
  cart: CartItem[]
  onUpdateQuantity: (menuItemId: number, qty: number) => void
}

export default function MenuGrid({ items, onAddItem, cart, onUpdateQuantity }: MenuGridProps) {
  const getCartItem = (itemId: number) => cart.find((c) => c.menuItem.id === itemId)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item) => {
        const cartItem = getCartItem(item.id)
        const inCart = !!cartItem

        return (
          <div
            key={item.id}
            className={cn(
              'relative flex flex-col rounded-xl border border-border bg-card shadow-card p-3 gap-2 transition-all',
              item.isAvailable && 'hover:border-primary/40 hover:shadow-card-hover',
              !item.isAvailable && 'opacity-60'
            )}
          >
            {/* Image or placeholder */}
            <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">🍺</span>
              )}
            </div>

            {/* Out of stock badge */}
            {!item.isAvailable && (
              <Badge
                variant="destructive"
                className="absolute top-2 right-2 text-[10px] px-1.5 py-0"
              >
                Hết
              </Badge>
            )}

            <div className="flex flex-col gap-0.5 flex-1">
              <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                {item.name}
              </p>
              <p className="text-xs text-primary font-bold tabular-nums">
                {formatCurrency(item.price)}
              </p>
            </div>

            {/* Action */}
            {!item.isAvailable ? (
              <div className="text-center text-xs text-muted-foreground py-1">Hết hàng</div>
            ) : inCart ? (
              <div className="flex items-center justify-between gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Giảm số lượng ${item.name}`}
                  onClick={() => onUpdateQuantity(item.id, cartItem.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-semibold text-foreground w-6 text-center">
                  {cartItem.quantity}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Tăng số lượng ${item.name}`}
                  onClick={() => onUpdateQuantity(item.id, cartItem.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs w-full"
                onClick={() => onAddItem(item)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Thêm
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
