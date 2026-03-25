# MUSIC BOX MANAGER - Task Decomposition cho Multi-AI Development

> Mục tiêu: Chia task để nhiều AI agent làm đồng thời mà KHÔNG conflict
> Ngày tạo: 2026-03-25

---

## NGUYÊN TẮC CHIA TASK

```
1. MỖI TASK = 1 THƯ MỤC RIÊNG          → Không conflict file
2. SHARED CODE tạo trước (Foundation)   → Các task khác dùng chung
3. INTERFACE trước, IMPLEMENTATION sau  → Đồng ý contract trước
4. DATABASE SCHEMA tạo 1 lần duy nhất  → Tất cả dùng chung
5. MỖI TASK có FILE LIST rõ ràng       → AI biết chỉ động vào file nào
```

---

## DEPENDENCY GRAPH

```
                    ┌─────────────────────┐
                    │   TASK 0: FOUNDATION │ ◄── LÀM TRƯỚC TIÊN
                    │   (Project Setup)    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  TASK 1:     │  │  TASK 2:     │  │  TASK 3:     │
   │  AUTH &      │  │  DATABASE    │  │  UI LAYOUT   │
   │  USER MGMT   │  │  & PRISMA   │  │  & DESIGN    │
   │  (Backend)   │  │  SCHEMA     │  │  SYSTEM      │
   └──────┬───────┘  └──────┬──────┘  └──────┬───────┘
          │                 │                 │
          └────────┬────────┘                 │
                   │ ◄── DB + Auth sẵn sàng   │
     ┌─────────────┼─────────────┐            │
     │             │             │            │
     ▼             ▼             ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ TASK 4: │  │ TASK 5:  │  │ TASK 6:  │  │ TASK 7:  │
│ ROOM    │  │ ORDER &  │  │ STOCK &  │  │ CUSTOMER │
│ MODULE  │  │ MENU     │  │ INVENTORY│  │ MODULE   │
│ Backend │  │ MODULE   │  │ MODULE   │  │ Backend  │
│         │  │ Backend  │  │ Backend  │  │          │
└────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘
     │             │             │             │
     ▼             ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ TASK 8: │  │ TASK 9:  │  │ TASK 10: │  │ TASK 11:│
│ ROOM    │  │ ORDER &  │  │ STOCK   │  │ CUSTOMER│
│ MODULE  │  │ MENU     │  │ MODULE  │  │ MODULE  │
│ Frontend│  │ Frontend │  │ Frontend│  │ Frontend│
└────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘
     │             │             │              │
     └──────┬──────┴─────────────┘              │
            │                                   │
            ▼                                   │
     ┌─────────────┐                            │
     │  TASK 12:   │                            │
     │  CHECKOUT & │ ◄── Cần Room + Order +     │
     │  PAYMENT    │     Customer sẵn sàng      │
     │  (Full)     │                            │
     └──────┬──────┘                            │
            │                                   │
            ▼                                   │
     ┌─────────────┐  ┌─────────────┐          │
     │  TASK 13:   │  │  TASK 14:   │◄─────────┘
     │  SHIFT &    │  │  REPORT &   │
     │  AUDIT      │  │  DASHBOARD  │
     │  MODULE     │  │  MODULE     │
     └─────────────┘  └─────────────┘
            │                │
            ▼                ▼
     ┌─────────────────────────────┐
     │  TASK 15: REALTIME &        │
     │  WEBSOCKET + NOTIFICATIONS  │
     └─────────────────────────────┘
            │
            ▼
     ┌─────────────────────────────┐
     │  TASK 16: SETTINGS &        │
     │  FINAL INTEGRATION          │
     └─────────────────────────────┘
```

---

## TASK 0: PROJECT FOUNDATION (LÀM ĐẦU TIÊN - 1 AI)

> **Mục tiêu**: Setup project, cài dependencies, cấu hình build tools
> **Ưu tiên**: CRITICAL - tất cả task khác phụ thuộc vào task này
> **Thời lượng ước tính**: ~30 phút

### Files tạo:

