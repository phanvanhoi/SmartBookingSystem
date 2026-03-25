# MUSIC BOX MANAGER - API Specification

> Version: 1.0
> Base URL: `/api/v1`
> Format: JSON
> Authentication: Bearer JWT Token
> Ngày tạo: 2026-03-25

---

## 1. TỔNG QUAN

### 1.1 Conventions

```
Method   Ý nghĩa
──────   ────────
GET      Lấy dữ liệu
POST     Tạo mới
PUT      Cập nhật toàn bộ
PATCH    Cập nhật một phần
DELETE   Xóa (soft delete)
```

### 1.2 Response Format

```json
// Thành công
{
  "success": true,
  "data": { ... },
  "message": "Thao tác thành công"
}

// Thành công - Danh sách có phân trang
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_AVAILABLE",
    "message": "Phòng đang được sử dụng"
  }
}
```

### 1.3 HTTP Status Codes

| Code | Ý nghĩa |
|------|----------|
| 200 | OK - Thành công |
| 201 | Created - Tạo mới thành công |
| 400 | Bad Request - Dữ liệu không hợp lệ |
| 401 | Unauthorized - Chưa đăng nhập |
| 403 | Forbidden - Không có quyền |
| 404 | Not Found - Không tìm thấy |
| 409 | Conflict - Xung đột (VD: phòng đã được đặt) |
| 422 | Unprocessable - Lỗi validation |
| 500 | Internal Server Error |

### 1.4 Authentication Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Các endpoint KHÔNG cần auth:
- `POST /api/v1/auth/login`

---

## 2. AUTH

### 2.1 Đăng nhập

```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "username": "thu_ngan_01",
  "password": "password123"
}
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 2,
      "username": "thu_ngan_01",
      "fullName": "Nguyễn Văn A",
      "role": "CASHIER",
      "phone": "0901234567"
    }
  }
}
```

**Errors:**
- `401` - Sai username hoặc password
- `403` - Tài khoản bị vô hiệu hóa
- `429` - Quá nhiều lần thử (rate limit)

### 2.2 Lấy thông tin user hiện tại

```
GET /api/v1/auth/me
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "thu_ngan_01",
    "fullName": "Nguyễn Văn A",
    "role": "CASHIER",
    "currentShift": {
      "id": 5,
      "startTime": "2026-03-25T17:00:00+07:00",
      "status": "OPEN"
    }
  }
}
```

### 2.3 Đổi mật khẩu

```
PATCH /api/v1/auth/password
```

**Request:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

---

## 3. ROOMS (Phòng)

### 3.1 Lấy danh sách phòng + trạng thái realtime

```
GET /api/v1/rooms
```

**Query params:**
- `status` - Lọc theo trạng thái: `AVAILABLE`, `OCCUPIED`, `ENDING_SOON`, `MAINTENANCE`

