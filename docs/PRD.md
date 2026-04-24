# MUSIC BOX MANAGER - Product Requirements Document

> Hệ thống quản lý quán karaoke - Sử dụng nội bộ
> Version: 1.0
> Ngày tạo: 2026-03-25
> Ngày cập nhật: 2026-04-24

---

## ⚠️ ADDENDUM (2026-04-24) — Features beyond v1 spec

These were added after the original PRD and are now part of the shipped product:

- **Facebook Page integration** (OWNER/MANAGER only) — webhook signature is
  HMAC-verified with `FB_APP_SECRET`. Incoming page messages are parsed by
  a Vietnamese rule-based parser; high-confidence requests auto-create a
  PENDING booking, low-confidence ones land in a manual confirmation inbox.
- **Role-based UI** — sidebar/routes filter by user role. STAFF sees only
  Rooms + Order; CASHIER adds Timeline + Customers; MANAGER unlocks
  Dashboard/Stock/Reports/Staff/Facebook; Settings is OWNER-only.
- **Real-time** — Socket.io broadcasts room/order/notification events;
  channel subscription is validated server-side by role.
- **QR thanh toán đôi** — system auto-picks `qr_code_1` (12:00–24:00) vs
  `qr_code_2` (00:00–12:00) based on checkout time of day.
- **Brute-force guard** — POST /login is rate-limited to 10 attempts per IP
  per 15 minutes.

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mô tả
Music Box Manager là web app quản lý nội bộ cho tiệm karaoke gồm 10 phòng (3 phòng lớn, 7 phòng nhỏ). Hệ thống giúp nhân viên quản lý đặt phòng, order đồ uống/ăn, thanh toán, kho hàng và theo dõi doanh thu.

### 1.2 Đối tượng sử dụng
- **Chủ quán**: Toàn quyền quản lý hệ thống
- **Quản lý ca**: Giám sát ca làm, checkout, nhập kho
- **Thu ngân**: Đặt phòng, order, checkout
- **Phục vụ**: Xem và cập nhật trạng thái order

### 1.3 Phạm vi
- Chỉ sử dụng nội bộ (nhân viên quán)
- Khách hàng KHÔNG truy cập hệ thống
- Truy cập qua trình duyệt web (PC, tablet, điện thoại)

---

## 2. CẤU TRÚC PHÒNG

### 2.1 Danh sách phòng

| STT | Phòng | Loại | Sức chứa (gợi ý) |
|-----|-------|------|-------------------|
| 1 | Phòng 1 | Nhỏ | 4-8 người |
| 2 | Phòng 2 | Nhỏ | 4-8 người |
| 3 | Phòng 3 | Nhỏ | 4-8 người |
| 4 | Phòng 4 | Nhỏ | 4-8 người |
| 5 | Phòng 5 | Nhỏ | 4-8 người |
| 6 | Phòng 6 | Nhỏ | 4-8 người |
| 7 | Phòng 7 | Nhỏ | 4-8 người |
| 8 | Phòng 8 | Lớn | 10-20 người |
| 9 | Phòng 9 | Lớn | 10-20 người |
| 10 | Phòng 10 | Lớn | 10-20 người |

> **Lưu ý**: Tên phòng, loại phòng, sức chứa có thể được admin cấu hình lại trong hệ thống.

### 2.2 Trạng thái phòng

```
TRỐNG (available) ──→ ĐANG HÁT (occupied) ──→ SẮP TRỐNG (ending_soon) ──→ TRỐNG
     ↓                                              ↓
 BẢO TRÌ (maintenance)                    GIA HẠN (extend) → ĐANG HÁT
```

| Trạng thái | Màu | Mô tả |
|------------|-----|-------|
| Trống | 🟢 Xanh lá | Sẵn sàng nhận khách |
| Đang hát | 🔴 Đỏ | Khách đang sử dụng |
| Sắp trống | 🟡 Vàng | Còn ≤ 15 phút (cấu hình được) |
| Bảo trì | ⚫ Xám | Đang sửa chữa/vệ sinh, không nhận khách |

