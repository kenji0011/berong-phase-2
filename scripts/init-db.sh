#!/bin/bash
# ============================================================
# PostgreSQL Initialization Script for BFP Berong
# This script runs ONLY on first database initialization
# (when postgres_data volume is empty)
# ============================================================

set -e

echo "============================================="
echo "  BFP Berong - Database Initialization"
echo "============================================="

# Check for the SQL dump file
DUMP_FILE="/docker-entrypoint-initdb.d/Database-bfp-berong.sql"

if [ -f "$DUMP_FILE" ]; then
    # Check if it's a pg_dump custom format (starts with PGDMP)
    HEADER=$(head -c 5 "$DUMP_FILE" 2>/dev/null || echo "")
    
    if [ "$HEADER" = "PGDMP" ]; then
        echo "📦 Found pg_dump custom format backup, restoring with pg_restore..."
        pg_restore \
            --no-owner \
            --no-privileges \
            --dbname="$POSTGRES_DB" \
            --username="$POSTGRES_USER" \
            --verbose \
            "$DUMP_FILE" 2>&1 || {
            echo "⚠️  pg_restore completed with warnings (some objects may already exist)"
        }
    else
        echo "📦 Found SQL text dump, restoring with psql..."
        psql \
            --dbname="$POSTGRES_DB" \
            --username="$POSTGRES_USER" \
            --file="$DUMP_FILE" \
            --echo-errors 2>&1 || {
            echo "⚠️  psql restore completed with warnings"
        }
    fi
    
    echo "✅ Database restore completed!"
    
    # Verify the restore
    USERS_COUNT=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    echo "📊 Users in database: $(echo $USERS_COUNT | tr -d ' ')"
else
    echo "ℹ️  No SQL dump found at $DUMP_FILE"
    echo "   Database will be initialized with Prisma migrations and seed script"
fi

echo "============================================="
echo "  Database initialization complete"
echo "============================================="
