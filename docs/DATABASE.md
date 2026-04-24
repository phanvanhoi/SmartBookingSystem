# MUSIC BOX MANAGER - Database Schema Design

> Version: 1.0
> Database: **SQLite** (dev + production) — see ADDENDUM below
> ORM: Prisma 6.x
> Ngày tạo: 2026-03-25
> Ngày cập nhật: 2026-04-24

---

## ⚠️ ADDENDUM (2026-04-24)

This document is the **original design**. The **shipped implementation differs**:

- **Database**: SQLite (file-backed) instead of PostgreSQL — chosen so the app
  runs without an external DB server (one container, one file, one VPS).
  All Prisma models below remain valid; only the datasource provider changes.
- **FK rules**: explicit `onDelete` rules added to every relation
  (Restrict for audit/history, Cascade for compositions, SetNull for optional
  links). Refer to `server/prisma/schema.prisma` for the authoritative list.
- **Soft delete**: `User`, `Product`, `Supplier`, and `Customer` all have
  `isActive Boolean` — prefer `isActive=false` over hard delete.
- **New tables not shown below**: `FacebookMessage` (auto-parse inbox),
  `Surcharge`, `Voucher`, `WaitingQueue`. See the live schema for shape.
- **Money**: stored as `Decimal`, computed in JS as integer VND with
  `Math.round`. No fractional dong.

The ERD and table listings below are still useful for understanding
*intent*. For the source of truth, read the schema file.

---

## 1. ENTITY RELATIONSHIP DIAGRAM (ERD)