**Response: 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Phòng 1",
      "roomType": { "id": 1, "name": "Phòng nhỏ", "capacityMax": 8 },
      "status": "OCCUPIED",
      "sortOrder": 1,
      "currentSession": {
        "id": 42,
        "customerName": "Anh Tuấn",
        "guestCount": 5,
        "checkInTime": "2026-03-25T18:30:00+07:00",
        "estimatedEnd": "2026-03-25T20:30:00+07:00",
        "elapsedMinutes": 45,
        "remainingMinutes": 75,
        "currentRoomCharge": 75000,
        "currentOrderTotal": 150000,
        "currentTotal": 225000
      }
    },
    {
      "id": 2,
      "name": "Phòng 2",
      "roomType": { "id": 1, "name": "Phòng nhỏ", "capacityMax": 8 },
      "status": "AVAILABLE",
      "sortOrder": 2,
      "currentSession": null
    }
  ]
}
```

### 3.2 Chi tiết phòng

```
GET /api/v1/rooms/:id
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Phòng 1",
    "roomType": { "id": 1, "name": "Phòng nhỏ", "capacityMin": 4, "capacityMax": 8 },
    "status": "OCCUPIED",
    "currentSession": {
      "id": 42,
      "customerName": "Anh Tuấn",
      "customerPhone": "0901234567",
      "guestCount": 5,
      "checkInTime": "2026-03-25T18:30:00+07:00",
      "estimatedEnd": "2026-03-25T20:30:00+07:00",
      "notes": "Khách quen, hay hát phòng này",
      "orders": [
        {
          "id": 101,
          "status": "SERVED",
          "totalAmount": 150000,
          "items": [
            { "name": "Bia Tiger", "quantity": 2, "unitPrice": 50000, "subtotal": 100000 },
            { "name": "Nước ép cam", "quantity": 1, "unitPrice": 50000, "subtotal": 50000 }
          ],
          "createdAt": "2026-03-25T18:45:00+07:00"
        }
      ],
      "priceBreakdown": {
        "segments": [
          { "start": "18:30", "end": "19:15", "slot": "peak", "minutes": 45, "pricePerHour": 150000, "amount": 112500 }
        ],
        "subtotal": 112500,
        "surcharge": 0,
        "total": 112500
      }
    },
    "todayBookings": [],
    "todayStats": {
      "sessionsCount": 3,
      "totalRevenue": 850000
    }
  }
}
```

### 3.3 Cập nhật phòng (Admin)

```
PUT /api/v1/rooms/:id
```
**Quyền:** OWNER

**Request:**
```json
{
  "name": "Phòng VIP 1",
  "roomTypeId": 2,
  "sortOrder": 1
}
```

### 3.4 Bật/tắt bảo trì

```
PATCH /api/v1/rooms/:id/maintenance
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "maintenance": true,
  "reason": "Sửa mic"
}
```

---

## 4. SESSIONS (Lượt khách)

### 4.1 Check-in

```
POST /api/v1/sessions/checkin
```
**Quyền:** OWNER, MANAGER, CASHIER

**Request:**
```json
{
  "roomId": 5,
  "customerName": "Anh Tuấn",
  "customerPhone": "0901234567",
  "guestCount": 5,
  "estimatedDurationMinutes": 120,
  "notes": "Khách yêu cầu mic không dây"
}
```

**Response: 201**
```json
{
  "success": true,
  "data": {
    "sessionId": 42,
    "roomId": 5,
    "roomName": "Phòng 5",
    "customerName": "Anh Tuấn",
    "checkInTime": "2026-03-25T18:30:00+07:00",
    "estimatedEnd": "2026-03-25T20:30:00+07:00",
    "customer": {
      "id": 15,
      "tier": "GOLD",
      "totalVisits": 12,
      "isBlacklisted": false
    }
  },
  "message": "Check-in phòng 5 thành công"
}
```

**Errors:**
- `409 ROOM_NOT_AVAILABLE` - Phòng đang được sử dụng
- `409 ROOM_MAINTENANCE` - Phòng đang bảo trì
- `422 CUSTOMER_BLACKLISTED` - Khách trong blacklist (cảnh báo, vẫn cho check-in)

### 4.2 Check-out (tính giá, chưa thanh toán)

```
POST /api/v1/sessions/:sessionId/checkout
```
**Quyền:** OWNER, MANAGER, CASHIER

**Response: 200**
```json
{
  "success": true,
  "data": {
    "sessionId": 42,
    "roomName": "Phòng 5",
    "customerName": "Anh Tuấn",
    "checkInTime": "2026-03-25T18:30:00+07:00",
    "checkOutTime": "2026-03-25T21:00:00+07:00",
    "duration": { "hours": 2, "minutes": 30 },

    "roomCharge": {
      "segments": [
        {
          "start": "18:30",
          "end": "21:00",
          "slot": "Giờ cao điểm",
          "minutes": 150,
          "pricePerHour": 150000,
          "amount": 375000
        }
      ],
      "subtotal": 375000,
      "surcharge": 0,
      "total": 375000
    },

    "orders": [
      {
        "id": 101,
        "items": [
          { "name": "Bia Tiger", "quantity": 2, "unitPrice": 50000, "subtotal": 100000 },
          { "name": "Nước ép cam", "quantity": 1, "unitPrice": 50000, "subtotal": 50000 }
        ],
        "total": 150000
      }
    ],
    "orderTotal": 150000,

    "subtotal": 525000,
    "applicableDiscounts": {
      "memberDiscount": { "tier": "GOLD", "percentage": 10, "amount": 37500, "appliesTo": "room" }
    },
    "depositAvailable": 0,

    "grandTotal": 487500,

    "qrCode": {
      "type": "QR1",
      "label": "QR Mã 1 (trước 00:00)",
      "imageUrl": "/uploads/qr/qr_before_midnight.png"
    }
  }
}
```

### 4.3 Gia hạn

```
PATCH /api/v1/sessions/:sessionId/extend
```
**Quyền:** OWNER, MANAGER, CASHIER

**Request:**
```json
{
  "additionalMinutes": 60
}
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "sessionId": 42,
    "newEstimatedEnd": "2026-03-25T22:00:00+07:00",
    "hasConflict": false
  },
  "message": "Gia hạn thêm 60 phút thành công"
}
```

**Errors:**
- `409 BOOKING_CONFLICT` - Có booking trùng giờ `{ nextBooking: { time: "22:00", customer: "Chị Lan" } }`

### 4.4 Chuyển phòng

```
POST /api/v1/sessions/:sessionId/transfer
```
**Quyền:** OWNER, MANAGER, CASHIER

**Request:**
```json
{
  "targetRoomId": 8
}
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "sessionId": 42,
    "fromRoom": { "id": 5, "name": "Phòng 5", "type": "Phòng nhỏ" },
    "toRoom": { "id": 8, "name": "Phòng 8", "type": "Phòng lớn" },
    "priceNote": "Giá sẽ tính theo phòng lớn từ thời điểm chuyển"
  },
  "message": "Chuyển từ Phòng 5 sang Phòng 8 thành công"
}
```

### 4.5 Gộp phòng

```
POST /api/v1/sessions/merge
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "primarySessionId": 42,
  "secondarySessionId": 45
}
```

### 4.6 Lịch sử sessions

```
GET /api/v1/sessions
```

**Query params:**
- `page`, `limit` - Phân trang
- `roomId` - Lọc theo phòng
- `status` - `ACTIVE`, `COMPLETED`
- `dateFrom`, `dateTo` - Khoảng thời gian
- `search` - Tìm theo tên/SĐT khách

---

## 5. BOOKINGS (Đặt trước)

### 5.1 Tạo booking

```
POST /api/v1/bookings
```
**Quyền:** OWNER, MANAGER, CASHIER

**Request:**
```json
{
  "roomId": 3,
  "customerName": "Chị Lan",
  "customerPhone": "0987654321",
  "bookingDate": "2026-03-26",
  "bookingTime": "19:00",
  "durationHours": 2,
  "depositAmount": 200000,
  "notes": "Sinh nhật, cần trang trí"
}
```

**Errors:**
- `409 BOOKING_OVERLAP` - Trùng lịch đặt phòng

### 5.2 Danh sách booking

```
GET /api/v1/bookings
```

**Query params:**
- `date` - Ngày cụ thể (mặc định: hôm nay)
- `roomId` - Lọc theo phòng
- `status` - `PENDING`, `CONFIRMED`, `CANCELLED`

### 5.3 Chuyển booking → check-in

```
POST /api/v1/bookings/:bookingId/confirm
```

**Response:** Tạo session mới + cập nhật booking status → CONFIRMED

### 5.4 Hủy booking

```
PATCH /api/v1/bookings/:bookingId/cancel
```

**Request:**
```json
{
  "reason": "Khách hủy, hoàn cọc"
}
```

---

## 6. ORDERS (Đặt đồ)

### 6.1 Tạo order

```
POST /api/v1/orders
```
**Quyền:** OWNER, MANAGER, CASHIER, STAFF

**Request:**
```json
{
  "sessionId": 42,
  "items": [
    { "menuItemId": 3, "quantity": 2, "notes": "Bia không đá" },
    { "menuItemId": 7, "quantity": 1 },
    { "menuItemId": 12, "quantity": 1, "notes": "Thêm đường" }
  ],
  "notes": "Phục vụ nhanh"
}
```

**Response: 201**
```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "sessionId": 42,
    "roomName": "Phòng 5",
    "status": "PENDING",
    "items": [
      { "id": 201, "name": "Bia Tiger", "quantity": 2, "unitPrice": 50000, "subtotal": 100000, "notes": "Bia không đá" },
      { "id": 202, "name": "Nước ép cam", "quantity": 1, "unitPrice": 50000, "subtotal": 50000 },
      { "id": 203, "name": "Nước chanh", "quantity": 1, "unitPrice": 35000, "subtotal": 35000, "notes": "Thêm đường" }
    ],
    "totalAmount": 185000
  },
  "message": "Order phòng 5 thành công"
}
```

**Errors:**
- `404 SESSION_NOT_FOUND` - Session không tồn tại
- `400 SESSION_NOT_ACTIVE` - Session đã checkout
- `400 ITEM_UNAVAILABLE` - Món hết hàng `{ item: "Bia Heineken", reason: "out_of_stock" }`

### 6.2 Lấy orders theo session

```
GET /api/v1/orders?sessionId=42
```

### 6.3 Cập nhật trạng thái order

```
PATCH /api/v1/orders/:orderId/status
```
**Quyền:** OWNER, MANAGER, CASHIER, STAFF

**Request:**
```json
{
  "status": "PREPARING"
}
```

### 6.4 Hủy order

```
PATCH /api/v1/orders/:orderId/cancel
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "reason": "Khách đổi ý, không muốn nước ép"
}
```

**Errors:**
- `400 CANNOT_CANCEL` - Order đã ở trạng thái SERVED

### 6.5 Sửa số lượng item

```
PATCH /api/v1/orders/:orderId/items/:itemId
```

**Request:**
```json
{
  "quantity": 3
}
```

---

## 7. MENU

### 7.1 Lấy menu (cho order)

```
GET /api/v1/menu
```

**Response: 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bia",
      "sortOrder": 1,
      "items": [
        { "id": 3, "name": "Bia Tiger", "price": 50000, "image": "/uploads/products/tiger.jpg", "isAvailable": true },
        { "id": 4, "name": "Bia Heineken", "price": 60000, "image": null, "isAvailable": false },
        { "id": 5, "name": "Bia Saigon", "price": 45000, "image": null, "isAvailable": true }
      ]
    },
    {
      "id": 2,
      "name": "Nước ngọt",
      "sortOrder": 2,
      "items": [
        { "id": 10, "name": "Coca Cola", "price": 25000, "image": null, "isAvailable": true },
        { "id": 11, "name": "Pepsi", "price": 25000, "image": null, "isAvailable": true }
      ]
    }
  ]
}
```

