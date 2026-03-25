import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Importing products & menu items from KV data...')

  // ════════════════════════════════════════════
  // 1. PRODUCTS (Kho hàng)
  // ════════════════════════════════════════════

  const products = [
    // ── Đồ ăn ──
    { sku: 'PINATTSU', name: 'Snack Pinattsu', category: 'Đồ ăn', unit: 'Gói', costPrice: 9000, stockQuantity: 9, minStock: 5 },
    { sku: 'PILLOWS', name: 'Snack Pillows', category: 'Đồ ăn', unit: 'Gói', costPrice: 9000, stockQuantity: 0, minStock: 5 },
    { sku: 'SWING', name: 'Snack Swing', category: 'Đồ ăn', unit: 'Gói', costPrice: 9000, stockQuantity: 0, minStock: 5 },
    { sku: 'OSTAR', name: 'Snack Ostar', category: 'Đồ ăn', unit: 'Gói', costPrice: 9000, stockQuantity: 5, minStock: 5 },
    { sku: 'LAYS', name: 'Snack Lays', category: 'Đồ ăn', unit: 'Gói', costPrice: 9000, stockQuantity: 10, minStock: 5 },
    { sku: 'KHO GA', name: 'Khô Gà', category: 'Đồ ăn', unit: 'Gói', costPrice: 8600, stockQuantity: 14, minStock: 5 },
    { sku: 'DORKBUA', name: 'Snack que Thái', category: 'Đồ ăn', unit: 'Gói', costPrice: 9000, stockQuantity: 2, minStock: 5 },
    { sku: 'KHO BO', name: 'Khô bò', category: 'Đồ ăn', unit: 'Gói', costPrice: 7500, stockQuantity: 17, minStock: 5 },

    // ── Đồ uống ──
    { sku: 'STRONGBOW', name: 'Nước trái cây Strongbow', category: 'Đồ uống', unit: 'Lon', costPrice: 18000, stockQuantity: 26, minStock: 10 },
    { sku: 'STING', name: 'Sting', category: 'Đồ uống', unit: 'Chai', costPrice: 7750, stockQuantity: 19, minStock: 10 },
    { sku: 'TEA PLUS', name: 'Trà ô long Tea Plus', category: 'Đồ uống', unit: 'Chai', costPrice: 7500, stockQuantity: 3, minStock: 10 },
    { sku: 'TWISTER', name: 'Nước cam ép Twister', category: 'Đồ uống', unit: 'Lon', costPrice: 7708, stockQuantity: 24, minStock: 10 },
    { sku: 'REVIVE', name: 'Revive', category: 'Đồ uống', unit: 'Chai', costPrice: 7083, stockQuantity: 26, minStock: 10 },
    { sku: 'ICE', name: 'Nước trái cây ICE', category: 'Đồ uống', unit: 'Chai', costPrice: 6875, stockQuantity: 9, minStock: 10 },
    { sku: 'REDBULL', name: 'Bò húc', category: 'Đồ uống', unit: 'Lon', costPrice: 10625, stockQuantity: 25, minStock: 10 },
    { sku: 'COCA COLA', name: 'Coca cola', category: 'Đồ uống', unit: 'Lon', costPrice: 7292, stockQuantity: 23, minStock: 10 },
    { sku: 'LAVIE', name: 'Nước suối', category: 'Đồ uống', unit: 'Chai', costPrice: 3958, stockQuantity: 184, minStock: 20 },
  ]

  // Upsert products
  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        category: p.category,
        unit: p.unit,
        costPrice: p.costPrice,
        stockQuantity: p.stockQuantity,
        minStock: p.minStock
      },
      create: p,
    })
  }
  console.log(`  ✓ ${products.length} sản phẩm kho`)

  // ════════════════════════════════════════════
  // 2. MENU CATEGORIES
  // ════════════════════════════════════════════

  // Ensure categories exist
  const catDoAn = await prisma.menuCategory.upsert({
    where: { name: 'Đồ ăn' },
    update: {},
    create: { name: 'Đồ ăn', sortOrder: 1, isActive: true },
  })

  const catDoUong = await prisma.menuCategory.upsert({
    where: { name: 'Đồ uống' },
    update: {},
    create: { name: 'Đồ uống', sortOrder: 2, isActive: true },
  })

  console.log('  ✓ Menu categories')

  // ════════════════════════════════════════════
  // 3. MENU ITEMS (liên kết product → menu)
  // ════════════════════════════════════════════

  const menuItems = [
    // ── Đồ ăn (giá bán 20,000) ──
    { name: 'Snack Pinattsu', price: 20000, categoryId: catDoAn.id, sku: 'PINATTSU', sortOrder: 1 },
    { name: 'Snack Pillows', price: 20000, categoryId: catDoAn.id, sku: 'PILLOWS', sortOrder: 2 },
    { name: 'Snack Swing', price: 20000, categoryId: catDoAn.id, sku: 'SWING', sortOrder: 3 },
    { name: 'Snack Ostar', price: 20000, categoryId: catDoAn.id, sku: 'OSTAR', sortOrder: 4 },
    { name: 'Snack Lays', price: 20000, categoryId: catDoAn.id, sku: 'LAYS', sortOrder: 5 },
    { name: 'Khô Gà', price: 20000, categoryId: catDoAn.id, sku: 'KHO GA', sortOrder: 6 },
    { name: 'Snack que Thái', price: 20000, categoryId: catDoAn.id, sku: 'DORKBUA', sortOrder: 7 },
    { name: 'Khô bò', price: 20000, categoryId: catDoAn.id, sku: 'KHO BO', sortOrder: 8 },

    // ── Đồ uống ──
    { name: 'Nước trái cây Strongbow', price: 30000, categoryId: catDoUong.id, sku: 'STRONGBOW', sortOrder: 1 },
    { name: 'Sting', price: 15000, categoryId: catDoUong.id, sku: 'STING', sortOrder: 2 },
    { name: 'Trà ô long Tea Plus', price: 15000, categoryId: catDoUong.id, sku: 'TEA PLUS', sortOrder: 3 },
    { name: 'Nước cam ép Twister', price: 15000, categoryId: catDoUong.id, sku: 'TWISTER', sortOrder: 4 },
    { name: 'Revive', price: 15000, categoryId: catDoUong.id, sku: 'REVIVE', sortOrder: 5 },
    { name: 'Nước trái cây ICE', price: 15000, categoryId: catDoUong.id, sku: 'ICE', sortOrder: 6 },
    { name: 'Bò húc', price: 20000, categoryId: catDoUong.id, sku: 'REDBULL', sortOrder: 7 },
    { name: 'Coca cola', price: 15000, categoryId: catDoUong.id, sku: 'COCA COLA', sortOrder: 8 },
    { name: 'Nước suối', price: 10000, categoryId: catDoUong.id, sku: 'LAVIE', sortOrder: 9 },
  ]

  for (const item of menuItems) {
    // Find linked product
    const product = await prisma.product.findFirst({ where: { sku: item.sku } })

    // Check if menu item already exists
    const existing = await prisma.menuItem.findFirst({
      where: { name: item.name, categoryId: item.categoryId },
    })

    const isAvailable = product ? product.stockQuantity > 0 : true

    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          price: item.price,
          productId: product?.id ?? null,
          sortOrder: item.sortOrder,
          isAvailable,
        },
      })
    } else {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          price: item.price,
          categoryId: item.categoryId,
          productId: product?.id ?? null,
          sortOrder: item.sortOrder,
          isAvailable,
        },
      })
    }
  }
  console.log(`  ✓ ${menuItems.length} menu items`)

  // ════════════════════════════════════════════
  // 4. PRICING RULES (từ dữ liệu dịch vụ)
  //    Phòng bé: 40,000 VNĐ/giờ
  //    Phòng lớn: 50,000 VNĐ/giờ
  // ════════════════════════════════════════════

  const roomTypeSmall = await prisma.roomType.findFirst({ where: { name: 'Phòng nhỏ' } })
  const roomTypeLarge = await prisma.roomType.findFirst({ where: { name: 'Phòng lớn' } })

  if (roomTypeSmall) {
    // Off-peak (12:00 - 17:00)
    await prisma.pricingRule.updateMany({
      where: { roomTypeId: roomTypeSmall.id, name: { contains: 'Off-peak' } },
      data: { pricePerHour: 40000 },
    })
    // Peak (17:00 - 05:00)
    await prisma.pricingRule.updateMany({
      where: { roomTypeId: roomTypeSmall.id, name: { contains: 'Peak' } },
      data: { pricePerHour: 40000 },
    })
    console.log('  ✓ Giá phòng nhỏ: 40,000 VNĐ/giờ')
  }

  if (roomTypeLarge) {
    // Off-peak (12:00 - 17:00)
    await prisma.pricingRule.updateMany({
      where: { roomTypeId: roomTypeLarge.id, name: { contains: 'Off-peak' } },
      data: { pricePerHour: 50000 },
    })
    // Peak (17:00 - 05:00)
    await prisma.pricingRule.updateMany({
      where: { roomTypeId: roomTypeLarge.id, name: { contains: 'Peak' } },
      data: { pricePerHour: 50000 },
    })
    console.log('  ✓ Giá phòng lớn: 50,000 VNĐ/giờ')
  }

  console.log('\n✅ Import hoàn tất!')
  console.log('  - 8 đồ ăn (giá bán 20,000 VNĐ)')
  console.log('  - 9 đồ uống (giá bán 10,000 - 30,000 VNĐ)')
  console.log('  - Phòng nhỏ: 40,000 VNĐ/giờ')
  console.log('  - Phòng lớn: 50,000 VNĐ/giờ')
}

main()
  .catch((e) => {
    console.error('Lỗi import:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
