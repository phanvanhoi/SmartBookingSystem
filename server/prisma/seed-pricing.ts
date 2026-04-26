/**
 * Reseed pricing rules from the IKA Music Box price board (April 2026).
 *
 * Naming convention: "[Loại phòng] [Khung giờ] [Giá] [(T2-T6)|(T7-CN)]"
 *   e.g. "Phòng nhỏ Trước 14h 40K (T2-T6)"
 *
 * Time slots cover the full day [00:00 → 24:00) with no gaps:
 *   00:00 → 14:00  ("Trước 14h")
 *   14:00 → 18:00  ("14h-18h")
 *   18:00 → 24:00  ("18h-24h")
 *
 * Day groups encoded as JSON arrays in PricingRule.dayOfWeek:
 *   T2-T6 (Mon–Fri) = [1,2,3,4,5]
 *   T7-CN (Sat+Sun) = [0,6]
 *
 * Run: ts-node --transpile-only prisma/seed-pricing.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'

// .env lives at the repo root, one level above server/. Load it before
// instantiating PrismaClient so DATABASE_URL is available.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Day groups ──────────────────────────────────────────────────────────────
const WEEKDAYS = JSON.stringify([1, 2, 3, 4, 5])
const WEEKEND = JSON.stringify([0, 6])

// ── Time slots ──────────────────────────────────────────────────────────────
type Slot = { label: string; timeStart: string; timeEnd: string }
const SLOTS: Slot[] = [
  { label: 'Trước 14h', timeStart: '00:00', timeEnd: '14:00' },
  { label: '14h-18h', timeStart: '14:00', timeEnd: '18:00' },
  { label: '18h-24h', timeStart: '18:00', timeEnd: '24:00' },
]

// ── Price matrix per the board ──────────────────────────────────────────────
// price[size][slot][dayGroup] = VND
const PRICES = {
  small: {
    'Trước 14h': { weekday: 40_000, weekend: 50_000 },
    '14h-18h': { weekday: 60_000, weekend: 75_000 },
    '18h-24h': { weekday: 95_000, weekend: 110_000 },
  },
  medium: {
    'Trước 14h': { weekday: 50_000, weekend: 70_000 },
    '14h-18h': { weekday: 85_000, weekend: 110_000 },
    '18h-24h': { weekday: 130_000, weekend: 150_000 },
  },
} as const

// "K" suffix (40_000 → "40K")
const formatK = (price: number) => `${price / 1000}K`

async function main() {
  console.log('🎤 Reseeding pricing rules from IKA price board…\n')

  // 1) Resolve room types. The price board maps:
  //    Small (1-3 persons)  → existing RoomType "Phòng nhỏ"
  //    Medium (4-6 persons) → existing RoomType "Phòng lớn"
  // (The board doesn't define a third tier.)
  const small = await prisma.roomType.findUnique({ where: { name: 'Phòng nhỏ' } })
  const medium = await prisma.roomType.findUnique({ where: { name: 'Phòng lớn' } })

  if (!small || !medium) {
    throw new Error(
      'Không tìm thấy RoomType "Phòng nhỏ" / "Phòng lớn". Chạy seed.ts trước.',
    )
  }

  // 2) Wipe old rules for these two room types so the result is deterministic.
  const deleted = await prisma.pricingRule.deleteMany({
    where: { roomTypeId: { in: [small.id, medium.id] } },
  })
  console.log(`🗑  Đã xóa ${deleted.count} pricing rule cũ\n`)

  // 3) Insert 12 new rules: 2 sizes × 3 slots × 2 day-groups.
  const sizes = [
    { roomTypeId: small.id, prismaName: 'Phòng nhỏ', priceTable: PRICES.small },
    { roomTypeId: medium.id, prismaName: 'Phòng lớn', priceTable: PRICES.medium },
  ] as const

  const dayGroups = [
    { suffix: '(T2-T6)', dayOfWeek: WEEKDAYS, key: 'weekday' as const },
    { suffix: '(T7-CN)', dayOfWeek: WEEKEND, key: 'weekend' as const },
  ]

  let created = 0
  for (const size of sizes) {
    for (const slot of SLOTS) {
      for (const dg of dayGroups) {
        const price = size.priceTable[slot.label][dg.key]
        const name = `${size.prismaName} ${slot.label} ${formatK(price)} ${dg.suffix}`

        await prisma.pricingRule.create({
          data: {
            roomTypeId: size.roomTypeId,
            name,
            timeStart: slot.timeStart,
            timeEnd: slot.timeEnd,
            pricePerHour: price,
            dayOfWeek: dg.dayOfWeek,
            isActive: true,
          },
        })
        console.log(`  ➕ ${name}`)
        created++
      }
    }
  }

  console.log(`\n✅ Đã tạo ${created} pricing rule.`)
}

main()
  .catch((err) => {
    console.error('❌ Lỗi:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
