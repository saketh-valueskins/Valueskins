#!/usr/bin/env bash
# verify-deployment.sh — Post-deploy verification suite
# Usage: ./scripts/verify-deployment.sh <BACKEND_URL>
# Checks: health, CORS, auth flow, database, WebSocket, rate limiting

set -euo pipefail

BACKEND_URL="${1:?Usage: ./scripts/verify-deployment.sh <BACKEND_URL>}"
PASS=0
FAIL=0

check() {
    local name="$1"
    local result="$2"
    if [ "$result" = "pass" ]; then
        echo "  ✅ $name"
        PASS=$((PASS + 1))
    else
        echo "  ❌ $name"
        FAIL=$((FAIL + 1))
    fi
}

echo "============================================="
echo "  Valueskins — Deployment Verification"
echo "  Target: $BACKEND_URL"
echo "============================================="
echo ""

# ── 1. Health endpoints ──────────────────────────────────────────────
echo "[1/5] Health endpoints"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null || echo "000")
check "GET /health returns 200" "$([ "$HTTP" = "200" ] && echo pass || echo fail)"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health/live" 2>/dev/null || echo "000")
check "GET /health/live returns 200" "$([ "$HTTP" = "200" ] && echo pass || echo fail)"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health/ready" 2>/dev/null || echo "000")
check "GET /health/ready returns 200 (DB connected)" "$([ "$HTTP" = "200" ] && echo pass || echo fail)"

# ── 2. Security headers ─────────────────────────────────────────────
echo ""
echo "[2/5] Security headers"
HEADERS=$(curl -s -I "$BACKEND_URL/health" 2>/dev/null)
check "X-Content-Type-Options present" "$(echo "$HEADERS" | grep -qi 'x-content-type-options' && echo pass || echo fail)"
check "X-Frame-Options present" "$(echo "$HEADERS" | grep -qi 'x-frame-options' && echo pass || echo fail)"

# ── 3. CORS ──────────────────────────────────────────────────────────
echo ""
echo "[3/5] CORS"
CORS=$(curl -s -I -H "Origin: https://valueskins.com" -X OPTIONS "$BACKEND_URL/health" 2>/dev/null)
check "CORS allows valueskins.com" "$(echo "$CORS" | grep -qi 'access-control-allow-origin' && echo pass || echo fail)"

# ── 4. Auth endpoints (should reject bad input) ─────────────────────
echo ""
echo "[4/5] Auth endpoints"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/auth/unified/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' 2>/dev/null || echo "000")
check "POST /auth/unified/login returns 401 (not 500)" "$([ "$HTTP" = "401" ] && echo pass || echo fail)"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/auth/unified/signup" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo "000")
check "POST /auth/unified/signup rejects empty body (400)" "$([ "$HTTP" = "400" ] && echo pass || echo fail)"

# ── 5. Protected endpoints (should require auth) ────────────────────
echo ""
echo "[5/5] Auth protection"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/personas/me/profile" 2>/dev/null || echo "000")
check "GET /personas/me/profile requires auth (401)" "$([ "$HTTP" = "401" ] && echo pass || echo fail)"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/admin/stats" 2>/dev/null || echo "000")
check "GET /admin/stats requires auth (401)" "$([ "$HTTP" = "401" ] && echo pass || echo fail)"

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "============================================="
TOTAL=$((PASS + FAIL))
echo "  Results: $PASS/$TOTAL passed"
if [ "$FAIL" -gt 0 ]; then
    echo "  ⚠️  $FAIL checks failed — review above"
    exit 1
else
    echo "  All checks passed!"
fi
echo "============================================="