```
┌──────────────┐       ┌───────────────┐       ┌──────────────────┐
│    Users     │       │    Shifts     │       │   AuditLogs      │
│──────────────│       │───────────────│       │──────────────────│
│ id           │◄──┐   │ id            │       │ id               │
│ username     │   │   │ opened_by  ──►│───┐   │ user_id       ──►│──┐
│ password     │   │   │ closed_by  ──►│───┤   │ action           │  │
│ full_name    │   │   │ start_time    │   │   │ entity_type      │  │
│ role         │   │   │ end_time      │   │   │ entity_id        │  │
│ phone        │   │   │ opening_cash  │   │   │ details (JSON)   │  │
│ is_active    │   │   │ closing_cash  │   │   │ created_at       │  │
│ created_at   │   │   │ status        │   │   └──────────────────┘  │
│ updated_at   │   │   │ notes         │   │                         │
└──────────────┘   │   └───────────────┘   │   ┌──────────────────┐  │
       ▲           │                       │   │   Notifications  │  │
       │           │                       │   │──────────────────│  │
       │           │                       │   │ id               │  │
       │           │                       │   │ user_id       ──►│──┤
       │           │                       │   │ title            │  │
       │           │                       │   │ message          │  │
       │           │                       │   │ type             │  │
       │           │                       │   │ is_read          │  │
       │           │                       │   │ created_at       │  │
       │           │                       │   └──────────────────┘  │
       │           │                       │                         │
       │           │   ┌───────────────┐   │                         │
       │           │   │   RoomTypes   │   │                         │
       │           │   │───────────────│   │                         │
       │           │   │ id            │   │                         │
       │           │   │ name          │   │                         │
       │           │   │ capacity_min  │   │                         │
       │           │   │ capacity_max  │   │                         │
       │           │   │ description   │   │                         │
       │           │   └───────┬───────┘   │                         │
       │           │           │           │                         │
       │           │           ▼           │                         │
       │           │   ┌───────────────┐   │                         │
       │           │   │    Rooms      │   │                         │
       │           │   │───────────────│   │                         │
       │           ├───│ id            │   │                         │
       │           │   │ name          │   │                         │
       │           │   │ room_type_id──│───┘                         │
       │           │   │ status        │                             │
       │           │   │ sort_order    │                             │
       │           │   │ is_active     │                             │
       │           │   └───────┬───────┘                             │
       │           │           │                                     │
       │           │           ▼                                     │
       │           │   ┌──────────────────┐     ┌────────────────┐  │
       │           │   │    Sessions      │     │   Customers    │  │
       │           │   │──────────────────│     │────────────────│  │
       │           │   │ id               │     │ id             │  │
       │           │   │ room_id       ──►│──┐  │ name           │  │
       │           │   │ customer_id   ──►│──┼─►│ phone (unique) │  │
       │           │   │ checked_in_by ──►│──┤  │ birthday       │  │
       │           │   │ checked_out_by──►│──┤  │ tier           │  │
       │           │   │ customer_name    │  │  │ total_spent    │  │
       │           │   │ guest_count      │  │  │ total_points   │  │
       │           │   │ check_in_time    │  │  │ notes          │  │
       │           │   │ check_out_time   │  │  │ is_blacklisted │  │
       │           │   │ estimated_end    │  │  │ blacklist_rsn  │  │
       │           │   │ room_charge      │  │  │ created_at     │  │
       │           │   │ status           │  │  └────────────────┘  │
       │           │   │ notes            │  │                      │
       │           │   └────────┬─────────┘  │                      │
       │           │            │             │                      │
       │           │            ▼             │                      │
       │           │   ┌──────────────────┐   │                     │
       │           │   │    Orders        │   │                     │
       │           │   │──────────────────│   │                     │
       │           │   │ id               │   │                     │
       │           │   │ session_id    ──►│───┘                     │
       │           │   │ created_by    ──►│─────────────────────────┘
       │           │   │ status           │
       │           │   │ total_amount     │
       │           │   │ notes            │
       │           │   │ created_at       │
       │           │   └────────┬─────────┘
       │           │            │
       │           │            ▼
       │           │   ┌──────────────────┐    ┌─────────────────┐
       │           │   │   OrderItems     │    │   MenuItems     │
       │           │   │──────────────────│    │─────────────────│
       │           │   │ id               │    │ id              │
       │           │   │ order_id      ──►│──┐ │ category_id  ──►│──┐
       │           │   │ menu_item_id  ──►│──┼►│ name            │  │
       │           │   │ product_id    ──►│──┤ │ price           │  │
       │           │   │ quantity         │  │ │ image           │  │
       │           │   │ unit_price       │  │ │ is_available    │  │
       │           │   │ subtotal         │  │ │ sort_order      │  │
       │           │   │ notes            │  │ │ product_id   ──►│──┤
       │           │   └──────────────────┘  │ └─────────────────┘  │
       │           │                         │                      │
       │           │                         │ ┌─────────────────┐  │
       │           │                         │ │ MenuCategories  │  │
       │           │                         │ │─────────────────│  │
       │           │                         └►│ id              │  │
       │           │                           │ name            │  │
       │           │                           │ sort_order      │  │
       │           │                           │ is_active       │  │
       │           │                           └─────────────────┘  │
       │           │                                                │
       │           │   ┌──────────────────┐    ┌─────────────────┐  │
       │           │   │   Invoices       │    │   Products      │◄─┘
       │           │   │──────────────────│    │─────────────────│
       │           │   │ id               │    │ id              │
       │           │   │ session_id    ──►│    │ name            │
       │           │   │ invoice_number   │    │ sku             │
       │           │   │ room_charge      │    │ category        │
       │           │   │ order_total      │    │ unit            │
       │           │   │ subtotal         │    │ pack_size       │
       │           │   │ discount_amount  │    │ cost_price      │
       │           │   │ discount_reason  │    │ stock_quantity  │
       │           │   │ surcharge_amount │    │ min_stock       │
       │           │   │ deposit_applied  │    │ supplier_id  ──►│──┐
       │           │   │ grand_total      │    │ expiry_date     │  │
       │           │   │ status           │    │ is_active       │  │
       │           │   │ created_by    ──►│    └─────────────────┘  │
       │           │   │ created_at       │                         │
       │           │   └────────┬─────────┘    ┌─────────────────┐  │
       │           │            │               │   Suppliers     │◄─┘
       │           │            ▼               │─────────────────│
       │           │   ┌──────────────────┐    │ id              │
       │           │   │   Payments       │    │ name            │
       │           │   │──────────────────│    │ phone           │
       │           │   │ id               │    │ address         │
       │           │   │ invoice_id    ──►│    │ notes           │
       │           │   │ method           │    └─────────────────┘
       │           │   │ amount           │
       │           │   │ qr_code_used     │    ┌─────────────────┐
       │           │   │ cash_received    │    │  StockEntries   │
       │           │   │ cash_change      │    │─────────────────│
       │           │   │ created_at       │    │ id              │
       │           │   └──────────────────┘    │ product_id   ──►│
       │           │                           │ supplier_id  ──►│
       │           │                           │ type (in/out)   │
       │           │                           │ quantity         │
       │           │                           │ unit_cost        │
       │           │                           │ total_cost       │
       │           │                           │ reason           │
       │           │                           │ created_by    ──►│
       │           │                           │ created_at       │
       │           │                           └─────────────────┘
       │           │
       │           │   ┌──────────────────┐
       │           │   │  PricingRules    │
       │           │   │──────────────────│
       │           │   │ id               │
       │           │   │ room_type_id  ──►│
       │           │   │ name             │
       │           │   │ time_start       │
       │           │   │ time_end         │
       │           │   │ price_per_hour   │
       │           │   │ day_of_week      │
       │           │   │ is_active        │
       │           │   └──────────────────┘
       │           │
       │           │   ┌──────────────────┐
       │           │   │   Surcharges     │
       │           │   │──────────────────│
       │           │   │ id               │
       │           │   │ name             │
       │           │   │ type             │
       │           │   │ percentage       │
       │           │   │ start_date       │
       │           │   │ end_date         │
       │           │   │ is_active        │
       │           │   └──────────────────┘
       │           │
       │           │   ┌──────────────────┐
       │           │   │    Bookings      │
       │           │   │──────────────────│
       │           │   │ id               │
       │           │   │ room_id       ──►│
       │           │   │ customer_name    │
       │           │   │ customer_phone   │
       │           │   │ booking_date     │
       │           │   │ booking_time     │
       │           │   │ duration_hours   │
       │           │   │ deposit_amount   │
       │           │   │ status           │
       │           │   │ notes            │
       │           │   │ created_by    ──►│
       │           │   │ created_at       │
       │           │   └──────────────────┘
       │           │
       │           │   ┌──────────────────┐
       │           │   │  WaitingQueue    │
       │           │   │──────────────────│
       │           │   │ id               │
       │           │   │ customer_name    │
       │           │   │ customer_phone   │
       │           │   │ preferred_type   │
       │           │   │ guest_count      │
       │           │   │ status           │
       │           │   │ notes            │
       │           │   │ created_by    ──►│
       │           │   │ created_at       │
       │           │   └──────────────────┘
       │           │
       │           │   ┌──────────────────┐
       │           │   │    Settings      │
       │           │   │──────────────────│
       │           │   │ id               │
       │           │   │ key (unique)     │
       │           │   │ value (JSON)     │
       │           │   │ description      │
       │           │   │ updated_by    ──►│
       │           │   │ updated_at       │
       │           │   └──────────────────┘
       │           │
       │           │   ┌──────────────────┐
       │           │   │    Vouchers      │
       │           │   │──────────────────│
       │           │   │ id               │
       │           │   │ code (unique)    │
       │           │   │ discount_type    │
       │           │   │ discount_value   │
       │           │   │ max_uses         │
       │           │   │ used_count       │
       │           │   │ valid_from       │
       │           │   │ valid_until      │
       │           │   │ is_active        │
       │           │   └──────────────────┘
       │           │
       └───────────┘
```

