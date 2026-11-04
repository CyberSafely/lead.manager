#!/usr/bin/env bash
# Auto-commit changes, push to GitHub, and deploy to Vercel production.
#
# Run automatically by the Claude Code Stop hook (see .claude/settings.local.json)
# after each turn Claude finishes. Commits any working-tree changes, pushes to
# origin, then runs `npm run deploy` (build:cloud + vercel --prod).
#
# Turn it off: delete the "hooks" block from .claude/settings.local.json, or open /hooks.
# Test without deploying: AUTO_DEPLOY_DRY_RUN=1 bash scripts/auto-deploy.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 0

LOG="$ROOT/scripts/.auto-deploy.log"
LOCK="$ROOT/scripts/.auto-deploy.lock"
exec >>"$LOG" 2>&1

# Only one deploy at a time (turns can finish faster than a deploy runs).
if ! mkdir "$LOCK" 2>/dev/null; then echo "$(date '+%F %T') skip: already running"; exit 0; fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

echo "=== $(date '+%F %T') auto-deploy ==="

# Keep the generated email file in sync so what we commit matches what we deploy.
python3 scripts/sync-emails.py >/dev/null 2>&1 || true

DIRTY="$(git status --porcelain)"
UNPUSHED="$(git rev-list '@{u}..HEAD' 2>/dev/null | head -1 || true)"
if [ -z "$DIRTY" ] && [ -z "$UNPUSHED" ]; then
  echo "nothing to commit or push"; exit 0
fi

if [ -n "${AUTO_DEPLOY_DRY_RUN:-}" ]; then
  echo "dry-run: would commit/push/deploy"
  [ -n "$DIRTY" ] && echo "dirty files:" && echo "$DIRTY"
  [ -n "$UNPUSHED" ] && echo "unpushed commits present"
  exit 0
fi

if [ -n "$DIRTY" ]; then
  git add -A
  git commit -q -m "Auto-deploy $(date '+%Y-%m-%d %H:%M')" && echo "committed" || echo "commit skipped"
fi

if git push origin HEAD; then echo "pushed"; else echo "PUSH FAILED"; fi
if npm run deploy; then echo "deployed"; else echo "DEPLOY FAILED"; fi
echo "=== done $(date '+%F %T') ==="
