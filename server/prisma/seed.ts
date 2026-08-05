import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // ── Room Types ──
  console.log('Seeding room types...')
  const roomTypeSmall = await prisma.roomType.upsert({
    where: { name: 'Phòng nhỏ' },
    update: {
      capacityMin: 1,
      capacityMax: 3,
      description: 'Phòng bé (1–7): 1–3 người',
    },
    create: {
      name: 'Phòng nhỏ',
      capacityMin: 1,
      capacityMax: 3,
      description: 'Phòng bé (1–7): 1–3 người',
    },
  })

  const roomTypeLarge = await prisma.roomType.upsert({
    where: { name: 'Phòng lớn' },
    update: {
      capacityMin: 4,
      capacityMax: 7,
      description: 'Phòng lớn (8–10): 4–7 người',
    },
    create: {
      name: 'Phòng lớn',
      capacityMin: 4,
      capacityMax: 7,
      description: 'Phòng lớn (8–10): 4–7 người',
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
      key: 'store_maps_url',
      value: 'https://maps.app.goo.gl/T7DjUWd4TV5bnfxP8' as unknown as object,
      description: 'Link Google Maps quán',
    },
    {
      key: 'store_phone',
      value: '0375228278' as unknown as object,
      description: 'Số điện thoại liên hệ quán',
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

  // ── Spin campaigns theo loại phòng ──
  console.log('Seeding spin campaigns...')

  // Tắt campaign cũ (không gắn loại phòng)
  await prisma.spinCampaign.updateMany({
    where: { roomTypeId: null, isActive: true },
    data: { isActive: false },
  })

  const smallPrizes = [
    {
      label: 'Giảm ngay 25% tiền giờ hát',
      prizeType: 'PERCENT_OFF' as const,
      prizeValue: '25',
      weight: 20,
      color: '#12d6a0',
      sortOrder: 1,
    },
    {
      label: 'SIÊU HOT · Giảm 50% tiền giờ hát',
      prizeType: 'PERCENT_OFF' as const,
      prizeValue: '50',
      weight: 50,
      color: '#ff3d7a',
      sortOrder: 2,
    },
    {
      label: 'Combo miễn phí: 1 khô + 1 nước suối',
      prizeType: 'FREE_ITEM' as const,
      prizeValue: '1 khô gà/bò + 1 nước suối',
      weight: 10,
      color: '#ffc53d',
      sortOrder: 3,
    },
    {
      label: 'Combo miễn phí: 2 khô gà/bò',
      prizeType: 'FREE_ITEM' as const,
      prizeValue: '2 khô gà/bò',
      weight: 10,
      color: '#ff8a3d',
      sortOrder: 4,
    },
    {
      label: 'Combo miễn phí: Coca + nước suối',
      prizeType: 'FREE_ITEM' as const,
      prizeValue: '1 coca + 1 nước suối',
      weight: 10,
      color: '#3d9eff',
      sortOrder: 5,
    },
  ]

  const largePrizes = [
    {
      label: 'Giảm ngay 10% tiền giờ hát',
      prizeType: 'PERCENT_OFF' as const,
      prizeValue: '10',
      weight: 20,
      color: '#12d6a0',
      sortOrder: 1,
    },
    {
      label: 'HOT · Giảm 25% tiền giờ hát',
      prizeType: 'PERCENT_OFF' as const,
      prizeValue: '25',
      weight: 50,
      color: '#ff3d7a',
      sortOrder: 2,
    },
    {
      label: 'Combo miễn phí: 2 khô + 1 nước suối',
      prizeType: 'FREE_ITEM' as const,
      prizeValue: '2 khô gà/bò + 1 nước suối',
      weight: 10,
      color: '#ffc53d',
      sortOrder: 3,
    },
    {
      label: 'Combo miễn phí: 1 khô + 2 Coca',
      prizeType: 'FREE_ITEM' as const,
      prizeValue: '1 khô gà/bò + 2 coca',
      weight: 10,
      color: '#ff8a3d',
      sortOrder: 4,
    },
    {
      label: 'Combo miễn phí: 2 Coca + nước suối',
      prizeType: 'FREE_ITEM' as const,
      prizeValue: '2 coca + 1 nước suối',
      weight: 10,
      color: '#3d9eff',
      sortOrder: 5,
    },
  ]

  async function syncCampaign(args: {
    name: string
    roomTypeId: number
    prizes: typeof smallPrizes
  }) {
    const campaign = await prisma.spinCampaign.upsert({
      where: { roomTypeId: args.roomTypeId },
      update: { name: args.name, isActive: true },
      create: {
        name: args.name,
        roomTypeId: args.roomTypeId,
        isActive: true,
      },
    })

    await prisma.spinPrize.deleteMany({ where: { campaignId: campaign.id } })
    for (const prize of args.prizes) {
      await prisma.spinPrize.create({
        data: { campaignId: campaign.id, ...prize },
      })
    }
    return campaign
  }

  await syncCampaign({
    name: 'KM Phòng bé (1–7)',
    roomTypeId: roomTypeSmall.id,
    prizes: smallPrizes,
  })
  await syncCampaign({
    name: 'KM Phòng lớn (8–10)',
    roomTypeId: roomTypeLarge.id,
    prizes: largePrizes,
  })

  // ── Menu + kho cho quà vòng quay (trừ tồn khi checkout) ──
  console.log('Seeding promo menu items...')
  const snackCat = await prisma.menuCategory.findUnique({ where: { name: 'Đồ ăn nhẹ' } })
  const drinkCat = await prisma.menuCategory.findUnique({ where: { name: 'Nước ngọt' } })
  if (snackCat && drinkCat) {
    const promoProducts = [
      {
        sku: 'PROMO-COCA',
        name: 'Coca',
        category: 'Nước ngọt',
        unit: 'lon',
        costPrice: 8000,
        sellPrice: 20000,
        stock: 200,
        menuCategoryId: drinkCat.id,
      },
      {
        sku: 'PROMO-SUOI',
        name: 'Nước suối',
        category: 'Nước ngọt',
        unit: 'chai',
        costPrice: 3000,
        sellPrice: 10000,
        stock: 300,
        menuCategoryId: drinkCat.id,
      },
      {
        sku: 'PROMO-KHO',
        name: 'Khô gà/bò',
        category: 'Đồ ăn nhẹ',
        unit: 'gói',
        costPrice: 15000,
        sellPrice: 35000,
        stock: 150,
        menuCategoryId: snackCat.id,
      },
    ]

    for (const item of promoProducts) {
      const product = await prisma.product.upsert({
        where: { sku: item.sku },
        update: {
          name: item.name,
          stockQuantity: item.stock,
          isActive: true,
        },
        create: {
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          costPrice: item.costPrice,
          stockQuantity: item.stock,
          minStock: 20,
          isActive: true,
        },
      })

      const existingMenu = await prisma.menuItem.findFirst({
        where: { productId: product.id },
      })
      if (existingMenu) {
        await prisma.menuItem.update({
          where: { id: existingMenu.id },
          data: {
            name: item.name,
            price: item.sellPrice,
            isAvailable: true,
            categoryId: item.menuCategoryId,
          },
        })
      } else {
        await prisma.menuItem.create({
          data: {
            name: item.name,
            price: item.sellPrice,
            categoryId: item.menuCategoryId,
            productId: product.id,
            isAvailable: true,
            sortOrder: 1,
          },
        })
      }
    }
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