---

## 2. PRISMA SCHEMA

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ════════════════════════════════════════════
// AUTH & USERS
// ════════════════════════════════════════════

enum UserRole {
  OWNER       // Chủ quán
  MANAGER     // Quản lý ca
  CASHIER     // Thu ngân
  STAFF       // Phục vụ
}

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String   // bcrypt hashed
  fullName  String   @map("full_name")
  role      UserRole @default(STAFF)
  phone     String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  sessionsCheckedIn  Session[]    @relation("CheckedInBy")
  sessionsCheckedOut Session[]    @relation("CheckedOutBy")
  orders             Order[]      @relation("OrderCreatedBy")
  invoices           Invoice[]    @relation("InvoiceCreatedBy")
  stockEntries       StockEntry[] @relation("StockEntryCreatedBy")
  bookings           Booking[]    @relation("BookingCreatedBy")
  waitingQueue       WaitingQueue[] @relation("QueueCreatedBy")
  shiftsOpened       Shift[]      @relation("ShiftOpenedBy")
  shiftsClosed       Shift[]      @relation("ShiftClosedBy")
  auditLogs          AuditLog[]
  notifications      Notification[]
  settingsUpdated    Setting[]    @relation("SettingUpdatedBy")

  @@map("users")
}

// ════════════════════════════════════════════
// ROOMS
// ════════════════════════════════════════════

enum RoomStatus {
  AVAILABLE     // Trống
  OCCUPIED      // Đang hát
  ENDING_SOON   // Sắp hết giờ
  MAINTENANCE   // Bảo trì
}

model RoomType {
  id          Int     @id @default(autoincrement())
  name        String  @unique  // "Phòng nhỏ", "Phòng lớn"
  capacityMin Int     @default(1) @map("capacity_min")
  capacityMax Int     @default(10) @map("capacity_max")
  description String?

  rooms        Room[]
  pricingRules PricingRule[]

  @@map("room_types")
}

model Room {
  id         Int        @id @default(autoincrement())
  name       String     @unique  // "Phòng 1", "Phòng VIP"
  roomTypeId Int        @map("room_type_id")
  status     RoomStatus @default(AVAILABLE)
  sortOrder  Int        @default(0) @map("sort_order")
  isActive   Boolean    @default(true) @map("is_active")

  roomType   RoomType   @relation(fields: [roomTypeId], references: [id])
  sessions   Session[]
  bookings   Booking[]

  @@map("rooms")
}

// ════════════════════════════════════════════
// SESSIONS (Lượt khách sử dụng phòng)
// ════════════════════════════════════════════

enum SessionStatus {
  ACTIVE        // Đang hát
  COMPLETED     // Đã checkout
  TRANSFERRED   // Đã chuyển phòng
  MERGED        // Đã gộp vào phòng khác
}

