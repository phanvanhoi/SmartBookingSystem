import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import type {
  ProductInput,
  UpdateProductInput,
  StockEntryInput,
  InventoryCheckInput,
  ProductQueryInput,
  StockEntryQueryInput,
} from './stock.validation'

// ── Helpers ───────────────────────────────────────────────

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

// ── Products ──────────────────────────────────────────────

export async function getProducts(filters: ProductQueryInput) {
  const { page, limit, category, lowStock, search } = filters

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
          ],
        }
      : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        stockEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  // Filter lowStock after query if requested (or filter in DB)
  const mapped = products
    .filter((p) => (lowStock ? p.stockQuantity <= p.minStock : true))
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      packSize: p.packSize,
      costPrice: Number(p.costPrice),
      stockQuantity: p.stockQuantity,
      minStock: p.minStock,
      isLowStock: p.stockQuantity <= p.minStock,
      supplierId: p.supplierId,
      expiryDate: p.expiryDate,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      supplier: p.supplier,
      lastEntry: p.stockEntries[0]?.createdAt ?? null,
    }))

  // Recount total when lowStock filter applied
  const filteredTotal = lowStock ? mapped.length : total

  return {
    data: mapped,
    pagination: buildPagination(page, limit, filteredTotal),
  }
}

export async function createProduct(data: ProductInput) {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      category: data.category,
      unit: data.unit,
      packSize: data.packSize,
      costPrice: data.costPrice,
      minStock: data.minStock,
      supplierId: data.supplierId,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  return {
    ...product,
    costPrice: Number(product.costPrice),
  }
}

export async function updateProduct(id: number, data: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing || !existing.isActive) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm')
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.packSize !== undefined ? { packSize: data.packSize } : {}),
      ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
      ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
      ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
      ...(data.expiryDate !== undefined
        ? { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }
        : {}),
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  return {
    ...updated,
    costPrice: Number(updated.costPrice),
  }
}

export async function deleteProduct(id: number) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing || !existing.isActive) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm')
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  })
}

// ── Stock Entries ─────────────────────────────────────────

export async function createStockEntry(data: StockEntryInput, userId: number) {
  const { type, items, supplierId, notes } = data

  return prisma.$transaction(async (tx) => {
    const createdEntries: Prisma.StockEntryGetPayload<{
      include: { product: { select: { id: true; name: true } } }
    }>[] = []

    for (const item of items) {
      // Validate product exists and is active
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, stockQuantity: true, isActive: true },
      })

      if (!product || !product.isActive) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `Không tìm thấy sản phẩm ID=${item.productId}`)
      }

      let quantityDelta: number
      let unitCost: number | undefined

      if (type === 'IN') {
        quantityDelta = item.quantity
        unitCost = item.unitCost
      } else {
        // OUT_MANUAL: store as negative
        quantityDelta = -item.quantity

        // Validate we won't go below 0
        if (product.stockQuantity + quantityDelta < 0) {
          throw new AppError(
            400,
            'INSUFFICIENT_STOCK',
            `Sản phẩm "${product.name}" không đủ tồn kho (hiện có: ${product.stockQuantity}, yêu cầu xuất: ${item.quantity})`
          )
        }
      }

      const totalCost =
        unitCost !== undefined ? unitCost * Math.abs(quantityDelta) : undefined

      // Create stock entry
      const entry = await tx.stockEntry.create({
        data: {
          productId: item.productId,
          supplierId: supplierId ?? null,
          type,
          quantity: quantityDelta,
          unitCost: unitCost !== undefined ? new Prisma.Decimal(unitCost) : undefined,
          totalCost: totalCost !== undefined ? new Prisma.Decimal(totalCost) : undefined,
          reason: item.reason ?? notes ?? null,
          createdById: userId,
        },
        include: {
          product: { select: { id: true, name: true } },
        },
      })

      createdEntries.push(entry)

      // Update stock quantity
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: quantityDelta } },
      })
    }

    return createdEntries
  })
}

export interface OrderItemForStock {
  productId: number
  quantity: number
}

/**
 * Deduct stock for sold items. Atomic per-item update prevents race conditions
 * where two concurrent checkouts both read the same stockQuantity and write
 * back, losing one decrement.
 *
 * Pass `tx` when called from inside an existing transaction (eg. checkout)
 * so stock changes commit/rollback together with the parent operation.
 */
