/**
 * Cập nhật tồn kho theo kiểm kê thực tế.
 *
 * Usage:
 *   cd server && npx ts-node --transpile-only prisma/update-stock.ts
 *
 * Docker:
 *   docker exec musicbox-app node prisma/update-stock.js
 *   (build JS first, or use ts-node in container if available)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** SKU → số lượng thực tế (kiểm kê) */
const STOCK_UPDATES: Record<string, number> = {
  // Đồ uống
  REDBULL: 20, // Bò húc
  'COCA COLA': 10, // Coca
  TWISTER: 0, // Nước cam
  STRONGBOW: 0, // Strong
  ICE: 4,
  REVIVE: 0, // Riven
  STING: 11,
  'TEA PLUS': 0, // Olong
  LAVIE: 201, // Suối

  // Snack (tổng 27) — phân bổ theo tỷ lệ hiện tại
  PINATTSU: 9,
  PILLOWS: 0,
  SWING: 0,
  OSTAR: 5,
  LAYS: 11,
  DORKBUA: 2,

  // Khô gà + khô bò (tổng 76)
  'KHO GA': 38,
  'KHO BO': 38,
}

async function main() {
  console.log('Cập nhật tồn kho...\n')

  let updated = 0
  let notFound = 0

  for (const [sku, quantity] of Object.entries(STOCK_UPDATES)) {
    const product = await prisma.product.findUnique({ where: { sku } })

    if (!product) {
      console.warn(`  ⚠ Không tìm thấy SKU: ${sku}`)
      notFound++
      continue
    }

    await prisma.product.update({
      where: { sku },
      data: { stockQuantity: quantity },
    })

    const menuItems = await prisma.menuItem.findMany({
      where: { productId: product.id },
    })

    for (const item of menuItems) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { isAvailable: quantity > 0 },
      })
    }

    console.log(`  ✓ ${sku.padEnd(12)} ${product.name.padEnd(28)} ${quantity}`)
    updated++
  }

  console.log(`\n✅ Hoàn tất: ${updated} sản phẩm cập nhật${notFound ? `, ${notFound} không tìm thấy` : ''}`)
}

main()
  .catch((e) => {
    console.error('Lỗi:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