---

## 3. BẢNG GIÁ

### 3.1 Khung giờ

| Khung giờ | Tên | Mô tả |
|-----------|-----|-------|
| 12:00 - 17:00 | Giờ nhẹ (off-peak) | Giá thấp hơn |
| 17:00 - 05:00 (+1) | Giờ cao điểm (peak) | Giá cao hơn |

> **Lưu ý**: Quán hoạt động từ 12:00 trưa đến 05:00 sáng hôm sau.

### 3.2 Bảng giá (admin cấu hình)

| Loại phòng | Giờ nhẹ (12h-17h) | Giờ cao điểm (17h-05h) |
|------------|--------------------|-----------------------|
| Phòng nhỏ | ___ VNĐ/giờ | ___ VNĐ/giờ |
| Phòng lớn | ___ VNĐ/giờ | ___ VNĐ/giờ |

> Giá cụ thể do admin cấu hình trong hệ thống.

### 3.3 Quy tắc tính giá

1. **Tính theo phút thực tế** - không làm tròn giờ (hoặc cấu hình làm tròn 30 phút)
2. **Hát qua khung giờ** - tự động chia và tính giá theo từng khung:
   - VD: Khách vào 16:00, hát đến 19:00
   - = 1 giờ x giá nhẹ + 2 giờ x giá cao điểm
3. **Thời gian tối thiểu** - 1 giờ (cấu hình được)
4. **Phụ thu ngày lễ/cuối tuần** - admin cấu hình % phụ thu
5. **Happy hour** - admin có thể tạo khung giờ giảm giá đặc biệt
6. **Combo** - gói phòng + đồ uống với giá ưu đãi

---

## 4. MODULE QUẢN LÝ PHÒNG & ĐẶT LỊCH

### 4.1 Màn hình chính - Bản đồ phòng
- Hiển thị toàn bộ 10 phòng dạng grid/card
- Mỗi phòng hiển thị:
  - Tên phòng, loại (nhỏ/lớn)
  - Trạng thái (màu sắc)
  - Tên khách (nếu có)
  - Thời gian vào / thời gian còn lại (countdown)
  - Tổng tiền tạm tính (phòng + order)
- Click vào phòng → mở chi tiết phòng

### 4.2 Nhận khách (Check-in)
1. Chọn phòng trống
2. Nhập thông tin:
   - Tên khách (bắt buộc)
   - Số điện thoại (tùy chọn - dùng để tra cứu khách quen)
   - Số người (tùy chọn)
   - Thời gian dự kiến (tùy chọn - để ước tính, không bắt buộc)
   - Ghi chú (tùy chọn)
3. Hệ thống ghi nhận giờ bắt đầu = thời điểm check-in
4. Phòng chuyển trạng thái → Đang hát

### 4.3 Đặt phòng trước (Booking)
- Nhân viên đặt trước cho khách (khách gọi điện/nhắn tin)
- Thông tin: tên khách, SĐT, phòng, ngày giờ đến, ghi chú
- Hiển thị trên timeline
- Khi khách đến → chuyển booking thành check-in

### 4.4 Gia hạn
- Khách muốn hát thêm → nhấn "Gia hạn"
- Hệ thống kiểm tra phòng có booking tiếp theo không
- Nếu trống → gia hạn thêm (nhập thời gian hoặc để mở)
- Nếu có booking → cảnh báo "Phòng đã được đặt lúc XX:XX"

### 4.5 Chuyển phòng
- Chọn phòng đích (phải đang trống)
- Toàn bộ thông tin khách + order được chuyển sang
- Giá tính lại nếu đổi loại phòng (nhỏ ↔ lớn)
- Phòng cũ → Trống

### 4.6 Gộp phòng
- Chọn 2 phòng đang hoạt động
- Chọn phòng giữ lại (phòng chính)
- Order từ phòng phụ → gộp vào phòng chính
- Phòng phụ → Trống
- Tính tiền phòng phụ theo thời gian thực tế đã dùng

