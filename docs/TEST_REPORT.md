# Test report

Run date: 2026-07-18. All commands run locally on the PA OS sandbox (macOS arm64, Node 24,
native Postgres 17, Playwright Chromium + WebKit).

## Summary

| Suite | Command | Result | Exit |
| --- | --- | --- | ---: |
| TypeScript (strict) | `pnpm typecheck` | pass | 0 |
| Lint / format (Biome) | `pnpm lint` | pass (3 unused-var warnings) | 0 |
| Unit | `pnpm test` | **60 passed** (9 files) | 0 |
| Integration (DB) | `pnpm test:integration` | **4 passed** | 0 |
| E2E (chromium+mobile+webkit) | `pnpm test:e2e` | **23 passed** | 0 |
| Content audit | `pnpm content:audit` | **0 errors, 0 warnings** | 0 |
| Production build | `pnpm build` | Compiled successfully | 0 |
| Combined gate | `pnpm check` | pass | 0 |
| Lighthouse (3 public pages) | see LIGHTHOUSE_REPORT | Perf 100 / A11y 96 / BP 96 / SEO 100 | — |

## Unit (60 tests, `src/**/*.test.ts`)

NCLC mapping (official boundaries), score estimation (monotonic, difficulty-aware, confidence,
disclaimer), timer (countdown / expiry / refresh-proof / pause / anti-tamper), SM-2 review,
mastery model, entitlements + daily limits, recommendation engine + reason codes, mock assembler
(4 complete forms, ≤2 reuse, ordered, deterministic), writing local analysis.

## Integration (4 tests, real Postgres `captcf_test`)

- Session lifecycle: create → record (server-graded) → submit → mastery + mistakes + review-queue
  updates.
- Idempotent re-submit (no double attempt).
- **Idempotent guest→account merge**: attempts/mistakes/bookmarks moved once, guest emptied,
  re-running the merge is a no-op.
- Entitlement plan resolution (free default, premium with active subscription).

## E2E (23 tests) — browsers & viewports

Chromium (Desktop Chrome 1280×720), mobile (Pixel 7), WebKit (Desktop Safari). Isolated
`captcf_test` DB migrated + seeded in global setup. Media: synthetic MediaStream for the mic flow.

| # | Scenario | Project |
| --- | --- | --- |
| 1 | Two clicks from home to a real question | chromium |
| 2 | Instant feedback + distractor rationales | chromium |
| 3 | Guest completes session → per-skill analysis | chromium |
| 4 | **Guest data survives registration (merge)** | chromium |
| 5 | Reading practice + review | chromium |
| 6 | Custom practice builder | chromium |
| 7 | Bookmark → bookmarks page | chromium |
| 8–9 | **Mock start + refresh-safe timer** | chromium |
| 10–11 | **Auto-submit on timeout + per-section results** | chromium |
| 14 | Writing local feedback (no AI) | chromium |
| 15 | Speaking record → self-eval (no ASR) | chromium |
| 16 | **Mic-denied fallback path** | chromium |
| 18 | Admin imports valid content | chromium |
| 19 | Admin rejects invalid content (atomic) | chromium |
| — | Non-admin locked out of admin | chromium |
| 21 | Free vs premium mock gating | chromium |
| — | Premium can start any mock | chromium |
| — | Simulator checkout upgrades to premium | chromium |
| 22 | Delete account | chromium |
| 20 | **Core works with no external API keys** | chromium |
| 17 | Mobile short practice + bottom nav | mobile |
| — | Home no horizontal overflow (mobile) | mobile |
| 23 | WebKit/Safari home + start practice | webkit |

Screenshots of key screens: `docs/screenshots/` (home, diagnostic, dashboard, quick practice,
listening, reading, mock exam, results, writing, speaking, progress, pricing, mobile nav, admin).

## Checks performed

Console errors, hydration warnings, element overlap, text truncation, horizontal overflow
(mobile), loading/empty/error/disabled/focus states, 404s. No unexplained console errors or
hydration warnings observed in the runs. (One Turbopack NFT *warning* about `next.config.ts`
tracing `lib/storage` is benign and does not affect the build.)

## Content audit (`pnpm content:audit`)

listening 108 · reading 126 · writing 45 · speaking 45 · vocabulary 453 — **0 errors, 0 warnings**.
Checks: exactly one correct answer, unique/non-empty options, distractor-rationale coverage,
answer-position balance, "correct ≠ always longest", stem-doesn't-leak, audio present + on disk,
transcript present, near-duplicate (Jaccard) scan, distribution. Reports in `docs/content/`.
