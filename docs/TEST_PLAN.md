# Test plan

## Commands

| Command | Scope |
| --- | --- |
| `pnpm typecheck` | TypeScript strict, whole repo |
| `pnpm lint` | Biome |
| `pnpm test` | Vitest **unit** (pure domain) |
| `pnpm test:integration` | Vitest **integration** (DB-backed services against `captcf_test`) |
| `pnpm test:e2e` | Playwright **E2E** (chromium + mobile + webkit) |
| `pnpm content:audit` | Content quality gates (schema, single-answer, dedupe, audio, distribution) |
| `pnpm build` | Production build |
| `pnpm check` | typecheck + lint + unit + content audit + build |

## Unit (co-located `src/**/*.test.ts`)

Scoring/estimation, NCLC mapping, mastery updates, SM-2 review, recommendation rules + reason
codes, entitlements + daily limits, server-authoritative timer (refresh/pause/tamper), guest
merge helpers, mock assembler, writing local analysis.

## Integration (`tests/integration`, real Postgres)

Session lifecycle (create → record → grade), server-authoritative correctness, mastery + mistakes
+ review-queue updates, **idempotent re-submit** (no double attempt), **idempotent guest→account
merge** (no duplicated attempts/mistakes/bookmarks), entitlement plan resolution.

## E2E (`tests/e2e`, Playwright)

Chromium (desktop), mobile (Pixel 7), WebKit smoke. Fake/synthetic media for the mic flow;
an isolated `captcf_test` DB migrated + seeded in global setup.

Coverage maps to the brief's required scenarios:

1. Two-click to a real question · 2. instant feedback + rationales · 3. per-skill analysis ·
4. **guest→account merge** · 5. reading practice + review · 6. custom practice · 7. bookmark →
review · 8–9. **mock start + refresh-safe timer** · 10–11. **auto-submit + per-section results** ·
14. writing local feedback · 15. speaking record + self-eval · 16. **mic-denied fallback** ·
17. mobile short practice + bottom nav · 18. admin **valid import** · 19. admin **rejects invalid** ·
20. **core works with no API keys** · 21. **free vs premium gating** · 22. **delete account** ·
plus premium-mock access, simulator checkout, non-admin lockout, mobile no-overflow, WebKit smoke.

Screenshots of key screens are captured to `docs/screenshots/`.

## Checks performed during E2E/manual review

Element overlap, text truncation, horizontal overflow (mobile), loading/empty/error/disabled/
focus states, console errors, hydration warnings, 404 requests.

Results: see `docs/TEST_REPORT.md`.
