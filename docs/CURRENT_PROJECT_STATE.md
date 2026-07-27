# CapTCF — current project state

_Living snapshot. Refresh the git/counts before relying on it. Last updated: 2026-07-26._

## Git & deployment

| | Value |
| --- | --- |
| `origin/main` HEAD | `c9694ac` (stability milestone — deployed) |
| `origin/round3/...` HEAD | `f4d4e84` (active dev) |
| Production deployed commit | `c9694ac` (live at https://captcf.onrender.com) |
| Render service / DB | `srv-d9e66m3rjlhs73bq0c1g` / `dpg-d9e66bjrjlhs73bpvp90-a` |
| Unpushed local work | **none** — everything above is on GitHub |

## Completed & merged to main (live)

- Round 1 + 2 product (guest-first practice, mocks, admin, auth, i18n, beta).
- **Round 3 stability**: version-gated bootstrap (advisory lock + seed_state checksum → no
  seed-on-boot), audio immutable caching, player retry/timeout, authed skeletons. Cold start
  94.4 s → 54.2 s; warm `/` 1.48 s → 0.58 s.

## Completed on the Round-3 branch (not yet merged to main)

- Audio provenance schema + `isOfficialAudio` gating; 266 recording packets + manifest + guide;
  honest "synthetic (prototype)" label; `/admin/recordings` import + QA backoffice; WAV analyser.
- Mistake notebook rebuilt (auto-add, dashboard card, results CTA, filters, history, mastery, E2E).
- Pricing-intent experiment (49 ¥ config, no charge, admin analytics).

## Content counts (bank = src/content/)

| Kind | In bank (published-ready) | 40-set target | Recovered & staged (not yet ingested) |
| --- | ---: | ---: | ---: |
| Reading | 340 | 1 560 | **+493 accepted** (141 rejected) in `content/round3-staging/accepted/` |
| Listening | 266 | 1 560 | text only; needs human audio |
| Writing | 69 | 120 | — |
| Speaking | 69 | 120 | — |

Recovered reading: 0 integrity errors, 0 near-dup, balanced keys/subtypes. Recovery report +
SHA-256 in `content/round3-staging/reports/`. Provenance journal in `docs/workflows/round3/`.

## Workflow status

- `captcf-r3-reading-scale` (reading A1/A2/B1) — **completed, then recovered** after a usage-limit
  interruption at the persist stage. 493 items salvaged from the journal.
- Not yet run: reading B2/C1/C2, listening text, writing/speaking to 120, four-skill mocks.

## Tests (last green run)

typecheck ✓ · lint ✓ · unit **89** ✓ · integration **6** ✓ · E2E **29** ✓ · build ✓.

## Human recordings still needed

**1 560** for full 40 listening sets (0 delivered, 0 approved). Min first batch = **39** (1 set).
Full breakdown: `docs/RECORDING_REQUIREMENTS.md`. This is the one true external blocker.

## Next exact task

See `docs/ROUND3_RESUME.md`. In short: ingest the 493 recovered reading items into the branch bank
(`scripts/content/raw/` → `pnpm content:ingest2` → `pnpm content:audit`), then continue generation
for reading B2/C1/C2 and writing/speaking toward the targets — **checkpoint + push every batch**.
