/**
 * Plain-JS variant of import-customers.ts so it runs in the production
 * container without needing ts-node (which trips on strict tsconfig outside
 * the src/ tree). The .ts file remains the canonical source for type-checked
 * dev runs; this mirror is what Docker actually executes.
 *
 * Usage in container:
 *   docker cp DanhSachKhachHang.xlsx musicbox-app:/tmp/customers.xlsx
 *   docker exec -it musicbox-app node prisma/import-customers.js /tmp/customers.xlsx
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

function asDate(v) {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return v
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const ms = v * 86_400_000
    const d = new Date(epoch.getTime() + ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function asPhone(v) {
  const s = asString(v)
  if (!s) return null
  const digits = s.replace(/[^\d+]/g, '')
  if (digits.length === 0) return null
  if (/^[1-9]\d{8,9}$/.test(digits)) return '0' + digits
  return digits
}

function asGender(v) {
  const s = asString(v)?.toLowerCase()
  if (!s) return null
  if (s.includes('nam') || s === 'male' || s === 'm') return 'MALE'
  if (s.includes('nữ') || s === 'female' || s === 'f') return 'FEMALE'
  return 'OTHER'
}

function asCustomerType(v) {
  const s = asString(v)?.toLowerCase()
  if (s && (s.includes('công ty') || s.includes('cong ty'))) return 'COMPANY'
  return 'INDIVIDUAL'
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: node import-customers.js <path-to-xlsx>')
    process.exit(1)
  }

  const absPath = path.resolve(filePath)
  console.log(`Reading ${absPath}…`)
  const wb = XLSX.readFile(absPath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  console.log(`Found ${rows.length} rows`)

  let inserted = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const importedAt = new Date()

  for (const row of rows) {
    const code = asString(row['Mã khách hàng'])
    const name = asString(row['Tên khách hàng'])

    if (!code || !name) {
      skipped++
      continue
    }

    const data = {
      code,
      name,
      phone: asPhone(row['Điện thoại']),
      birthday: asDate(row['Ngày sinh']),
      gender: asGender(row['Giới tính']),
      email: asString(row['Email']),
      customerType: asCustomerType(row['Loại khách']),
      address: asString(row['Địa chỉ']),
      ward: asString(row['Phường/Xã']),
      region: asString(row['Khu vực']),
      company: asString(row['Công ty']),
      taxCode: asString(row['Mã số thuế']),
      customerGroup: asString(row['Nhóm khách hàng']),
      totalSpent: asNumber(row['Tổng bán trừ trả hàng']) || asNumber(row['Tổng bán']),
      currentDebt: asNumber(row['Nợ cần thu hiện tại']),
      lastVisit: asDate(row['Ngày giao dịch cuối']),
      notes: asString(row['Ghi chú']),
      branch: asString(row['Chi nhánh']),
      createdByName: asString(row['Người tạo']),
      isActive: asNumber(row['Trạng thái']) !== 0,
      importedAt,
    }

    try {
      const existing = await prisma.customer.findUnique({ where: { code } })
      if (existing) {
        await prisma.customer.update({ where: { code }, data })
        updated++
      } else {
        await prisma.customer.create({ data })
        inserted++
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err)
      // Phone uniqueness collision — retry without phone so we don't lose row.
      if (msg.includes('Unique constraint') && msg.includes('phone') && data.phone) {
        try {
          const retry = { ...data, phone: null }
          const existing = await prisma.customer.findUnique({ where: { code } })
          if (existing) {
            await prisma.customer.update({ where: { code }, data: retry })
            updated++
          } else {
            await prisma.customer.create({ data: retry })
            inserted++
          }
          console.warn(`  ⚠ phone conflict for ${code}, imported without phone`)
          continue
        } catch (e2) {
          errors++
          console.error(`  ✗ ${code}:`, e2 && e2.message ? e2.message : e2)
          continue
        }
      }
      errors++
      console.error(`  ✗ ${code}:`, msg)
    }

    if ((inserted + updated) % 500 === 0 && inserted + updated > 0) {
      console.log(`  … ${inserted + updated}/${rows.length}`)
    }
  }

  console.log('\n──────────────────────────────')
  console.log(`✅ Inserted: ${inserted}`)
  console.log(`🔄 Updated:  ${updated}`)
  console.log(`⏭  Skipped:  ${skipped} (no code/name)`)
  console.log(`❌ Errors:   ${errors}`)
  console.log('──────────────────────────────\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
