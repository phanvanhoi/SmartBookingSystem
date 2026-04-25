#!/bin/sh
set -e

echo "🎵 Music Box Manager - Starting..."

# ── Volume ownership fix ─────────────────────────────────────────────────────
# Named volumes mounted on /app/{data,uploads,logs} may be owned by root
# (eg. created by a previous root-running image). The unprivileged `node`
# user can't write to them as-is. Run as root briefly to chown, then drop
# privileges via su-exec for the rest of the script.
if [ "$(id -u)" = "0" ]; then
  for d in data uploads logs uploads/qr uploads/products; do
    mkdir -p "/app/$d"
    chown -R node:node "/app/$d"
  done
  echo "🔐 Re-executing as node user…"
  exec su-exec node:node "$0" "$@"
fi

# ── Schema sync ──────────────────────────────────────────────────────────────
# `prisma db push` (without --accept-data-loss) will refuse to make destructive
# changes — it only adds new tables/columns. If the schema diverges in a way
# that would drop data, the container exits and you must reconcile manually.
echo "📦 Syncing database schema..."
npx prisma db push --schema=prisma/schema.prisma --skip-generate

# ── Seed (idempotent) ────────────────────────────────────────────────────────
echo "🌱 Checking seed data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function seed() {
  const count = await p.user.count();
  if (count > 0) {
    console.log('  → Database has data, skipping seed.');
    return;
  }
  console.log('  → Seeding database...');

  const small = await p.roomType.create({ data: { name: 'Phòng nhỏ', capacityMin: 4, capacityMax: 8 } });
  const large = await p.roomType.create({ data: { name: 'Phòng lớn', capacityMin: 10, capacityMax: 20 } });

  for (let i = 1; i <= 7; i++) await p.room.create({ data: { name: 'Phòng ' + i, roomTypeId: small.id, sortOrder: i } });
  for (let i = 8; i <= 10; i++) await p.room.create({ data: { name: 'Phòng ' + i, roomTypeId: large.id, sortOrder: i } });

  const hash = await bcrypt.hash('admin123', 12);
  await p.user.create({ data: { username: 'admin', password: hash, fullName: 'Chủ quán', role: 'OWNER' } });

  const cats = ['Đồ ăn', 'Đồ uống'];
  for (let i = 0; i < cats.length; i++) await p.menuCategory.create({ data: { name: cats[i], sortOrder: i + 1 } });

  // Pricing: small 40k off-peak / 60k peak; large 50k off-peak / 80k peak.
  // Peak ends at 12:00 next day (NOT 05:00) so 05:00–12:00 isn't a 0đ gap.
  const rules = [
    { roomTypeId: small.id, name: 'Off-peak nhỏ', timeStart: '12:00', timeEnd: '17:00', pricePerHour: 40000 },
    { roomTypeId: small.id, name: 'Peak nhỏ', timeStart: '17:00', timeEnd: '12:00', pricePerHour: 60000 },
    { roomTypeId: large.id, name: 'Off-peak lớn', timeStart: '12:00', timeEnd: '17:00', pricePerHour: 50000 },
    { roomTypeId: large.id, name: 'Peak lớn', timeStart: '17:00', timeEnd: '12:00', pricePerHour: 80000 },
  ];
  for (const r of rules) await p.pricingRule.create({ data: { ...r, dayOfWeek: '[]' } });

  const settings = [
    { key: 'store_name', value: 'Music Box' },
    { key: 'operating_hours', value: JSON.stringify({ open: '12:00', close: '05:00' }) },
    { key: 'qr_code_1', value: JSON.stringify({ path: '', label: 'QR 1' }) },
    { key: 'qr_code_2', value: JSON.stringify({ path: '', label: 'QR 2' }) },
    { key: 'min_duration_minutes', value: 0 },
    { key: 'billing_round_minutes', value: 5 },
    { key: 'bill_round_amount', value: 1000 },
    { key: 'warning_before_minutes', value: 15 },
    { key: 'currency', value: 'VNĐ' },
    { key: 'timezone', value: 'Asia/Ho_Chi_Minh' },
    { key: 'points_per_amount', value: JSON.stringify({ amount: 100000, points: 1 }) },
    { key: 'max_discount_percent_cashier', value: 10 },
  ];
  for (const s of settings) await p.setting.create({ data: { key: s.key, value: s.value } });

  console.log('  ✅ Seed complete!');
}

seed().catch(e => { console.error('Seed error:', e); process.exit(1); }).finally(() => p.\$disconnect());
"

echo "🚀 Starting server on port ${PORT:-3000}..."
exec node dist/index.js