### 4.7 Hàng chờ
- Khi tất cả phòng đầy, thêm khách vào hàng chờ
- Thông tin: tên, SĐT, loại phòng muốn, số người, thời gian đăng ký chờ
- Khi có phòng trống → thông báo cho nhân viên
- Sắp xếp theo thứ tự đăng ký

### 4.8 Timeline
- Hiển thị dạng Gantt chart theo phòng
- Trục ngang: thời gian (12h → 05h)
- Trục dọc: 10 phòng
- Thanh màu: đang hát (đỏ), đã đặt trước (xanh dương), trống (xanh lá)
- Kéo thả để đặt phòng nhanh

---

## 5. MODULE ORDER & BÁN HÀNG (POS)

### 5.1 Menu
- Phân loại danh mục: Bia, Nước ngọt, Nước ép, Đồ ăn nhẹ, Trái cây, Combo...
- Mỗi món: tên, giá bán, ảnh (tùy chọn), trạng thái (còn hàng/hết)
- Admin quản lý menu (thêm/sửa/xóa/ẩn món)
- Hiển thị "top món bán chạy" lên đầu

### 5.2 Quy trình order
```
Chọn phòng → Chọn món từ menu → Nhập số lượng → Ghi chú (nếu có) → Xác nhận
```

- Mỗi phòng có thể order nhiều lần (nhiều đợt)
- Mỗi order ghi nhận: thời gian, người tạo, danh sách món
- Tất cả order được gộp vào bill phòng

### 5.3 Trạng thái order

```
ĐÃ ĐẶT (pending) → ĐANG CHUẨN BỊ (preparing) → ĐÃ PHỤC VỤ (served)
       ↓
   ĐÃ HỦY (cancelled) ← cần ghi lý do hủy
```

### 5.4 Hủy/sửa order
- Chỉ hủy được khi trạng thái = "Đã đặt"
- Hủy phải ghi lý do
- Sửa số lượng: cho phép tăng/giảm
- Ghi log: ai hủy/sửa, lúc nào, lý do

### 5.5 Màn hình Bar/Bếp (tùy chọn)
- Hiển thị danh sách order cần chuẩn bị
- Sắp xếp theo thời gian đặt
- Nhân viên bar đánh dấu "Đã chuẩn bị xong"
- Có thể hiển thị trên tablet/màn hình riêng tại quầy bar

---

## 6. MODULE THANH TOÁN (CHECKOUT)

### 6.1 Màn hình checkout

```
┌─────────────────────────────────────────┐
│          HÓA ĐƠN - PHÒNG 5             │
├─────────────────────────────────────────┤
│ TIỀN PHÒNG                              │
│  Phòng nhỏ: 16:30 → 20:15 (3h45p)      │
│  ├ 16:30-17:00: 0.5h x giá nhẹ = ___   │
│  └ 17:00-20:15: 3h15p x giá peak = ___ │
│  Tổng phòng:                    ___     │
├─────────────────────────────────────────┤
│ ĐỒ UỐNG / ĂN                           │
│  2x Bia Tiger            ___            │
│  1x Nước ép cam          ___            │
│  1x Đĩa trái cây        ___            │
│  Tổng order:                    ___     │
├─────────────────────────────────────────┤
│ Tạm tính:                       ___     │
│ Giảm giá:              - ___           │
│ Đặt cọc:               - ___           │
│ ════════════════════════════════════     │
│ TỔNG THANH TOÁN:                ___     │
├─────────────────────────────────────────┤
│ Phương thức: [Tiền mặt] [QR Code]      │
│              [Ghi nợ]                   │
└─────────────────────────────────────────┘
```

### 6.2 Phương thức thanh toán

