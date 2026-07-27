# CapTCF — restore on a new machine (from GitHub only)

Goal: prove the whole project can continue from `github.com/zongminliu9/captcf` alone, with nothing
depending on the old computer.

## Prerequisites on the new machine

- Node ≥ 22, `pnpm` (via corepack), and a PostgreSQL 17 you can reach (local or managed).
- `gh` and the Render CLI if you want to deploy (auth is interactive — see below).

## One-shot restore

```bash
git clone https://github.com/zongminliu9/captcf.git
cd captcf
bash scripts/restore-new-machine.sh      # installs deps, creates .env, DB, migrates, seeds, builds
bash scripts/verify-restore.sh           # typecheck + unit + integration + build + content audit
```

`restore-new-machine.sh` is idempotent and creates a local `.env` with a freshly generated
`AUTH_SECRET` (it never pulls a secret from git — there are none).

## What you must re-authenticate (held by you, not the repo)

- `gh auth login` — GitHub (account `zongminliu9`).
- `render login` — Render (device flow; opens a browser). Account `zl3030@Columbia.edu`.

After `render login`, production deploys/logs/DB access work exactly as before — see
`docs/DEPLOYMENT.md` and `docs/ENVIRONMENT_VARIABLES.md`.

## Production is independent of any laptop

The live site runs on Render and auto-deploys from `main`; the database is Render-managed. Losing
the laptop does not affect production. To deploy a new commit from the new machine:

```bash
render deploys create srv-d9e66m3rjlhs73bq0c1g --commit $(git rev-parse origin/main) --wait --confirm
```

## Where the Round-3 work-in-progress lives (all on GitHub)

- Branch `round3/pro-review-remediation` — all Round-3 code + docs.
- `content/round3-staging/accepted|rejected/` — generated reading items (recovered).
- `content/round3-staging/reports/` — recovery report + SHA-256 checksums.
- `docs/workflows/round3/` — gzipped workflow journal (provenance) + workflow script.
- `scripts/workflows/round3/` — the recovery + generation scripts.
- Recovery checkpoints are git tags: `git tag -l 'checkpoint/*'`.

## Not restorable from GitHub by design (and why that's fine)

- **Claude Code session transcripts / live workflow state** — captured as the gzipped journal in
  `docs/workflows/round3/`; the final freeze also archives them (see the migration final report).
- **Human recordings** — none exist yet; when they do they go through `/admin/recordings`.
- **Production user data** — lives only in `captcf-db` (backed up separately, never in git).
