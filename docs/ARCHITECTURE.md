# Architecture

## Stack

Next.js 16 (App Router, RSC + Server Actions + Route Handlers) · React 19 · TypeScript (strict,
`noUncheckedIndexedAccess`) · Tailwind CSS v4 · Drizzle ORM · PostgreSQL 17 · Zod 4 · Biome ·
Vitest · Playwright. Custom cookie-session auth (bcryptjs) — no OAuth key required.

## Layers

```
src/
  app/                Next routes (marketing / app / auth groups), Server Actions, API handlers
  components/         UI primitives + feature components (client where interactive)
  db/                 Drizzle schema (34 tables), client, SQL migrations
  lib/
    exam/             versioned exam spec, NCLC table, score estimation, timer, mock assembler
    mastery/          transparent mastery model (EMA + difficulty weighting)
    review/           SM-2 spaced repetition
    recommend/        rules-based, explainable recommendation engine (reason codes)
    entitlements/     plans, feature matrix, daily limits, plan resolver
    practice/         content queries/DTOs, session state machine + grading, mock engine
    writing/ speaking/ deterministic local analysis (no AI needed)
    auth/             password, tokens, cookie sessions, actor (user|guest), idempotent merge
    storage/          pluggable file storage (local disk; S3/R2/Supabase adapters ready)
    i18n/             fr/en/zh dictionaries + fallback
scripts/              pg runner, migrate/seed/reset/setup, content ingest/audit/dedupe/audio
tests/                unit (src co-located) · integration (DB) · e2e (Playwright)
```

The pure domain (`exam`, `mastery`, `review`, `recommend`, `entitlements`, `writing`,
`speaking/analyze`, `exam/assemble`) has no DB/Next dependency and is unit-tested.

## Ownership & auth

Every request has an **actor**: a signed-in `user` (auth-session cookie, sha256-hashed token in
`auth_sessions`) or an anonymous `guest` (`guest_sessions`). Owned rows carry `user_id` **or**
`guest_id` (CHECK enforces exactly one). `ownerEq()` scopes every query; `ownerValues()` scopes
inserts. **Guest→account merge** flips `guest_id → user_id` idempotently (NOT-EXISTS guards +
per-owner unique indexes prevent duplicated attempts/mistakes). Cookies are `HttpOnly`,
`SameSite=Lax`, `Secure` in production.

## Server-authoritative rules

- **Grading** happens on the server from the DB answer key — the client never sends correctness.
- **Timers** derive remaining time from `startedAt` + duration on the server clock, so refresh,
  reopen and client-clock tampering can't extend or reset time. Mock sections store per-section
  `startedAt`; expiry auto-advances / auto-submits even without the client.
- **Grading is idempotent** — re-submitting a session returns the existing attempt.

## Data model (34 tables, summary)

Identity: `users`, `auth_sessions`, `guest_sessions`, `accounts`. Learner: `profiles`,
`exam_goals`, `study_plans`. Content: `questions`, `options`, `audio_assets`,
`question_versions`, `writing_tasks`, `speaking_tasks`, `vocabulary_items`, `mock_tests`,
`mock_sections`, `mock_items`. Activity: `practice_sessions`, `responses`, `attempts`. Learning
state: `mastery_records`, `review_queue`, `mistakes`, `bookmarks`, `vocabulary_progress`.
Productive: `writing_submissions`, `writing_feedback`, `speaking_submissions`,
`speaking_feedback`. Commerce/ops: `subscriptions`, `entitlements`, `usage_counters`,
`issue_reports`, `analytics_events`, `content_audits`. Indexes, foreign keys, per-owner unique
constraints, and CHECKs are defined in `src/db/schema.ts`.

## Provider adapters (all optional)

- **AI feedback** (`AI_FEEDBACK_PROVIDER`) — off by default → deterministic local rubric.
- **Payments** (`PAYMENTS_PROVIDER`) — `simulator` grants Premium locally; `stripe` when keyed.
- **Storage** (`STORAGE_DRIVER`) — `local` disk default; S3/R2/Supabase behind one interface.
- **OAuth** — Google button only shown when keys exist (never a dead button).

## Environment substitutions (this sandbox)

No Docker → native project-local Postgres (`scripts/pg.ts`, port 5433, `.pgdata/`). No ffmpeg →
`afconvert` for AAC/m4a. macOS `say` provides French-Canadian voices. `docker-compose.yml` is
provided for parity on machines that have Docker.