| Phương thức | Mô tả |
|-------------|-------|
| Tiền mặt | Nhập số tiền khách đưa, tính tiền thừa |
| QR Code | Hiển thị mã QR tương ứng theo giờ (xem 6.3) |
| Kết hợp | Một phần tiền mặt + một phần QR |
| Ghi nợ | Ghi vào công nợ khách hàng (cần có hồ sơ khách) |

### 6.3 QR Code thanh toán

Hệ thống sử dụng **2 mã QR cố định** (ảnh QR do admin upload):

| Điều kiện | QR sử dụng |
|-----------|------------|
| Thanh toán **trước 00:00** (nửa đêm) | **QR Mã 1** |
| Thanh toán **từ 00:00 trở đi** | **QR Mã 2** |

- Hệ thống tự động hiển thị đúng mã QR dựa theo thời điểm checkout
- Admin upload/thay đổi ảnh QR trong phần cài đặt
- Hiển thị kèm số tiền cần chuyển để nhân viên và khách dễ kiểm tra
- Nhân viên xác nhận đã nhận được tiền → hoàn tất checkout

### 6.4 Giảm giá
- Giảm theo % hoặc số tiền cố định
- Mã khuyến mãi (voucher code)
- Giảm giá thành viên (tự động áp dụng nếu khách có hạng)
- Ghi lý do giảm giá
- Phân quyền: chỉ quản lý/chủ quán mới được giảm trên mức X%

### 6.5 Đặt cọc
- Ghi nhận khi khách đặt phòng trước
- Trừ vào tổng bill khi checkout
- Nếu khách hủy → xử lý theo chính sách (hoàn/không hoàn)

### 6.6 Ghi nợ
- Chỉ áp dụng cho khách có hồ sơ trong hệ thống
- Ghi nhận số tiền nợ, ngày nợ
- Khi khách đến lần sau → nhắc nhở "Khách còn nợ ___"
- Báo cáo công nợ tổng hợp

### 6.7 Sau checkout
- Phòng chuyển về trạng thái → Trống
- Hóa đơn lưu vào lịch sử
- Cập nhật doanh thu ca

---

## 7. MODULE QUẢN LÝ KHO

### 7.1 Danh mục hàng hóa
- Mỗi sản phẩm: mã, tên, danh mục, đơn vị tính, giá nhập, giá bán, tồn kho, mức tối thiểu
- Hỗ trợ quy đổi đơn vị: 1 thùng = 24 lon, nhập theo thùng - bán theo lon
- Ảnh sản phẩm (tùy chọn)

### 7.2 Nhập kho
- Phiếu nhập: ngày, nhà cung cấp, người nhập, danh sách sản phẩm (tên, SL, giá nhập)
- Tồn kho tự động cộng thêm
- Lịch sử nhập kho đầy đủ

### 7.3 Xuất kho
- **Tự động**: khi order món → trừ tồn kho tương ứng
- **Thủ công**: xuất cho lý do khác (hư hỏng, hết hạn, cho tặng...)
- Ghi lý do xuất thủ công

### 7.4 Kiểm kê
- Tạo phiên kiểm kê: nhập số lượng thực tế từng sản phẩm
- So sánh: tồn kho hệ thống vs thực tế
- Báo cáo chênh lệch (thừa/thiếu)
- Điều chỉnh tồn kho sau kiểm kê

### 7.5 Cảnh báo
- Tồn kho ≤ mức tối thiểu → hiển thị cảnh báo trên dashboard
- Hàng sắp hết hạn (nếu có nhập ngày hết hạn)
- Thông báo cho quản lý/chủ quán

### 7.6 Nhà cung cấp
- Danh sách NCC: tên, SĐT, địa chỉ, ghi chú
- Gắn NCC vào phiếu nhập
- Lịch sử mua hàng từ từng NCC

---

## 8. MODULE KHÁCH HÀNG

### 8.1 Hồ sơ khách hàng
- Thông tin: tên, SĐT (unique), ngày sinh, ghi chú
- Tạo khi khách cung cấp SĐT (không bắt buộc)
- Tra cứu nhanh theo SĐT hoặc tên

