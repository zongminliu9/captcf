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
- Commit: `04f6f58`.

### 1.2 Audio caching + player reliability + skeletons ✅
- `next.config.ts`: `/audio/:path*` now `Cache-Control: public, max-age=31536000, immutable`
  (was default `max-age=0` → re-download every play). Verified on a prod serve; range/206 intact.
- `audio-player.tsx`: visible **loading spinner**, a **12 s load timeout** (no more endless disabled
  play button), and a real **retry** that reloads + re-arms the timeout.
- `(app)/loading.tsx` + `.skeleton` shimmer: authed navigations now show a skeleton (nav stays),
  no blank screen / infinite spinner.
- Commit: _pending._

Note: DB is already well-indexed (owner indexes on every hot table) — no N+1 index gaps at schema
level. Deeper audio-file audits (missing/0-byte/silent/corrupt) are built in Phase 2.

## Phase 2 — Human-audio production system
### 2.1 Provenance schema + gating ✅
- `audio_assets` + `source_type` / `publish_state` lifecycle / license / speaker / recording / QA /
  loudness / version columns (migration 0003). Existing 266 TTS default to `prototype_tts`.
- `src/lib/audio/gating.ts` — `isOfficialAudio` = human recording AND `approved`; TTS is never
  official. Unit tests (4) cover the exclusion. Commit `272af26`.

### 2.2 Recording production package ✅
- `scripts/content/recording-packets.ts` (`pnpm content:packets`) generates, for all 266 published
  listening items: per-item actor packets `content/recording-packets/<CEFR>/<id>.md` (scenario,
  cast→voice spec, script, pace, pronunciation, target duration, interdictions),
  `content/recording-manifest.csv` (progress tracker, all `awaiting_recording`), and
  `content/pronunciation-guide.md`.
- `docs/AUDIO_RECORDING_GUIDE.md` — voice cast, WAV master / −16 LUFS delivery standards, workflow,
  the 7 QA gates, legal boundary (originals or licensed; no competitor audio; no AI-as-human).
- **Recordings still needed: 266** (grows with Phase 3 listening). This is an external input — the
  system is complete; no new TTS is passed off as human audio.
- Commit: _pending._

### 2.3 Honest synthetic-audio label ✅
- Provenance flows from `audio_assets` → `getClientQuestions` → `Stimulus`; every listening clip in
  practice AND mock (both use `QuestionCard`) shows "🔊 Audio synthétique (prototype) — enregistrement
  humain à venir". Flips to "Enregistrement humain" once approved human audio replaces it.
- Commit `0a5d719`. typecheck + build green, 64 unit tests.

### 2.4 Admin import + QA backoffice — _next (infra; untestable end-to-end until human audio exists)_

## Phase 3 — Content scale (40/40/10/120/120)
- _pending_

## Phase 4 — Mistake notebook as a core loop
- _pending_

## Phase 5 — Pricing intent capture
- _pending_

## Phase 6 — Live black-box acceptance
- _pending_
