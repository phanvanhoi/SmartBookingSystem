/**
 * Menu “gộp” (Snack / Khô gà bò): một món bán, trừ kho từ SKU còn hàng
 * trong nhóm (ưu tiên tồn cao nhất).
 */
export const STOCK_POOLS = {
  SNACK: ['LAYS', 'OSTAR', 'PILLOWS', 'PINATTSU', 'DORKBUA', 'SWING'] as const,
  KHO: ['KHÔ GÀ', 'KHO GA', 'KHÔ BÒ', 'KHO BO'] as const,
} as const

export type StockPoolKey = keyof typeof STOCK_POOLS

const SKU_TO_POOL = new Map<string, StockPoolKey>()
for (const [key, skus] of Object.entries(STOCK_POOLS) as [StockPoolKey, readonly string[]][]) {
  for (const sku of skus) SKU_TO_POOL.set(sku, key)
}

export function poolKeyForSku(sku: string | null | undefined): StockPoolKey | null {
  if (!sku) return null
  return SKU_TO_POOL.get(sku) ?? null
}

export function skusForPool(key: StockPoolKey): readonly string[] {
  return STOCK_POOLS[key]
}

/** Tổng tồn các SKU trong pool (chỉ product active). */
export function poolAvailableQty(
  products: Array<{ sku: string | null; stockQuantity: number; isActive?: boolean }>,
  key: StockPoolKey,
): number {
  const set = new Set(skusForPool(key))
  return products
    .filter((p) => p.sku && set.has(p.sku) && p.isActive !== false)
    .reduce((sum, p) => sum + Math.max(0, p.stockQuantity), 0)
}

/**
 * Chọn 1 productId đủ số lượng (ưu tiên tồn cao). Null nếu không có SKU nào đủ.
 */
export function pickProductIdFromPool(
  products: Array<{ id: number; sku: string | null; stockQuantity: number; isActive?: boolean }>,
  key: StockPoolKey,
  qty: number,
): number | null {
  const set = new Set(skusForPool(key))
  const candidates = products
    .filter(
      (p) =>
        p.sku &&
        set.has(p.sku) &&
        p.isActive !== false &&
        p.stockQuantity >= qty,
    )
    .sort((a, b) => b.stockQuantity - a.stockQuantity || a.id - b.id)
  return candidates[0]?.id ?? null
}

/**
 * Phân bổ qty trên nhiều SKU trong pool (ưu tiên tồn cao).
 * Mutates `products` stockQuantity. Null nếu tổng pool không đủ.
 */
export function allocateFromPool(
  products: Array<{ id: number; sku: string | null; stockQuantity: number; isActive?: boolean }>,
  key: StockPoolKey,
  qty: number,
): Array<{ productId: number; quantity: number }> | null {
  if (qty <= 0) return []
  if (poolAvailableQty(products, key) < qty) return null

  const set = new Set(skusForPool(key))
  const allocations: Array<{ productId: number; quantity: number }> = []
  let remaining = qty

  while (remaining > 0) {
    const candidates = products
      .filter(
        (p) =>
          p.sku && set.has(p.sku) && p.isActive !== false && p.stockQuantity > 0,
      )
      .sort((a, b) => b.stockQuantity - a.stockQuantity || a.id - b.id)

    const top = candidates[0]
    if (!top) return null

    const take = Math.min(remaining, top.stockQuantity)
    allocations.push({ productId: top.id, quantity: take })
    top.stockQuantity -= take
    remaining -= take
  }

  return allocations
}