### 8.2 Lịch sử khách
- Số lần đến, tổng chi tiêu, lần cuối đến
- Chi tiết từng lần: phòng nào, bao lâu, order gì, tổng tiền

### 8.3 Hạng thành viên

| Hạng | Điều kiện (gợi ý) | Ưu đãi (gợi ý) |
|------|-------------------|-----------------|
| Thường | Mặc định | Không |
| Bạc | Chi tiêu ≥ 2 triệu | Giảm 5% tiền phòng |
| Vàng | Chi tiêu ≥ 5 triệu | Giảm 10% tiền phòng |
| VIP | Chi tiêu ≥ 10 triệu | Giảm 15% + ưu tiên đặt phòng |

> Điều kiện và ưu đãi do admin cấu hình.

### 8.4 Tích điểm
- Quy tắc: mỗi X VNĐ chi tiêu = 1 điểm (admin cấu hình)
- Đổi điểm: Y điểm = giảm Z VNĐ (admin cấu hình)
- Lịch sử tích/đổi điểm

### 8.5 Sinh nhật
- Hệ thống nhắc "Hôm nay/tuần này sinh nhật khách X"
- Có thể tặng voucher tự động

### 8.6 Blacklist
- Đánh dấu khách có vấn đề
- Ghi lý do
- Cảnh báo khi check-in bằng SĐT khách blacklist

---

## 9. MODULE NHÂN VIÊN & PHÂN QUYỀN

### 9.1 Vai trò & quyền hạn

| Chức năng | Chủ quán | Quản lý ca | Thu ngân | Phục vụ |
|-----------|:--------:|:----------:|:-------:|:-------:|
| Xem bản đồ phòng | ✅ | ✅ | ✅ | ✅ |
| Check-in / Check-out | ✅ | ✅ | ✅ | ❌ |
| Order | ✅ | ✅ | ✅ | ✅ |
| Cập nhật trạng thái order | ✅ | ✅ | ✅ | ✅ |
| Hủy order | ✅ | ✅ | ❌ | ❌ |
| Áp dụng giảm giá | ✅ | ✅ | Giới hạn | ❌ |
| Ghi nợ | ✅ | ✅ | ❌ | ❌ |
| Nhập kho | ✅ | ✅ | ❌ | ❌ |
| Xem báo cáo | ✅ | ✅ | Ca hiện tại | ❌ |
| Quản lý menu/giá | ✅ | ❌ | ❌ | ❌ |
| Quản lý nhân viên | ✅ | ❌ | ❌ | ❌ |
| Quản lý khách hàng | ✅ | ✅ | Xem | ❌ |
| Cấu hình hệ thống | ✅ | ❌ | ❌ | ❌ |
| Mở/đóng ca | ✅ | ✅ | ❌ | ❌ |

### 9.2 Quản lý ca làm

```
MỞ CA                                    ĐÓNG CA
├ Chọn ca (sáng/tối hoặc tự do)          ├ Tổng doanh thu ca
├ Nhập tiền đầu ca (tiền mặt tại quỹ)    ├ Chi tiết: tiền mặt / QR
├ Kiểm tra phòng đang hoạt động           ├ Số lượt khách
└ Ghi chú bàn giao từ ca trước           ├ Tiền mặt cuối ca (nhập thực tế)
                                          ├ Chênh lệch (nếu có)
                                          └ Ghi chú bàn giao ca sau
```

### 9.3 Audit log
- Mọi thao tác quan trọng đều ghi log
- Thông tin: ai, làm gì, lúc nào, chi tiết
- VD: "Nhân viên A hủy order #123 lúc 21:30 - Lý do: khách đổi ý"
- Chỉ chủ quán xem được audit log

---

## 10. DASHBOARD & BÁO CÁO

### 10.1 Dashboard realtime
- **Tổng quan phòng**: X/10 phòng đang hoạt động
- **Doanh thu hôm nay**: tổng, tiền phòng, tiền order
- **Doanh thu ca hiện tại**
- **Số lượt khách hôm nay**
- **Cảnh báo**: phòng sắp hết giờ, tồn kho thấp, khách chờ
- **Hàng chờ**: số khách đang chờ

