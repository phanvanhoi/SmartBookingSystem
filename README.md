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

**Hướng dẫn đầy đủ (sự cố đã gặp + lệnh nhanh):** [`docs/DEPLOY-VPS.md`](docs/DEPLOY-VPS.md)

Tóm tắt production hiện tại (`/opt/SmartBookingSystem`):

- Dùng **`docker-compose.prod.yml`** (`network_mode: host`, port **8081**)
- Build bằng `docker build --network=host` + mirror npm (Compose trên VPS không nhận `--network`)
- **Không** `down -v`; **không** dùng `docker-compose.yml` bridge nếu iptables Docker hỏng

```bash
cd /opt/SmartBookingSystem
git pull origin main
docker build --network=host \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
  -t smartbookingsystem-app:latest .
docker compose -f docker-compose.prod.yml up -d --force-recreate
curl -sS http://127.0.0.1:8081/api/health
```

Docker Desktop (Windows): dùng `docker compose up -d --build` với `docker-compose.yml` (`8081:3000`).

Container **fail-closed** nếu thiếu `JWT_SECRET` hoặc `CORS_ORIGINS`.

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
├─ docs/                PRD, ARCHITECTURE, DATABASE, API, DEPLOY-VPS, …
├─ Dockerfile           multi-stage build, non-root user
├─ docker-compose.yml        Docker Desktop (bridge 8081:3000)
├─ docker-compose.prod.yml   VPS Linux (host network, port 8081)
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
- `docs/DEPLOY-VPS.md` — deploy production, tránh lỗi build/iptables

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