### 7.2 CRUD Menu Categories

```
GET    /api/v1/menu/categories
POST   /api/v1/menu/categories          (OWNER)
PUT    /api/v1/menu/categories/:id       (OWNER)
DELETE /api/v1/menu/categories/:id       (OWNER)
```

### 7.3 CRUD Menu Items

```
GET    /api/v1/menu/items
POST   /api/v1/menu/items               (OWNER)
PUT    /api/v1/menu/items/:id            (OWNER)
DELETE /api/v1/menu/items/:id            (OWNER)
```

**POST/PUT Request:**
```json
{
  "categoryId": 1,
  "name": "Bia Tiger",
  "price": 50000,
  "productId": 3,
  "sortOrder": 1,
  "isAvailable": true
}
```

---

## 8. CHECKOUT & PAYMENTS

### 8.1 Thanh toán

```
POST /api/v1/checkout
```
**Quyền:** OWNER, MANAGER, CASHIER

**Request:**
```json
{
  "sessionId": 42,
  "discountAmount": 50000,
  "discountReason": "Khách quen giảm giá",
  "voucherCode": null,
  "depositApplied": 0,
  "payments": [
    {
      "method": "CASH",
      "amount": 200000,
      "cashReceived": 500000
    },
    {
      "method": "QR_TRANSFER",
      "amount": 237500
    }
  ],
  "notes": null
}
```

