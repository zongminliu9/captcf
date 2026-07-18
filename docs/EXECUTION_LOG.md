# CapTCF — Execution Log

A running, honest log of decisions and progress. Newest entries at the bottom of each phase.

## Environment (PA OS sandbox, macOS arm64)

Discovered at start:

| Tool | Status | Notes |
| --- | --- | --- |
| node | ✅ v24.14.0 | user-space install; exposed via `~/.local/paos-env.sh` |
| pnpm | ✅ 9.15.4 | via corepack |
| PostgreSQL | ✅ 17.4 native | `~/.local/postgresql/bin`; **no Docker** → run natively via `scripts/pg.ts` |
| `say` + `afconvert` | ✅ | macOS TTS with French-**Canadian** voices → real AAC audio, **no ffmpeg needed** |
| git | ✅ 2.50.1 | GitHub token in macOS keychain (`x-access-token`) → push works |
| Docker | ❌ | substituted with native Postgres cluster under `.pgdata/` |
| ffmpeg | ❌ | substituted with `afconvert` (AIFF → AAC/m4a) |
| gh CLI | ❌ | use `git` + keychain credential helper directly |

**Substitutions are first-class**, not degraded: native Postgres + `afconvert` produce a fully working product. `docker-compose.yml` is still provided for parity on machines that have Docker.

## Phase 0 — Inspect & baseline

- Working dir `/Users/michael/France website` was **empty**, not a git repo. GitHub remote `zongminliu9/captcf` was **empty** (no history to preserve).
- Fixed shell env: enhanced `~/.local/paos-env.sh` to expose node + Postgres on PATH for non-interactive shells.
- Verified current-stable versions from the npm registry rather than trusting memory:
  Next **16.2.10**, React **19.2.7**, Drizzle **0.45.2**, Zod **4.4.3**, Tailwind **4.3.3**, Vitest **4.1.10**, Playwright **1.61.1**.

## Phase 1 — Research (official exam facts, verified online)

Sources bot-blocked the official FEI/IRCC pages to WebFetch; corroborated exact numbers across TCF-specialist sources. See `docs/research/OFFICIAL_EXAM_SPEC.md` for citations. Key verified facts:

- 4 mandatory sections. Compréhension orale: **39 QCM / 35 min** (audio once). Compréhension écrite: **39 QCM / 60 min**. Expression écrite: **3 tasks / 60 min**. Expression orale: **3 tasks / ~12 min** (+prep on task 2).
- CO/CE scored **0–699** (CEFR bands); EE/EO scored **0–20**.
- Official IRCC score→NCLC table captured verbatim into versioned config.

## Phase 1 — Scaffold + infrastructure

- Chose stack: Next 16 App Router + React 19 + TS strict + Tailwind v4 (CSS-first) + Drizzle + native Postgres + Zod. Biome for lint/format (avoids ESLint-plugin version churn on Next 16). Custom cookie-session auth + guest sessions (no OAuth key required). Vitest + Playwright.
- `scripts/pg.ts`: native, project-local Postgres cluster on `127.0.0.1:5433` (`.pgdata/`, trust auth, spaces-free socket dir). `pnpm db:up` initialises + starts + creates `captcf` and `captcf_test`. Verified working.
- Domain core first (pure, unit-tested): exam config + official IRCC NCLC table, score estimation, timer, mastery, SM-2, recommendation engine, entitlements, mock assembler. 34-table Drizzle schema + migration applied.

## Phase 2 — Content + audio

- Two **author → blind-reviewer → editor-fix** workflows (parallel subagents) generated original
  Canadian French content. Ingested → normalized → Zod-validated → deduped → audited (**0/0**).
  Audited counts: listening 108, reading 126, writing 45, speaking 45, vocab 453; 4 complete mocks.
- Real audio: 108 multi-voice fr-CA clips via `say` → Python `wave` concat → `afconvert` (AAC/m4a),
  idempotent manifest. De-risked the pipeline with a spike before the full run.

## Phases 3–7 — Product

- App shell (sidebar + mobile bottom nav + focus mode); guest-first via route handlers (cookies
  can't be set during page render — fixed early). Practice engine + session state machine +
  server-authoritative grading + instant feedback. Listening/reading players, results + review.
  Auth + idempotent guest→account merge. Dashboard + transparent recommendations. Writing editor +
  deterministic local analysis. Speaking recorder + volume metering + permission fallback. Mock
  engine (refresh-safe per-section timer + auto-submit). Onboarding, diagnostic, settings
  (export/delete), pricing + entitlement simulator, admin (import/edit/reports), i18n.
- Parallel subagents built the marketing + product-list pages against precise component specs;
  main agent reviewed diffs, fixed a flagged type error, and integrated. Verified the core loop and
  mock in a real browser (incl. refresh-safe timer 34:43 → 34:29).

## Phases 8–9 — Polish, tests, verification

- Fixed a dev-only host quirk (Next dev redirect `Location` uses `localhost`; E2E base URL matched)
  and headless mic (`getUserMedia` hangs → synthetic MediaStream in the mic test).
- **Green:** typecheck, Biome lint, 60 unit, 4 integration, 23 E2E (chromium+mobile+webkit),
  content audit 0/0, production build, `pnpm check`. Lighthouse (public pages): 100/96/96/100,
  LCP ~0.6 s, CLS 0. 16 key-screen screenshots. `pnpm run setup` verified from a reseed.
- All docs written; committed + pushed to `origin` in stages; working tree clean.
