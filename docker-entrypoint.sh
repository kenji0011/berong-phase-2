#!/bin/sh
set -e

echo "🔥 BFP Berong - Starting up..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 3

# Apply Prisma migrations (production-safe)
echo "📦 Applying database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Seed the database with production seed script
echo "🌱 Seeding database..."
node prisma/seed-production.js || echo "Seeding skipped or already complete"

echo "🚀 Starting Next.js server..."
exec "$@"
