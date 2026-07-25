#!/usr/bin/env bash
# deploy.sh — Build backend Docker image, push to Render, run migrations
# Usage: ./scripts/deploy.sh
# Prerequisites: Docker, Render CLI (render login), psql (for migrations)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

echo "============================================="
echo "  Valueskins — Production Deployment"
echo "============================================="

# ── 1. Validate environment ──────────────────────────────────────────────
echo ""
echo "[1/6] Validating environment..."

if ! command -v docker &>/dev/null; then
    echo "ERROR: Docker not found. Install Docker Desktop."
    exit 1
fi

if ! command -v render &>/dev/null; then
    echo "WARNING: Render CLI not found. Install: npm i -g @renderinc/cli"
    echo "         You can deploy manually via Render dashboard instead."
fi

# Check that critical files exist
for f in Dockerfile Cargo.toml Cargo.lock; do
    if [ ! -f "$BACKEND_DIR/$f" ]; then
        echo "ERROR: Missing $BACKEND_DIR/$f"
        exit 1
    fi
done

echo "  OK"

# ── 2. Build Docker image ───────────────────────────────────────────────
echo ""
echo "[2/6] Building Docker image..."
cd "$BACKEND_DIR"
docker build -t valueskins-backend:latest . 2>&1 | tail -5

echo ""
echo "  Image built: valueskins-backend:latest"

# ── 3. Tag for Render registry ──────────────────────────────────────────
echo ""
echo "[3/6] Tagging image..."
REGISTRY="registry.render.com/valueskins/valueskins-api"
docker tag valueskins-backend:latest "$REGISTRY:latest"
docker tag valueskins-backend:latest "$REGISTRY:$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

echo "  Tagged: $REGISTRY:latest"

# ── 4. Push to Render ──────────────────────────────────────────────────
echo ""
echo "[4/6] Pushing to Render registry..."
if command -v render &>/dev/null; then
    docker push "$REGISTRY:latest"
    echo "  Pushed."
else
    echo "  SKIPPED — Render CLI not found. Push manually:"
    echo "    docker push $REGISTRY:latest"
fi

# ── 5. Run database migrations ─────────────────────────────────────────
echo ""
echo "[5/6] Running database migrations..."
DB_URL="${DATABASE_URL:-}"
if [ -n "$DB_URL" ]; then
    bash "$SCRIPT_DIR/run-migrations.sh" "$DB_URL"
else
    echo "  SKIPPED — Set DATABASE_URL env var to run migrations."
    echo "  Example: export DATABASE_URL='postgresql://...'"
fi

# ── 6. Trigger Render deploy ───────────────────────────────────────────
echo ""
echo "[6/6] Triggering Render deploy..."
if command -v render &>/dev/null; then
    render services deploy valueskins-api --image "$REGISTRY:latest"
    echo "  Deploy triggered."
else
    echo "  SKIPPED — Render CLI not found. Deploy via:"
    echo "    1. Go to https://dashboard.render.com"
    echo "    2. Select 'valueskins-api'"
    echo "    3. Click 'Manual Deploy' > 'Deploy latest commit'"
fi

echo ""
echo "============================================="
echo "  Deployment complete!"
echo "============================================="
echo ""
echo "Verify:"
echo "  curl https://valueskins-api.onrender.com/health"
echo ""
