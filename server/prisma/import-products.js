/**
 * Import sản phẩm + menu items từ file Excel KiotViet.
 *
 * Usage in container:
 *   docker cp DanhSachSanPham.xlsx musicbox-app:/tmp/products.xlsx
 *   docker exec -it musicbox-app node prisma/import-products.js /tmp/products.xlsx
 *
 * Idempotent: dùng `sku` (Mã hàng) để upsert Product. MenuItem upsert theo
 * (name, categoryId) — nếu cùng tên trong cùng category thì update.
 *
 * Bỏ qua dòng `Loại hàng = Dịch vụ` (giờ vào phòng) — đã được seed như
 * PricingRule, không phải sản phẩm bán lẻ.
 */

const path = require('path')
const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')

const prisma = new PrismaClient()

function asString(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

function asNumber(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function asInt(v) {
  return Math.round(asNumber(v))
}

async function getOrCreateCategory(name, sortOrder) {
  let cat = await prisma.menuCategory.findUnique({ where: { name } })
  if (!cat) {
    cat = await prisma.menuCategory.create({ data: { name, sortOrder } })
    console.log(`  + Tạo category: ${name}`)
  }
  return cat
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: node import-products.js <path-to-xlsx>')
    process.exit(1)
  }

  console.log(`Reading ${path.resolve(filePath)}…`)
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  console.log(`Found ${rows.length} rows\n`)

  // Pre-create the menu categories used in the data so MenuItem upsert
  // can resolve categoryId without a per-row lookup race.
  const categoryNames = [...new Set(rows.map((r) => asString(r['Loại thực đơn'])).filter(Boolean))]
  const categoryMap = {}
  let order = 1
  for (const name of categoryNames) {
    if (name === 'Khác') continue // dịch vụ — không cần menu
    categoryMap[name] = await getOrCreateCategory(name, order++)
  }

  let productInserted = 0
  let productUpdated = 0
  let menuInserted = 0
  let menuUpdated = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    const loaiHang = asString(row['Loại hàng'])
    const sku = asString(row['Mã hàng'])
    const name = asString(row['Tên hàng hóa'])
    const menuType = asString(row['Loại thực đơn'])

    // Bỏ qua dịch vụ giờ vào phòng (đã trong PricingRule)
    if (loaiHang === 'Dịch vụ' || menuType === 'Khác') {
      skipped++
      continue
    }
    if (!sku || !name) {
      skipped++
      continue
    }

    const productData = {
      sku,
      name,
      category: menuType, // dùng "Loại thực đơn" làm phân loại kho cho dễ
      unit: asString(row['ĐVT']) || 'cái',
      packSize: asInt(row['Quy đổi']) || 1,
      costPrice: asNumber(row['Giá vốn']),
      stockQuantity: asInt(row['Tồn kho']),
      minStock: asInt(row['Tồn nhỏ nhất']),
      isActive: asInt(row['Đang kinh doanh']) !== 0,
    }

    try {
      // ── Upsert Product ──
      let product
      const existing = await prisma.product.findUnique({ where: { sku } })
      if (existing) {
        product = await prisma.product.update({ where: { sku }, data: productData })
        productUpdated++
      } else {
        product = await prisma.product.create({ data: productData })
        productInserted++
      }

      // ── Upsert MenuItem (chỉ khi sản phẩm "Được bán trực tiếp") ──
      const sellable = asInt(row['Được bán trực tiếp']) !== 0
      const cat = categoryMap[menuType]
      if (sellable && cat) {
        const menuData = {
          name,
          price: asNumber(row['Giá bán']),
          categoryId: cat.id,
          productId: product.id,
          isAvailable: true,
        }
        const existingMenu = await prisma.menuItem.findFirst({
          where: { name, categoryId: cat.id },
        })
        if (existingMenu) {
          await prisma.menuItem.update({ where: { id: existingMenu.id }, data: menuData })
          menuUpdated++
        } else {
          await prisma.menuItem.create({ data: menuData })
          menuInserted++
        }
      }

      console.log(`  ✓ ${sku.padEnd(12)} ${name}`)
    } catch (err) {
      errors++
      console.error(`  ✗ ${sku}:`, err && err.message ? err.message : err)
    }
  }

  console.log('\n──────────────────────────────')
  console.log(`📦 Products    inserted: ${productInserted}, updated: ${productUpdated}`)
  console.log(`🍽  Menu items  inserted: ${menuInserted}, updated: ${menuUpdated}`)
  console.log(`⏭  Skipped:    ${skipped}`)
  console.log(`❌ Errors:     ${errors}`)
  console.log('──────────────────────────────\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
