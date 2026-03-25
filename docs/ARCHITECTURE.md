# MUSIC BOX MANAGER - Thiết kế Kiến trúc Hệ thống

> Version: 1.0
> Ngày tạo: 2026-03-25

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Mô hình: Modular Monolith

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   React 18 + TypeScript + Tailwind CSS + shadcn/ui              │
│   Zustand (State) + Socket.io-client (Realtime)                 │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS / WSS
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js)                             │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │   Express    │  │  Socket.io   │  │   Static Files     │     │
│  │   REST API   │  │  Realtime    │  │   (React build)    │     │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────┘     │
│         │                │                                      │
│  ┌──────▼────────────────▼──────────────────────────────┐      │
│  │              APPLICATION LAYER                        │      │
│  │                                                       │      │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │      │
│  │  │  Room     │ │  Order   │ │  Stock   │ │  Auth   │ │      │
│  │  │  Module   │ │  Module  │ │  Module  │ │  Module │ │      │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │      │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │      │
│  │  │ Customer │ │  Staff   │ │  Report  │ │ Setting │ │      │
│  │  │  Module  │ │  Module  │ │  Module  │ │  Module │ │      │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │      │
│  └──────────────────────┬───────────────────────────────┘      │
│                         │                                       │
│  ┌──────────────────────▼───────────────────────────────┐      │
│  │              DATA ACCESS LAYER (Prisma ORM)           │      │
│  └──────────────────────┬───────────────────────────────┘      │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   PostgreSQL Database  │
              │                       │
              │   - Tables            │
              │   - Indexes           │
              │   - Triggers          │
              └───────────────────────┘