**Response: 201**
```json
{
  "success": true,
  "data": {
    "invoiceId": 78,
    "invoiceNumber": "INV-20260325-012",
    "roomName": "Phòng 5",
    "customerName": "Anh Tuấn",

    "roomCharge": 375000,
    "orderTotal": 150000,
    "subtotal": 525000,
    "discountAmount": 50000,
    "surchargeAmount": 0,
    "depositApplied": 0,
    "grandTotal": 475000,

    "payments": [
      { "method": "CASH", "amount": 200000, "cashReceived": 500000, "cashChange": 300000 },
      { "method": "QR_TRANSFER", "amount": 275000, "qrCodeUsed": "QR1" }
    ],

    "debtAmount": 0
  },
  "message": "Thanh toán thành công - Tiền thừa: 300,000 VNĐ"
}
```

**Errors:**
- `400 PAYMENT_INSUFFICIENT` - Tổng thanh toán < tổng bill
- `400 INVALID_VOUCHER` - Mã voucher không hợp lệ/hết hạn

### 8.2 Ghi nợ

```
POST /api/v1/checkout
```

**Request (ghi nợ):**
```json
{
  "sessionId": 42,
  "payments": [
    { "method": "CASH", "amount": 300000, "cashReceived": 300000 },
    { "method": "DEBT", "amount": 175000 }
  ]
}
```