```
music-box-manager/
├── package.json                  # Root workspace config
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── client/
│   ├── package.json              # React + deps
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx              # Entry point (minimal)
│   │   ├── App.tsx               # Router shell (empty routes)
│   │   ├── styles/globals.css    # Tailwind base
│   │   └── utils/cn.ts           # Tailwind class merge util
│   └── components.json           # shadcn/ui config
│
├── server/
│   ├── package.json              # Express + deps
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Server entry (minimal)
│       ├── app.ts                # Express app setup
│       └── types/index.ts        # Shared types
│
└── prisma/
    └── (schema sẽ do Task 2 tạo)
```

### Công việc:
- [ ] Init monorepo (npm workspaces)
- [ ] Cài tất cả dependencies (client + server)
- [ ] Config Vite, Tailwind, TypeScript
- [ ] Setup shadcn/ui
- [ ] Setup Express + middleware cơ bản (helmet, cors, compression)
- [ ] Verify `npm run dev` chạy được cả client và server
- [ ] Tạo `.env.example`

### Dependencies cài đặt:

```bash
# Client
react react-dom react-router-dom
@tanstack/react-query axios socket.io-client
zustand recharts date-fns react-hot-toast
lucide-react tailwindcss @tailwindcss/forms
class-variance-authority clsx tailwind-merge
# Dev
typescript @types/react @types/react-dom vite @vitejs/plugin-react

# Server
express socket.io @prisma/client
jsonwebtoken bcryptjs zod multer
cors helmet compression winston node-cron
# Dev
typescript @types/express @types/node @types/jsonwebtoken
@types/bcryptjs @types/multer @types/cors ts-node-dev prisma
```

---

## TASK 1: AUTH & USER MANAGEMENT (Backend)

> **Phụ thuộc**: Task 0, Task 2
> **AI chỉ chạm vào thư mục**: `server/src/modules/auth/`, `server/src/middleware/`

### Files tạo:

```
server/src/
├── modules/auth/
│   ├── auth.routes.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.validation.ts
├── middleware/
│   ├── auth.middleware.ts         # JWT verify
│   ├── role.middleware.ts         # RBAC check
│   ├── validate.middleware.ts     # Zod validator
│   └── error.middleware.ts        # Global error handler
└── utils/
    └── logger.ts                  # Winston logger
```

### API endpoints:
```
POST   /api/v1/auth/login
GET    /api/v1/auth/me
PATCH  /api/v1/auth/password
```

### Business logic:
- Hash password với bcrypt (salt rounds = 12)
- Sign JWT với expiry 12h, payload: { sub, username, role }
- Middleware `authenticate`: verify JWT từ header Authorization
- Middleware `authorize(roles[])`: check role hierarchy (OWNER > MANAGER > CASHIER > STAFF)
- Rate limiting: max 5 login attempts / 15 phút
- Global error handler: format lỗi thống nhất `{ success, error: { code, message } }`

### Contract (exports cho các module khác dùng):
```typescript
// middleware/auth.middleware.ts
export const authenticate: RequestHandler
// middleware/role.middleware.ts
export const authorize: (...roles: UserRole[]) => RequestHandler
// middleware/validate.middleware.ts
export const validate: (schema: ZodSchema) => RequestHandler
```

---

## TASK 2: DATABASE & PRISMA SCHEMA (1 AI duy nhất)

> **Phụ thuộc**: Task 0
> **AI chỉ chạm vào thư mục**: `prisma/`

### Files tạo:

```
prisma/
├── schema.prisma          # Toàn bộ schema (copy từ DATABASE.md)
├── seed.ts                # Seed data
└── migrations/            # Auto-generated
```

### Công việc:
- [ ] Viết toàn bộ `schema.prisma` (theo DATABASE.md)
- [ ] Chạy `npx prisma migrate dev --name init`
- [ ] Viết seed script:
  - 2 RoomTypes (Nhỏ, Lớn)
  - 10 Rooms (7 nhỏ + 3 lớn)
  - 1 Admin user (username: admin, password: admin123)
  - 6 MenuCategories mặc định
  - 4 PricingRules mặc định (giá = 0, admin set sau)
  - Default Settings (store_name, qr codes, min_duration...)
- [ ] Chạy `npx prisma db seed`
- [ ] Export Prisma client instance

### Contract (exports):
```typescript
// server/src/lib/prisma.ts
export const prisma: PrismaClient
```

---

