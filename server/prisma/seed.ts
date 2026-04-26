import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // ── Room Types ──
  console.log('Seeding room types...')
  const roomTypeSmall = await prisma.roomType.upsert({
    where: { name: 'Phòng nhỏ' },
    update: {},
    create: {
      name: 'Phòng nhỏ',
      capacityMin: 4,
      capacityMax: 8,
      description: 'Phòng dành cho nhóm nhỏ 4-8 người',
    },
  })

  const roomTypeLarge = await prisma.roomType.upsert({
    where: { name: 'Phòng lớn' },
    update: {},
    create: {
      name: 'Phòng lớn',
      capacityMin: 10,
      capacityMax: 20,
      description: 'Phòng dành cho nhóm lớn 10-20 người',
    },
  })

  // ── Rooms ──
  console.log('Seeding rooms...')
  const roomsData = [
    { name: 'Phòng 1', roomTypeId: roomTypeSmall.id, sortOrder: 1 },
    { name: 'Phòng 2', roomTypeId: roomTypeSmall.id, sortOrder: 2 },
    { name: 'Phòng 3', roomTypeId: roomTypeSmall.id, sortOrder: 3 },
    { name: 'Phòng 4', roomTypeId: roomTypeSmall.id, sortOrder: 4 },
    { name: 'Phòng 5', roomTypeId: roomTypeSmall.id, sortOrder: 5 },
    { name: 'Phòng 6', roomTypeId: roomTypeSmall.id, sortOrder: 6 },
    { name: 'Phòng 7', roomTypeId: roomTypeSmall.id, sortOrder: 7 },
    { name: 'Phòng 8', roomTypeId: roomTypeLarge.id, sortOrder: 8 },
    { name: 'Phòng 9', roomTypeId: roomTypeLarge.id, sortOrder: 9 },
    { name: 'Phòng 10', roomTypeId: roomTypeLarge.id, sortOrder: 10 },
  ]

  for (const room of roomsData) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    })
  }

  // ── Admin User ──
  console.log('Seeding admin user...')
  const hashedPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Chủ quán',
      role: 'OWNER',
    },
  })

  // ── Menu Categories ──
  console.log('Seeding menu categories...')
  const categoriesData = [
    { name: 'Bia', sortOrder: 1 },
    { name: 'Nước ngọt', sortOrder: 2 },
    { name: 'Nước ép', sortOrder: 3 },
    { name: 'Đồ ăn nhẹ', sortOrder: 4 },
    { name: 'Trái cây', sortOrder: 5 },
    { name: 'Combo', sortOrder: 6 },
  ]

  for (const category of categoriesData) {
    await prisma.menuCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    })
  }

  // ── Pricing Rules ──
  // Off-peak (12:00–17:00) + Peak (17:00 → 12:00 next day) cover 24h fully.
  // Critical: nếu để gap (vd 05:00→12:00 không có rule), khách check-in trong
  // khung đó sẽ tính 0đ/h (rule lookup không match → fallback 0). Cover 24h
  // tránh bug đó hoàn toàn.
  console.log('Seeding pricing rules...')
  const pricingRulesData = [
    {
      roomTypeId: roomTypeSmall.id,
      name: 'Off-peak nhỏ',
      timeStart: '12:00',
      timeEnd: '17:00',
      pricePerHour: 40_000,
      dayOfWeek: '[]',
    },
    {
      roomTypeId: roomTypeSmall.id,
      name: 'Peak nhỏ',
      timeStart: '17:00',
      timeEnd: '12:00', // overnight + early morning, giáp Off-peak
      pricePerHour: 60_000,
      dayOfWeek: '[]',
    },
    {
      roomTypeId: roomTypeLarge.id,
      name: 'Off-peak lớn',
      timeStart: '12:00',
      timeEnd: '17:00',
      pricePerHour: 50_000,
      dayOfWeek: '[]',
    },
    {
      roomTypeId: roomTypeLarge.id,
      name: 'Peak lớn',
      timeStart: '17:00',
      timeEnd: '12:00',
      pricePerHour: 80_000,
      dayOfWeek: '[]',
    },
  ]

  for (const rule of pricingRulesData) {
    const existing = await prisma.pricingRule.findFirst({
      where: {
        roomTypeId: rule.roomTypeId,
        name: rule.name,
      },
    })
    if (!existing) {
      await prisma.pricingRule.create({ data: rule })
    }
  }

  // ── Default Settings ──
  console.log('Seeding settings...')
  const settingsData = [
    {
      key: 'store_name',
      value: 'Music Box' as unknown as object,
      description: 'Tên quán',
    },
    {
      key: 'store_address',
      value: '' as unknown as object,
      description: 'Địa chỉ',
    },
    {
      key: 'operating_hours',
      value: { open: '12:00', close: '05:00' },
      description: 'Giờ hoạt động',
    },
    {
      key: 'qr_code_1',
      value: { path: '', label: 'QR Mã 1 (trước 00:00)' },
      description: 'QR thanh toán trước nửa đêm',
    },
    {
      key: 'qr_code_2',
      value: { path: '', label: 'QR Mã 2 (từ 00:00)' },
      description: 'QR thanh toán sau nửa đêm',
    },
    {
      key: 'min_duration_minutes',
      // 0 = bill exact elapsed time (chủ quán muốn tính theo giờ thực tế).
      // Increase via Settings UI nếu sau này muốn thu tối thiểu 1 ngưỡng.
      value: 0 as unknown as object,
      description: 'Thời gian hát tối thiểu (phút) — 0 = tính chính xác theo giờ',
    },
    {
      key: 'billing_round_minutes',
      // Làm tròn lên (ceil) thời gian tính tiền. 5 = mỗi 5 phút là một block,
      // khách hát 47 phút sẽ tính 50 phút. 0 = không làm tròn.
      value: 5 as unknown as object,
      description: 'Làm tròn thời gian tính tiền (phút) — 0 = không làm tròn, 5 = mỗi 5 phút',
    },
    {
      key: 'bill_round_amount',
      // Làm tròn LÊN tổng tiền cuối (ceil) cho gọn — vd 45,333 → 46,000
      // với step=1000. Đặt 0 nếu muốn giữ chính xác.
      value: 1000 as unknown as object,
      description: 'Làm tròn tổng tiền (VNĐ) — 0 = không làm tròn, 1000 = lên gần nhất nghìn',
    },
    {
      key: 'business_day_start_hour',
      // Một "ngày kinh doanh" bắt đầu lúc N giờ trưa (12 = 12h trưa). Hóa đơn
      // tạo từ 12h trưa hôm nay đến 5h sáng hôm sau được tính cho cùng 1 ngày.
      value: 12 as unknown as object,
      description: 'Giờ bắt đầu ngày kinh doanh (0–23, mặc định 12)',
    },
    {
      key: 'business_day_end_hour',
      // Kết thúc ngày kinh doanh — phải nhỏ hơn start_hour để window cross-midnight.
      // 5 = 5h sáng hôm sau.
      value: 5 as unknown as object,
      description: 'Giờ kết thúc ngày kinh doanh (0–23, < start_hour = qua đêm; mặc định 5)',
    },
    {
      key: 'warning_before_minutes',
      value: 15 as unknown as object,
      description: 'Cảnh báo trước khi hết giờ (phút)',
    },
    {
      key: 'currency',
      value: 'VNĐ' as unknown as object,
      description: 'Đơn vị tiền tệ',
    },
    {
      key: 'timezone',
      value: 'Asia/Ho_Chi_Minh' as unknown as object,
      description: 'Múi giờ',
    },
    {
      key: 'points_per_amount',
      value: { amount: 100000, points: 1 },
      description: 'Quy tắc tích điểm',
    },
    {
      key: 'max_discount_percent_cashier',
      value: 10 as unknown as object,
      description: '% giảm giá tối đa cho thu ngân',
    },
  ]

  for (const setting of settingsData) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
