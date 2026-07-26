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

## Section A — stability shipped to production ✅ (2026-07-26)
Cherry-picked ONLY the verified stability commits onto `main` (`c9694ac`); Round-3 audio/content
work stayed on the branch. Gate before merge: empty-DB bootstrap (seeds 606 published + 4 mocks),
populated-DB boot **skips in 21 ms**, two concurrent boots seed **exactly once**, typecheck, lint,
60 unit, 6 integration, production build.

Deployed via Render CLI (`dep-d9j63iq4hv7c73cf1thg`, succeeded). Live measurements:

| Metric | Before | After |
| --- | --- | --- |
| App bootstrap (seed on every boot) | ~46 s | **5.5 s** this boot; future boots skip the seed entirely (marker `8ee7237eaf27` set in prod) |
| `next start` ready | — | 1.5 s |
| Warm TTFB `/` | 1.48 s | **0.58 s** |
| Warm TTFB `/api/health` | 0.165 s | 0.24 s |
| Warm TTFB `/api/ready` | 0.21 s | 0.37 s |
| `/audio/*` cache | `max-age=0` | **`public, max-age=31536000, immutable`** (206 range intact) |

Render Free container wake (~48 s) is unchanged — that is a platform limit, removable only by a paid
plan (see gap audit §5). Production content verified intact: 606 published, 4 mocks, 0 users.

### 2.4 Admin import + QA backoffice
**Core rules + analyser ✅** — `src/lib/audio/qa.ts` (pure, no DB/fs):
- `analyseWav()` decodes a real PCM WAV master in pure Node (no ffmpeg): duration, sample rate, bit
  depth, channels, peak, RMS→LUFS **estimate** (documented as an approximation, not ITU-BS.1770),
  leading/trailing silence, clipping, internal dead air. Non-WAV/0-byte/corrupt → `analysed:false`
  rather than a guessed number.
- `technicalQa()` thresholds; a delivery-only (compressed) upload can never pass — the master is
  required, so we block publication instead of faking a measurement.
- `canApprove()` enforces every gate: human source, licence name+url for `human_licensed`,
  transcript-hash match, technical pass, confirmed human listen.
- `src/lib/audio/import.ts` — `planImport()` computes the whole batch plan first (matched /
  unmatched / duplicate_version / unsupported), so a bad file can never leave a half-written record.
- 16 new unit tests (80 total) covering all six required rules. Commit: _pending._

## Phase 3 — Content scale (40/40/10/120/120)
- _pending_

## Phase 4 — Mistake notebook as a core loop
- _pending_

## Phase 5 — Pricing intent capture
- _pending_

## Phase 6 — Live black-box acceptance
- _pending_
