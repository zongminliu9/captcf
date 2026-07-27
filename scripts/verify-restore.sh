#!/usr/bin/env bash
# Verify a restored checkout is healthy end-to-end. Exits non-zero on the first failure.
set -euo pipefail
cd "$(dirname "$0")/.."
fail() { echo "✗ $1 FAILED"; exit 1; }

echo "→ typecheck";        pnpm typecheck        || fail typecheck
echo "→ lint";            pnpm lint             || fail lint
echo "→ unit tests";      pnpm test             || fail "unit tests"
echo "→ integration";     pnpm test:integration || fail integration
echo "→ content audit";   pnpm content:audit    || fail "content audit"
echo "→ production build"; pnpm build            || fail build

echo "→ artifact presence"
for p in \
  docs/ROUND3_FINAL_REPORT.md docs/RECORDING_REQUIREMENTS.md docs/NEW_MACHINE_RESTORE.md \
  content/recording-manifest.csv scripts/bootstrap.ts \
  content/round3-staging/accepted content/round3-staging/reports ; do
  [ -e "$p" ] || fail "missing artifact: $p"
done
echo "  recording packets: $(find content/recording-packets -name '*.md' | wc -l | tr -d ' ')"
echo "  recovered accepted reading: $(python3 -c "import json,glob;print(sum(len(json.load(open(f))) for f in glob.glob('content/round3-staging/accepted/*.json')))" 2>/dev/null || echo '?')"

echo "✓ verify-restore passed."