### 10.2 Báo cáo doanh thu
- Theo: ngày / tuần / tháng / năm / khoảng thời gian tùy chọn
- Phân tích: tiền phòng vs tiền order
- Biểu đồ trend (line chart)
- So sánh: kỳ này vs kỳ trước

### 10.3 Báo cáo phòng
- Phòng nào được sử dụng nhiều nhất (tỉ lệ lấp đầy)
- Phòng nào ít sử dụng
- Doanh thu trung bình mỗi phòng
- Thời lượng trung bình mỗi lượt khách

### 10.4 Báo cáo thời gian
- Khung giờ nào đông nhất
- Ngày trong tuần nào đông nhất
- Giúp điều chỉnh giá và khuyến mãi

### 10.5 Báo cáo kho
- Hàng bán chạy nhất
- Lợi nhuận theo sản phẩm (giá bán - giá nhập)
- Hàng tồn lâu
- Giá trị tồn kho

### 10.6 Báo cáo ca
- Doanh thu từng ca
- So sánh giữa các ca
- Chênh lệch tiền mặt

### 10.7 Xuất báo cáo
- Xuất Excel (.xlsx)
- Xuất PDF
- In trực tiếp

---

## 11. THÔNG BÁO & CẢNH BÁO

### 11.1 Thông báo trong app

| Sự kiện | Người nhận | Ưu tiên |
|---------|-----------|---------|
| Phòng sắp hết giờ (≤15p) | Thu ngân, Quản lý | Cao |
| Phòng đã hết giờ chưa checkout | Thu ngân, Quản lý | Cao |
| Có khách trong hàng chờ | Thu ngân | Trung bình |
| Tồn kho thấp | Quản lý, Chủ quán | Trung bình |
| Order mới (cho bar/bếp) | Phục vụ | Cao |
| Booking sắp đến | Thu ngân | Trung bình |
| Khách có sinh nhật | Thu ngân | Thấp |

### 11.2 Âm thanh
- Chuông cảnh báo khi phòng hết giờ
- Âm thanh khi có order mới
- Có thể bật/tắt trong cài đặt

### 11.3 Push notification (nâng cao)
- Gửi qua trình duyệt (Web Push)
- Cho chủ quán: doanh thu bất thường, sự kiện quan trọng

---

## 12. CÀI ĐẶT HỆ THỐNG

### 12.1 Cấu hình chung
- Tên quán, địa chỉ, logo
- Giờ mở/đóng cửa
- Đơn vị tiền tệ (VNĐ)
- Múi giờ (GMT+7)

### 12.2 Cấu hình phòng
- Thêm/sửa/xóa phòng
- Đặt tên, loại (nhỏ/lớn), sức chứa
- Bật/tắt phòng (bảo trì)

### 12.3 Cấu hình giá
- Quản lý khung giờ
- Đặt giá theo loại phòng + khung giờ
- Phụ thu ngày lễ/cuối tuần
- Happy hour
- Combo

### 12.4 Cấu hình QR
- Upload ảnh QR Mã 1 (trước 00:00)
- Upload ảnh QR Mã 2 (từ 00:00)

### 12.5 Cấu hình khuyến mãi
- Tạo/quản lý voucher
- Chương trình tích điểm
- Điều kiện hạng thành viên

### 12.6 Cấu hình thông báo
- Thời gian cảnh báo trước khi hết giờ (mặc định 15 phút)
- Bật/tắt âm thanh
- Bật/tắt push notification

---

## 13. YÊU CẦU GIAO DIỆN (UI/UX)

### 13.1 Phong cách thiết kế
- **Hiện đại, tối giản** - dark mode làm chủ đạo (phù hợp quán karaoke)
- **Màu chủ đạo**: tông tối (dark background) + điểm nhấn neon/gradient
- **Typography**: font rõ ràng, cỡ chữ lớn (dễ đọc trong điều kiện ánh sáng yếu)
- **Responsive**: ưu tiên desktop/tablet, hỗ trợ mobile

