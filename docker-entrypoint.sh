#!/bin/sh
set -e

echo "🔥 BFP Berong - Starting up..."

# Wait for database with retry loop instead of sleep
echo "⏳ Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0
until npx prisma migrate deploy 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ Database not ready after $MAX_RETRIES attempts, attempting migration anyway..."
    break
  fi
  echo "Waiting for database... attempt $RETRY_COUNT/$MAX_RETRIES"
  sleep 2
done

# Apply Prisma migrations (production-safe)
echo "📦 Applying database migrations..."
npx prisma migrate deploy || echo "⚠️ Migration failed or already applied"

# NOTE: prisma generate is already done at Docker build time, not needed here

# Check if database has data (skip seeding if SQL dump was restored)
DATA_EXISTS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c > 0 ? 'yes' : 'no'); p.\$disconnect(); }).catch(() => { console.log('no'); p.\$disconnect(); });
" 2>/dev/null || echo "no")

if [ "$DATA_EXISTS" = "yes" ]; then
  echo "ℹ️  Database already has data, skipping seed"
else
  echo "🌱 Seeding database..."
  node prisma/seed-production.js || echo "⚠️ Seeding skipped or failed"
fi

echo "🚀 Starting Next.js server..."
exec "$@"
