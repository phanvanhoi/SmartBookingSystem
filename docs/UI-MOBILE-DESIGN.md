# Music Box Manager — Thiết kế UI Mobile

> Phiên bản: 1.0 · Ngày: 2026-05-29  
> Phạm vi: Màn hình **320px – 767px** (điện thoại), mở rộng tablet 768–1023px  
> Theme: **Light POS** (cam ấm `#E86B3A`) — đồng bộ với `globals.css` hiện tại

---

## 1. Bối cảnh & nguyên tắc

### 1.1 Người dùng & bối cảnh

| Vai trò | Dùng mobile khi |
|---------|-----------------|
| STAFF / CASHIER | Order nhanh, xem phòng, check-in tại sảnh |
| MANAGER / OWNER | Xem doanh thu, kho, báo cáo khi không ở quầy |

**Bối cảnh thực tế:** một tay cầm điện thoại, ánh sáng quán karaoke, thao tác vội giữa khách.

### 1.2 Nguyên tắc thiết kế mobile

1. **Thumb-first** — nút chính nằm vùng ngón cái (dưới màn hình).
2. **3 chạm tối đa** — check-in, order, checkout mỗi flow ≤ 3 bước chính.
3. **Đọc nhanh** — số tiền, timer, trạng thái phòng dùng font tabular, contrast cao.
4. **Không ẩn hành động quan trọng** — CTA chính luôn full-width trên mobile.
5. **Dialog = full-screen sheet** trên `< sm` — tránh panel 2 cột chật.

### 1.3 Breakpoints (Tailwind)

```
xs   320px   iPhone SE — kiểm tra tối thiểu
sm   640px   Điện thoại lớn / landscape ngắn
md   768px   Tablet — chuyển sang sidebar + bỏ bottom nav
lg  1024px   Desktop đầy đủ
```

| Thành phần | `< md` (mobile) | `≥ md` (tablet+) |
|------------|-----------------|------------------|
| Sidebar | Ẩn → Sheet từ hamburger | Cố định trái 240px |
| Bottom nav | Cố định 64px | Ẩn |
| Status bar | Thu gọn 1 dòng | Đầy đủ 3 vùng |
| Dialog order | Full-screen stack | 2 cột menu + giỏ |

---

## 2. Shell layout (Mobile)

### 2.1 Cấu trúc tổng thể

```
┌─────────────────────────────┐  ← safe-area-top
│ HEADER          56px        │  hamburger · logo · 🔔 · avatar
├─────────────────────────────┤
│                             │
│   MAIN (scroll)             │  padding: 16px
│   pb = 64 + 32 + safe       │  bottom nav + status + home indicator
│                             │
├─────────────────────────────┤
│ STATUS BAR      32px        │  🟢 Online · Doanh thu ca (rút gọn)
├─────────────────────────────┤
│ BOTTOM NAV      64px        │  4 tab + "Thêm"
└─────────────────────────────┘  ← safe-area-bottom
```

### 2.2 Header (compact)

```
┌──────────────────────────────────────┐
│ [≡]  Music Box          [🔔] [👤]  │
└──────────────────────────────────────┘
```

| Phần tử | Mobile | Ghi chú |
|---------|--------|---------|
| Hamburger `[≡]` | Hiện | Mở **Menu Sheet** (các mục không nằm bottom nav) |
| Tên ca | Ẩn | Chuyển vào Status bar hoặc sheet |
| Tên user | Ẩn label | Chỉ avatar tròn 28px |
| Chuông | 44×44 tap target | Badge đỏ góc phải |

### 2.3 Bottom navigation — **4 + Thêm**

Hiện tại app chỉ hiện 5 mục đầu → thiếu Kho, Cài đặt, v.v. Thiết kế mới:

| Vị trí | STAFF | CASHIER | MANAGER |
|--------|-------|---------|---------|
| Tab 1 | Phòng | Phòng | Phòng |
| Tab 2 | Order | Order | Order |
| Tab 3 | — | Khách | Lịch |
| Tab 4 | — | — | Tổng quan |
| Tab 5 | **Thêm** | **Thêm** | **Thêm** |

**Tab "Thêm"** mở bottom sheet:

```
┌─────────────────────────────┐
│         ─── (handle)        │
│  Menu đầy đủ                │
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ Lịch│ │ Kho │ │ B/C │   │  grid 3 cột
│  └─────┘ └─────┘ └─────┘   │
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ KH  │ │ FB  │ │ ⚙️  │   │
│  └─────┘ └─────┘ └─────┘   │
└─────────────────────────────┘
```

- Icon 24px + label 11px, ô tối thiểu **72×72px**.
- Mục không có quyền → ẩn hoàn toàn (không hiện xám).

### 2.4 Menu Sheet (hamburger)

Slide từ trái, rộng **85vw max 320px**:

```
┌──────────────────┐
│ ♪ Music Box      │
│ ─────────────    │
│ 👤 Nguyễn A      │
│    Thu ngân      │
│ ─────────────    │
│ 🚪 Phòng      ●  │  ← active
│ 🍺 Order         │
│ ... (full list)  │
│ ─────────────    │
│ Đổi MK · ĐX      │
└──────────────────┘
```

---

## 3. Design tokens (Mobile)

### 3.1 Màu — giữ theme hiện tại

```css
/* Đã có trong globals.css — không đổi brand */
--primary: 16 85% 55%;        /* cam POS */
--background: 30 25% 98%;
--card: 0 0% 100%;
```

**Trạng thái phòng (mobile card):**

| Status | Nền card | Viền trái 4px | Badge |
|--------|----------|---------------|-------|
| AVAILABLE | trắng | `#22c55e` | Trống |
| OCCUPIED | trắng | `#ef4444` | Đang hát |
| ENDING_SOON | `#fffbeb` | `#f59e0b` | Sắp trống |
| MAINTENANCE | `#f4f4f5` | `#9ca3af` | Bảo trì |

### 3.2 Typography mobile

| Token | Size | Weight | Dùng cho |
|-------|------|--------|----------|
| `text-page-title` | 18px | 700 | Tiêu đề trang |
| `text-card-title` | 14px | 600 | Tên phòng, tên món |
| `text-money` | 14px | 700 | Giá, tổng tiền (tabular-nums) |
| `text-caption` | 11px | 500 | Label, badge |
| `text-timer` | 20px | 700 | Countdown phòng |

**Font:** system-ui stack hiện tại (Segoe UI / Roboto) — hỗ trợ tiếng Việt tốt, không cần webfont nặng trên 3G.

### 3.3 Touch & spacing

| Quy tắc | Giá trị |
|---------|---------|
| Tap target tối thiểu | **44×44px** (Apple HIG) |
| Khoảng cách giữa nút | ≥ 8px |
| Padding card | 12px |
| Padding trang | 16px (12px trên xs 320px) |
| Bottom nav height | 64px + `env(safe-area-inset-bottom)` |
| Radius card | 12px (`rounded-xl`) |
| Radius nút CTA | 12px, height **48px** |

---

## 4. Màn hình chính

### 4.1 Đăng nhập

```
┌─────────────────────────────┐
│                             │
│      [♪]  MUSIC BOX         │
│      Hệ thống quản lý       │
│                             │
│  ┌─────────────────────┐    │
│  │ 👤 Tên đăng nhập    │    │  h: 48px
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ 🔒 Mật khẩu     👁  │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │    ĐĂNG NHẬP        │    │  full width, primary
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

- Form `max-w-sm`, căn giữa dọc.
- Input font **16px** (tránh iOS auto-zoom).
- Không scroll ngang.

### 4.2 Bản đồ phòng (trang mặc định)

**Layout mobile — 2 cột theo sơ đồ quán (giữ logic trái/phải):**

```
┌─────────────────────────────┐
│ Phòng karaoke    [↻]       │
│ [Tất cả][Trống][Hát][⚠]    │  ← filter chips scroll ngang
├─────────────────────────────┤
│  TRÁI          │  PHẢI     │
│ ┌────┐ ┌────┐ │ ┌────┐     │
│ │ P2 │ │ P4 │ │ │ P1 │     │  2 cột mỗi bên
│ └────┘ └────┘ │ └────┘     │
│ ┌────┐ ┌────┐ │ ┌────┐     │
│ │ P6 │ │ P8 │ │ │ P3 │     │
│ └────┘ └────┘ │ └────┘     │
│ ...           │ ...        │
└─────────────────────────────┘
```

**Room card compact (mobile):**

```
┌─────────────────┐
│▌ P4      [Hát] │  ← viền trái màu status
│▌ ⏱ 01:24:30    │
│▌ 💰 320K       │
└─────────────────┘
   min-h: 88px