model Session {
  id             Int           @id @default(autoincrement())
  roomId         Int           @map("room_id")
  customerId     Int?          @map("customer_id")
  checkedInById  Int           @map("checked_in_by")
  checkedOutById Int?          @map("checked_out_by")

  customerName   String        @map("customer_name")
  customerPhone  String?       @map("customer_phone")
  guestCount     Int?          @map("guest_count")

  checkInTime    DateTime      @default(now()) @map("check_in_time")
  checkOutTime   DateTime?     @map("check_out_time")
  estimatedEnd   DateTime?     @map("estimated_end")  // Dự kiến kết thúc

  roomCharge     Decimal?      @map("room_charge") @db.Decimal(12, 0)
  status         SessionStatus @default(ACTIVE)
  notes          String?

  // Chuyển phòng tracking
  transferredFromId Int?       @map("transferred_from_id")
  mergedIntoId      Int?       @map("merged_into_id")

  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  // Relations
  room           Room          @relation(fields: [roomId], references: [id])
  customer       Customer?     @relation(fields: [customerId], references: [id])
  checkedInBy    User          @relation("CheckedInBy", fields: [checkedInById], references: [id])
  checkedOutBy   User?         @relation("CheckedOutBy", fields: [checkedOutById], references: [id])
  orders         Order[]
  invoice        Invoice?

  @@index([roomId, status])
  @@index([checkInTime])
  @@map("sessions")
}

// ════════════════════════════════════════════
// BOOKINGS (Đặt phòng trước)
// ════════════════════════════════════════════

enum BookingStatus {
  PENDING      // Chờ khách đến
  CONFIRMED    // Khách đã đến (chuyển thành session)
  CANCELLED    // Đã hủy
  NO_SHOW      // Khách không đến
}

model Booking {
  id             Int           @id @default(autoincrement())
  roomId         Int           @map("room_id")
  customerName   String        @map("customer_name")
  customerPhone  String?       @map("customer_phone")
  bookingDate    DateTime      @map("booking_date") @db.Date
  bookingTime    DateTime      @map("booking_time") @db.Time()
  durationHours  Decimal?      @map("duration_hours") @db.Decimal(4, 1)
  depositAmount  Decimal       @default(0) @map("deposit_amount") @db.Decimal(12, 0)
  status         BookingStatus @default(PENDING)
  notes          String?
  createdById    Int           @map("created_by")
  createdAt      DateTime      @default(now()) @map("created_at")

  room           Room          @relation(fields: [roomId], references: [id])
  createdBy      User          @relation("BookingCreatedBy", fields: [createdById], references: [id])

  @@index([roomId, bookingDate])
  @@index([bookingDate, status])
  @@map("bookings")
}

// ════════════════════════════════════════════
// WAITING QUEUE (Hàng chờ)
// ════════════════════════════════════════════

enum QueueStatus {
  WAITING    // Đang chờ
  ASSIGNED   // Đã xếp phòng
  CANCELLED  // Đã hủy
  EXPIRED    // Hết hạn chờ
}

model WaitingQueue {
  id             Int         @id @default(autoincrement())
  customerName   String      @map("customer_name")
  customerPhone  String?     @map("customer_phone")
  preferredType  Int?        @map("preferred_type")  // room_type_id
  guestCount     Int?        @map("guest_count")
  status         QueueStatus @default(WAITING)
  notes          String?
  createdById    Int         @map("created_by")
  createdAt      DateTime    @default(now()) @map("created_at")

  createdBy      User        @relation("QueueCreatedBy", fields: [createdById], references: [id])

  @@index([status])
  @@map("waiting_queue")
}

// ════════════════════════════════════════════
// MENU & ORDERS
// ════════════════════════════════════════════

model MenuCategory {
  id        Int        @id @default(autoincrement())
  name      String     @unique  // "Bia", "Nước ngọt", "Đồ ăn"
  sortOrder Int        @default(0) @map("sort_order")
  isActive  Boolean    @default(true) @map("is_active")
  items     MenuItem[]

  @@map("menu_categories")
}

model MenuItem {
  id          Int          @id @default(autoincrement())
  categoryId  Int          @map("category_id")
  name        String       // "Bia Tiger", "Coca Cola"
  price       Decimal      @db.Decimal(12, 0)  // Giá bán
  image       String?      // Path ảnh
  isAvailable Boolean      @default(true) @map("is_available")
  sortOrder   Int          @default(0) @map("sort_order")
  productId   Int?         @map("product_id")  // Liên kết sản phẩm kho

  category    MenuCategory @relation(fields: [categoryId], references: [id])
  product     Product?     @relation(fields: [productId], references: [id])
  orderItems  OrderItem[]

  @@index([categoryId])
  @@map("menu_items")
}

enum OrderStatus {
  PENDING     // Đã đặt
  PREPARING   // Đang chuẩn bị
  SERVED      // Đã phục vụ
  CANCELLED   // Đã hủy
}

