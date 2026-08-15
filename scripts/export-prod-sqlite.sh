#!/usr/bin/env bash
# Chạy TRÊN VPS. Xuất SQLite (kèm WAL) ra thư mục hiện tại.
#   cd /opt/SmartBookingSystem
#   bash scripts/export-prod-sqlite.sh
set -euo pipefail

OUT_DIR="${1:-./backups}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$OUT_DIR"
DEST="$OUT_DIR/musicbox-prod-$STAMP.db"

echo "==> Checkpoint + copy SQLite from musicbox-app"
docker exec musicbox-app sh -c '
  node -e "
    const {PrismaClient}=require(\"@prisma/client\");
    const p=new PrismaClient();
    p.\$queryRawUnsafe(\"PRAGMA wal_checkpoint(TRUNCATE)\")
      .then(()=>p.\$disconnect())
      .catch(()=>process.exit(0));
  " >/dev/null 2>&1 || true
  cp /app/data/musicbox.db /tmp/musicbox-export.db
  if [ -f /app/data/musicbox.db-wal ]; then cp /app/data/musicbox.db-wal /tmp/musicbox-export.db-wal; fi
  if [ -f /app/data/musicbox.db-shm ]; then cp /app/data/musicbox.db-shm /tmp/musicbox-export.db-shm; fi
  ls -lh /tmp/musicbox-export.db*
'

docker cp musicbox-app:/tmp/musicbox-export.db "$DEST"
docker exec musicbox-app rm -f /tmp/musicbox-export.db /tmp/musicbox-export.db-wal /tmp/musicbox-export.db-shm || true

echo "==> Wrote $DEST"
ls -lh "$DEST"
echo
echo "Copy về máy Windows (từ máy local):"
echo "  scp USER@VPS:$DEST C:/Project/SmartBookingSystem/backups/"
echo "Rồi chạy:"
echo "  powershell -File scripts/import-sqlite-to-local.ps1 -DbPath backups/$(basename "$DEST")"