```

### 1.2 Tại sao chọn Modular Monolith?

| Tiêu chí | Monolith | Modular Monolith | Microservices |
|-----------|----------|-------------------|---------------|
| Độ phức tạp | Thấp | Trung bình | Cao |
| Phù hợp team nhỏ | ✅ | ✅ | ❌ |
| Dễ deploy | ✅ | ✅ | ❌ |
| Tách module rõ ràng | ❌ | ✅ | ✅ |
| Chi phí hạ tầng | Thấp | Thấp | Cao |
| Mở rộng sau này | Khó | Dễ chuyển sang MS | Đã sẵn |

**Kết luận**: Modular Monolith là lựa chọn tối ưu vì:
- Quy mô nhỏ (1 quán, ~5-10 user đồng thời)
- Dễ phát triển và bảo trì bởi 1-2 developer
- Code tổ chức rõ ràng theo module, dễ mở rộng
- Deploy đơn giản (1 server duy nhất)
- Chi phí hạ tầng thấp

---

## 2. TECH STACK CHI TIẾT

### 2.1 Frontend

| Công nghệ | Version | Vai trò | Lý do chọn |
|-----------|---------|---------|-------------|
| **React** | 18.x | UI Library | Ecosystem lớn, component-based, cộng đồng đông |
| **TypeScript** | 5.x | Type Safety | Giảm bug, IDE support tốt, refactor dễ |
| **Vite** | 5.x | Build Tool | Nhanh hơn Webpack 10-100x, HMR instant |
| **Tailwind CSS** | 3.x | Styling | Utility-first, dark mode built-in, nhanh |
| **shadcn/ui** | latest | Component Library | Accessible, customizable, dựa trên Radix UI |
| **Zustand** | 4.x | State Management | Nhẹ (1KB), API đơn giản, ko boilerplate |
| **React Router** | 6.x | Routing | SPA routing chuẩn |
| **Socket.io-client** | 4.x | Realtime | Tự động reconnect, fallback polling |
| **React Query** | 5.x | Server State | Cache, refetch, loading/error states |
| **Recharts** | 2.x | Charts | Biểu đồ doanh thu, thống kê |
| **date-fns** | 3.x | Date Utils | Nhẹ, tree-shakable, format tiếng Việt |
| **react-hot-toast** | 2.x | Notifications | Toast thông báo đẹp, nhẹ |
| **Lucide React** | latest | Icons | Icon set hiện đại, consistent |

### 2.2 Backend

| Công nghệ | Version | Vai trò | Lý do chọn |
|-----------|---------|---------|-------------|
| **Node.js** | 20.x LTS | Runtime | JavaScript full-stack, non-blocking I/O |
| **Express** | 4.x | HTTP Framework | Đơn giản, middleware ecosystem lớn |
| **Socket.io** | 4.x | Realtime Server | WebSocket + fallback, rooms support |
| **Prisma** | 5.x | ORM | Type-safe queries, migration tự động, schema đẹp |
| **PostgreSQL** | 16.x | Database | ACID, JSON support, reliable |
| **JWT** | - | Authentication | Stateless auth, đơn giản |
| **bcrypt** | 5.x | Password Hashing | Chuẩn bảo mật, salt tự động |
| **Zod** | 3.x | Validation | Schema validation, type inference |
| **multer** | 1.x | File Upload | Upload ảnh QR, ảnh sản phẩm |
| **node-cron** | 3.x | Scheduled Tasks | Backup, cảnh báo định kỳ |
| **winston** | 3.x | Logging | Structured logging, multi-transport |
| **helmet** | 7.x | Security | HTTP security headers |
| **cors** | 2.x | CORS | Cross-origin config |
| **compression** | 1.x | Performance | Gzip response |

### 2.3 DevOps & Tools

| Công nghệ | Vai trò |
|-----------|---------|
| **Docker** + **Docker Compose** | Containerization, dễ deploy |
| **Nginx** | Reverse proxy, SSL termination |
| **ESLint** + **Prettier** | Code quality |
| **Vitest** | Unit/Integration testing |
| **GitHub Actions** (tùy chọn) | CI/CD |

---

## 3. CẤU TRÚC THƯ MỤC

```
music-box-manager/
│
├── client/                          # ══════ FRONTEND ══════
│   ├── public/
│   │   ├── favicon.ico
│   │   └── assets/                  # Static assets
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.tsx                  # Root component + Router
│   │   │
│   │   ├── components/              # ── Shared Components ──
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx      # Menu điều hướng
│   │   │   │   ├── Header.tsx       # Top bar: user, notifications
│   │   │   │   ├── Footer.tsx       # Status bar
│   │   │   │   └── MainLayout.tsx   # Layout wrapper
│   │   │   ├── RoomCard.tsx         # Card hiển thị phòng
│   │   │   ├── CountdownTimer.tsx   # Bộ đếm ngược
│   │   │   ├── QRDisplay.tsx        # Hiển thị QR thanh toán
│   │   │   ├── NotificationBell.tsx # Chuông thông báo
│   │   │   └── SearchBar.tsx        # Tìm kiếm toàn cục
│   │   │
│   │   ├── pages/                   # ── Page Components ──
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── rooms/
│   │   │   │   ├── RoomMapPage.tsx       # Bản đồ phòng (trang chính)
│   │   │   │   ├── RoomDetailPanel.tsx   # Chi tiết phòng (slide panel)
│   │   │   │   ├── CheckinDialog.tsx     # Dialog check-in
│   │   │   │   ├── CheckoutDialog.tsx    # Dialog checkout
│   │   │   │   ├── ExtendDialog.tsx      # Dialog gia hạn
│   │   │   │   ├── TransferDialog.tsx    # Dialog chuyển phòng
│   │   │   │   └── TimelinePage.tsx      # Timeline Gantt
│   │   │   ├── orders/
│   │   │   │   ├── OrderPage.tsx         # Đặt order cho phòng
│   │   │   │   ├── MenuGrid.tsx          # Grid menu items
│   │   │   │   └── OrderHistory.tsx      # Lịch sử order phòng
│   │   │   ├── stock/
│   │   │   │   ├── StockPage.tsx         # Tồn kho
│   │   │   │   ├── StockEntryForm.tsx    # Nhập kho
│   │   │   │   └── InventoryCheck.tsx    # Kiểm kê
│   │   │   ├── customers/
│   │   │   │   ├── CustomerListPage.tsx
│   │   │   │   └── CustomerDetailPage.tsx
│   │   │   ├── reports/
│   │   │   │   ├── ReportsPage.tsx       # Dashboard báo cáo
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   └── RoomUsageChart.tsx
│   │   │   ├── staff/
│   │   │   │   └── StaffPage.tsx
│   │   │   └── settings/
│   │   │       ├── SettingsPage.tsx
│   │   │       ├── PricingSettings.tsx
│   │   │       ├── QRSettings.tsx
│   │   │       └── RoomSettings.tsx
│   │   │
│   │   ├── hooks/                   # ── Custom Hooks ──
│   │   │   ├── useAuth.ts           # Authentication
│   │   │   ├── useRooms.ts          # Room data + realtime
│   │   │   ├── useOrders.ts         # Order operations
│   │   │   ├── useSocket.ts         # WebSocket connection
│   │   │   ├── useCountdown.ts      # Countdown timer logic
│   │   │   ├── useNotifications.ts  # In-app notifications
│   │   │   └── usePricing.ts        # Price calculation
│   │   │
│   │   ├── stores/                  # ── Zustand Stores ──
│   │   │   ├── authStore.ts         # Auth state
│   │   │   ├── roomStore.ts         # Room states
│   │   │   ├── orderStore.ts        # Active orders
│   │   │   ├── notificationStore.ts # Notifications
│   │   │   └── shiftStore.ts        # Current shift
│   │   │
│   │   ├── services/                # ── API Services ──
│   │   │   ├── api.ts               # Axios instance + interceptors
│   │   │   ├── authService.ts
│   │   │   ├── roomService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── stockService.ts
│   │   │   ├── customerService.ts
│   │   │   ├── reportService.ts
│   │   │   └── settingService.ts
│   │   │
│   │   ├── types/                   # ── TypeScript Types ──
│   │   │   ├── room.ts
│   │   │   ├── order.ts
│   │   │   ├── customer.ts
│   │   │   ├── staff.ts
│   │   │   ├── stock.ts
│   │   │   └── common.ts
│   │   │
│   │   ├── utils/                   # ── Utilities ──
│   │   │   ├── formatCurrency.ts    # Format VNĐ
│   │   │   ├── formatTime.ts        # Format giờ/ngày
│   │   │   ├── priceCalculator.ts   # Tính giá phòng
│   │   │   ├── constants.ts         # App constants
│   │   │   └── cn.ts                # Tailwind class merge
│   │   │
│   │   └── styles/
│   │       └── globals.css          # Tailwind base + custom
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                          # ══════ BACKEND ══════
│   ├── src/
│   │   ├── index.ts                 # Entry point: Express + Socket.io
│   │   ├── app.ts                   # Express app setup
│   │   │
│   │   ├── modules/                 # ── Business Modules ──
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.validation.ts
│   │   │   ├── rooms/
│   │   │   │   ├── room.routes.ts
│   │   │   │   ├── room.controller.ts
│   │   │   │   ├── room.service.ts
│   │   │   │   ├── session.service.ts    # Check-in/out logic
│   │   │   │   ├── booking.service.ts
│   │   │   │   ├── pricing.service.ts    # Tính giá
│   │   │   │   └── room.validation.ts
│   │   │   ├── orders/
│   │   │   │   ├── order.routes.ts
│   │   │   │   ├── order.controller.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   └── order.validation.ts
│   │   │   ├── stock/
│   │   │   │   ├── stock.routes.ts
│   │   │   │   ├── stock.controller.ts
│   │   │   │   ├── stock.service.ts
│   │   │   │   └── stock.validation.ts
│   │   │   ├── customers/
│   │   │   │   ├── customer.routes.ts
│   │   │   │   ├── customer.controller.ts
│   │   │   │   └── customer.service.ts
│   │   │   ├── staff/
│   │   │   │   ├── staff.routes.ts
│   │   │   │   ├── staff.controller.ts
│   │   │   │   └── staff.service.ts
│   │   │   ├── shifts/
│   │   │   │   ├── shift.routes.ts
│   │   │   │   ├── shift.controller.ts
│   │   │   │   └── shift.service.ts
│   │   │   ├── reports/
│   │   │   │   ├── report.routes.ts
│   │   │   │   ├── report.controller.ts
│   │   │   │   └── report.service.ts
│   │   │   └── settings/
│   │   │       ├── setting.routes.ts
│   │   │       ├── setting.controller.ts
│   │   │       └── setting.service.ts
│   │   │
│   │   ├── middleware/              # ── Middleware ──
│   │   │   ├── auth.middleware.ts       # JWT verification
│   │   │   ├── role.middleware.ts       # Role-based access
│   │   │   ├── validate.middleware.ts   # Zod validation
│   │   │   ├── error.middleware.ts      # Global error handler
│   │   │   └── audit.middleware.ts      # Audit logging
│   │   │
│   │   ├── socket/                  # ── WebSocket ──
│   │   │   ├── socketManager.ts     # Socket.io setup
│   │   │   ├── roomSocket.ts        # Room status events
│   │   │   └── orderSocket.ts       # Order events
│   │   │
│   │   ├── utils/                   # ── Utilities ──
│   │   │   ├── logger.ts            # Winston logger
│   │   │   ├── priceCalculator.ts   # Server-side price calc
│   │   │   ├── dateUtils.ts         # Date helpers
│   │   │   └── constants.ts
│   │   │
│   │   └── types/                   # ── Types ──
│   │       └── index.ts
│   │
│   ├── tsconfig.json
│   └── package.json
│
├── prisma/                          # ══════ DATABASE ══════
│   ├── schema.prisma                # Database schema
│   ├── migrations/                  # Auto-generated migrations
│   └── seed.ts                      # Seed data (phòng mặc định, admin...)
│
├── uploads/                         # ══════ UPLOADS ══════
│   ├── qr/                          # QR code images
│   └── products/                    # Product images
│
├── docs/                            # ══════ DOCUMENTATION ══════
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   └── UI-WIREFRAMES.md
│
├── docker-compose.yml               # Docker setup
├── Dockerfile                       # App container
├── .env.example                     # Environment variables template
├── .gitignore
├── package.json                     # Root package.json (workspaces)
└── README.md
```

---

## 4. LUỒNG DỮ LIỆU (DATA FLOW)

### 4.1 Luồng Check-in

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Thu ngân │     │  React   │     │  Express │     │  Postgres│
│  (User)  │     │  Client  │     │  Server  │     │  Database│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                 │
     │ Click phòng    │                │                 │
     │ trống, nhập    │                │                 │
     │ thông tin      │                │                 │
     │───────────────>│                │                 │
     │                │  POST /api/    │                 │
     │                │  sessions/     │                 │
     │                │  checkin       │                 │
     │                │───────────────>│                 │
     │                │               │  Validate        │
     │                │               │  Check room      │
     │                │               │  available       │
     │                │               │────────────────>│
     │                │               │  Create session  │
     │                │               │  Update room     │
     │                │               │  status          │
     │                │               │────────────────>│
     │                │               │<────────────────│
     │                │               │                  │
     │                │               │  Emit socket:    │
     │                │               │  'room:updated'  │
     │                │<──────────────│                  │
     │                │               │───── broadcast ──│──> All clients
     │  Phòng đổi     │               │                  │
     │  trạng thái    │               │                  │
     │  → Đang hát    │               │                  │
     │<───────────────│               │                  │
     │                │               │                  │
```