model Order {
  id          Int         @id @default(autoincrement())
  sessionId   Int         @map("session_id")
  createdById Int         @map("created_by")
  status      OrderStatus @default(PENDING)
  totalAmount Decimal     @default(0) @map("total_amount") @db.Decimal(12, 0)
  notes       String?
  cancelReason String?    @map("cancel_reason")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  session     Session     @relation(fields: [sessionId], references: [id])
  createdBy   User        @relation("OrderCreatedBy", fields: [createdById], references: [id])
  items       OrderItem[]

  @@index([sessionId])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id         Int      @id @default(autoincrement())
  orderId    Int      @map("order_id")
  menuItemId Int      @map("menu_item_id")
  productId  Int?     @map("product_id")  // Để trừ kho
  quantity   Int      @default(1)
  unitPrice  Decimal  @map("unit_price") @db.Decimal(12, 0)
  subtotal   Decimal  @db.Decimal(12, 0)
  notes      String?

  order      Order    @relation(fields: [orderId], references: [id])
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])
  product    Product? @relation(fields: [productId], references: [id])

  @@map("order_items")
}

// ════════════════════════════════════════════
// INVOICES & PAYMENTS
// ════════════════════════════════════════════

enum InvoiceStatus {
  PENDING   // Chờ thanh toán
  PAID      // Đã thanh toán
  PARTIAL   // Thanh toán một phần (ghi nợ)
  VOID      // Đã hủy
}

model Invoice {
  id              Int           @id @default(autoincrement())
  sessionId       Int           @unique @map("session_id")
  invoiceNumber   String        @unique @map("invoice_number")  // "INV-20260325-001"

  roomCharge      Decimal       @map("room_charge") @db.Decimal(12, 0)
  orderTotal      Decimal       @map("order_total") @db.Decimal(12, 0)
  subtotal        Decimal       @db.Decimal(12, 0)

  discountAmount  Decimal       @default(0) @map("discount_amount") @db.Decimal(12, 0)
  discountReason  String?       @map("discount_reason")
  voucherCode     String?       @map("voucher_code")

  surchargeAmount Decimal       @default(0) @map("surcharge_amount") @db.Decimal(12, 0)
  surchargeReason String?       @map("surcharge_reason")

  depositApplied  Decimal       @default(0) @map("deposit_applied") @db.Decimal(12, 0)

  grandTotal      Decimal       @map("grand_total") @db.Decimal(12, 0)
  debtAmount      Decimal       @default(0) @map("debt_amount") @db.Decimal(12, 0)

  status          InvoiceStatus @default(PENDING)
  createdById     Int           @map("created_by")
  createdAt       DateTime      @default(now()) @map("created_at")

  session         Session       @relation(fields: [sessionId], references: [id])
  createdBy       User          @relation("InvoiceCreatedBy", fields: [createdById], references: [id])
  payments        Payment[]

  @@index([createdAt])
  @@index([invoiceNumber])
  @@map("invoices")
}

enum PaymentMethod {
  CASH         // Tiền mặt
  QR_TRANSFER  // Chuyển khoản QR
  DEBT         // Ghi nợ
}

model Payment {
  id           Int           @id @default(autoincrement())
  invoiceId    Int           @map("invoice_id")
  method       PaymentMethod
  amount       Decimal       @db.Decimal(12, 0)
  qrCodeUsed   String?       @map("qr_code_used")  // "QR1" hoặc "QR2"
  cashReceived Decimal?      @map("cash_received") @db.Decimal(12, 0)
  cashChange   Decimal?      @map("cash_change") @db.Decimal(12, 0)
  createdAt    DateTime      @default(now()) @map("created_at")

  invoice      Invoice       @relation(fields: [invoiceId], references: [id])

  @@map("payments")
}

// ════════════════════════════════════════════
// STOCK & INVENTORY
// ════════════════════════════════════════════

model Product {
  id            Int          @id @default(autoincrement())
  name          String
  sku           String?      @unique  // Mã sản phẩm
  category      String?      // Phân loại kho (khác menu category)
  unit          String       @default("cái")  // "lon", "chai", "đĩa", "kg"
  packSize      Int          @default(1) @map("pack_size")  // 1 thùng = 24 lon
  costPrice     Decimal      @map("cost_price") @db.Decimal(12, 0)  // Giá nhập
  stockQuantity Int          @default(0) @map("stock_quantity")  // Tồn kho (theo đơn vị nhỏ nhất)
  minStock      Int          @default(0) @map("min_stock")  // Mức tối thiểu cảnh báo
  supplierId    Int?         @map("supplier_id")
  expiryDate    DateTime?    @map("expiry_date") @db.Date
  isActive      Boolean      @default(true) @map("is_active")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  supplier      Supplier?    @relation(fields: [supplierId], references: [id])
  menuItems     MenuItem[]   // Sản phẩm này xuất hiện ở menu items nào
  stockEntries  StockEntry[]
  orderItems    OrderItem[]

  @@index([category])
  @@index([stockQuantity])
  @@map("products")
}

model Supplier {
  id        Int        @id @default(autoincrement())
  name      String
  phone     String?
  address   String?
  notes     String?
  isActive  Boolean    @default(true) @map("is_active")
  createdAt DateTime   @default(now()) @map("created_at")

  products     Product[]
  stockEntries StockEntry[]

  @@map("suppliers")
}

