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

# Copy Prisma seed (compiled)
COPY --from=server-build /app/server/dist/prisma-seed.js ./dist/prisma-seed.js 2>/dev/null || true

# Copy entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directories
RUN mkdir -p uploads/qr uploads/products data logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
