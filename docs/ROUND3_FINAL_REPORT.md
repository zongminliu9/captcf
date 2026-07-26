# CapTCF — Round 3 final report (Professional Reviewer Remediation)

Branch `round3/pro-review-remediation`. Stability work is **already merged to `main` and live**;
the rest is on the branch pending the round gate.

> **Status honesty.** Per the six-level scale requested: this report separates
> *engineering complete* · *content text complete* · *recording packets complete* ·
> *human recordings pending* · *human audio approved* · *publicly published*.

## 1. What the reviewer said → what actually changed

| # | Reviewer's point | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Layout/visual is good | kept, not regressed | 29 E2E incl. mobile pass |
| 2 | **Listening audio sounds mechanical / AI** | **system complete, recordings pending** | provenance schema, gating, packets, import + QA backoffice; TTS now *labelled* as prototype and *blocked* from official use. **0 human recordings exist yet** — external input (§5) |
| 3 | **Sometimes won't load / unstable** | **fixed and deployed** | seed-on-boot removed; warm home TTFB 1.48 s → **0.58 s**; audio now immutable-cached (§2) |
| 4 | Not enough sets (competitors ~40) | **in progress** | exact gap measured; batched generation running (§4) |
| 5 | Needs complete content + usable mistake notebook + low price | notebook **rebuilt**, price **being validated** | §3, §6 |
| 6 | ~50 RMB price perception | **experiment shipped** (no charge) | §6 |
| 7 | Official product must use human audio, never AI-as-official | **enforced in code** | `isOfficialAudio()`; TTS can never be approved — unit-tested |

## 2. Stability — shipped to production ✅

Merged to `main` (`c9694ac`) and deployed (`dep-d9j63iq4hv7c73cf1thg`).

**Root cause found:** the container re-ran the **full 600+ item seed on every boot** (~16 s of the
~46 s app bootstrap), and `/audio/*` was served with `cache-control: max-age=0`.

**Fix:** `scripts/bootstrap.ts` — PostgreSQL advisory lock (no double-seed across instances),
pending migrations only, and a versioned `seed_state` checksum marker so an already-seeded database
skips the seed entirely. Fails loudly (exit 1) rather than starting half-initialised. One `npx`
invocation instead of three.

| Metric | Before | After |
| --- | --- | --- |
| App bootstrap | ~46 s (seed every boot) | **5.5 s** first boot, then **skipped** (marker set in prod) |
| Local populated-DB boot | — | **21 ms** |
| Warm TTFB `/` | 1.48 s | **0.58 s** |
| `/audio/*` cache | `max-age=0` | **`public, max-age=31536000, immutable`** (206 range intact) |
| **Cold start (total, measured)** | **94.4 s** | **54.2 s** — re-measured on a genuinely slept container after the deploy |

**Honest split:** the cold start dropped **94.4 s → 54.2 s (−43 %)**, measured on a container that
had actually gone to sleep. Essentially all of the remaining 54 s is the **Render Free container
wake**, which no code change can remove — the app's own share fell from ~46 s to a few seconds. Only a paid plan does (Starter web ≈ US$7/mo removes idle sleep; a Starter
database removes the 30-day expiry). That needs your billing approval — it is the one thing I have
not done.

Tests before merge: empty-DB bootstrap (seeds 606 published + 4 mocks), populated boot skips,
two concurrent boots seed exactly once, typecheck, lint, 60 unit, 6 integration, production build.

## 3. Mistake notebook — rebuilt as a core loop ✅ (branch)

The reviewer never noticed it, so visibility and history were rebuilt (migration `0004`):

- **Auto-add** on wrong answers **and unanswered/timed-out** items (`addedReason`:
  wrong | timeout | repeated).
- **A correct answer no longer erases anything** — it increments `correctStreak`; an item is only
  `mastered` after **2 consecutive** correct answers, keeping `firstWrongAt`, `lastWrongAt`,
  `lastSeenAt`, `wrongCount` and the learner's own wrong option.
- **Dashboard**: prominent *Carnet d'erreurs* card — due today, in-progress vs mastered, weakest
  question type, repeated-mistake badge, one-click **Réviser 5–10 min**.
- **Results page**: "N question(s) ajoutée(s) à votre carnet" + **Réviser maintenant**.
- **Notebook**: filters (en cours / répétées / maîtrisées / toutes) + per-item metadata (why added,
  first/last error, last & next review, mastery progress) beside the correct answer and every
  distractor rationale.
