# CapTCF — environment variables (names + how to obtain, never values)

**No secret value is ever committed.** `.env*` is git-ignored. This file lists what each deployment
needs and where to get it. See `.env.example` for the local template.

## Production (Render web service `captcf`) — set in the Render dashboard / render.yaml

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Render → `captcf-db` → Connect (internal URL) | wired automatically by `render.yaml` `fromDatabase` |
| `AUTH_SECRET` | `render.yaml` `generateValue: true` | 32+ chars; app refuses to boot in prod if weak |
| `NODE_ENV` | `render.yaml` = `production` | |
| `NODE_VERSION` | `render.yaml` = `22.11.0` | pin; don't let Render pick a bleeding-edge Node |
| `PAYMENTS_PROVIDER` | `render.yaml` = `beta` | real checkout disabled; no self-upgrade |
| `ENABLE_DEMO_ACCOUNTS` | `render.yaml` = `false` | never seed demo/admin accounts in prod |
| `NEXT_PUBLIC_BETA` | `render.yaml` = `true` | shows the Private-Beta strip |
| `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` | `render.yaml` = `false` | hide demo creds on login |
| `STORAGE_DRIVER` / `STORAGE_LOCAL_DIR` | `render.yaml` | `local` + `/tmp/uploads` (ephemeral on free) |
| `APP_URL` | unset → falls back to `RENDER_EXTERNAL_URL` | |

Optional (not set today): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AI_FEEDBACK_PROVIDER` +
its key, `GOOGLE_CLIENT_ID/SECRET`, S3/R2 storage creds. All have safe fallbacks when absent.

## Local development

`pnpm run setup` generates `.env` (random `AUTH_SECRET`, local Postgres URL). Only extras a dev may
want: `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true`, `NEXT_PUBLIC_BETA=true`, `RATE_LIMIT_DISABLED=1` (E2E).

## Credentials you (the human) hold — never in the repo

| What | Where it lives |
| --- | --- |
| GitHub auth | `gh` keychain (account `zongminliu9`) — re-auth with `gh auth login` on a new machine |
| Render auth | Render CLI token in `~/.render` — re-auth with `render login` (device flow) |
| Render account | `zl3030@Columbia.edu`, workspace `tea-d9e5ih3rjlhs73boqbv0` |

## Resource IDs (not secret)

- Web service: `srv-d9e66m3rjlhs73bq0c1g` · Postgres: `dpg-d9e66bjrjlhs73bpvp90-a`
- Live URL: <https://captcf.onrender.com> · GitHub: `zongminliu9/captcf`
