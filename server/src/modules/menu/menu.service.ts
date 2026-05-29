import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import { CategoryInput, MenuItemInput } from './menu.validation'

// ── Types ──────────────────────────────────────────────────────────────────

interface MenuItemResult {
  id: number
  name: string
  price: number
  image: string | null
  isAvailable: boolean
  productId: number | null
  sortOrder: number
}

interface CategoryWithItems {
  id: number
  name: string
  sortOrder: number
  items: MenuItemResult[]
}

// ── Public Service Functions ───────────────────────────────────────────────

/**
 * Get full menu grouped by category (only active categories).
 * Soft-deleted items (isAvailable=false) are hidden.
 * Items linked to a product with stockQuantity <= 0 stay visible but are marked unavailable.
 */
export async function getMenu(): Promise<CategoryWithItems[]> {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      items: {
        where: { isAvailable: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          price: true,
          image: true,
          isAvailable: true,
          sortOrder: true,
          productId: true,
          product: {
            select: { stockQuantity: true },
          },
        },
      },
    },
  })

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sortOrder,
    items: cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image: item.image,
      sortOrder: item.sortOrder,
      productId: item.productId,
      // Auto-mark as unavailable when linked product has no stock
      isAvailable:
        item.product !== null && item.product.stockQuantity <= 0
          ? false
          : item.isAvailable,
    })),
  }))
}

/**
 * Get all categories (including inactive ones for admin management).
 */
export async function getCategories(): Promise<
  { id: number; name: string; sortOrder: number; isActive: boolean; _count: { items: number } }[]
> {
  return prisma.menuCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { items: true } },
    },
  })
}

export async function createCategory(data: CategoryInput) {
  return prisma.menuCategory.create({
    data: {
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    },
  })
}

export async function updateCategory(id: number, data: CategoryInput) {
  await findCategoryOrThrow(id)

  return prisma.menuCategory.update({
    where: { id },
    data: {
      name: data.name,
      sortOrder: data.sortOrder ?? undefined,
      isActive: data.isActive ?? undefined,
    },
  })
}

/** Soft delete – sets isActive = false */
export async function deleteCategory(id: number): Promise<void> {
  await findCategoryOrThrow(id)

  await prisma.menuCategory.update({
    where: { id },
    data: { isActive: false },
  })
}

export async function createMenuItem(data: MenuItemInput) {
  // Validate category exists
  const category = await prisma.menuCategory.findUnique({
    where: { id: data.categoryId },
  })
  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục')
  }

  return prisma.menuItem.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      price: data.price,
      productId: data.productId ?? null,
      sortOrder: data.sortOrder ?? 0,
      isAvailable: data.isAvailable ?? true,
    },
  })
}

export async function updateMenuItem(id: number, data: MenuItemInput) {
  await findMenuItemOrThrow(id)

  if (data.categoryId !== undefined) {
    const category = await prisma.menuCategory.findUnique({
      where: { id: data.categoryId },
    })
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục')
    }
  }

  return prisma.menuItem.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      name: data.name,
      price: data.price,
      productId: data.productId ?? null,
      sortOrder: data.sortOrder ?? undefined,
      isAvailable: data.isAvailable ?? undefined,
    },
  })
}

/** Soft delete – sets isAvailable = false */
export async function deleteMenuItem(id: number): Promise<void> {
  await findMenuItemOrThrow(id)

  await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: false },
  })
}

export async function uploadMenuItemImage(id: number, imagePath: string) {
  await findMenuItemOrThrow(id)

  return prisma.menuItem.update({
    where: { id },
    data: { image: imagePath },
    select: { id: true, image: true },
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function findCategoryOrThrow(id: number) {
  const category = await prisma.menuCategory.findUnique({ where: { id } })
  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục')
  }
  return category
}

async function findMenuItemOrThrow(id: number) {
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (!item) {
    throw new AppError(404, 'MENU_ITEM_NOT_FOUND', 'Không tìm thấy món')
  }
  return item
}
