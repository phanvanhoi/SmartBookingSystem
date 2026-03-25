#!/bin/sh
set -e

echo "🎵 Music Box Manager - Starting..."

# Run database migration
echo "📦 Running database migration..."
npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null || \
  npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

# Seed if database is empty (check if admin user exists)
echo "🌱 Checking seed data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => {
  if (c === 0) {
    console.log('  → Database empty, seeding...');
    process.exit(1);
  } else {
    console.log('  → Database has data, skipping seed.');
    process.exit(0);
  }
}).catch(() => process.exit(1)).finally(() => p.\$disconnect());
" || {
  echo "  → Running seed..."
  node dist/prisma-seed.js 2>/dev/null || echo "  → Seed script not found, skipping."
}

echo "🚀 Starting server on port ${PORT:-3000}..."
exec node dist/index.js
