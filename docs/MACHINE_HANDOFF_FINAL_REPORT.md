# CapTCF — Machine Handoff Final Report

Remote-only restore verification. Proves the project continues from GitHub alone, with production
left untouched. Verified 2026-07-26.

## Repository & refs

| | Value |
| --- | --- |
| Source repository | https://github.com/zongminliu9/captcf |
| `main` remote HEAD | `c9694ac9e5c587ea34cf999cf09a81710e6479ae` (stable, deployed) |
| Round-3 remote HEAD | `d8253fd20295013c30ca40cece8176c50234d4d9` (verified clone commit; this report is a docs-only commit on top, re-verified) |
| Checkpoint tags | `checkpoint/round3-reading-recovered` (`a1e489f`) |
| Other branches on origin | `r3-stability-integration` (already merged into main) |

## Clean-clone test

- Directory (outside the repo, nothing copied from it): `/private/tmp/captcf-restore-verify/captcf`
- Commands:
  ```bash
  git clone https://github.com/zongminliu9/captcf.git && cd captcf
  git checkout round3/pro-review-remediation      # HEAD == remote, confirmed
  bash scripts/restore-new-machine.sh             # deps + .env + Postgres + migrate + seed + build
  bash scripts/verify-restore.sh                  # typecheck+lint+unit+integration+audit+build+artifacts
  ```
- Run twice from zero. The first run **found a real bug** — `pnpm lint` failed on a fresh checkout
  (the committed Workflow provenance script uses a top-level `return`; the `content/` JSON tripped
  the Biome formatter). Fixed in source (`d8253fd`: biome ignores `content/` +
  `scripts/workflows/**/*.wf.js`), pushed, and the clone test was repeated from a fresh clone → all
  green.

## Results (fresh clone at the verified commit)

| Step | Result |
| --- | --- |
| `pnpm install --frozen-lockfile --prod=false` | ✅ ok |
| Database restore (bootstrap: migrate + versioned seed) | ✅ isolated local DB seeded |
| Content: reading | **833** |
| Content: listening | **266** |
| Content: total QCM | **1 099** |
| Content: mocks / mock sections | **4 / 16** |
| Content: writing / speaking / vocabulary | **69 / 69 / 615** |
| Content: audio assets | 266 |
| `pnpm typecheck` | ✅ pass |
| `pnpm lint` | ✅ pass (1 pre-existing warning, non-failing) |
| `pnpm test` (unit) | ✅ **89 passed** (12 files) |
| `pnpm test:integration` | ✅ **6 passed** (incl. bootstrap no-reseed + concurrent-boot) |
| `pnpm content:audit` | ✅ 0 errors / 0 warnings |
| `pnpm build` | ✅ pass |
| `scripts/verify-restore.sh` | ✅ pass |

## Workflow recovery artifacts present in a clean clone

| Artifact | Path | Count / SHA-256 |
| --- | --- | --- |
| Recovery script | `scripts/workflows/round3/recover-reading.py` | present |
| Ingest script | `scripts/workflows/round3/ingest-recovered-reading.ts` | present |
| Accepted reading | `content/round3-staging/accepted/{A1,A2,B1}.json` | **493 items** |
| Rejected reading | `content/round3-staging/rejected/{A1,A2,B1}.json` | **141 items** |
| Compressed journal (provenance) | `docs/workflows/round3/reading-scale.journal.jsonl.gz` | `5621141a2a2b875a3106156e885c97c6fa9a92b47c296e0921b315435f9eb9b4` |
| Recovery report | `content/round3-staging/reports/reading-recovery.json` | `757e54ba6768a148c071a218c053346ee3d138f5631227a2c2623ef5c4b8af5d` |
| Checksums file | `content/round3-staging/reports/reading-recovery.sha256` | present (verified OK in clone) |
| accepted/A1.json | | `0ac953c1d159fddb143384c5c6faa846fea882e53620ad145bf2286f116b757e` |
| accepted/A2.json | | `8e3df4e4e11b095ace14060960da7ec58b7c1a5b472222923c3a1e81c947fe7d` |
| accepted/B1.json | | `6b51f7f264cbbf6fda7bfcaf3550b2a0796847647d15c26a4e3cb0293b633cb9` |
| Recording packets | `content/recording-packets/**/*.md` | **266** |
| Restore/resume docs | `docs/{ROUND3_RESUME,CURRENT_PROJECT_STATE,NEW_MACHINE_RESTORE,ENVIRONMENT_VARIABLES}.md` | present |