## TASK 3: UI LAYOUT & DESIGN SYSTEM (Frontend)

> **Phụ thuộc**: Task 0
> **AI chỉ chạm vào**: `client/src/components/layout/`, `client/src/components/ui/`, `client/src/styles/`
> **KHÔNG tạo pages** - chỉ tạo shell layout + components

### Files tạo:

```
client/src/
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx        # Sidebar + Header + Content area
│   │   ├── Sidebar.tsx           # Menu navigation
│   │   ├── Header.tsx            # Top bar
│   │   └── StatusBar.tsx         # Bottom status
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       ├── badge.tsx
│       ├── dropdown-menu.tsx
│       ├── toast.tsx (+ toaster)
│       ├── tabs.tsx
│       ├── separator.tsx
│       ├── skeleton.tsx
│       ├── scroll-area.tsx
│       └── sheet.tsx             # Slide-in panel
├── styles/
│   └── globals.css               # Dark theme variables, custom styles
└── utils/
    ├── cn.ts                     # Class merge utility
    ├── formatCurrency.ts         # format VNĐ
    └── formatTime.ts             # format giờ/ngày tiếng Việt
```

### Công việc:
- [ ] Setup dark theme CSS variables (theo UI-WIREFRAMES.md Section 1)
- [ ] Install + customize shadcn/ui components (dark mode)
- [ ] Tạo MainLayout với Sidebar, Header, StatusBar
- [ ] Sidebar: menu items với icons (Lucide), active state, collapsible
- [ ] Header: logo, notification bell (placeholder), user dropdown
- [ ] StatusBar: online indicator, shift info (placeholder), revenue (placeholder)
- [ ] Responsive: desktop sidebar → tablet/mobile bottom nav
- [ ] Utility functions: formatCurrency, formatTime
- [ ] App.tsx: setup Router + MainLayout wrapper với empty route placeholders

### Design tokens (từ UI-WIREFRAMES.md):
```css
/* Bắt buộc tuân theo */
--bg-primary: #0a0a0f;
--bg-secondary: #111118;
--accent-primary: #6c5ce7;
--accent-gradient: linear-gradient(135deg, #6c5ce7, #a855f7);
--status-available: #22c55e;
--status-occupied: #ef4444;
--status-ending: #f59e0b;
--status-maintenance: #6b7280;
```

---

## TASK 4: ROOM MODULE - Backend

> **Phụ thuộc**: Task 1, Task 2
> **AI chỉ chạm vào**: `server/src/modules/rooms/`

### Files tạo:

```
server/src/modules/rooms/
├── room.routes.ts
├── room.controller.ts
├── room.service.ts
├── session.service.ts        # Check-in/out/extend/transfer/merge
├── booking.service.ts        # Đặt phòng trước
├── pricing.service.ts        # Tính giá phòng
├── queue.service.ts          # Hàng chờ
└── room.validation.ts        # Zod schemas
```

### API endpoints:
```
GET    /api/v1/rooms                        # Danh sách + trạng thái
GET    /api/v1/rooms/:id                    # Chi tiết phòng
PUT    /api/v1/rooms/:id                    # Cập nhật (OWNER)
PATCH  /api/v1/rooms/:id/maintenance        # Bảo trì (OWNER, MANAGER)

POST   /api/v1/sessions/checkin             # Nhận khách
POST   /api/v1/sessions/:id/checkout        # Tính giá checkout
PATCH  /api/v1/sessions/:id/extend          # Gia hạn
POST   /api/v1/sessions/:id/transfer        # Chuyển phòng
POST   /api/v1/sessions/merge               # Gộp phòng
GET    /api/v1/sessions                     # Lịch sử

POST   /api/v1/bookings                    # Đặt trước
GET    /api/v1/bookings                    # Danh sách booking
POST   /api/v1/bookings/:id/confirm        # Booking → Check-in
PATCH  /api/v1/bookings/:id/cancel          # Hủy booking

POST   /api/v1/waiting-queue               # Thêm hàng chờ
GET    /api/v1/waiting-queue               # Danh sách chờ
POST   /api/v1/waiting-queue/:id/assign    # Xếp phòng
PATCH  /api/v1/waiting-queue/:id/cancel    # Hủy chờ
```