```

- Tap card → sheet chi tiết (không panel bên phải như desktop).
- Phòng trống: tap → **Check-in sheet** full-screen.

### 4.3 Chi tiết phòng (Bottom Sheet)

```
┌─────────────────────────────┐
│        ───                  │
│  Phòng 4 · Đang hát         │
│  Nguyễn Văn A · 4 khách     │
│  ⏱ Còn 01:24:30             │
│  Order: 150,000             │
├─────────────────────────────┤
│ ┌──────────┐ ┌──────────┐  │
│ │ + Order  │ │ Gia hạn  │  │  2 cột
│ └──────────┘ └──────────┘  │
│ ┌────────────────────────┐ │
│ │      CHECKOUT          │ │  full width primary
│ └────────────────────────┘ │
└─────────────────────────────┘
```

- Sheet cao **70vh**, kéo full màn nếu cần.
- Swipe down để đóng.

### 4.4 Order (full-screen mobile)

**Thay vì 2 cột ngang — stack dọc + tab:**

```
┌─────────────────────────────┐
│ ← Order · Phòng 4           │
├─────────────────────────────┤
│ [Menu] [Giỏ hàng (3)]       │  ← tabs sticky
├─────────────────────────────┤
│ Tab Menu:                   │
│ [Đồ ăn] [Đồ uống]           │  chip category
│ ┌────┐ ┌────┐               │
│ │🍿 │ │🥤 │               │  grid 2 cột
│ │20K│ │15K│               │
│ │+  │ │Hết│               │
│ └────┘ └────┘               │
├─────────────────────────────┤
│ (Tab Giỏ: sticky footer)    │
│ Tổng: 85,000                │
│ [    XÁC NHẬN ORDER    ]    │  fixed bottom trên nav
└─────────────────────────────┘
```

| Thành phần | Mobile spec |
|------------|-------------|
| Menu grid | 2 cột, gap 8px |
| Card món | Ảnh 1:1, tên 2 dòng max, giá cam |
| Hết hàng | Badge đỏ "Hết", opacity 60%, không nút + |
| Giỏ hàng | Tab riêng, badge số lượng trên tab |
| CTA | Fixed `bottom: calc(64px + safe)` |

### 4.5 Checkout

```
┌─────────────────────────────┐
│ ← Thanh toán · Phòng 4      │
├─────────────────────────────┤
│ Phòng        375,000        │
│ Order        150,000        │
│ ─────────────────────       │
│ Tạm tính     525,000        │
│ Giảm giá     -52,500        │
│ ═════════════════════       │
│ TỔNG         472,500        │  text 22px bold
├─────────────────────────────┤
│ [QR 1]  [QR 2]  [Tiền mặt]  │  segment control
│ ┌─────────────────────────┐ │
│ │     XÁC NHẬN TT        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- QR hiển thị full-width, pinch-zoom được.
- Nút xác nhận sticky bottom.

### 4.6 Kho hàng

