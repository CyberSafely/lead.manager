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

# public/email-templates.js is regenerated with a fresh "generated" timestamp on every
# deploy, so it is always "changed" even when nothing real did. Discard that churn here so
# it never makes a no-op commit or triggers a pointless deploy. Real email edits live in
# emails/*.md (committed below) and npm run deploy rebuilds them into the deployed artifact.
git checkout -q -- public/email-templates.js 2>/dev/null || true

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

# Push as the account that has access to the CyberSafely repo (the active gh account can
# reset between sessions). Harmless if it is already active or gh is unavailable.
gh auth switch --user explorevieques1 >/dev/null 2>&1 || true
gh auth setup-git >/dev/null 2>&1 || true
if git push origin HEAD; then echo "pushed"; else echo "PUSH FAILED"; fi
if npm run deploy; then echo "deployed"; else echo "DEPLOY FAILED"; fi
# The deploy just rewrote the email file's timestamp again — clear it so the tree stays clean.
git checkout -q -- public/email-templates.js 2>/dev/null || true
echo "=== done $(date '+%F %T') ==="