### Business logic quan trọng:
```
pricing.service.ts phải implement:
- splitByTimeSlots(checkIn, checkOut, rules[]) → segments[]
- calculateRoomPrice(segments, roomType, surcharges) → PriceBreakdown
- Xử lý edge cases: qua nửa đêm, qua khung giờ, thời gian tối thiểu
```

---

## TASK 5: ORDER & MENU MODULE - Backend

> **Phụ thuộc**: Task 1, Task 2
> **AI chỉ chạm vào**: `server/src/modules/orders/`, `server/src/modules/menu/`
> **Song song với**: Task 4, 6, 7

### Files tạo:

```
server/src/modules/orders/
├── order.routes.ts
├── order.controller.ts
├── order.service.ts
└── order.validation.ts

server/src/modules/menu/
├── menu.routes.ts
├── menu.controller.ts
├── menu.service.ts
└── menu.validation.ts
```

### API endpoints:
```
# Menu
GET    /api/v1/menu                         # Menu cho order (grouped by category)
GET    /api/v1/menu/categories              # CRUD categories
POST   /api/v1/menu/categories              # (OWNER)
PUT    /api/v1/menu/categories/:id          # (OWNER)
DELETE /api/v1/menu/categories/:id          # (OWNER)
POST   /api/v1/menu/items                   # (OWNER)
PUT    /api/v1/menu/items/:id               # (OWNER)
DELETE /api/v1/menu/items/:id               # (OWNER)

# Orders
POST   /api/v1/orders                       # Tạo order
GET    /api/v1/orders?sessionId=X           # Orders theo session
PATCH  /api/v1/orders/:id/status            # Cập nhật trạng thái
PATCH  /api/v1/orders/:id/cancel            # Hủy (OWNER, MANAGER)
PATCH  /api/v1/orders/:id/items/:itemId     # Sửa số lượng
```

### Business logic:
- Tạo order: validate session active, validate menu items available
- Hủy order: chỉ khi status = PENDING, ghi lý do, ghi audit log
- Tổng order: auto-calculate totalAmount từ items
- Link với Stock: khi order → check stockQuantity, khi served → sẽ trừ kho (ở checkout)

---

## TASK 6: STOCK & INVENTORY MODULE - Backend

> **Phụ thuộc**: Task 1, Task 2
> **AI chỉ chạm vào**: `server/src/modules/stock/`
> **Song song với**: Task 4, 5, 7

### Files tạo:

```
server/src/modules/stock/
├── stock.routes.ts
├── stock.controller.ts
├── stock.service.ts
├── supplier.service.ts
└── stock.validation.ts
```

### API endpoints:
```
# Products
GET    /api/v1/stock/products               # Danh sách tồn kho
POST   /api/v1/stock/products               # Thêm SP (OWNER)
PUT    /api/v1/stock/products/:id           # Sửa SP (OWNER)
DELETE /api/v1/stock/products/:id           # Xóa SP (OWNER)

# Stock Entries
POST   /api/v1/stock/entries                # Nhập/Xuất kho (OWNER, MANAGER)
GET    /api/v1/stock/entries                # Lịch sử nhập/xuất

# Inventory Check
POST   /api/v1/stock/inventory-check        # Kiểm kê (OWNER, MANAGER)

# Suppliers
GET    /api/v1/stock/suppliers
POST   /api/v1/stock/suppliers              # (OWNER)
PUT    /api/v1/stock/suppliers/:id          # (OWNER)
DELETE /api/v1/stock/suppliers/:id          # (OWNER)
```

### Business logic:
- Nhập kho: tạo StockEntry type=IN, cộng stockQuantity
- Xuất kho thủ công: type=OUT_MANUAL, trừ stockQuantity, ghi lý do
- Xuất kho tự động (khi checkout): type=OUT_SALE, trừ theo orderItems
- Kiểm kê: so sánh actual vs system, tạo ADJUSTMENT entries
- Cảnh báo: query products WHERE stockQuantity <= minStock

---

## TASK 7: CUSTOMER MODULE - Backend

> **Phụ thuộc**: Task 1, Task 2
> **AI chỉ chạm vào**: `server/src/modules/customers/`
> **Song song với**: Task 4, 5, 6

### Files tạo:

