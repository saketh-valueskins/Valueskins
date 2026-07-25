#!/usr/bin/env bash
# run-migrations.sh — Apply all SQL migrations to Render PostgreSQL
# Usage: ./scripts/run-migrations.sh <DATABASE_URL>
# Safe to run multiple times (migrations are idempotent via IF NOT EXISTS)

set -euo pipefail

DATABASE_URL="${1:?Usage: ./scripts/run-migrations.sh <DATABASE_URL>}"
MIGRATIONS_DIR="$(dirname "$0")/../backend/migrations"

echo "==> Running migrations against database"
echo "    URL: ${DATABASE_URL:0:40}..."

APPLIED=0
FAILED=0

for migration in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
    filename=$(basename "$migration")
    echo -n "  $filename ... "
    
    if psql "$DATABASE_URL" -f "$migration" -v ON_ERROR_STOP=1 --quiet 2>/dev/null; then
        echo "OK"
        APPLIED=$((APPLIED + 1))
    else
        echo "SKIP (already applied or error)"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "==> Done. Applied: $APPLIED | Skipped: $FAILED"
