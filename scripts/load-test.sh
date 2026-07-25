#!/usr/bin/env bash
# load-test.sh — Concurrent user load test
# Usage: ./scripts/load-test.sh <BACKEND_URL> [concurrent] [requests]
# Requires: ab (Apache Bench) or wrk

set -euo pipefail

BACKEND_URL="${1:?Usage: ./scripts/load-test.sh <BACKEND_URL> [concurrent] [requests]}"
CONCURRENT="${2:-50}"
REQUESTS="${3:-500}"

echo "============================================="
echo "  Valueskins — Load Test"
echo "  Target: $BACKEND_URL"
echo "  Concurrent: $CONCURRENT"
echo "  Total requests: $REQUESTS"
echo "============================================="
echo ""

# Test 1: Health endpoint (should be fast)
echo "[Test 1] Health endpoint — $CONCURRENT concurrent, $REQUESTS requests"
if command -v ab &>/dev/null; then
    ab -n "$REQUESTS" -c "$CONCURRENT" -s 10 "$BACKEND_URL/health" 2>&1 | grep -E "(Requests per|Time per|Failed|Complete|Non-2xx)"
elif command -v wrk &>/dev/null; then
    wrk -t4 -c "$CONCURRENT" -d30s "$BACKEND_URL/health" 2>&1
else
    echo "  SKIPPED — Install ab (Apache Bench) or wrk"
    echo "    macOS: brew install apache2-utils"
    echo "    Linux: sudo apt install apache2-utils"
fi

echo ""

# Test 2: Auth endpoint (rate-limited)
echo "[Test 2] Auth rate limiting — 10 rapid login attempts"
BLOCKED=0
for i in $(seq 1 10); do
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/auth/unified/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"loadtest@test.com","password":"wrong"}' 2>/dev/null || echo "000")
    if [ "$HTTP" = "429" ]; then
        BLOCKED=$((BLOCKED + 1))
    fi
done
echo "  Rate limited (429): $BLOCKED/10 attempts"
if [ "$BLOCKED" -ge 3 ]; then
    echo "  ✅ Rate limiting working"
else
    echo "  ⚠️  Rate limiting may not be configured (got $BLOCKED 429s)"
fi

echo ""

# Test 3: Large payload rejection
echo "[Test 3] Large payload rejection"
LARGE=$(python3 -c "print('{\"data\":\"' + 'A'*1000000 + '\"}')" 2>/dev/null || echo '{"data":"LARGE"}')
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/auth/unified/login" \
    -H "Content-Type: application/json" \
    -d "$LARGE" 2>/dev/null || echo "000")
echo "  1MB payload: HTTP $HTTP (expected 413 or 400)"
if [ "$HTTP" = "413" ] || [ "$HTTP" = "400" ]; then
    echo "  ✅ Large payload rejected"
else
    echo "  ⚠️  Large payload not rejected (got $HTTP)"
fi

echo ""
echo "============================================="
echo "  Load test complete"
echo "============================================="
