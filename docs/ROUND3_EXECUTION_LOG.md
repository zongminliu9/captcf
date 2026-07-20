# Round 3 — Execution log

Branch: `round3/pro-review-remediation` (from `origin/main` @ `743a6c1`). One single-responsibility
commit per stage; tests before each commit.

## Phase 0 — Real problem baseline ✅
- Live audit of https://captcf.onrender.com as a fresh visitor (Render Free).
- Measured cold start **94.4 s** (≈48 s Render wake + ≈46 s app bootstrap; full seed re-runs every
  boot ~16 s), warm TTFB 0.16–1.5 s, audio range 206 but `cache-control: max-age=0`, DB well-indexed,
  no warm 5xx/console errors. Findings → `ROUND3_GAP_AUDIT.md`.
- Commit: _pending (Phase 0 docs)._

## Phase 1 — Loading & stability
### 1.1 Version-gated bootstrap (kill seed-on-boot) ✅
- New `scripts/bootstrap.ts`: PG **advisory lock** (no double-seed across instances) → pending
  migrations only → **`seed_state` checksum marker**: seeds only when `src/content/*.json` or the
  spec changes; otherwise skips the full 600+ item seed. Fails loudly (exit 1) so the app never
  starts half-initialised. Structured timing logs, no secrets.
- `startCommand` collapsed from 3× `npx pnpm` (migrate; seed; start) to a single
  `npx pnpm run start:prod` = `bootstrap && next start`.
- Measured locally: first boot seeds (650 ms) + sets marker; **warm boot skips in 26 ms**.
- Tests: `tests/integration/bootstrap.test.ts` — (a) populated DB → second boot does not re-seed;
  (b) two concurrent boots seed at most once. `pnpm test:integration` → 6 passed.
- Commit: _pending._

## Phase 2 — Human-audio production system
- _pending_

## Phase 3 — Content scale (40/40/10/120/120)
- _pending_

## Phase 4 — Mistake notebook as a core loop
- _pending_

## Phase 5 — Pricing intent capture
- _pending_

## Phase 6 — Live black-box acceptance
- _pending_