### 8.3 Lấy thông tin QR hiện tại

```
GET /api/v1/checkout/qr
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "activeQR": "QR1",
    "label": "QR Mã 1 (trước 00:00)",
    "imageUrl": "/uploads/qr/qr_before_midnight.png",
    "switchTime": "00:00",
    "currentTime": "21:30"
  }
}
```

### 8.4 Lịch sử hóa đơn

```
GET /api/v1/invoices
```

**Query params:**
- `page`, `limit`
- `dateFrom`, `dateTo`
- `status` - `PAID`, `PARTIAL`, `VOID`
- `search` - Tìm theo invoice number, tên khách

### 8.5 Chi tiết hóa đơn

```
GET /api/v1/invoices/:id
```

---

## 9. STOCK (Kho)

### 9.1 Danh sách tồn kho

```
GET /api/v1/stock/products
```

**Query params:**
- `page`, `limit`
- `category` - Lọc theo loại
- `lowStock` - `true` để chỉ hiện hàng dưới mức tối thiểu
- `search` - Tìm theo tên/SKU

**Response: 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "Bia Tiger",
      "sku": "BEER-TGR-01",
      "category": "Bia",
      "unit": "lon",
      "packSize": 24,
      "costPrice": 15000,
      "stockQuantity": 120,
      "minStock": 48,
      "isLowStock": false,
      "supplier": { "id": 1, "name": "NCC Bia ABC" },
      "lastEntry": "2026-03-20"
    }
  ]
}
```

### 9.2 Nhập kho

```
POST /api/v1/stock/entries
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "supplierId": 1,
  "items": [
    { "productId": 3, "quantity": 48, "unitCost": 15000 },
    { "productId": 5, "quantity": 24, "unitCost": 12000 }
  ],
  "notes": "Nhập hàng tuần"
}
```

### 9.3 Xuất kho thủ công

```
POST /api/v1/stock/entries
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "type": "OUT_MANUAL",
  "items": [
    { "productId": 7, "quantity": -5, "reason": "Hư hỏng, hết hạn" }
  ]
}
```

### 9.4 Kiểm kê

```
POST /api/v1/stock/inventory-check
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "items": [
    { "productId": 3, "actualQuantity": 118 },
    { "productId": 5, "actualQuantity": 24 },
    { "productId": 7, "actualQuantity": 10 }
  ],
  "notes": "Kiểm kê cuối ngày 25/03"
}
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "checkId": 12,
    "discrepancies": [
      { "product": "Bia Tiger", "system": 120, "actual": 118, "diff": -2, "status": "SHORTAGE" }
    ],
    "totalItems": 3,
    "matchedItems": 2,
    "discrepancyItems": 1
  }
}
```

### 9.5 Lịch sử nhập/xuất

```
GET /api/v1/stock/entries
```

**Query params:**
- `productId`, `type`, `dateFrom`, `dateTo`, `page`, `limit`

### 9.6 CRUD Products

```
GET    /api/v1/stock/products
POST   /api/v1/stock/products        (OWNER)
PUT    /api/v1/stock/products/:id     (OWNER)
DELETE /api/v1/stock/products/:id     (OWNER)
```

### 9.7 CRUD Suppliers

```
GET    /api/v1/stock/suppliers
POST   /api/v1/stock/suppliers        (OWNER)
PUT    /api/v1/stock/suppliers/:id     (OWNER)
DELETE /api/v1/stock/suppliers/:id     (OWNER)
```

---

## 10. CUSTOMERS (Khách hàng)

### 10.1 Danh sách khách

```
GET /api/v1/customers
```

**Query params:**
- `search` - Tìm theo tên/SĐT
- `tier` - `REGULAR`, `SILVER`, `GOLD`, `VIP`
- `page`, `limit`

### 10.2 Tra cứu nhanh theo SĐT

```
GET /api/v1/customers/lookup?phone=0901234567
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Anh Tuấn",
    "phone": "0901234567",
    "tier": "GOLD",
    "totalSpent": 5200000,
    "totalPoints": 52,
    "visitCount": 12,
    "lastVisit": "2026-03-20T21:00:00+07:00",
    "isBlacklisted": false,
    "notes": "Hay hát phòng 5, thích bia Tiger"
  }
}
```

### 10.3 Chi tiết + lịch sử khách

```
GET /api/v1/customers/:id
GET /api/v1/customers/:id/history    # Lịch sử ghé thăm
GET /api/v1/customers/:id/points     # Lịch sử tích điểm
```

### 10.4 CRUD

```
POST   /api/v1/customers
PUT    /api/v1/customers/:id
PATCH  /api/v1/customers/:id/blacklist   (OWNER, MANAGER)
```

---

## 11. STAFF (Nhân viên)

### 11.1 CRUD nhân viên

```
GET    /api/v1/staff                 (OWNER)
POST   /api/v1/staff                 (OWNER)
PUT    /api/v1/staff/:id             (OWNER)
DELETE /api/v1/staff/:id             (OWNER)
```

**POST Request:**
```json
{
  "username": "thu_ngan_02",
  "password": "123456",
  "fullName": "Trần Thị B",
  "role": "CASHIER",
  "phone": "0912345678"
}
```

### 11.2 Reset password

```
PATCH /api/v1/staff/:id/reset-password    (OWNER)
```

**Request:**
```json
{
  "newPassword": "newpass123"
}
```

### 11.3 Vô hiệu hóa/kích hoạt

```
PATCH /api/v1/staff/:id/toggle-active     (OWNER)
```

---

## 12. SHIFTS (Ca làm)

### 12.1 Mở ca

```
POST /api/v1/shifts/open
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "openingCash": 2000000,
  "notes": "Ca tối 25/03"
}
```

**Errors:**
- `409 SHIFT_ALREADY_OPEN` - Đã có ca đang mở

### 12.2 Đóng ca

```
POST /api/v1/shifts/:shiftId/close
```
**Quyền:** OWNER, MANAGER

**Request:**
```json
{
  "closingCash": 5500000,
  "handoverNote": "Phòng 3 khách đang hát, phòng 8 sắp checkout"
}
```

**Response: 200**
```json
{
  "success": true,
  "data": {
    "shiftId": 5,
    "duration": "8 giờ 30 phút",
    "summary": {
      "totalSessions": 15,
      "totalRevenue": 4200000,
      "cashRevenue": 2800000,
      "qrRevenue": 1400000,
      "openingCash": 2000000,
      "closingCash": 5500000,
      "expectedCash": 4800000,
      "cashDifference": 700000
    }
  }
}
```

### 12.3 Ca hiện tại

```
GET /api/v1/shifts/current
```

### 12.4 Lịch sử ca

```
GET /api/v1/shifts?dateFrom=2026-03-01&dateTo=2026-03-31
```

---

## 13. REPORTS (Báo cáo)

### 13.1 Doanh thu

```
GET /api/v1/reports/revenue
```

**Query params:**
- `period` - `today`, `week`, `month`, `year`, `custom`
- `dateFrom`, `dateTo` - Cho period=custom
- `groupBy` - `day`, `week`, `month`

**Response: 200**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 12500000,
      "roomRevenue": 8000000,
      "orderRevenue": 4500000,
      "totalSessions": 45,
      "avgRevenuePerSession": 277778,
      "comparison": {
        "previousPeriod": 11000000,
        "changePercent": 13.6
      }
    },
    "chart": [
      { "date": "2026-03-19", "revenue": 1800000, "roomRevenue": 1200000, "orderRevenue": 600000 },
      { "date": "2026-03-20", "revenue": 2100000, "roomRevenue": 1400000, "orderRevenue": 700000 }
    ]
  }
}
```

