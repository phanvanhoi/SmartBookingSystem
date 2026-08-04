# ══════════════════════════════════════════
# Stage 1: Build client
# ══════════════════════════════════════════
FROM node:20-alpine AS client-build

WORKDIR /app/client

# Faster / more resilient npm on flaky VPS networks
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000 \
 && npm config set maxsockets 3

COPY client/package.json client/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY client/ ./
RUN npm run build

# ══════════════════════════════════════════
# Stage 2: Build server
# ══════════════════════════════════════════
FROM node:20-alpine AS server-build

WORKDIR /app/server

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000 \
 && npm config set maxsockets 3

COPY server/package.json server/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY server/ ./

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build TypeScript
RUN npx tsc

# Production node_modules: drop build-only deps, keep prisma CLI for entrypoint `db push`
RUN npm prune --omit=dev \
 && npm install prisma@6.4.1 --omit=dev --no-audit --no-fund \
 && npx prisma generate --schema=prisma/schema.prisma

# ══════════════════════════════════════════
# Stage 3: Production (no third npm install — avoids long hangs on VPS)
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
