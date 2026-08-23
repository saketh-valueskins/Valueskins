#!/usr/bin/env bash
# One command to put develop on valueskins.com.
#
#   ./scripts/ship.sh "commit message"
#
# main is protected by a pre-push hook, so it cannot be pushed to directly.
# The supported path is develop -> PR -> merge, which this wraps. Vercel builds
# production from main automatically once the merge lands.
set -euo pipefail

# Message comes from stdin when piped, else from $1. Prefer stdin for anything
# containing backticks or newlines — the shell will otherwise run the backticks
# as a command substitution before this script ever sees them.
if [ ! -t 0 ]; then
  MSG="$(cat)"
else
  MSG="${1:-}"
fi
[ -z "$MSG" ] && { echo 'usage: ./scripts/ship.sh "message"   or   ./scripts/ship.sh <<'"'"'EOF'"'"' ... EOF'; exit 1; }
TITLE="$(printf '%s' "$MSG" | head -1)"

cd "$(dirname "$0")/.."

echo "→ building"
( cd marketplace && npm run build >/dev/null 2>&1 ) || { echo "BUILD FAILED — nothing shipped"; exit 1; }

echo "→ committing"
git add -A marketplace/
git diff --cached --quiet && echo "  (nothing staged)" || printf '%s' "$MSG" | git commit -q -F -

echo "→ pushing develop"
git push -q origin develop

echo "→ opening PR"
PR=$(gh pr list --base main --head develop --json number --jq '.[0].number' 2>/dev/null || true)
if [ -z "$PR" ]; then
  PR=$(gh pr create --base main --head develop --title "$TITLE" --body "$MSG" | grep -oE '[0-9]+$')
fi

echo "→ merging #$PR"
gh pr merge "$PR" --merge

echo "→ live shortly at https://valueskins.com  (PR #$PR)"