### 13.2 Phân tích phòng

```
GET /api/v1/reports/rooms
```

**Response: 200**
```json
{
  "success": true,
  "data": [
    {
      "roomId": 5,
      "roomName": "Phòng 5",
      "roomType": "Phòng nhỏ",
      "totalSessions": 8,
      "totalHours": 22.5,
      "occupancyRate": 65.2,
      "totalRevenue": 3200000,
      "avgSessionDuration": 2.8
    }
  ]
}
```

### 13.3 Phân tích giờ cao điểm

```
GET /api/v1/reports/peak-hours
```

### 13.4 Báo cáo kho

```
GET /api/v1/reports/stock
```

### 13.5 Báo cáo ca

```
GET /api/v1/reports/shifts
```

### 13.6 Xuất báo cáo

```
GET /api/v1/reports/export
```

**Query params:**
- `type` - `revenue`, `rooms`, `stock`, `shifts`
- `format` - `xlsx`, `pdf`
- `dateFrom`, `dateTo`

---

## 14. SETTINGS (Cài đặt)

### 14.1 Lấy settings

```
GET /api/v1/settings
```
**Quyền:** OWNER

### 14.2 Cập nhật settings

```
PUT /api/v1/settings
```
**Quyền:** OWNER

**Request:**
```json
{
  "settings": [
    { "key": "store_name", "value": "Music Box Karaoke" },
    { "key": "min_duration_minutes", "value": 60 },
    { "key": "warning_before_minutes", "value": 15 }
  ]
}
```

