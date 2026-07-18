# Operations & deployment

## Health & readiness

- `GET /api/health` — liveness (process up; no dependencies). Use for container liveness probes.
- `GET /api/ready` — readiness (runs `SELECT 1` against Postgres; 503 if the DB is unreachable).
  Use for load-balancer/orchestrator readiness gating.

## Startup configuration validation

`src/instrumentation.ts` runs `validateEnv()` on server boot. In **production** it throws (fails
the deploy) if `DATABASE_URL` is missing or `AUTH_SECRET` is missing/weak/placeholder; in dev it
only warns. This prevents shipping an insecure/misconfigured instance.

## Structured logging

`src/lib/logger.ts` emits one JSON object per line in production (ship to any aggregator) and a
compact human line in dev. Never logs passwords or tokens.

## Rate limiting

`src/lib/rate-limit.ts` is a **DB-backed fixed-window** limiter (table `rate_limits`), correct
across multiple processes/instances (not in-memory). Applied to `login` (10/min/IP), password
reset requests (5/hour/IP). Fails open if the store is unreachable (never locks users out). Swap
the backing store for Redis behind the same `rateLimit()` signature if desired.

## Database backup & restore (native Postgres)

The dev cluster lives in `.pgdata/` on `127.0.0.1:5433`.

```bash
# backup (custom format, compressed)
"$PAOS_POSTGRES_BIN/pg_dump" -h 127.0.0.1 -p 5433 -U captcf -Fc captcf > backup-$(date +%F).dump

# restore into a fresh database
"$PAOS_POSTGRES_BIN/createdb" -h 127.0.0.1 -p 5433 -U captcf captcf_restore
"$PAOS_POSTGRES_BIN/pg_restore" -h 127.0.0.1 -p 5433 -U captcf -d captcf_restore backup-YYYY-MM-DD.dump

# plain-SQL full-cluster backup
"$PAOS_POSTGRES_BIN/pg_dumpall" -h 127.0.0.1 -p 5433 -U captcf > cluster-$(date +%F).sql
```

In managed production (RDS/Cloud SQL/Neon/Supabase), enable the provider's automated daily
snapshots + PITR; the schema is standard Postgres created by Drizzle migrations
(`pnpm db:migrate`), so restore = provision + migrate + restore data.

## Data retention & privacy

- **Guest data** is tied to a device cookie (`captcf_guest`); merged into a user account on
  registration/login. Guests never see other guests' data (owner-scoped queries).
- **Export**: `GET /api/account/export` returns all of the actor's data as JSON.
- **Account deletion** (`/settings`): removes the user and all owned rows, **and purges stored
  speaking recordings** (derived audio) from object storage before deleting the rows.
- **Speaking recordings** are stored via the storage adapter (`local` disk by default; S3/R2/
  Supabase behind the same interface). They are served owner-checked only (`/api/speaking/audio/[id]`).
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production; tokens are stored hashed.

## Providers (all optional; local fallbacks by default)

| Concern | Env | Default (no key) |
| --- | --- | --- |
| AI writing/speaking feedback | `AI_FEEDBACK_PROVIDER` | deterministic local rubric |
| Payments | `PAYMENTS_PROVIDER`, `STRIPE_*` | dev entitlement simulator |
| Email (password reset) | `EMAIL_PROVIDER`, `SMTP_URL`/`RESEND_API_KEY` | console driver (prints link in dev) |
| File storage | `STORAGE_DRIVER` | local disk (`.uploads/`) |
| OAuth | `GOOGLE_*` | Google button hidden |

Stripe webhook (`POST /api/billing/webhook`) is idempotent (each event id processed once) and a
safe no-op until `STRIPE_WEBHOOK_SECRET` is set.