export async function deductStockForOrder(
  orderItems: OrderItemForStock[],
  userId: number,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const itemsWithProduct = orderItems.filter((i) => i.productId != null)
  if (itemsWithProduct.length === 0) return

  const run = async (client: Prisma.TransactionClient) => {
    for (const item of itemsWithProduct) {
      // Atomic conditional decrement: only succeeds if enough stock exists.
      // updateMany returns count=0 if the WHERE clause doesn't match.
      const result = await client.product.updateMany({
        where: {
          id: item.productId,
          isActive: true,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      })

      if (result.count === 0) {
        // Either product is inactive, removed, or stock insufficient.
        // Look up which to give a useful error.
        const product = await client.product.findUnique({
          where: { id: item.productId },
          select: { name: true, stockQuantity: true, isActive: true },
        })
        if (!product || !product.isActive) {
          // Soft-skip: product gone, nothing to deduct
          continue
        }
        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `Sản phẩm "${product.name}" không đủ tồn kho (còn ${product.stockQuantity}, cần ${item.quantity})`,
        )
      }

      await client.stockEntry.create({
        data: {
          productId: item.productId,
          type: 'OUT_SALE',
          quantity: -item.quantity,
          createdById: userId,
        },
      })
    }
  }

  if (tx) {
    await run(tx)
  } else {
    await prisma.$transaction(run)
  }
}

export async function getStockEntries(filters: StockEntryQueryInput) {
  const { page, limit, productId, type, dateFrom, dateTo } = filters

  const where: Prisma.StockEntryWhereInput = {
    ...(productId ? { productId } : {}),
    ...(type ? { type } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  }

  const [entries, total] = await Promise.all([
    prisma.stockEntry.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, unit: true, sku: true } },
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockEntry.count({ where }),
  ])

  const mapped = entries.map((e) => ({
    id: e.id,
    productId: e.productId,
    supplierId: e.supplierId,
    type: e.type,
    quantity: e.quantity,
    unitCost: e.unitCost !== null ? Number(e.unitCost) : null,
    totalCost: e.totalCost !== null ? Number(e.totalCost) : null,
    reason: e.reason,
    createdAt: e.createdAt,
    product: e.product,
    supplier: e.supplier,
    createdBy: e.createdBy,
  }))

  return {
    data: mapped,
    pagination: buildPagination(page, limit, total),
  }
}

// ── Inventory Check ───────────────────────────────────────

export interface DiscrepancyItem {
  product: string
  productId: number
  system: number
  actual: number
  diff: number
  status: 'SHORTAGE' | 'SURPLUS' | 'MATCH'
}

export async function inventoryCheck(data: InventoryCheckInput, userId: number) {
  const { items, notes } = data
  const discrepancies: DiscrepancyItem[] = []

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, stockQuantity: true, isActive: true },
      })

      if (!product || !product.isActive) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `Không tìm thấy sản phẩm ID=${item.productId}`)
      }

      const diff = item.actualQuantity - product.stockQuantity

      let status: 'SHORTAGE' | 'SURPLUS' | 'MATCH'
      if (diff < 0) {
        status = 'SHORTAGE'
      } else if (diff > 0) {
        status = 'SURPLUS'
      } else {
        status = 'MATCH'
      }

      discrepancies.push({
        product: product.name,
        productId: product.id,
        system: product.stockQuantity,
        actual: item.actualQuantity,
        diff,
        status,
      })

      // Only create adjustment entry if there is a discrepancy
      if (diff !== 0) {
        await tx.stockEntry.create({
          data: {
            productId: item.productId,
            type: 'ADJUSTMENT',
            quantity: diff,
            reason: notes ?? 'Kiểm kê kho',
            createdById: userId,
          },
        })

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: item.actualQuantity },
        })
      }
    }
  })

  const totalItems = discrepancies.length
  const matchedItems = discrepancies.filter((d) => d.status === 'MATCH').length
  const discrepancyItems = totalItems - matchedItems

  return {
    discrepancies,
    totalItems,
    matchedItems,
    discrepancyItems,
  }
}

// ── Low Stock Alerts ──────────────────────────────────────

export async function getLowStockAlerts() {
  // Fetch all active products and filter those where stockQuantity <= minStock
  // Prisma does not support field-to-field comparisons natively, so we use a raw where
  // that fetches only products whose stockQuantity is not above their minStock.
  // We rely on a raw query equivalent: stockQuantity <= minStock.
  const products = await prisma.$queryRaw<
    Array<{
      id: number
      name: string
      sku: string | null
      category: string | null
      unit: string
      stock_quantity: number
      min_stock: number
      supplier_id: number | null
      supplier_name: string | null
    }>
  >`
    SELECT p.id, p.name, p.sku, p.category, p.unit,
           p.stock_quantity, p.min_stock, p.supplier_id,
           s.name AS supplier_name
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplier_id AND s.is_active = 1
    WHERE p.is_active = 1
      AND p.stock_quantity <= p.min_stock
    ORDER BY (p.min_stock - p.stock_quantity) DESC
  `

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    unit: p.unit,
    stockQuantity: Number(p.stock_quantity),
    minStock: Number(p.min_stock),
    deficit: Number(p.min_stock) - Number(p.stock_quantity),
    supplier:
      p.supplier_id !== null
        ? { id: p.supplier_id, name: p.supplier_name }
        : null,
  }))
}
