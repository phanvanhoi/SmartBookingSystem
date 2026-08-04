# syntax=docker/dockerfile:1
# ══════════════════════════════════════════
# Stage 1: Build client
# ══════════════════════════════════════════
FROM node:20-alpine AS client-build

# Override on VPS if npmjs is slow, e.g.:
#   docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org

WORKDIR /app/client

RUN npm config set registry "$NPM_REGISTRY" \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm config set maxsockets 2 \
 && npm config set fund false \
 && npm config set audit false

COPY client/package.json client/package-lock.json* ./
# Prefer lockfile; fall back to install. No BuildKit cache mount (hangs on some VPS).
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY client/ ./
RUN npm run build

# ══════════════════════════════════════════
# Stage 2: Build server
# ══════════════════════════════════════════
FROM node:20-alpine AS server-build

ARG NPM_REGISTRY=https://registry.npmjs.org

WORKDIR /app/server

RUN npm config set registry "$NPM_REGISTRY" \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm config set maxsockets 2 \
 && npm config set fund false \
 && npm config set audit false

COPY server/package.json server/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY server/ ./

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npx tsc

# Drop build-only deps; prisma stays in dependencies for entrypoint `db push`
RUN npm prune --omit=dev

# ══════════════════════════════════════════
# Stage 3: Production (copy artifacts — no npm network)
# ══════════════════════════════════════════
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=server-build /app/server/package.json ./
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p uploads/qr uploads/products data logs \
 && chown -R node:node /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider "http://localhost:${PORT:-3000}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
