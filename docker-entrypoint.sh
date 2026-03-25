#!/bin/sh

echo "🎵 Music Box Manager - Starting..."

# Create database tables
echo "📦 Creating database tables..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

# Seed if database is empty
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

  // Room types
  const small = await p.roomType.create({ data: { name: 'Phòng nhỏ', capacityMin: 4, capacityMax: 8 } });
  const large = await p.roomType.create({ data: { name: 'Phòng lớn', capacityMin: 10, capacityMax: 20 } });

  // 10 rooms
  for (let i = 1; i <= 7; i++) await p.room.create({ data: { name: 'Phòng ' + i, roomTypeId: small.id, sortOrder: i } });
  for (let i = 8; i <= 10; i++) await p.room.create({ data: { name: 'Phòng ' + i, roomTypeId: large.id, sortOrder: i } });

  // Admin user
  const hash = await bcrypt.hash('admin123', 12);
  await p.user.create({ data: { username: 'admin', password: hash, fullName: 'Chủ quán', role: 'OWNER' } });

  // Menu categories
  const cats = ['Đồ ăn', 'Đồ uống'];
  for (let i = 0; i < cats.length; i++) await p.menuCategory.create({ data: { name: cats[i], sortOrder: i + 1 } });

  // Pricing rules
  const rules = [
    { roomTypeId: small.id, name: 'Off-peak nhỏ', timeStart: '12:00', timeEnd: '17:00', pricePerHour: 40000 },
    { roomTypeId: small.id, name: 'Peak nhỏ', timeStart: '17:00', timeEnd: '05:00', pricePerHour: 40000 },
    { roomTypeId: large.id, name: 'Off-peak lớn', timeStart: '12:00', timeEnd: '17:00', pricePerHour: 50000 },
    { roomTypeId: large.id, name: 'Peak lớn', timeStart: '17:00', timeEnd: '05:00', pricePerHour: 50000 },
  ];
  for (const r of rules) await p.pricingRule.create({ data: { ...r, dayOfWeek: '[]' } });

  // Default settings
  const settings = [
    { key: 'store_name', value: 'Music Box' },
    { key: 'operating_hours', value: JSON.stringify({ open: '12:00', close: '05:00' }) },
    { key: 'qr_code_1', value: JSON.stringify({ path: '', label: 'QR 1' }) },
    { key: 'qr_code_2', value: JSON.stringify({ path: '', label: 'QR 2' }) },
    { key: 'min_duration_minutes', value: 60 },
    { key: 'warning_before_minutes', value: 15 },
    { key: 'currency', value: 'VNĐ' },
    { key: 'timezone', value: 'Asia/Ho_Chi_Minh' },
    { key: 'points_per_amount', value: JSON.stringify({ amount: 100000, points: 1 }) },
    { key: 'max_discount_percent_cashier', value: 10 },
  ];
  for (const s of settings) await p.setting.create({ data: { key: s.key, value: s.value } });

  console.log('  ✅ Seed complete!');
}

seed().catch(e => console.error('Seed error:', e)).finally(() => p.\$disconnect());
"

echo "🚀 Starting server on port ${PORT:-3000}..."
exec node dist/index.js