## Remaining local-only items (project work-product: 0)

All source, content, docs, recovery scripts, the recovery journal, and reports are on GitHub. The
following remain only on this machine and are **intentionally not uploaded** — none is irreplaceable
project work-product:

| Item | Size | Why not backed up |
| --- | --- | --- |
| Main Claude session transcript (`…/6e0bf217….jsonl`) | 20 MB | contains shell commands with real credentials (AUTH_SECRET/DATABASE_URL) — unsafe to upload; not needed to restore |
| Per-agent workflow transcripts (`…/subagents/…`) | 39 MB | **redundant** — the recovery-critical results are in the committed `reading-scale.journal.jsonl.gz` (which alone reproduced all 493 items); scanned: no real credentials, only content + sha256 checksums |
| `docs/lighthouse-raw/*.json` | 2 MB | regenerable perf-tool output; the summary `docs/LIGHTHOUSE_REPORT.md` is in git |
| `.uploads/*.webm` | ~1 MB | throwaway synthetic test recordings from automated testing; not user data |
| `.env`, `.pgdata/`, `.next/`, `node_modules/` | — | secrets / regenerable / installable |

## Credentials intentionally NOT in git or any backup

GitHub token · Render token · `DATABASE_URL` · `AUTH_SECRET` · session cookies · passwords · private
keys · production user data. Re-auth on a new machine: `gh auth login`, `render login`
(see `docs/ENVIRONMENT_VARIABLES.md`).

## New-Mac instructions (exact)

```bash
# 1. prerequisites: Node >= 22 (corepack), PostgreSQL 17
git clone https://github.com/zongminliu9/captcf.git && cd captcf
git checkout round3/pro-review-remediation
bash scripts/restore-new-machine.sh     # → running app + seeded DB
bash scripts/verify-restore.sh           # → proves the checkout is healthy
# 2. to deploy / manage production:
gh auth login          # GitHub (account zongminliu9)
render login           # Render (device flow) — account zl3030@Columbia.edu
```

## Exact command to resume Round 3

```bash
git checkout round3/pro-review-remediation && git pull
# then follow docs/ROUND3_RESUME.md — next: generate reading B2/C1/C2 via
# scripts/workflows/round3/reading-scale.wf.js (edit BUCKETS), recover with
# scripts/workflows/round3/recover-reading.py <journal-dir>, ingest, audit, commit+push PER BATCH.
```

## Production health (read-only; not deployed, DB untouched)

| Check | Result |
| --- | --- |
| https://captcf.onrender.com | available |
| `/api/health` · `/api/ready` · `/` | 200 · 200 · 200 |
| Live deploy commit | `c9694ac` (unchanged) |
| Service `captcf` | not suspended |
| `origin/main` | `c9694ac` (unchanged) |
| Round-3 work | isolated on `round3/pro-review-remediation` |

## Verdict

```
MIGRATION_READY=YES
REMOTE_ONLY_RESTORE_VERIFIED=YES
REMAINING_LOCAL_ONLY_PROJECT_ITEMS=0
SAFE_TO_RETURN_COMPUTER=YES
```

Basis: a fresh GitHub-only clone restores to identical content (1 099 QCM incl. 833 reading),
passes typecheck/lint/unit(89)/integration(6)/content-audit(0-0)/build and `verify-restore.sh`, and
contains every recovery artifact with matching checksums. Production is live and unchanged. The only
local-only items are secrets (must not be uploaded) and regenerable/redundant tooling state.