- **E2E** (`mistakes.spec.ts`): wrong → results CTA → notebook → dashboard → re-answer → history
  preserved → survives a completely fresh browser session.

## 4. Content scale — measured, batched, in progress

Exact gap (computed, not guessed) for 40 sets × 39 = 1 560 per skill:

| Skill | Now | Target | Still needed |
| --- | ---: | ---: | ---: |
| Reading | 340 | 1 560 | **1 220** |
| Listening | 266 | 1 560 | **1 294** |
| Writing tasks | 69 | 120 | 51 |
| Speaking tasks | 69 | 120 | 51 |

A batched 4-stage pipeline (author → **blind solver** → French + assessment reviewer → editor/persist)
is running for reading A1/A2/B1 (672 items, 68 batches), writing each accepted batch to
`content/round3-staging/reading/` so nothing is lost between sessions. Only items where the blind
solver agrees with the key **and** the reviewer passes French/single-answer/no-leak/difficulty are
kept; the rest are repaired or dropped.

**Nothing is published from this yet.** Counts in the UI will only ever reflect genuinely
publishable sets — no padded numbers, no empty sets.

## 5. Human audio — the one real external blocker

| Level | Status |
| --- | --- |
| Engineering complete | ✅ schema, gating, packets, import, QA, versioning, rollback, admin UI |
| Content text complete (existing bank) | ✅ 266 scripts |
| Recording packets complete | ✅ 266 packets + manifest + pronunciation guide |
| **Human recordings delivered** | ❌ **0** |
| Human audio approved | ❌ 0 |
| Publicly published as human audio | ❌ 0 |

**40 complete sets need 1 560 human recordings** — and that includes all 266 existing items, none of
which has one. Minimum publishable batches: **1 set = 39 recordings** (recommended first order),
4 sets = 156, 10 sets = 390, 40 sets = 1 560. Effort: ~33 s finished speech per item →
~14.3 h finished audio / ~50 h studio / ~21 h post for the full 40 sets, with a 4-speaker minimum
cast (6–8 ideal) reusable across every set. Full breakdown: `docs/RECORDING_REQUIREMENTS.md`.

Until real files arrive, every clip stays labelled *« Audio synthétique (prototype) »* and
`isOfficialAudio()` blocks it from official content. **No new TTS has been passed off as human
audio, and item 2 is NOT claimed as solved.**

## 6. Pricing — validated, not guessed ✅ (branch)

Payments remain off. `src/lib/pricing/experiment.ts` holds every amount in config: **49 ¥ one-time**
early bird (the reviewer's signal) with 9 $ CA / 7 $ US display variants. The survey asks
would-you-buy (the only required answer), one-time vs monthly, acceptable band, main reason /
main blocker, plus a comment — and is skippable. Guests and signed-in users both count; one row per
owner+variant (upsert) plus a rate limit stop repeat clicks from inflating the tally. **No
countdown, no "N people bought", no invented discount.** Admin shows the real tally and says
"no data yet" rather than a fabricated 0 %. Verified in a browser end-to-end: payload persisted,
second submission updated the same row instead of creating a new one.

## 7. Test status

| Suite | Result |
| --- | --- |
| typecheck | pass |
| lint | pass |
| unit | **89 passed** (+29 this round) |
| integration | **6 passed** (incl. bootstrap no-reseed + concurrent-boot) |
| E2E | **29 passed** (+2 mistake-notebook) |
| production build | pass |

New rule coverage includes: populated DB does not re-seed · two instances seed exactly once ·
`prototype_tts` can never be approved · `human_licensed` without licence metadata cannot publish ·
transcript-hash mismatch blocks approval · technical-QA failure blocks publication · only approved
human audio serves official content · a bad file in a batch upload leaves no dirty record.

## 8. Still open (honest)

1. **1 560 human recordings** — external input; everything else is ready (§5).
2. **Content generation to 40/40/10/120/120** — pipeline running in batches; not published yet.
3. **Render Free cold start (~48 s)** — needs your approval for a paid plan; not a code issue.
4. **Ten four-skill mocks + 120/120 productive tasks** — queued behind the content batches.
5. Round-3 branch is **not merged** beyond the stability subset, by design.