### 14.3 Upload QR Code

```
POST /api/v1/settings/qr-upload
```
**Quyền:** OWNER

**Request:** `multipart/form-data`
- `qrType`: `QR1` hoặc `QR2`
- `image`: file ảnh (PNG/JPG, max 5MB)

### 14.4 CRUD Pricing Rules

```
GET    /api/v1/settings/pricing
POST   /api/v1/settings/pricing         (OWNER)
PUT    /api/v1/settings/pricing/:id      (OWNER)
DELETE /api/v1/settings/pricing/:id      (OWNER)
```

### 14.5 CRUD Surcharges

```
GET    /api/v1/settings/surcharges
POST   /api/v1/settings/surcharges       (OWNER)
PUT    /api/v1/settings/surcharges/:id    (OWNER)
DELETE /api/v1/settings/surcharges/:id    (OWNER)
```

### 14.6 CRUD Vouchers

```
GET    /api/v1/settings/vouchers
POST   /api/v1/settings/vouchers         (OWNER)
PUT    /api/v1/settings/vouchers/:id      (OWNER)
DELETE /api/v1/settings/vouchers/:id      (OWNER)
```

---

## 15. NOTIFICATIONS

### 15.1 Lấy thông báo

```
GET /api/v1/notifications
```

**Query params:**
- `unreadOnly` - `true` chỉ lấy chưa đọc
- `limit` - Số lượng (mặc định 20)

