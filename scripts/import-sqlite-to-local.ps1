# Import a production SQLite dump into Docker Desktop volume musicbox-data.
# Usage:
#   powershell -File scripts/import-sqlite-to-local.ps1 -DbPath C:\path\musicbox-prod.db
param(
  [Parameter(Mandatory = $true)]
  [string]$DbPath
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path $DbPath)) {
  throw "DB file not found: $DbPath"
}
$abs = (Resolve-Path $DbPath).Path
Write-Host "==> Source: $abs"

docker info | Out-Null

$compose = Join-Path $root 'docker-compose.yml'
if (-not (Test-Path $compose)) { throw 'docker-compose.yml missing' }

Write-Host '==> Stop app (keep volumes)'
docker compose stop app 2>$null
# Container may still exist stopped — that's fine for docker cp if we start a helper.

$vol = docker volume ls --format '{{.Name}}' | Where-Object { $_ -match 'musicbox-data$' } | Select-Object -First 1
if (-not $vol) {
  Write-Host '==> Create volumes by starting compose once'
  docker compose up -d --no-start
  $vol = docker volume ls --format '{{.Name}}' | Where-Object { $_ -match 'musicbox-data$' } | Select-Object -First 1
}
if (-not $vol) { throw 'Named volume *musicbox-data not found' }
Write-Host "==> Volume: $vol"

Write-Host '==> Copy DB into volume via helper container'
docker run --rm -v "${vol}:/data" -v "${abs}:/in/musicbox.db:ro" alpine:3.20 sh -c @'
set -e
cp /in/musicbox.db /data/musicbox.db
rm -f /data/musicbox.db-wal /data/musicbox.db-shm
ls -lh /data/musicbox.db
'@

Write-Host '==> Start local app'
docker compose up -d
Start-Sleep -Seconds 4
docker compose ps
try {
  (Invoke-WebRequest -Uri 'http://localhost:8081/api/health' -UseBasicParsing -TimeoutSec 15).Content
} catch {
  Write-Host 'Health not ready yet — check: docker logs musicbox-app --tail 40'
}

Write-Host 'Done. Local DB is a clone of the dump (login = production users/passwords).'