```
server/src/modules/customers/
├── customer.routes.ts
├── customer.controller.ts
├── customer.service.ts
├── points.service.ts
└── customer.validation.ts
```

### API endpoints:
```
GET    /api/v1/customers                    # Danh sách
GET    /api/v1/customers/lookup?phone=X     # Tra cứu nhanh SĐT
GET    /api/v1/customers/:id                # Chi tiết
GET    /api/v1/customers/:id/history        # Lịch sử ghé
GET    /api/v1/customers/:id/points         # Lịch sử điểm
POST   /api/v1/customers                    # Tạo mới
PUT    /api/v1/customers/:id                # Cập nhật
PATCH  /api/v1/customers/:id/blacklist      # Blacklist (OWNER, MANAGER)
```

### Business logic:
- Lookup by phone: dùng khi check-in, auto-fill thông tin
- Tích điểm: sau checkout, totalSpent += grandTotal, tính points
- Hạng thành viên: auto upgrade dựa trên totalSpent
- Blacklist: flag + reason, cảnh báo khi check-in

---

## TASK 8: ROOM MODULE - Frontend

> **Phụ thuộc**: Task 3 (Layout), Task 4 (API)
> **AI chỉ chạm vào**: `client/src/pages/rooms/`, `client/src/components/RoomCard.tsx`, `client/src/components/CountdownTimer.tsx`

### Files tạo:

```
client/src/
├── pages/rooms/
│   ├── RoomMapPage.tsx           # Grid 10 phòng
│   ├── RoomDetailPanel.tsx       # Slide-in panel chi tiết
│   ├── CheckinDialog.tsx         # Dialog nhận khách
│   ├── CheckoutDialog.tsx        # Dialog thanh toán (basic, QR logic)
│   ├── ExtendDialog.tsx          # Dialog gia hạn
│   ├── TransferDialog.tsx        # Dialog chuyển phòng
│   └── TimelinePage.tsx          # Gantt chart (Phase 2)
├── components/
│   ├── RoomCard.tsx              # Card phòng (4 states)
│   ├── CountdownTimer.tsx        # Đếm ngược
│   └── QRDisplay.tsx             # Hiển thị QR thanh toán
├── hooks/
│   ├── useRooms.ts               # React Query hooks cho rooms
│   ├── useCountdown.ts           # Countdown logic
│   └── usePricing.ts             # Client-side price estimate
├── services/
│   └── roomService.ts            # API calls
├── stores/
│   └── roomStore.ts              # Zustand store
└── types/
    └── room.ts                   # TypeScript types
```

### Wireframe tham chiếu: UI-WIREFRAMES.md Section 5, 6, 7

---

## TASK 9: ORDER & MENU MODULE - Frontend

> **Phụ thuộc**: Task 3 (Layout), Task 5 (API)
> **AI chỉ chạm vào**: `client/src/pages/orders/`
> **Song song với**: Task 8, 10, 11

### Files tạo:

```
client/src/
├── pages/orders/
│   ├── OrderPage.tsx             # Full order page
│   ├── OrderDialog.tsx           # Dialog order (dùng trong RoomDetail)
│   ├── MenuGrid.tsx              # Grid menu items
│   └── OrderHistory.tsx          # Lịch sử order phòng
├── hooks/
│   └── useOrders.ts
├── services/
│   └── orderService.ts
├── stores/
│   └── orderStore.ts
└── types/
    └── order.ts
```

### Wireframe tham chiếu: UI-WIREFRAMES.md Section 8

---

## TASK 10: STOCK MODULE - Frontend

> **Phụ thuộc**: Task 3 (Layout), Task 6 (API)
> **AI chỉ chạm vào**: `client/src/pages/stock/`
> **Song song với**: Task 8, 9, 11

### Files tạo:

```
client/src/
├── pages/stock/
│   ├── StockPage.tsx             # Danh sách tồn kho
│   ├── StockEntryForm.tsx        # Form nhập kho
│   ├── InventoryCheckPage.tsx    # Kiểm kê
│   └── SupplierPage.tsx          # Quản lý NCC
├── hooks/
│   └── useStock.ts
├── services/
│   └── stockService.ts
└── types/
    └── stock.ts
```

### Wireframe tham chiếu: UI-WIREFRAMES.md Section 11

---