### 13.2 Layout chính

```
┌──────────────────────────────────────────────┐
│  HEADER: Logo | Thông báo | User | Ca làm    │
├────────┬─────────────────────────────────────┤
│        │                                     │
│  SIDE  │          MAIN CONTENT               │
│  BAR   │                                     │
│        │   (Bản đồ phòng / Timeline /        │
│  Menu  │    Order / Báo cáo / ...)           │
│  điều  │                                     │
│  hướng │                                     │
│        │                                     │
├────────┴─────────────────────────────────────┤
│  FOOTER: Trạng thái hệ thống | Doanh thu ca │
└──────────────────────────────────────────────┘
```

### 13.3 Các màn hình chính
1. **Dashboard** - tổng quan nhanh
2. **Bản đồ phòng** - trạng thái 10 phòng (mặc định khi mở app)
3. **Timeline** - lịch đặt phòng dạng Gantt
4. **Order** - đặt đồ cho phòng
5. **Checkout** - thanh toán
6. **Kho hàng** - nhập/xuất/kiểm kê
7. **Khách hàng** - danh sách, hồ sơ
8. **Báo cáo** - doanh thu, thống kê
9. **Nhân viên** - quản lý tài khoản, phân quyền
10. **Cài đặt** - cấu hình hệ thống

### 13.4 UX quan trọng
- **Thao tác nhanh**: check-in trong ≤ 3 click
- **Phím tắt**: cho các thao tác thường xuyên
- **Tìm kiếm**: thanh search toàn cục (phòng, khách, order)
- **Offline**: lưu cache, hoạt động khi mất mạng tạm thời
- **Loading state**: skeleton loading, không để trắng màn hình

---

## 14. KIẾN TRÚC KỸ THUẬT

### 14.1 Tech Stack

| Layer | Công nghệ | Lý do |
|-------|-----------|-------|
| Frontend | React 18 + TypeScript | Component-based, ecosystem lớn |
| UI Framework | Tailwind CSS + shadcn/ui | Hiện đại, customizable, dark mode sẵn |
| State Management | Zustand | Nhẹ, đơn giản hơn Redux |
| Realtime | WebSocket (Socket.io) | Cập nhật trạng thái phòng realtime |
| Backend | Node.js + Express | JavaScript full-stack, dễ maintain |
| ORM | Prisma | Type-safe, migration dễ |
| Database | PostgreSQL | Quan hệ phức tạp, ACID, reliable |
| Authentication | JWT + bcrypt | Đơn giản, stateless |
| Build Tool | Vite | Nhanh, HMR tốt |

### 14.2 Cấu trúc dự án

```
music-box-manager/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Các trang
│   │   ├── hooks/          # Custom hooks
│   │   ├── stores/         # Zustand stores
│   │   ├── services/       # API calls
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   └── ...
├── server/                 # Backend Node.js
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Business logic
│   │   ├── models/         # Prisma models
│   │   ├── middleware/     # Auth, validation
│   │   ├── services/       # Business services
│   │   └── utils/          # Helpers
│   └── ...
├── prisma/                 # Database schema
│   ├── schema.prisma
│   └── migrations/
├── docs/                   # Tài liệu
└── docker-compose.yml      # Deployment
```

### 14.3 Database Schema (chính)

```
Users (nhân viên)
Rooms (phòng)
RoomTypes (loại phòng)
PricingRules (bảng giá)
Sessions (lượt khách - check-in/out)
Bookings (đặt trước)
WaitingQueue (hàng chờ)
MenuCategories (danh mục menu)
MenuItems (món)
Orders (đơn hàng theo phòng)
OrderItems (chi tiết đơn hàng)
Invoices (hóa đơn)
Payments (thanh toán)
Products (hàng hóa kho)
StockEntries (phiếu nhập kho)
StockAdjustments (điều chỉnh kho)
Suppliers (nhà cung cấp)
Customers (khách hàng)
CustomerPoints (tích điểm)
MembershipTiers (hạng thành viên)
Shifts (ca làm)
Vouchers (khuyến mãi)
Settings (cấu hình)
AuditLogs (nhật ký thao tác)
Notifications (thông báo)
```