enum StockEntryType {
  IN           // Nhập kho
  OUT_SALE     // Xuất bán (tự động khi order)
  OUT_MANUAL   // Xuất thủ công (hư hỏng, hết hạn...)
  ADJUSTMENT   // Điều chỉnh kiểm kê
}

model StockEntry {
  id          Int            @id @default(autoincrement())
  productId   Int            @map("product_id")
  supplierId  Int?           @map("supplier_id")
  type        StockEntryType
  quantity    Int            // Dương = nhập, Âm = xuất
  unitCost    Decimal?       @map("unit_cost") @db.Decimal(12, 0)
  totalCost   Decimal?       @map("total_cost") @db.Decimal(12, 0)
  reason      String?        // Lý do xuất/điều chỉnh
  createdById Int            @map("created_by")
  createdAt   DateTime       @default(now()) @map("created_at")

  product     Product        @relation(fields: [productId], references: [id])
  supplier    Supplier?      @relation(fields: [supplierId], references: [id])
  createdBy   User           @relation("StockEntryCreatedBy", fields: [createdById], references: [id])

  @@index([productId, createdAt])
  @@index([type])
  @@map("stock_entries")
}

// ════════════════════════════════════════════
// CUSTOMERS
// ════════════════════════════════════════════

enum CustomerTier {
  REGULAR   // Thường
  SILVER    // Bạc
  GOLD      // Vàng
  VIP       // VIP
}

model Customer {
  id            Int          @id @default(autoincrement())
  name          String
  phone         String       @unique
  birthday      DateTime?    @db.Date
  tier          CustomerTier @default(REGULAR)
  totalSpent    Decimal      @default(0) @map("total_spent") @db.Decimal(14, 0)
  totalPoints   Int          @default(0) @map("total_points")
  visitCount    Int          @default(0) @map("visit_count")
  lastVisit     DateTime?    @map("last_visit")
  notes         String?
  isBlacklisted Boolean      @default(false) @map("is_blacklisted")
  blacklistReason String?    @map("blacklist_reason")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  sessions      Session[]
  pointHistory  PointHistory[]

  @@index([phone])
  @@index([tier])
  @@map("customers")
}

enum PointAction {
  EARN    // Tích điểm
  REDEEM  // Đổi điểm
  ADJUST  // Điều chỉnh
}

model PointHistory {
  id         Int         @id @default(autoincrement())
  customerId Int         @map("customer_id")
  action     PointAction
  points     Int         // Dương = tích, Âm = đổi
  reason     String?
  createdAt  DateTime    @default(now()) @map("created_at")

  customer   Customer    @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@map("point_history")
}

// ════════════════════════════════════════════
// PRICING
// ════════════════════════════════════════════

model PricingRule {
  id           Int      @id @default(autoincrement())
  roomTypeId   Int      @map("room_type_id")
  name         String   // "Giờ nhẹ phòng nhỏ", "Peak phòng lớn"
  timeStart    String   @map("time_start")  // "12:00" (lưu dạng string HH:mm)
  timeEnd      String   @map("time_end")    // "17:00"
  pricePerHour Decimal  @map("price_per_hour") @db.Decimal(12, 0)
  dayOfWeek    Int[]    @map("day_of_week")  // [1,2,3,4,5] = T2-T6, [] = tất cả
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  roomType     RoomType @relation(fields: [roomTypeId], references: [id])

  @@index([roomTypeId, isActive])
  @@map("pricing_rules")
}

model Surcharge {
  id         Int      @id @default(autoincrement())
  name       String   // "Phụ thu cuối tuần", "Phụ thu Tết"
  type       String   // "weekend", "holiday", "custom"
  percentage Decimal  @db.Decimal(5, 2)  // 20.00 = 20%
  startDate  DateTime? @map("start_date") @db.Date
  endDate    DateTime? @map("end_date") @db.Date
  dayOfWeek  Int[]    @map("day_of_week")  // Áp dụng ngày nào trong tuần
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("surcharges")
}

// ════════════════════════════════════════════
// VOUCHERS
// ════════════════════════════════════════════

enum DiscountType {
  PERCENTAGE   // Giảm %
  FIXED_AMOUNT // Giảm số tiền cố định
}

model Voucher {
  id            Int          @id @default(autoincrement())
  code          String       @unique  // "GIAMGIA20", "SINHNAT50K"
  discountType  DiscountType @map("discount_type")
  discountValue Decimal      @map("discount_value") @db.Decimal(12, 2)
  maxDiscount   Decimal?     @map("max_discount") @db.Decimal(12, 0)  // Giảm tối đa (cho %)
  maxUses       Int?         @map("max_uses")
  usedCount     Int          @default(0) @map("used_count")
  validFrom     DateTime     @map("valid_from")
  validUntil    DateTime     @map("valid_until")
  isActive      Boolean      @default(true) @map("is_active")
  createdAt     DateTime     @default(now()) @map("created_at")

  @@index([code])
  @@map("vouchers")
}

// ════════════════════════════════════════════
// SHIFTS (Ca làm)
// ════════════════════════════════════════════

