# Deploy VPS (Music Box / SmartBookingSystem)

Ghi chú từ sự cố Aug 2026 — để lần sau cập nhật **nhanh và đúng**.

## Hiện trạng production

| Mục | Giá trị |
|---|---|
| Thư mục | `/opt/SmartBookingSystem` |
| Container | `musicbox-app` |
| Compose prod | `docker-compose.prod.yml` (**host network**) |
| Port app | **8081** (Node listen trực tiếp trên host) |
| DB / uploads / logs | Named volumes `smartbookingsystem_musicbox-*` |
| Nginx host | **Không** dùng cho Music Box (`systemctl nginx` inactive, không có config `/etc/nginx`) |
| Cổng 80 | Container Docker khác (`docker-proxy`) — không phải Music Box |
| Truy cập app | `http://<IP-or-domain>:8081` |

Xác nhận thư mục compose đang gắn container:

```bash
docker inspect musicbox-app --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}'
docker inspect musicbox-app --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
```

## Lệnh deploy nhanh (đúng cách)

```bash
cd /opt/SmartBookingSystem

# 1) Code
git pull origin main

# 2) Backup DB (khuyến nghị)
docker exec musicbox-app sh -c 'cp /app/data/musicbox.db /app/data/musicbox-backup-$(date +%F-%H%M).db' \
  || cp musicbox-backup.db "backups/musicbox-$(date +%F-%H%M).db" 2>/dev/null || true

# 3) Build — dùng docker build (Compose trên VPS này KHÔNG nhận flag --network)
docker build --network=host \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
  -t smartbookingsystem-app:latest \
  . 2>&1 | tee /tmp/mb-build.log

# 4) Recreate — file prod (host network), KHÔNG tạo bridge
docker compose -f docker-compose.prod.yml up -d --force-recreate

# 5) Verify
docker inspect musicbox-app --format 'Created={{.Created}} NetworkMode={{.HostConfig.NetworkMode}}'
docker logs --tail 40 musicbox-app
curl -sS http://127.0.0.1:8081/api/health
```

### Dấu hiệu image MỚI đã chạy

Log khởi động phải có dạng:

```text
→ Database has data, skipping base seed.
→ Spin campaigns ready.
→ Promo products ready (PROMO-COCA, PROMO-SUOI, PROMO-KHO).
🚀 Starting server on port 8081...
```

`Created=` phải là thời điểm vừa build (không còn vài tuần trước).

Image cũ thường chỉ ghi `skipping seed` và vẫn log `Unhandled error CORS: origin ... not allowed`.

## Việc KHÔNG làm

- `docker compose down -v` / `docker volume rm` — xóa DB thật.
- `docker compose up` với `docker-compose.yml` (bridge) trên VPS này — dễ fail iptables.
- `docker compose build --network=host` — flag `--network` **không hỗ trợ** trên Compose của VPS → build bị bỏ qua / lỗi ngay.
- Chỉ `git pull` rồi restart container cũ — **code trên disk đổi nhưng image Docker không đổi**.

## Sự cố đã gặp & cách tránh

### 1) Git đã mới nhưng app vẫn cũ

- **Triệu chứng:** `git log` = commit mới, nhưng `Created=2026-06-20`, log CORS/`/%c0` kiểu Unhandled, seed text cũ.
- **Nguyên nhân:** chưa build lại image / chưa recreate container.
- **Cách:** luôn `docker build ... -t smartbookingsystem-app:latest` rồi `compose -f docker-compose.prod.yml up -d --force-recreate`.

### 2) `unknown flag: --network` trên `docker compose build`

- Dùng `docker build --network=host ...` (CLI `docker build` hỗ trợ).
- Hoặc `build.network: host` trong `docker-compose.prod.yml` (khi dùng `compose build` không kèm flag).

### 3) `failed to create network ... iptables ... DOCKER-FORWARD`

- Bridge networking trên VPS bị hỏng iptables.
- Production chạy **`network_mode: host`** → tránh tạo `smartbookingsystem_default`.
- Dùng `docker-compose.prod.yml`, **không** dùng `docker-compose.yml` (bridge + publish ports — dành cho Docker Desktop).

### 4) npm build treo trên VPS

- Registry chậm tới npmjs.
- Luôn truyền: `--build-arg NPM_REGISTRY=https://registry.npmmirror.com`
- Build với `--network=host` để container build dùng mạng host.

### 5) Nhầm thư mục lồng

- Có thể tồn tại `/opt/SmartBookingSystem/SmartBookingSystem/` (bản clone thừa).
- Luôn làm việc tại `/opt/SmartBookingSystem` (nơi có `docker-compose.yml` mà container đang dùng).

### 6) Log “CORS domain lạ” / `/JNAP/` / `/%c0`

- Scanner internet, **không** phải domain của shop.
- Code mới (từ `8575914`+) xử lý êm: CORS deny im lặng, JSON/URI → warn + 4xx.
- Không cần thêm các domain đó vào `CORS_ORIGINS`.

### 7) Nginx

- Host nginx inactive; process nginx thấy qua `ps` là container khác (`daemon off`), không proxy Music Box.
- App health kiểm tra: `curl http://127.0.0.1:8081/api/health`.

## Fallback nếu compose prod vẫn lỗi

```bash
docker stop musicbox-app
docker rm musicbox-app   # chỉ xóa container — volume giữ nguyên

docker run -d \
  --name musicbox-app \
  --restart unless-stopped \
  --network host \
  --env-file .env \
  -e NODE_ENV=production \
  -e PORT=8081 \
  -e DATABASE_URL=file:/app/data/musicbox.db \
  -e TZ=Asia/Ho_Chi_Minh \
  -v smartbookingsystem_musicbox-data:/app/data \
  -v smartbookingsystem_musicbox-uploads:/app/uploads \
  -v smartbookingsystem_musicbox-logs:/app/logs \
  smartbookingsystem-app:latest
```

(Env JWT/CORS lấy từ `.env` qua `--env-file`.)

## Docker Desktop (máy dev Windows)

Dùng `docker-compose.yml` (bridge `8081:3000`), **không** cần `docker-compose.prod.yml`:

```bash
docker compose up -d --build
```

## Checklist 30 giây sau deploy

1. [ ] `Created=` hôm nay  
2. [ ] Log có `Spin campaigns ready`  
3. [ ] `curl http://127.0.0.1:8081/api/health` → 200  
4. [ ] Mở UI `:8081` đăng nhập được  
5. [ ] Volume vẫn còn (`docker volume ls | grep musicbox`)