### 14.4 API Design (REST)

```
Auth:       POST /api/auth/login, /logout, /me
Rooms:      GET/POST/PUT /api/rooms
Sessions:   POST /api/sessions/checkin, /checkout, /extend, /transfer
Bookings:   CRUD /api/bookings
Orders:     CRUD /api/orders
Menu:       CRUD /api/menu/categories, /api/menu/items
Checkout:   POST /api/checkout
Stock:      CRUD /api/stock, /api/stock/entries, /api/stock/check
Customers:  CRUD /api/customers
Staff:      CRUD /api/staff
Shifts:     POST /api/shifts/open, /close
Reports:    GET /api/reports/revenue, /rooms, /stock, /shifts
Settings:   GET/PUT /api/settings
```

---

## 15. ĐỘ ƯU TIÊN PHÁT TRIỂN

### Phase 1 - MVP (Cốt lõi)
> Mục tiêu: Có thể vận hành cơ bản

- [x] Đăng nhập (admin mặc định)
- [ ] Bản đồ phòng + trạng thái realtime
- [ ] Check-in / Check-out
- [ ] Countdown timer
- [ ] Tính giá tự động theo khung giờ
- [ ] Order đồ uống cơ bản
- [ ] Checkout + hiển thị QR theo giờ
- [ ] Menu quản lý cơ bản

### Phase 2 - Mở rộng
- [ ] Đặt phòng trước (booking)
- [ ] Gia hạn / chuyển phòng / gộp phòng
- [ ] Quản lý kho (nhập/xuất/kiểm kê)
- [ ] Phân quyền nhân viên
- [ ] Quản lý ca làm (mở/đóng ca)
- [ ] Dashboard doanh thu cơ bản

### Phase 3 - Nâng cao
- [ ] Khách hàng & tích điểm
- [ ] Hạng thành viên
- [ ] Voucher / khuyến mãi
- [ ] Báo cáo chi tiết + xuất Excel
- [ ] Timeline (Gantt chart)
- [ ] Hàng chờ
- [ ] Audit log

### Phase 4 - Tối ưu
- [ ] Push notification
- [ ] Offline mode
- [ ] Tối ưu performance
- [ ] Backup tự động
- [ ] Màn hình bar/bếp riêng

---

## 16. PHỤ LỤC

### 16.1 Glossary
| Thuật ngữ | Nghĩa |
|-----------|-------|
| Check-in | Khách bắt đầu vào phòng hát |
| Check-out | Khách kết thúc, thanh toán ra về |
| Session | Một lượt khách sử dụng phòng (từ check-in đến check-out) |
| Order | Đơn đặt đồ uống/ăn của khách |
| Invoice | Hóa đơn tổng hợp (phòng + order) |
| Shift | Ca làm việc của nhân viên |
| Booking | Đặt phòng trước |
| POS | Point of Sale - Điểm bán hàng |

### 16.2 Business Rules quan trọng
1. Phòng không thể check-in khi đang ở trạng thái "Đang hát" hoặc "Bảo trì"
2. Không thể checkout phòng đang trống
3. Thời gian tối thiểu sử dụng phòng: 1 giờ
4. QR Mã 1 hiển thị khi checkout trước 00:00, QR Mã 2 từ 00:00 trở đi
5. Hủy order chỉ được khi trạng thái "Đã đặt", phải có lý do
6. Giảm giá > X% cần quyền quản lý trở lên
7. Ghi nợ chỉ áp dụng cho khách có hồ sơ trong hệ thống
8. Mọi thao tác tài chính đều ghi audit log
