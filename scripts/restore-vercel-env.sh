#!/usr/bin/env bash
# Restore the project's Vercel environment variables.
#
# The project had ~25 app-owned vars and lost all of them; only the two added
# during the realtime work remained. Values come from .env.vercel-pull (a
# snapshot of the old Vercel env), EXCEPT the URLs — the snapshot's are
# localhost, which is what api-diagnostics.ts warns about, so those are
# overridden with real production values below.
#
# Usage: ./scripts/restore-vercel-env.sh [environment]   (default: production)

set -uo pipefail

ENVIRONMENT="${1:-production}"
cd "$(dirname "$0")/../marketplace" || exit 1

SRC=".env.vercel-pull"
[ -f "$SRC" ] || { echo "missing $SRC"; exit 1; }

APP_URL="https://www.valueskins.com"
API_URL="https://valueskins-web-service.onrender.com"

# Vercel injects these itself; setting them breaks the build.
SKIP_RE='^(VERCEL|TURBO|NX_DAEMON|NODE_ENV)'

# Values in the snapshot that point at dead infrastructure. Restoring these
# silently breaks production, so they are refused rather than replayed.
#
# dpg-d9hpuajeo5us73e4p1t0 is the SUSPENDED "valueskins test" database. The
# snapshot's DATABASE_URL points there; restoring it made every OAuth login
# fail with "Connection terminated unexpectedly". The live database is
# dpg-dad68of10e5c73dgvigg. The real value is not hardcoded here because this
# file is committed and the URL contains a password — set it with:
#   vercel env add DATABASE_URL production --force
DEAD_VALUE_RE='dpg-d9hpuajeo5us73e4p1t0|valueskins-api\.render\.com|valueskins-final\.onrender\.com'

# Correct production values, overriding the localhost ones in the snapshot.
declare -a OVERRIDE_KEYS=(
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_URL
  NEXT_PUBLIC_BACKEND_URL
  BACKEND_URL
  NEXT_PUBLIC_WS_URL
  NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  NEXT_PUBLIC_GITHUB_REDIRECT_URI
)
declare -a OVERRIDE_VALS=(
  "$APP_URL"
  "$APP_URL"
  "$API_URL"
  "$API_URL"
  "wss://valueskins-web-service.onrender.com/ws"
  "$APP_URL/api/oauth/google/callback"
  "$APP_URL/api/oauth/github/callback"
)

override_for() {
  local k="$1" i
  for i in "${!OVERRIDE_KEYS[@]}"; do
    [ "${OVERRIDE_KEYS[$i]}" = "$k" ] && { printf '%s' "${OVERRIDE_VALS[$i]}"; return 0; }
  done
  return 1
}

set_var() {
  local key="$1" val="$2"
  # --force replaces an existing value instead of erroring.
  printf '%s' "$val" | npx vercel env add "$key" "$ENVIRONMENT" --force >/dev/null 2>&1
}

echo "Restoring env -> $ENVIRONMENT"
count=0; skipped=0; refused=0

while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  key="${line%%=*}"
  case "$key" in *[!A-Za-z0-9_]*) continue ;; esac

  if [[ "$key" =~ $SKIP_RE ]]; then
    skipped=$((skipped + 1)); continue
  fi

  val="${line#*=}"
  # Strip one layer of surrounding quotes.
  val="${val%\"}"; val="${val#\"}"
  [ -z "$val" ] && continue

  if ov="$(override_for "$key")"; then
    val="$ov"
    printf '  %-34s (corrected)\n' "$key"
  elif [[ "$val" =~ $DEAD_VALUE_RE ]]; then
    printf '  %-34s REFUSED — points at dead infrastructure, set it manually\n' "$key"
    refused=$((refused + 1))
    continue
  else
    printf '  %-34s\n' "$key"
  fi

  set_var "$key" "$val"
  count=$((count + 1))
done < "$SRC"

echo
echo "set: $count   skipped (Vercel-managed): $skipped   refused (dead): $refused"
