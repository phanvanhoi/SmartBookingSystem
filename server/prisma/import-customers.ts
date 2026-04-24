/**
 * Import khách hàng từ file Excel xuất từ KiotViet/legacy POS.
 *
 * Usage (trên VPS, trong container):
 *   1. Copy file Excel vào container:
 *        docker cp DanhSachKhachHang.xlsx musicbox-app:/tmp/customers.xlsx
 *   2. Chạy:
 *        docker exec -it musicbox-app sh -c \
 *          "cd /app && node -e \"require('xlsx');\" 2>/dev/null || npm install --no-save xlsx"
 *        docker exec -it musicbox-app sh -c "cd /app && npx tsx prisma/import-customers.ts /tmp/customers.xlsx"
 *
 * Local dev:
 *   cd server && npx tsx prisma/import-customers.ts ../DanhSachKhachHang.xlsx
 *
 * Idempotent: dùng `code` (mã KH như KH006384) làm key để upsert.
 * Dòng nào không có code → bỏ qua (không thể đảm bảo idempotency).
 */
import { PrismaClient, type CustomerType, type Gender } from '@prisma/client'
import * as XLSX from 'xlsx'
import path from 'path'

const prisma = new PrismaClient()

// Excel chứa columns tiếng Việt — map sang field DB
type Row = {
  'Loại khách'?: string
  'Chi nhánh'?: string
  'Mã khách hàng'?: string
  'Tên khách hàng'?: string
  'Điện thoại'?: string | number
  'Địa chỉ'?: string
  'Khu vực'?: string
  'Phường/Xã'?: string
  'Công ty'?: string
  'Mã số thuế'?: string
  'Ngày sinh'?: string | number
  'Giới tính'?: string
  Email?: string
  'Nhóm khách hàng'?: string
  'Ghi chú'?: string
  'Người tạo'?: string
  'Ngày tạo'?: string | number
  'Ngày giao dịch cuối'?: string | number
  'Nợ cần thu hiện tại'?: string | number
  'Tổng bán'?: string | number
  'Tổng bán trừ trả hàng'?: string | number
  'Trạng thái'?: string | number
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

// Excel stores dates as serial numbers (days since 1900-01-01). Convert to Date.
function asDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return v
  if (typeof v === 'number') {
    // Excel epoch: Jan 1, 1900 (with the famous 1900 leap-year bug — XLSX lib
    // already accounts for it via SSF). Use sheet_to_json with raw:false for
    // proper date strings, or do the math here:
    const epoch = new Date(Date.UTC(1899, 11, 30)) // Dec 30, 1899
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

function asPhone(v: unknown): string | null {
  const s = asString(v)
  if (!s) return null
  // Strip non-digits but keep leading + (international). KiotViet sometimes
  // exports phones as numbers, losing the leading 0 — pad it back.
  const digits = s.replace(/[^\d+]/g, '')
  if (digits.length === 0) return null
  if (/^[1-9]\d{8,9}$/.test(digits)) return '0' + digits // missing leading 0
  return digits
}

function asGender(v: unknown): Gender | null {
  const s = asString(v)?.toLowerCase()
  if (!s) return null
  if (s.includes('nam') || s === 'male' || s === 'm') return 'MALE'
  if (s.includes('nữ') || s === 'female' || s === 'f') return 'FEMALE'
  return 'OTHER'
}

function asCustomerType(v: unknown): CustomerType {
  const s = asString(v)?.toLowerCase()
  if (s?.includes('công ty') || s?.includes('cong ty')) return 'COMPANY'
  return 'INDIVIDUAL'
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: tsx import-customers.ts <path-to-xlsx>')
    process.exit(1)
  }

  const absPath = path.resolve(filePath)
  console.log(`Reading ${absPath}…`)
  const wb = XLSX.readFile(absPath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' })
  console.log(`Found ${rows.length} rows`)

  let inserted = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const importedAt = new Date()

  for (const row of rows) {
    const code = asString(row['Mã khách hàng'])
    const name = asString(row['Tên khách hàng'])

    if (!code) {
      skipped++
      continue
    }
    if (!name) {
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
      // Most common error: phone uniqueness collision (two POS rows share a
      // phone number). Retry without phone so we don't lose the record.
      if (
        err instanceof Error &&
        err.message.includes('Unique constraint') &&
        err.message.includes('phone') &&
        data.phone
      ) {
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
          console.error(`  ✗ ${code}:`, e2 instanceof Error ? e2.message : e2)
          continue
        }
      }
      errors++
      console.error(`  ✗ ${code}:`, err instanceof Error ? err.message : err)
    }

    if ((inserted + updated) % 500 === 0) {
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