```
┌─────────────────────────────┐
│ Kho hàng          [+ SP]    │
│ 🔍 Tìm kiếm...              │
├─────────────────────────────┤
│ ⚠ 3 SP dưới mức tối thiểu  │  banner vàng, tap xem
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Sting          11 chai  │ │
│ │ Min: 10  ● OK           │ │
│ └─────────────────────────┘ │  list card, không table
│ ┌─────────────────────────┐ │
│ │ Trà ô long      0 chai  │ │
│ │ Min: 10  ● Hết          │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- **Không dùng table** trên mobile — chuyển sang list card.
- Swipe trái card → "Nhập kho" / "Kiểm kê".

### 4.7 Báo cáo / Dashboard

- **1 metric / hàng** trên mobile.
- Biểu đồ: chiều cao 200px, scroll ngang nếu nhiều cột.
- Date filter: bottom sheet chọn khoảng ngày.

---

## 5. Component patterns

### 5.1 Dialog → Sheet trên mobile

| Desktop | Mobile `< md` |
|---------|---------------|
| `Dialog` centered max-w-4xl | `Sheet` full-height hoặc `Drawer` bottom |
| 2 cột | 1 cột + tabs |
| Close X góc | Swipe down + nút ← back |

### 5.2 Form inputs

- Height **48px**, font **16px**.
- Label trên input (không placeholder-only).
- Numeric keypad cho SĐT, số lượng, tiền mặt.

### 5.3 Toast

- Vị trí: **top-center** trên mobile (tránh che bottom nav).
- Max width: `calc(100vw - 32px)`.

### 5.4 Loading

- Skeleton card thay spinner toàn màn.
- Pull-to-refresh trên danh sách phòng / order.

---

## 6. Luồng tương tác (Mobile)

### Check-in — 3 chạm

```
Tap phòng trống → Sheet nhập tên/SĐT → [Nhận khách]
```

### Order — 3 chạm

```
Tap phòng đang hát → [+ Order] → Chọn món → [Xác nhận]
```

### Checkout — 4 chạm

```
Tap phòng → [Checkout] → Review bill → Chọn PTTT → [Xác nhận]
```

---

## 7. Gap hiện tại vs thiết kế mới

| Hạng mục | Hiện tại | Cần làm |
|----------|----------|---------|
| Bottom nav | 5 mục đầu, thiếu menu | Tab 4 + "Thêm" sheet |
| Hamburger | Có nút, chưa wired | Menu sheet trái |
| Order dialog | 2 cột chật mobile | Full-screen + tab Menu/Giỏ |
| Room detail | Panel desktop | Bottom sheet |
| Status bar | Doanh thu hardcode 0 | Nối API, rút gọn mobile |
| Safe area | Chưa có | `pb-safe`, `pt-safe` iOS |
| Kho / Báo cáo | Table desktop | List card responsive |

---

## 8. Lộ trình triển khai

### Phase 1 — Shell (1–2 ngày)
- [ ] Safe area + bottom nav "Thêm"
- [ ] Menu sheet (hamburger)
- [ ] Status bar mobile rút gọn + API

### Phase 2 — Core flows (2–3 ngày)
- [ ] Room detail → bottom sheet
- [ ] Order → full-screen tabs
- [ ] Check-in / Checkout sheet mobile

### Phase 3 — Secondary pages (2 ngày)
- [ ] Kho: list card
- [ ] Báo cáo: metric stack
- [ ] Khách hàng: search sticky + card list

### Phase 4 — Polish
- [ ] Pull-to-refresh
- [ ] Haptic feedback (optional)
- [ ] Test iPhone SE 320px + Android Chrome

---

## 9. Checklist QA mobile

- [ ] Không scroll ngang toàn trang
- [ ] Mọi nút ≥ 44px
- [ ] Input không bị zoom iOS (font ≥ 16px)
- [ ] Bottom nav không che CTA (padding đúng)
- [ ] Dialog scroll được khi bàn phím mở
- [ ] Landscape: Order vẫn dùng được (1 cột hoặc 2 cột menu)
- [ ] Offline toast rõ ràng (Socket disconnect)

---

## 10. Tham chiếu file code

| Thành phần | File hiện tại |
|------------|---------------|
| Layout | `client/src/components/layout/MainLayout.tsx` |
| Bottom nav | `client/src/components/layout/Sidebar.tsx` → `BottomNav` |
| Header | `client/src/components/layout/Header.tsx` |
| Order UI | `client/src/pages/orders/OrderDialog.tsx`, `MenuGrid.tsx` |
| Phòng | `client/src/pages/rooms/RoomMapPage.tsx` |
| Theme | `client/src/styles/globals.css` |

Wireframe desktop cũ: `docs/UI-WIREFRAMES.md` §2.3, §17 — **theme dark trong wireframe cũ đã lỗi thời**; dùng tài liệu này làm chuẩn mobile.