## TASK 11: CUSTOMER MODULE - Frontend

> **Phụ thuộc**: Task 3 (Layout), Task 7 (API)
> **AI chỉ chạm vào**: `client/src/pages/customers/`
> **Song song với**: Task 8, 9, 10

### Files tạo:

```
client/src/
├── pages/customers/
│   ├── CustomerListPage.tsx
│   └── CustomerDetailPage.tsx
├── hooks/
│   └── useCustomers.ts
├── services/
│   └── customerService.ts
└── types/
    └── customer.ts
```

---

## TASK 12: CHECKOUT & PAYMENT (Full-stack)

> **Phụ thuộc**: Task 4, 5, 7 (Room + Order + Customer backend done)
> **AI chỉ chạm vào**: `server/src/modules/checkout/`, phần checkout trong frontend

### Files tạo:

```
server/src/modules/checkout/
├── checkout.routes.ts
├── checkout.controller.ts
├── checkout.service.ts         # Invoice + Payment logic
├── voucher.service.ts          # Voucher validation
└── checkout.validation.ts

# Frontend - thêm vào existing
client/src/
├── services/
│   └── checkoutService.ts
└── hooks/
    └── useCheckout.ts
```

### API endpoints:
```
POST   /api/v1/checkout                     # Thanh toán
GET    /api/v1/checkout/qr                  # Lấy QR hiện tại
GET    /api/v1/invoices                     # Lịch sử hóa đơn
GET    /api/v1/invoices/:id                 # Chi tiết hóa đơn
```

### Business logic QUAN TRỌNG:
```
checkout.service.ts:
1. Lấy session + tính room charge (dùng pricing.service từ Task 4)
2. Aggregate tất cả orders → orderTotal
3. Áp dụng giảm giá:
   - Member discount (từ customer tier)
   - Voucher code (validate + apply)
   - Manual discount (cần lý do)
4. Áp dụng phụ thu (surcharges)
5. Trừ deposit (nếu có từ booking)
6. Tạo Invoice + Payment records
7. Trừ kho: iterate orderItems → trừ stockQuantity
8. Cập nhật customer: totalSpent, visitCount, points
9. Cập nhật session: status = COMPLETED
10. Cập nhật room: status = AVAILABLE

QR Logic:
- currentHour = new Date().getHours()
- if (currentHour >= 0 && currentHour < 12) → QR2
- else → QR1
```

### Wireframe tham chiếu: UI-WIREFRAMES.md Section 9

---

## TASK 13: SHIFT & AUDIT MODULE (Full-stack)

> **Phụ thuộc**: Task 1 (Auth), Task 12 (Checkout - cho shift revenue)
> **AI chỉ chạm vào**: `server/src/modules/shifts/`, `server/src/modules/staff/`, `client/src/pages/staff/`

### Files tạo:

```
server/src/modules/shifts/
├── shift.routes.ts
├── shift.controller.ts
└── shift.service.ts

server/src/modules/staff/
├── staff.routes.ts
├── staff.controller.ts
└── staff.service.ts

server/src/middleware/
└── audit.middleware.ts          # Auto audit logging

client/src/pages/staff/
├── StaffPage.tsx                # Quản lý nhân viên
└── ShiftDialog.tsx              # Mở/đóng ca
```

### API endpoints:
```
# Shifts
POST   /api/v1/shifts/open
POST   /api/v1/shifts/:id/close
GET    /api/v1/shifts/current
GET    /api/v1/shifts

# Staff
GET    /api/v1/staff                        # (OWNER)
POST   /api/v1/staff                        # (OWNER)
PUT    /api/v1/staff/:id                    # (OWNER)
PATCH  /api/v1/staff/:id/reset-password     # (OWNER)
PATCH  /api/v1/staff/:id/toggle-active      # (OWNER)

# Audit
GET    /api/v1/audit-logs                   # (OWNER)
```

### Wireframe tham chiếu: UI-WIREFRAMES.md Section 14

---

## TASK 14: REPORTS & DASHBOARD (Full-stack)

> **Phụ thuộc**: Task 12 (cần dữ liệu invoices/payments)
> **AI chỉ chạm vào**: `server/src/modules/reports/`, `client/src/pages/dashboard/`, `client/src/pages/reports/`

