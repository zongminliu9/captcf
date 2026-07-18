# CapTCF

**An original TCF Canada intelligent exam-prep platform.** Practice listening, reading,
writing and speaking; take full-length mock exams that mirror the current official
structure; review your mistakes with spaced repetition; and get transparent,
explainable recommendations for what to study next.

> CapTCF is an independent study tool. It provides **original, TCF-Canada-style practice
> material** and **unofficial** score estimates. It is not affiliated with France Éducation
> international or IRCC, and its estimates do not replace an official test result.

---

## Quick start

Requirements: **Node ≥ 20** and a local **PostgreSQL** (a native cluster is managed for
you — no Docker needed). On this PA OS sandbox both are already present.

```bash
pnpm install
pnpm run setup   # env check → start Postgres → migrate → seed content → verify audio → demo users
pnpm dev         # http://localhost:3000
```

Use `pnpm run setup` (not `pnpm setup`, which is a reserved pnpm built-in command). It is
idempotent — safe to run repeatedly — and prints the local URL and demo credentials when it
finishes.

### Demo accounts (development only)

| Role | Email | Password |
| --- | --- | --- |
| Learner (Premium) | `demo@captcf.app` | `demo-captcf-2026` |
| Learner (Free) | `free@captcf.app` | `demo-captcf-2026` |
| Admin | `admin@captcf.app` | `admin-captcf-2026` |

Demo accounts are disabled automatically when `NODE_ENV=production`.

## Common commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run the app in development |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm db:up` / `pnpm db:down` | Start / stop the native local Postgres cluster |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:reset` | Migrations, seed, full reset |
| `pnpm content:validate` / `content:audit` / `content:dedupe` | Content quality gates |
| `pnpm content:audio` | (Re)generate French-Canadian listening audio (macOS `say` + `afconvert`) |
| `pnpm typecheck` / `pnpm lint` | TypeScript strict / Biome |
| `pnpm test` / `pnpm test:integration` / `pnpm test:e2e` | Vitest unit / integration / Playwright E2E |
| `pnpm check` | typecheck + lint + unit tests + content audit + build |

## No API keys required

The core product runs with **zero external/commercial keys**. Optional providers upgrade
specific features but are never required, and their UI never appears as a dead button:

| Capability | Without a key (default) | With a key |
| --- | --- | --- |
| Writing feedback | Deterministic local rubric | AI rubric (`AI_FEEDBACK_PROVIDER`) |
| Speaking feedback | Local self-eval (duration, volume, pace, rubric) | AI transcription + scoring |
| Payments / Premium | Dev entitlement simulator | Stripe Checkout |
| Google sign-in | Button hidden | Google OAuth |

See `.env.example` for the full list. Full documentation lives in [`docs/`](docs/).

## Tech

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Drizzle ORM ·
PostgreSQL 17 · Zod · Vitest · Playwright · Biome.
