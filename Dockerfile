# ══════════════════════════════════════════
# Stage 1: Build client
# ══════════════════════════════════════════
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY client/ ./
RUN npm run build

# ══════════════════════════════════════════
# Stage 2: Build server
# ══════════════════════════════════════════
FROM node:20-alpine AS server-build

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY server/ ./

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build TypeScript
RUN npx tsc

# ══════════════════════════════════════════
# Stage 3: Production
# ══════════════════════════════════════════
FROM node:20-alpine AS production

WORKDIR /app

# Install production deps only
COPY server/package.json ./
RUN npm install --omit=dev

# Copy Prisma schema + generated client
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=server-build /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=server-build /app/server/node_modules/@prisma ./node_modules/@prisma

# Copy compiled server
COPY --from=server-build /app/server/dist ./dist

# Copy built client → serve as static files
COPY --from=client-build /app/client/dist ./public

# Drop to node user via busybox su (no extra apk — avoids build failures when
# VPS DNS cannot reach dl-cdn.alpinelinux.org for su-exec).
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directories
RUN mkdir -p uploads/qr uploads/products data logs
RUN chown -R node:node /app

# Note: we intentionally stay as root here so the entrypoint can chown the
# mounted volumes (which may have been created root-owned by an older image),
# then drop to `node` via busybox su. Process never serves traffic as root.

# Expose port
EXPOSE 3000

# Health check — uses PORT from env (defaults to 3000 in docker, 8081 with host net)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider "http://localhost:${PORT:-3000}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