### 15.2 Đánh dấu đã đọc

```
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
```

---

## 16. WAITING QUEUE (Hàng chờ)

### 16.1 Thêm vào hàng chờ

```
POST /api/v1/waiting-queue
```

**Request:**
```json
{
  "customerName": "Anh Minh",
  "customerPhone": "0909876543",
  "preferredType": 1,
  "guestCount": 6,
  "notes": "Chờ phòng nhỏ"
}
```

### 16.2 Danh sách hàng chờ

```
GET /api/v1/waiting-queue?status=WAITING
```

### 16.3 Xếp phòng cho khách chờ

```
POST /api/v1/waiting-queue/:id/assign
```

**Request:**
```json
{
  "roomId": 3
}
```

→ Tự động tạo session check-in + cập nhật queue status → ASSIGNED

### 16.4 Hủy chờ

```
PATCH /api/v1/waiting-queue/:id/cancel
```

---

## 17. AUDIT LOG

### 17.1 Xem audit log

```
GET /api/v1/audit-logs
```
**Quyền:** OWNER

**Query params:**
- `userId` - Lọc theo nhân viên
- `action` - Lọc theo hành động
- `entityType` - Lọc theo loại entity
- `dateFrom`, `dateTo`
- `page`, `limit`

---

## 18. WEBSOCKET EVENTS

### 18.1 Client → Server

```javascript
// Kết nối với auth token
const socket = io(SERVER_URL, {
  auth: { token: "Bearer ..." }
});

// Đăng ký nhận updates
socket.emit("subscribe", { channels: ["rooms", "orders", "notifications"] });
```

### 18.2 Server → Client

```javascript
// Phòng thay đổi trạng thái
socket.on("room:updated", (data) => {
  // data: { roomId, status, currentSession }
});

// Phòng sắp hết giờ
socket.on("room:timer_warning", (data) => {
  // data: { roomId, roomName, remainingMinutes, customerName }
});

// Phòng đã hết giờ
socket.on("room:timer_expired", (data) => {
  // data: { roomId, roomName, customerName, overtimeMinutes }
});

// Order mới (cho bar/bếp)
socket.on("order:new", (data) => {
  // data: { orderId, roomName, items, createdBy }
});

// Order cập nhật trạng thái
socket.on("order:status_changed", (data) => {
  // data: { orderId, roomName, oldStatus, newStatus }
});

// Thông báo mới
socket.on("notification:new", (data) => {
  // data: { id, title, message, type }
});

// Cập nhật ca
socket.on("shift:updated", (data) => {
  // data: { shiftId, status, summary }
});
```
