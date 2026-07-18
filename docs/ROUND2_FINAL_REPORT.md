# CapTCF — Round 2 final report

Round 2 closed the gaps the Round-1 report itself flagged. All Round-1 functionality is preserved;
nothing was removed. Every claim below is backed by a real command result. No "market-quality"
stands in for evidence.

## Round-2 Definition of Done — status

| # | Requirement | Result | Evidence |
| ---: | --- | --- | --- |
| 1 | Listening published ≥ 220 | **266** | `content:audit` / DB |
| 2 | Reading published ≥ 280 | **340** | `content:audit` / DB |
| 3 | Writing published ≥ 50 | **69** | `content:audit` |
| 4 | Speaking published ≥ 50 | **69** | `content:audit` |
| 5 | Vocabulary ≥ 600 | **615** | `content:audit` |
| 6 | 4 mocks CO/CE **non-overlapping** | CO **156/156**, CE **156/156**, **0** reuse | DB query + `assemble.test.ts` + audit gate |
| 7 | Each mock structurally complete | 39 CO + 39 CE + 3 EE + 3 EO ×4 | DB query |
| 8 | EE/EO integrated into unified full mock | one `mockAttemptId`, unified result | `mock.ts`, `r2-mock-results.png` |
| 9 | Full 4-section mock E2E passes | ✅ | `full-mock.spec.ts` §9 |
| 10 | All mock audio passes QA status | 266 published, **0 rejected / 0 missing** | `content:audio:qa` |
| 11 | Content audit 0 critical errors | **0 errors / 0 warnings** | `content:audit` |
| 12 | Near-duplicate audit clean | **0** near-dupes (Jaccard ≥ 0.82) | audit `DUPLICATE_REPORT.md` |
| 13 | Typecheck | pass | `pnpm typecheck` |
| 14 | Lint | pass | `pnpm lint` |
| 15 | Unit tests | **60 passed** | `pnpm test` |
| 16 | Integration tests | **4 passed** | `pnpm test:integration` |
| 17 | All E2E pass | **30 passed** (chromium+mobile+webkit) | `pnpm test:e2e` |
| 18 | Production build | pass | `pnpm build` |
| 19 | Clean setup from scratch | pass | `pnpm run setup` (reseed verified) |
| 20 | Pushed to GitHub | ✅ `origin/main` | `git push` |
| 21 | HEAD == origin/main | ✅ | `git rev-parse` |
| 22 | `git status` clean | ✅ | `git status` |
| 23 | Evidence report | this file | — |
| 24 | Honest limitations | below | — |

`pnpm check` (typecheck + lint + unit + content audit + audio QA + build) is **green**.

## What changed in Round 2

- **Content scaled** via a stronger 5-role pipeline (author → blind solver → French reviewer →
  assessment reviewer → dedup; publish only on full agreement). Merge-ingest appends to the
  existing bank with continued IDs, dedups (exact + Jaccard), and QA-gates status. Audio generated
  for the 158 new listening clips.
- **Non-overlapping mocks**: the assembler now consumes items without replacement, so the 4 forms
  share **zero** CO/CE items (156 distinct each). A content-audit gate fails on any cross-mock reuse.
- **Unified 4-section full mock**: CO + CE + EE + EO run in one session under one attempt, each
  section with a server-authoritative clock (refresh/close/relogin-safe, auto-submit, no reopening a
  finished section). CO/CE auto-scored; EE (inline editor) + EO (inline recorders) saved with local
  rubric. The result page shows all four, clearly labelling **auto-scored (0–699)** vs **local
  self-evaluation (0–20, unofficial)**.
- **Listening audio QA**: loudness normalization + silence/truncation detection + voice-distinctness
  → quality tiers (`prototype_tts` / `reviewed_tts` / `premium_ready` / `rejected`), a
  `content:audio:qa` gate (fails on rejected/missing), and an admin QA queue (`/admin/audio`) to
  listen and promote/regenerate. Audio is honestly labelled as synthesised (TTS), never as human.
- **Commercial closure**: password reset (token table + email-provider abstraction + rate-limited
  flow), **DB-backed** persistent rate limiter, Stripe webhook (idempotent) + subscription cancel,
  health/readiness endpoints, structured logging, startup env validation, error boundary +
  global-error + 404, recording cleanup on account deletion, backup/restore + retention docs.

## Actual content (audited)

| Kind | Published | Audio |
| --- | ---: | --- |
| Listening | **266** | 266 clips (125 reviewed_tts, 141 prototype_tts, 0 rejected) |
| Reading | **340** | — |
| Writing tasks | **69** | — |
| Speaking tasks | **69** | — |
| Vocabulary | **615** | — |
| Mock forms | **4** (non-overlapping, complete) | uses QA-passed listening |
| Standalone (non-mock) items | 110 CO + 184 CE = **294** (≥150) | — |

## Run & verify

```bash
pnpm install && pnpm run setup && pnpm dev        # http://localhost:3000
pnpm check           # typecheck + lint + unit + content audit + audio QA + build
pnpm test:integration && pnpm test:e2e
```

Demo accounts: `demo@captcf.app` (Premium), `free@captcf.app` (Free), `admin@captcf.app` (Admin) —
all password `demo-captcf-2026` except admin `admin-captcf-2026`. Disabled when `NODE_ENV=production`.

## Real limitations (honest)

1. **Audio is synthesised (TTS)**, honestly labelled. ~53% reaches `reviewed_tts` automatically;
   the rest is `prototype_tts` pending admin promotion. It is not human-recorded studio audio.
   `premium_ready` requires human approval in `/admin/audio`.
2. **AI writing/speaking feedback and speech-to-text remain adapter stubs** (local rubrics only)
   until provider keys are configured; scores are always labelled unofficial.
3. **Email/SMTP and Stripe are interface-complete but not wired to a live service** — the console
   email driver and the entitlement simulator make the flows work end-to-end without credentials;
   production requires setting the provider env + adding the SDK client.
4. **i18n**: chrome + reason codes are trilingual; many deep product strings are French-only with a
   safe French fallback (never a raw key).
5. **Recommendation/mastery are transparent rules** (by design), not ML.
6. Lighthouse was measured on public pages (authed pages need a session): 100/96/96/100.

## Top 3 next iterations

1. Promote more audio to `reviewed_tts`/`premium_ready` (or integrate a neural-TTS/human-recording
   pipeline) and expand multi-question reading passages.
2. Wire the AI/ASR adapters (+ LanguageTool) for deeper, still-unofficial writing/speaking feedback.
3. Wire a live email provider + full Stripe Checkout/webhook against test keys end-to-end.