### 4.2 Luồng Checkout + QR

```
Thu ngân ─→ Click "Checkout" phòng X
         ─→ Hệ thống tính giá:
              ├─ Tính tiền phòng (theo khung giờ)
              ├─ Cộng tiền order
              ├─ Trừ đặt cọc (nếu có)
              └─ Áp giảm giá (nếu có)
         ─→ Hiển thị bill chi tiết
         ─→ Chọn phương thức thanh toán:
              ├─ Tiền mặt → Nhập tiền nhận → Tính thừa
              ├─ QR Code:
              │    ├─ Giờ hiện tại < 00:00 → Hiển thị QR Mã 1
              │    └─ Giờ hiện tại ≥ 00:00 → Hiển thị QR Mã 2
              │    └─ Hiển thị kèm số tiền
              └─ Kết hợp → Nhập tiền mặt + phần còn lại QR
         ─→ Xác nhận thanh toán
         ─→ Tạo Invoice + Payment records
         ─→ Cập nhật tồn kho (trừ các món đã order)
         ─→ Phòng → Trống
         ─→ Broadcast socket → All clients
```

### 4.3 Luồng Realtime (WebSocket Events)

```
┌─────────────────────────────────────────────────────┐
│                  SOCKET.IO EVENTS                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Server → Client (Broadcast)                        │
│  ─────────────────────────────                      │
│  room:updated        Phòng thay đổi trạng thái      │
│  room:timer_warning  Phòng sắp hết giờ (≤15p)       │
│  room:timer_expired  Phòng đã hết giờ                │
│  order:new           Order mới (cho bar/bếp)         │
│  order:updated       Trạng thái order thay đổi       │
│  notification:new    Thông báo mới                   │
│  shift:updated       Thông tin ca làm thay đổi       │
│                                                     │
│  Client → Server                                    │
│  ─────────────────                                  │
│  room:subscribe      Đăng ký nhận update phòng       │
│  order:subscribe     Đăng ký nhận update order        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 5. AUTHENTICATION & AUTHORIZATION

### 5.1 Luồng đăng nhập

```
┌─────────┐                ┌──────────┐                ┌──────────┐
│  Login  │  POST /login   │  Server  │  Verify pwd    │    DB    │
│  Form   │───────────────>│          │───────────────>│          │
│         │                │          │<───────────────│          │
│         │  JWT Token     │  Sign    │                │          │
│         │<───────────────│  JWT     │                │          │
│         │                │          │                │          │
│  Store  │                │          │                │          │
│  token  │                │          │                │          │
│  in     │  GET /api/*    │          │                │          │
│  memory │  Authorization:│  Verify  │                │          │
│         │  Bearer <token>│  JWT +   │                │          │
│         │───────────────>│  Check   │                │          │
│         │                │  Role    │                │          │
│         │  Response      │          │                │          │
│         │<───────────────│          │                │          │
└─────────┘                └──────────┘                └──────────┘
```

### 5.2 JWT Structure

```json
{
  "sub": "user_id",
  "username": "thu_ngan_01",
  "role": "cashier",
  "shiftId": "current_shift_id",
  "iat": 1711324800,
  "exp": 1711368000
}
```

### 5.3 Role-Based Access Control

```
                    ┌─────────┐
                    │  OWNER  │  (Chủ quán)
                    │  ★★★★   │
                    └────┬────┘
                         │ inherits all
                    ┌────▼────┐
                    │ MANAGER │  (Quản lý ca)
                    │  ★★★    │
                    └────┬────┘
                         │ inherits
                    ┌────▼────┐
                    │ CASHIER │  (Thu ngân)
                    │  ★★     │
                    └────┬────┘
                         │ inherits
                    ┌────▼────┐
                    │  STAFF  │  (Phục vụ)
                    │  ★      │
                    └─────────┘
```

---

## 6. COUNTDOWN TIMER SYSTEM

### 6.1 Kiến trúc Timer

```
Server Side:
┌──────────────────────────────────────────┐
│  CRON JOB (chạy mỗi 60 giây)            │
│                                          │
│  1. Query tất cả phòng "occupied"        │
│  2. Với mỗi phòng có estimated_end:      │
│     ├─ Nếu còn ≤ 15 phút:               │
│     │   emit 'room:timer_warning'        │
│     │   update status → 'ending_soon'    │
│     └─ Nếu đã quá giờ:                  │
│         emit 'room:timer_expired'        │
│  3. Broadcast trạng thái mới             │
└──────────────────────────────────────────┘

Client Side:
┌──────────────────────────────────────────┐
│  useCountdown Hook                       │
│                                          │
│  - Nhận check_in_time từ server          │
│  - Nhận estimated_duration (nếu có)      │
│  - Tính countdown = end_time - now       │
│  - Update mỗi giây (setInterval)         │
│  - Hiển thị: "Còn 01:23:45"             │
│  - Nếu không có duration: hiển thị       │
│    thời gian đã hát "Đã hát 02:30:00"   │
└──────────────────────────────────────────┘
```

---

## 7. PRICE CALCULATION ENGINE

### 7.1 Thuật toán tính giá

```typescript
// Pseudocode - Thuật toán tính giá phòng
function calculateRoomPrice(
  checkInTime: DateTime,
  checkOutTime: DateTime,
  roomType: 'small' | 'large',
  pricingRules: PricingRule[],
  surcharges: Surcharge[]
): PriceBreakdown {

  // 1. Chia thời gian thành các segment theo khung giờ
  const segments = splitByTimeSlots(checkInTime, checkOutTime, pricingRules)

  // VD: check-in 16:00, check-out 20:00
  // segments = [
  //   { start: 16:00, end: 17:00, slot: 'off-peak', minutes: 60 },
  //   { start: 17:00, end: 20:00, slot: 'peak',     minutes: 180 }
  // ]

  // 2. Tính giá từng segment
  let totalRoomPrice = 0
  const breakdown = segments.map(seg => {
    const rule = findPricingRule(roomType, seg.slot)
    const price = (seg.minutes / 60) * rule.pricePerHour
    totalRoomPrice += price
    return { ...seg, price, pricePerHour: rule.pricePerHour }
  })

  // 3. Áp dụng phụ thu (ngày lễ, cuối tuần...)
  let surchargeAmount = 0
  for (const surcharge of applicableSurcharges) {
    surchargeAmount += totalRoomPrice * (surcharge.percentage / 100)
  }

  // 4. Áp dụng thời gian tối thiểu
  const totalMinutes = diff(checkOutTime, checkInTime)
  if (totalMinutes < MIN_DURATION_MINUTES) {
    totalRoomPrice = calculateMinPrice(roomType, checkInTime)
  }

  return {
    segments: breakdown,
    subtotal: totalRoomPrice,
    surcharge: surchargeAmount,
    total: totalRoomPrice + surchargeAmount
  }
}
```

### 7.2 Xử lý edge cases

```
Case 1: Hát qua nửa đêm (cross-day)
  Check-in: 23:00 ngày 25/03
  Check-out: 02:00 ngày 26/03
  → Tất cả trong khung peak (17:00-05:00)
  → Tính 3 giờ x giá peak

Case 2: Hát từ off-peak sang peak
  Check-in: 15:00
  Check-out: 19:00
  → Segment 1: 15:00-17:00 = 2h x giá off-peak
  → Segment 2: 17:00-19:00 = 2h x giá peak

Case 3: Phụ thu ngày lễ
  Check-in: 20:00 (ngày lễ)
  → Giá peak + 20% phụ thu

Case 4: Thời gian tối thiểu
  Check-in: 20:00, Check-out: 20:25 (25 phút)
  → Tính theo 1 giờ tối thiểu
```

---

## 8. QR CODE PAYMENT LOGIC

### 8.1 Quy tắc chọn QR

```
┌─────────────────────────────────────────┐
│         QR CODE SELECTION LOGIC          │
│                                         │
│  currentHour = new Date().getHours()    │
│                                         │
│  if (currentHour >= 0 && currentHour    │
│      < 12) {                            │
│    // 00:00 - 11:59 → QR Mã 2          │
│    displayQR = QR_CODE_2                │
│  } else {                               │
│    // 12:00 - 23:59 → QR Mã 1          │
│    displayQR = QR_CODE_1                │
│  }                                      │
│                                         │
│  Hiển thị: ảnh QR + số tiền cần CK     │
│                                         │
└─────────────────────────────────────────┘
```

### 8.2 Lưu trữ QR

```
- QR images được upload bởi admin
- Lưu tại: /uploads/qr/qr_before_midnight.png
                      /uploads/qr/qr_after_midnight.png
- Path lưu trong bảng Settings
- Admin có thể thay đổi bất cứ lúc nào
```

---

## 9. DEPLOYMENT

### 9.1 Production Setup

```
┌──────────────────────────────────────────────┐
│              VPS / Cloud Server              │
│                                              │
│  ┌──────────┐     ┌──────────────────────┐  │
│  │  Nginx   │────>│  Docker Container    │  │
│  │  :80/443 │     │                      │  │
│  │  SSL     │     │  ┌────────────────┐  │  │
│  │  Proxy   │     │  │  Node.js App   │  │  │
│  └──────────┘     │  │  :3000         │  │  │
│                   │  │  Express +     │  │  │
│                   │  │  React static  │  │  │
│                   │  │  Socket.io     │  │  │
│                   │  └───────┬────────┘  │  │
│                   │          │            │  │
│                   │  ┌───────▼────────┐  │  │
│                   │  │  PostgreSQL    │  │  │
│                   │  │  :5432         │  │  │
│                   │  └────────────────┘  │  │
│                   └──────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

### 9.2 Docker Compose

```yaml
# docker-compose.yml (concept)
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
      - JWT_SECRET=...
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=musicbox
      - POSTGRES_USER=musicbox
      - POSTGRES_PASSWORD=...
    volumes:
      - pgdata:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app

volumes:
  pgdata:
```

### 9.3 Environment Variables

```bash
# .env.example
# ── Database ──
DATABASE_URL=postgresql://musicbox:password@localhost:5432/musicbox

# ── JWT ──
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=12h

# ── Server ──
PORT=3000
NODE_ENV=production

# ── Upload ──
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB

# ── Timezone ──
TZ=Asia/Ho_Chi_Minh
```

---

## 10. SECURITY

### 10.1 Các biện pháp bảo mật

| Layer | Biện pháp | Chi tiết |
|-------|-----------|----------|
| Network | HTTPS/SSL | Mã hóa toàn bộ traffic |
| Network | CORS | Chỉ cho phép origin từ app |
| HTTP | Helmet.js | Security headers (XSS, clickjacking...) |
| Auth | JWT | Token-based, expiry 12h |
| Auth | bcrypt | Hash password, salt rounds = 12 |
| Auth | Rate Limiting | Max 5 login attempts / 15 phút |
| Input | Zod Validation | Validate mọi input từ client |
| Input | Sanitization | Chống XSS, SQL injection |
| File | Upload Validation | Chỉ cho phép image types, max 5MB |
| DB | Prisma ORM | Parameterized queries (chống SQL injection) |
| DB | Backup | Tự động backup hàng ngày |
| Audit | Logging | Ghi log mọi thao tác quan trọng |

### 10.2 Password Policy
- Độ dài tối thiểu: 6 ký tự (nội bộ nên đơn giản)
- Hash bằng bcrypt với salt rounds = 12
- Admin có thể reset password nhân viên

---

## 11. PERFORMANCE

### 11.1 Tối ưu hóa

| Khu vực | Giải pháp |
|---------|-----------|
| Frontend | React.lazy + Suspense (code splitting) |
| Frontend | React Query caching (stale time: 30s cho room data) |
| Frontend | Debounce search input |
| Backend | Database connection pooling (Prisma) |
| Backend | Gzip compression |
| Backend | Response caching cho static data (menu, settings) |
| Database | Indexes trên các column query thường xuyên |
| Database | Soft delete (không xóa thật, đánh dấu deleted) |
| WebSocket | Room-based broadcast (chỉ gửi cho client liên quan) |

### 11.2 Dự kiến tải

```
- Concurrent users: 5-10 (nội bộ)
- Rooms active: max 10
- Orders/day: ~50-200
- Database size (1 năm): ~500MB
→ Một VPS nhỏ (2 vCPU, 4GB RAM) là đủ
```

---

## 12. MONITORING & BACKUP

### 12.1 Logging

```
Winston Logger → 3 levels:
├── error.log    # Errors only
├── combined.log # All logs
└── Console      # Development only

Format: [timestamp] [level] [module] message {metadata}
VD: [2026-03-25 20:30:15] [INFO] [room] Check-in room 5 {userId: 3, customer: "Anh Tuấn"}
```

### 12.2 Backup Strategy

```
PostgreSQL backup:
├── Daily: pg_dump full backup → /backups/daily/
├── Weekly: Giữ 4 bản gần nhất
├── Monthly: Giữ 12 bản gần nhất
└── Trigger: node-cron chạy lúc 05:30 sáng (sau giờ đóng cửa)

Upload files backup:
└── Rsync /uploads/ → backup location
```