enum ShiftStatus {
  OPEN    // Đang mở ca
  CLOSED  // Đã đóng ca
}

model Shift {
  id          Int         @id @default(autoincrement())
  openedById  Int         @map("opened_by")
  closedById  Int?        @map("closed_by")
  startTime   DateTime    @default(now()) @map("start_time")
  endTime     DateTime?   @map("end_time")
  openingCash Decimal     @default(0) @map("opening_cash") @db.Decimal(12, 0)
  closingCash Decimal?    @map("closing_cash") @db.Decimal(12, 0)
  status      ShiftStatus @default(OPEN)
  notes       String?
  handoverNote String?    @map("handover_note")  // Ghi chú bàn giao

  openedBy    User        @relation("ShiftOpenedBy", fields: [openedById], references: [id])
  closedBy    User?       @relation("ShiftClosedBy", fields: [closedById], references: [id])

  @@index([startTime])
  @@index([status])
  @@map("shifts")
}

// ════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════

model Setting {
  id          Int      @id @default(autoincrement())
  key         String   @unique  // "qr_code_1", "qr_code_2", "min_duration"...
  value       Json     // Giá trị linh hoạt
  description String?
  updatedById Int?     @map("updated_by")
  updatedAt   DateTime @updatedAt @map("updated_at")

  updatedBy   User?    @relation("SettingUpdatedBy", fields: [updatedById], references: [id])

  @@map("settings")
}

// ════════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════════

model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  action     String   // "CHECKIN", "CHECKOUT", "ORDER_CREATE", "ORDER_CANCEL"...
  entityType String   @map("entity_type")  // "session", "order", "stock"...
  entityId   Int      @map("entity_id")
  details    Json?    // Chi tiết thay đổi
  ipAddress  String?  @map("ip_address")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════

enum NotificationType {
  ROOM_ENDING      // Phòng sắp hết giờ
  ROOM_EXPIRED     // Phòng đã hết giờ
  ORDER_NEW        // Order mới
  STOCK_LOW        // Tồn kho thấp
  BOOKING_REMINDER // Nhắc booking
  CUSTOMER_BIRTHDAY // Sinh nhật khách
  SYSTEM           // Hệ thống
}