### Files tạo:

```
server/src/modules/reports/
├── report.routes.ts
├── report.controller.ts
└── report.service.ts

client/src/pages/
├── dashboard/
│   └── DashboardPage.tsx         # Tổng quan + KPI cards + charts
└── reports/
    ├── ReportsPage.tsx           # Tabs: Doanh thu, Phòng, Kho, Ca
    ├── RevenueChart.tsx          # Biểu đồ doanh thu
    └── RoomUsageChart.tsx        # Biểu đồ phòng
```

### API endpoints:
```
GET    /api/v1/reports/revenue?period=X
GET    /api/v1/reports/rooms
GET    /api/v1/reports/peak-hours
GET    /api/v1/reports/stock
GET    /api/v1/reports/shifts
GET    /api/v1/reports/export?format=xlsx
```

### Wireframe tham chiếu: UI-WIREFRAMES.md Section 4, 12

---

## TASK 15: REALTIME & NOTIFICATIONS (Full-stack)

> **Phụ thuộc**: Task 4, 5 (Room + Order done)
> **AI chỉ chạm vào**: `server/src/socket/`, `client/src/hooks/useSocket.ts`, `client/src/stores/notificationStore.ts`

### Files tạo:

```
server/src/socket/
├── socketManager.ts              # Socket.io setup + auth
├── roomSocket.ts                 # Room status events
└── orderSocket.ts                # Order events

client/src/
├── hooks/
│   ├── useSocket.ts              # Socket connection
│   └── useNotifications.ts       # Notification hook
├── stores/
│   └── notificationStore.ts
└── components/
    └── NotificationBell.tsx      # Dropdown notifications
```

### Socket events:
```
Server → Client:
  room:updated, room:timer_warning, room:timer_expired
  order:new, order:status_changed
  notification:new, shift:updated

Server cron (mỗi 60s):
  Check phòng sắp hết giờ → emit room:timer_warning
  Check phòng quá giờ → emit room:timer_expired
```

### API:
```
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
```

---

## TASK 16: SETTINGS & FINAL INTEGRATION

> **Phụ thuộc**: Tất cả task khác done
> **AI chỉ chạm vào**: `server/src/modules/settings/`, `client/src/pages/settings/`

### Files tạo:

```
server/src/modules/settings/
├── setting.routes.ts
├── setting.controller.ts
└── setting.service.ts

client/src/pages/settings/
├── SettingsPage.tsx              # Tabs container
├── GeneralSettings.tsx           # Tên quán, giờ mở cửa
├── PricingSettings.tsx           # Bảng giá + phụ thu
├── QRSettings.tsx                # Upload QR code 1 & 2
├── RoomSettings.tsx              # Quản lý phòng
└── VoucherSettings.tsx           # Quản lý voucher

client/src/pages/auth/
└── LoginPage.tsx                 # Trang đăng nhập
```

### API:
```
GET    /api/v1/settings                     # (OWNER)
PUT    /api/v1/settings                     # (OWNER)
POST   /api/v1/settings/qr-upload           # Upload QR (OWNER)
CRUD   /api/v1/settings/pricing             # (OWNER)
CRUD   /api/v1/settings/surcharges          # (OWNER)
CRUD   /api/v1/settings/vouchers            # (OWNER)
```

### Wireframe tham chiếu: UI-WIREFRAMES.md Section 13

---

## MA TRẬN SONG SONG

```
PHASE    AI-1           AI-2           AI-3           AI-4
═════    ════           ════           ════           ════

  A      Task 0: Foundation
         (30 phút)
         ──────────────────────────────────────────────────

  B      Task 2:        Task 3:        Task 1:
         Database       UI Layout      Auth Backend
         Schema         Design System  Middleware
         ──────────────────────────────────────────────────

  C      Task 4:        Task 5:        Task 6:        Task 7:
         Room BE        Order BE       Stock BE       Customer BE
         ──────────────────────────────────────────────────

  D      Task 8:        Task 9:        Task 10:       Task 11:
         Room FE        Order FE       Stock FE       Customer FE
         ──────────────────────────────────────────────────

  E      Task 12:                      Task 13:
         Checkout                      Shift & Audit
         Full-stack                    Full-stack
         ──────────────────────────────────────────────────

  F      Task 14:                      Task 15:
         Reports &                     Realtime &
         Dashboard                     Notifications
         ──────────────────────────────────────────────────

  G      Task 16: Settings & Final Integration
         (1 AI tổng hợp)
```

