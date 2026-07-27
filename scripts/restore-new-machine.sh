#!/usr/bin/env bash
# Restore CapTCF on a fresh machine from a clean GitHub clone. Idempotent. No secrets are read from
# git (there are none) — a local .env with a fresh AUTH_SECRET is generated if missing.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Node: $(node -v 2>/dev/null || echo MISSING)  pnpm: $(pnpm -v 2>/dev/null || echo MISSING)"
command -v node >/dev/null || { echo "Install Node >= 22"; exit 1; }
corepack enable 2>/dev/null || true

echo "→ Installing dependencies (incl. dev tooling)…"
pnpm install --frozen-lockfile --prod=false

if [ ! -f .env ]; then
  echo "→ Creating .env (fresh AUTH_SECRET; local Postgres on :5433)…"
  SECRET=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")
  cat > .env <<ENV
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgres://captcf@localhost:5433/captcf
PGPORT=5433
PGDATABASE=captcf
PGUSER=captcf
AUTH_SECRET=$SECRET
AI_FEEDBACK_PROVIDER=none
PAYMENTS_PROVIDER=simulator
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=.uploads
ENABLE_DEMO_ACCOUNTS=true
NEXT_PUBLIC_BETA=true
NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true
ENV
fi

echo "→ Starting local Postgres (native, project-local .pgdata)…"
pnpm db:up || echo "  (skip if you use an external DATABASE_URL)"

echo "→ Migrate + seed via the versioned bootstrap…"
pnpm bootstrap

echo "→ Production build…"
pnpm build

echo "✓ Restore complete. Run 'pnpm dev' for the app, or scripts/verify-restore.sh to verify."