model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int              @map("user_id")
  title     String
  message   String
  type      NotificationType
  isRead    Boolean          @default(false) @map("is_read")
  metadata  Json?            // Dữ liệu bổ sung (roomId, orderId...)
  createdAt DateTime         @default(now()) @map("created_at")

  user      User             @relation(fields: [userId], references: [id])

  @@index([userId, isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

---

## 3. INDEXES & PERFORMANCE

### 3.1 Indexes quan trọng

| Table | Index | Mục đích |
|-------|-------|----------|
| sessions | (room_id, status) | Tìm phòng đang active nhanh |
| sessions | (check_in_time) | Báo cáo theo thời gian |
| orders | (session_id) | Lấy orders theo phòng |
| orders | (created_at) | Báo cáo |
| invoices | (created_at) | Báo cáo doanh thu |
| invoices | (invoice_number) | Tra cứu hóa đơn |
| bookings | (room_id, booking_date) | Check booking trùng |
| products | (stock_quantity) | Cảnh báo tồn kho |
| customers | (phone) | Tra cứu khách |
| audit_logs | (entity_type, entity_id) | Tra cứu lịch sử |
| audit_logs | (created_at) | Lọc theo thời gian |
| notifications | (user_id, is_read) | Lấy thông báo chưa đọc |

### 3.2 Soft Delete Strategy
- Các entity quan trọng sử dụng `isActive` flag thay vì xóa thật
- Áp dụng cho: Users, Rooms, Products, MenuItems, Suppliers
- Lý do: bảo toàn dữ liệu lịch sử, tránh mất reference

---

## 4. SEED DATA

```typescript
// prisma/seed.ts - Dữ liệu mặc định

const seedData = {
  // ── Room Types ──
  roomTypes: [
    { name: "Phòng nhỏ", capacityMin: 4, capacityMax: 8 },
    { name: "Phòng lớn", capacityMin: 10, capacityMax: 20 },
  ],

  // ── Rooms (7 nhỏ + 3 lớn) ──
  rooms: [
    { name: "Phòng 1", type: "Phòng nhỏ", sortOrder: 1 },
    { name: "Phòng 2", type: "Phòng nhỏ", sortOrder: 2 },
    { name: "Phòng 3", type: "Phòng nhỏ", sortOrder: 3 },
    { name: "Phòng 4", type: "Phòng nhỏ", sortOrder: 4 },
    { name: "Phòng 5", type: "Phòng nhỏ", sortOrder: 5 },
    { name: "Phòng 6", type: "Phòng nhỏ", sortOrder: 6 },
    { name: "Phòng 7", type: "Phòng nhỏ", sortOrder: 7 },
    { name: "Phòng 8", type: "Phòng lớn", sortOrder: 8 },
    { name: "Phòng 9", type: "Phòng lớn", sortOrder: 9 },
    { name: "Phòng 10", type: "Phòng lớn", sortOrder: 10 },
  ],

  // ── Default Admin ──
  users: [
    { username: "admin", password: "admin123", fullName: "Chủ quán", role: "OWNER" },
  ],

  // ── Default Pricing Rules ──
  pricingRules: [
    { roomType: "Phòng nhỏ", name: "Off-peak nhỏ", timeStart: "12:00", timeEnd: "17:00", pricePerHour: 0 },
    { roomType: "Phòng nhỏ", name: "Peak nhỏ",     timeStart: "17:00", timeEnd: "05:00", pricePerHour: 0 },
    { roomType: "Phòng lớn", name: "Off-peak lớn",  timeStart: "12:00", timeEnd: "17:00", pricePerHour: 0 },
    { roomType: "Phòng lớn", name: "Peak lớn",      timeStart: "17:00", timeEnd: "05:00", pricePerHour: 0 },
  ],

  // ── Default Menu Categories ──
  menuCategories: [
    { name: "Bia", sortOrder: 1 },
    { name: "Nước ngọt", sortOrder: 2 },
    { name: "Nước ép", sortOrder: 3 },
    { name: "Đồ ăn nhẹ", sortOrder: 4 },
    { name: "Trái cây", sortOrder: 5 },
    { name: "Combo", sortOrder: 6 },
  ],

  // ── Default Settings ──
  settings: [
    { key: "store_name", value: "Music Box", description: "Tên quán" },
    { key: "store_address", value: "", description: "Địa chỉ" },
    { key: "operating_hours", value: { open: "12:00", close: "05:00" }, description: "Giờ hoạt động" },
    { key: "qr_code_1", value: { path: "", label: "QR Mã 1 (trước 00:00)" }, description: "QR thanh toán trước nửa đêm" },
    { key: "qr_code_2", value: { path: "", label: "QR Mã 2 (từ 00:00)" }, description: "QR thanh toán sau nửa đêm" },
    { key: "min_duration_minutes", value: 60, description: "Thời gian hát tối thiểu (phút)" },
    { key: "warning_before_minutes", value: 15, description: "Cảnh báo trước khi hết giờ (phút)" },
    { key: "currency", value: "VNĐ", description: "Đơn vị tiền tệ" },
    { key: "timezone", value: "Asia/Ho_Chi_Minh", description: "Múi giờ" },
    { key: "points_per_amount", value: { amount: 100000, points: 1 }, description: "Quy tắc tích điểm" },
    { key: "max_discount_percent_cashier", value: 10, description: "% giảm giá tối đa cho thu ngân" },
  ],
}
```

---

## 5. DATA FLOW EXAMPLES

### 5.1 Check-in → Order → Checkout

```sql
-- 1. Check-in: Tạo session
INSERT INTO sessions (room_id, customer_name, checked_in_by, check_in_time, status)
VALUES (5, 'Anh Tuấn', 2, NOW(), 'ACTIVE');

-- Update room status
UPDATE rooms SET status = 'OCCUPIED' WHERE id = 5;

-- 2. Order: Tạo order + items
INSERT INTO orders (session_id, created_by, total_amount) VALUES (1, 2, 150000);
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
VALUES (1, 3, 2, 50000, 100000),  -- 2 Bia Tiger
       (1, 7, 1, 50000, 50000);   -- 1 Nước ép

-- 3. Checkout: Tính giá + tạo invoice
-- Server tính: room_charge = f(check_in_time, NOW(), room_type, pricing_rules)
UPDATE sessions SET check_out_time = NOW(), room_charge = 350000, status = 'COMPLETED' WHERE id = 1;

INSERT INTO invoices (session_id, invoice_number, room_charge, order_total, subtotal, grand_total, created_by)
VALUES (1, 'INV-20260325-001', 350000, 150000, 500000, 500000, 2);

INSERT INTO payments (invoice_id, method, amount, qr_code_used)
VALUES (1, 'QR_TRANSFER', 500000, 'QR1');  -- Trước 00:00 → QR1

UPDATE rooms SET status = 'AVAILABLE' WHERE id = 5;

-- Trừ kho tự động
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = 3;  -- Bia Tiger -2
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = 7;  -- Nước ép -1
```

### 5.2 Query: Dashboard doanh thu hôm nay

```sql
SELECT
  COUNT(DISTINCT s.id) as total_sessions,
  COALESCE(SUM(i.grand_total), 0) as total_revenue,
  COALESCE(SUM(i.room_charge), 0) as room_revenue,
  COALESCE(SUM(i.order_total), 0) as order_revenue,
  COUNT(DISTINCT CASE WHEN s.status = 'ACTIVE' THEN s.id END) as active_sessions
FROM sessions s
LEFT JOIN invoices i ON i.session_id = s.id
WHERE s.check_in_time >= CURRENT_DATE
  AND s.check_in_time < CURRENT_DATE + INTERVAL '1 day';
```