---

## QUY TẮC CHO MỖI AI AGENT

### 1. KHÔNG ĐƯỢC chạm vào file ngoài phạm vi
```
❌ AI làm Task 5 (Order) KHÔNG ĐƯỢC sửa file trong server/src/modules/rooms/
✅ AI làm Task 5 (Order) CHỈ ĐƯỢC sửa file trong server/src/modules/orders/ và menu/
```

### 2. IMPORT từ module khác qua interface
```typescript
// ✅ ĐÚNG - import qua interface đã thỏa thuận
import { prisma } from '../../lib/prisma'
import { authenticate, authorize } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'

// ❌ SAI - import trực tiếp logic nội bộ module khác
import { someInternalHelper } from '../rooms/room.service'
```

### 3. ĐĂNG KÝ routes trong file riêng
```typescript
// Mỗi module export router riêng
// server/src/modules/orders/order.routes.ts
const router = express.Router()
export default router

// Tổng hợp routes ở Task 16 (integration)
// server/src/app.ts
app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/menu', menuRoutes)
// ...
```

### 4. SHARED TYPES quy ước trước

```typescript
// server/src/types/index.ts - AI nào cũng có thể đọc, KHÔNG ĐƯỢC sửa
// (do Task 0 tạo, Task 16 cập nhật nếu cần)

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: { code: string; message: string }
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF'

export interface AuthUser {
  id: number
  username: string
  fullName: string
  role: UserRole
}
```

### 5. MỖI AI phải viết test cơ bản cho module mình
```
server/src/modules/rooms/__tests__/
server/src/modules/orders/__tests__/
...
```

---

## CHECKLIST TỔNG HỢP

```
Phase A (Foundation):
  □ Task 0  - Project setup, dependencies, build tools

Phase B (Base layer - 3 AI song song):
  □ Task 1  - Auth & middleware
  □ Task 2  - Database schema + seed
  □ Task 3  - UI layout + design system

Phase C (Core backend - 4 AI song song):
  □ Task 4  - Room module backend
  □ Task 5  - Order & menu module backend
  □ Task 6  - Stock module backend
  □ Task 7  - Customer module backend

Phase D (Core frontend - 4 AI song song):
  □ Task 8  - Room module frontend
  □ Task 9  - Order & menu module frontend
  □ Task 10 - Stock module frontend
  □ Task 11 - Customer module frontend

Phase E (Integration - 2 AI song song):
  □ Task 12 - Checkout & payment (full-stack)
  □ Task 13 - Shift & audit (full-stack)

Phase F (Enhancement - 2 AI song song):
  □ Task 14 - Reports & dashboard (full-stack)
  □ Task 15 - Realtime & notifications (full-stack)

Phase G (Finalize):
  □ Task 16 - Settings, login page, route integration, final testing
```

---

## PROMPT MẪU CHO TỪNG AI

### Dùng prompt này để giao việc cho mỗi AI agent:

```
Bạn đang làm dự án Music Box Manager - hệ thống quản lý quán karaoke.

**Nhiệm vụ của bạn: TASK [X] - [TÊN TASK]**

Đọc các file tài liệu sau để hiểu context:
- docs/PRD.md (yêu cầu sản phẩm)
- docs/ARCHITECTURE.md (kiến trúc hệ thống)
- docs/DATABASE.md (database schema)
- docs/API.md (API specification)
- docs/UI-WIREFRAMES.md (thiết kế giao diện)
- docs/TASK-DECOMPOSITION.md (phần Task [X])

**QUY TẮC BẮT BUỘC:**
1. CHỈ tạo/sửa files trong phạm vi được ghi trong task
2. KHÔNG chạm vào file ngoài phạm vi
3. Import module khác qua interface đã quy ước
4. Tuân theo response format: { success, data, message, error }
5. Sử dụng Prisma client từ '../../lib/prisma'
6. Sử dụng middleware từ '../../middleware/'
7. Viết TypeScript, không dùng any

Bắt đầu implement Task [X].
```
