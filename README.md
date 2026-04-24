# Music Box Manager

Hệ thống quản lý nội bộ cho quán karaoke: 10 phòng (7 nhỏ + 3 lớn), đặt phòng,
order đồ ăn/uống, thanh toán 2 mã QR, kho hàng, khách hàng, nhân viên, báo cáo
và tích hợp Facebook Messenger tự động.

Tech stack: React 18 + TypeScript + Tailwind + shadcn/ui · Express + Prisma
(SQLite) · Socket.io · Docker.

---

## Chạy local (không Docker)

Yêu cầu: Node 20+.

```bash
# 1. Cài dependencies (workspaces)
npm install

# 2. Copy env mẫu
cp .env.example .env
# → sửa JWT_SECRET, CORS_ORIGINS nếu cần

# 3. Tạo database + seed
cd server
npx prisma db push
npx prisma db seed     # tạo 10 phòng, admin user, bảng giá, settings

# 4. Chạy dev (server + client cùng lúc)
cd ..
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Login: `admin` / `admin123`

---

## Deploy lên VPS với Docker

1. Clone repo + tạo `.env`:

   ```bash
   git clone https://github.com/phanvanhoi/SmartBookingSystem.git
   cd SmartBookingSystem

   # Generate JWT_SECRET
   JWT=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

   cat > .env <<EOF
   JWT_SECRET=$JWT
   JWT_EXPIRES_IN=12h
   CORS_ORIGINS=https://yourdomain.com
   TRUST_PROXY_HOPS=1
   EOF
   ```

2. Tuỳ chọn — Facebook integration:

   ```bash
   echo "FB_APP_SECRET=<từ Meta App Dashboard>" >> .env
   echo "FB_VERIFY_TOKEN=<chuỗi bí mật tự đặt>" >> .env
   ```

3. Build + chạy:

   ```bash
   docker compose up -d --build
   docker logs -f musicbox-app
   ```

Port mặc định trong `docker-compose.yml`: `8081:3000`. Đổi nếu cần.

Container sẽ **fail-closed** nếu thiếu `JWT_SECRET` hoặc `CORS_ORIGINS` — đó là
chủ ý để tránh chạy production với secret yếu.

---

## Phân quyền

| Menu | OWNER | MANAGER | CASHIER | STAFF |
|------|:---:|:---:|:---:|:---:|
| Phòng / Order | ✓ | ✓ | ✓ | ✓ |
| Lịch đặt / Khách hàng | ✓ | ✓ | ✓ | – |
| Tổng quan / Kho / Báo cáo / Nhân viên / Facebook | ✓ | ✓ | – | – |
| Cài đặt hệ thống | ✓ | – | – | – |

---

## Cấu trúc thư mục

```
IKA/
├─ server/              Express + Prisma + Socket.io
│  ├─ prisma/schema.prisma
│  └─ src/modules/      auth, rooms, bookings, orders, checkout, stock,
│                       customers, staff, shifts, reports, settings,
│                       notifications, facebook
├─ client/              React + Vite + Tailwind + shadcn/ui
│  └─ src/pages/        dashboard, rooms, orders, customers, stock, staff,
│                       reports, settings, facebook, auth
├─ docs/                PRD, ARCHITECTURE, DATABASE, API, UI wireframes
├─ Dockerfile           multi-stage build, non-root user
├─ docker-compose.yml   single-service, volume-backed SQLite + uploads
└─ docker-entrypoint.sh `prisma db push` + idempotent seed + `node dist`
```

---

## Tài liệu

- `docs/PRD.md` — yêu cầu sản phẩm (có ADDENDUM cập nhật)
- `docs/ARCHITECTURE.md` — kiến trúc tổng quan
- `docs/DATABASE.md` — schema (có ADDENDUM: SQLite thay vì Postgres)
- `docs/API.md` — REST endpoints (có ADDENDUM: Facebook, rate limit, CORS)
- `docs/UI-WIREFRAMES.md` — wireframe các màn hình chính
- `docs/TASK-DECOMPOSITION.md` — task breakdown gốc

---

## Backup

Database là file `/app/data/musicbox.db` trong volume `musicbox-data`. Backup:

```bash
docker exec musicbox-app sh -c 'sqlite3 /app/data/musicbox.db ".backup /app/data/backup-$(date +%F).db"'
docker cp musicbox-app:/app/data/backup-$(date +%F).db ./backups/
```

---

## Troubleshooting

- **`JWT_SECRET must be set in .env`** — chưa tạo `.env`, xem mục Deploy.
- **`CORS: origin X not allowed`** — thêm domain vào `CORS_ORIGINS` (phân tách
  dấu phẩy, không có dấu `/` cuối).
- **Port conflict (EADDRINUSE)** — đổi mapping trong `docker-compose.yml` hoặc
  dừng container khác chiếm port.
- **Rate limit 429 sau reverse proxy** — set `TRUST_PROXY_HOPS` đúng số proxy
  (nginx = 1, cloudflare + nginx = 2…).
