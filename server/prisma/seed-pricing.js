/**
 * Reseed pricing rules from the IKA Music Box price board (April 2026).
 *
 * Plain CommonJS version — runnable inside the production container which
 * doesn't ship ts-node (image installs `--omit=dev`). Mirrors the logic
 * of seed-pricing.ts; keep both in sync if either is edited.
 *
 * Usage on VPS (Docker):
 *   cd /opt/SmartBookingSystem
 *   git pull
 *   docker compose up -d --build           # rebuild so the new file is in the image
 *   docker exec musicbox-app node prisma/seed-pricing.js
 *
 * The container has DATABASE_URL set via docker-compose.yml
 * (file:/app/data/musicbox.db), so no .env loading is needed here.
 *
 * What it does:
 *   1. Find the two existing RoomTypes ("Phòng nhỏ" / "Phòng lớn").
 *   2. Delete every PricingRule attached to them.
 *   3. Insert 12 new rules: 2 sizes × 3 time slots × 2 day groups (T2-T6,T7-CN).
 *
 * Time slots cover [00:00 → 24:00) without gaps; the night slot wraps past
 * midnight (18:00 → 05:00) so a Friday-night session billing into Saturday
 * morning stays on the night rate. pricing.service.ts does per-minute
 * day-of-week lookup, so a Fri→Sat overnight session correctly switches
 * from T2-T6 to T7-CN at midnight.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ── Day groups ──────────────────────────────────────────────────────────────
const WEEKDAYS = JSON.stringify([1, 2, 3, 4, 5])
const WEEKEND = JSON.stringify([0, 6])

// ── Time slots ──────────────────────────────────────────────────────────────
const SLOTS = [
  { label: 'Trước 14h', timeStart: '05:00', timeEnd: '14:00' },
  { label: '14h-18h', timeStart: '14:00', timeEnd: '18:00' },
  { label: '18h-5h sáng', timeStart: '18:00', timeEnd: '05:00' },
]

// ── Price matrix per the board ──────────────────────────────────────────────
const PRICES = {
  small: {
    'Trước 14h': { weekday: 40000, weekend: 50000 },
    '14h-18h': { weekday: 60000, weekend: 75000 },
    '18h-5h sáng': { weekday: 95000, weekend: 110000 },
  },
  medium: {
    'Trước 14h': { weekday: 50000, weekend: 70000 },
    '14h-18h': { weekday: 85000, weekend: 110000 },
    '18h-5h sáng': { weekday: 130000, weekend: 150000 },
  },
}

const formatK = (price) => `${price / 1000}K`

async function main() {
  console.log('🎤 Reseeding pricing rules from IKA price board…\n')

  const small = await prisma.roomType.findUnique({ where: { name: 'Phòng nhỏ' } })
  const medium = await prisma.roomType.findUnique({ where: { name: 'Phòng lớn' } })

  if (!small || !medium) {
    throw new Error(
      'Không tìm thấy RoomType "Phòng nhỏ" / "Phòng lớn". Cần chạy seed.ts trước (hoặc seed db).',
    )
  }

  const deleted = await prisma.pricingRule.deleteMany({
    where: { roomTypeId: { in: [small.id, medium.id] } },
  })
  console.log(`🗑  Đã xóa ${deleted.count} pricing rule cũ\n`)

  const sizes = [
    { roomTypeId: small.id, prismaName: 'Phòng nhỏ', priceTable: PRICES.small },
    { roomTypeId: medium.id, prismaName: 'Phòng lớn', priceTable: PRICES.medium },
  ]

  const dayGroups = [
    { suffix: '(T2-T6)', dayOfWeek: WEEKDAYS, key: 'weekday' },
    { suffix: '(T7-CN)', dayOfWeek: WEEKEND, key: 'weekend' },
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
