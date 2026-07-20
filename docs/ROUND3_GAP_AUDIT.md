# Round 3 — Gap audit (Phase 0 baseline)

Measured against the live site **https://captcf.onrender.com** (Render Free) on 2026-07-20, as a
fresh visitor, before any code change. Numbers are real `curl`/log/DB measurements.

## 1. Performance & stability (measured)

| Metric | Value | Notes |
| --- | --- | --- |
| **Cold start** TTFB `/api/health` | **94.4 s** | service asleep → wake + app bootstrap |
| Warm TTFB `/api/health` | 0.165 s | fine |
| Warm TTFB `/api/ready` (DB `SELECT 1`) | 0.21 s | fine |
| Warm TTFB `/` (home) | 1.48 s | slowest warm page (RSC) |
| Warm TTFB `/pricing`,`/mock` | 0.76 s | fine |
| Warm TTFB `/practice`,`/login`,`/register` | 0.18–0.20 s | fine |
| `/practice/start`,`/mock/../begin` | 307, 0.2–0.45 s | relative redirect OK |
| Audio range request | **206**, `accept-ranges: bytes`, `content-range` OK | streaming works |
| Audio cache header | **`cache-control: public, max-age=0`** | ❌ no caching — re-downloads every play |
| Warm 5xx / 4xx | none | all core routes 200/307 |
| DB indexes | owner indexes present on every hot table (responses, mistakes, review_queue, attempts, sessions…); questions has 7 | no schema-level N+1 index gaps |

### Cold-start decomposition (from Render runtime logs, boot @ 09:13:34→09:14:20)

The 94 s splits into platform wait + **app bootstrap ≈ 46 s**, itemised against the brief's A–F:

- **A — Render Free sleep/wake:** ~48 s (94 − 46). Removable only with a paid plan (see §5).
- **B — app startup script:** `startCommand` runs `npx pnpm@9.15.4` **three times** (migrate, seed, start); each npx resolve + tsx spin-up adds seconds. `next start` ready in 1.4 s once reached.
- **C — migration/seed:** **the FULL seed runs on every boot** — `→ Seeding content… questions: 606 … Assembling mock exams …` ≈ 16 s (tsx startup + re-upsert of 606 questions + delete/reinsert options & mock items). This is the single most fixable app-side cost. **Fix in Phase 1.**
- **D — Next.js page/API:** warm response is fine; not a cold-start driver.
- **E — audio loading:** `max-age=0` means no browser/CDN caching → repeat plays re-fetch. **Fix in Phase 1.**
- **F — real app errors:** none observed on warm loads (no 5xx, no console/hydration errors in Round-2 checks).

> Honest framing: roughly **half** the cold wait is the Render Free platform (only a paid upgrade
> removes it); the other half is app bootstrap that Phase 1 will cut (skip seed when already applied,
> single bootstrap process, advisory lock). This is **not** a "user network" problem.

## 2. Audio authenticity (Phase 2 gap)

- All **266** listening clips are **TTS** (`prototype_tts`/`reviewed_tts`). **Zero** human recordings.
- `audio_assets` has `quality`+`qa` but **no** `source_type` (human_original / human_licensed /
  prototype_tts), no license fields, no speaker/recording metadata, no recording-packet workflow.
- Gating is by *quality tier* only — **prototype_tts can still enter published mocks**. There is no
  "human-only in official content" rule yet.
- The professional reviewer is right: TTS must not be presented as official listening material.

## 3. Content scale (Phase 3 gap)

| Kind | Now | Round-3 target |
| --- | ---: | --- |
| Listening sets (39 ea.) | ~4 forms | **40 sets** (1560 positions, non-overlapping IDs) |
| Reading sets (39 ea.) | ~4 forms | **40 sets** (1560 positions, non-overlapping IDs) |
| Four-skill integrated mocks | 4 | **≥10** |
| Writing tasks | 69 | **120** |
| Speaking tasks | 69 | **120** |

## 4. Mistake notebook (Phase 4 gap)

`mistakes` + `review_queue` tables and `/mistakes` `/review` pages exist, but the professional user
didn't perceive them — visibility/entry/closed-loop is weak. Needs: auto-add rules (wrong / timeout /
flagged-unsure / repeated-wrong), a visible Dashboard "due mistakes + start 5–10 min review" entry,
rich per-item detail, filters, and a spaced-review loop that keeps history on later correct answers.

## 5. Render Free reality

Cold wake (~48 s) cannot be honestly removed by front-end code. Phase 1 reduces the **app** portion.
For "friends always open instantly," the minimal real fix is a paid Render plan:
**Starter web (no idle sleep) + a small persistent disk (recordings survive) + Starter Postgres
(no 30-day expiry)** ≈ US$7 + US$7 (+disk) /mo. Requires the user's billing approval — will pause only for that.

## 6. Pricing (Phase 5)

Payments are disabled (beta). No price-intent capture exists. Need a configurable early-bird
experiment (≈49 RMB one-time, CAD/USD equivalents) that records intent **without charging**.

---

### Round-3 priority order (execution)

1. **Phase 1 — stability**: bootstrap seed-versioning + advisory lock (kill seed-on-boot), audio
   long-cache headers, frontend reliability, audio QA. *(highest impact, in progress)*
2. **Phase 2 — human-audio production system** (schema, packets, admin import, QA, gating). Human
   recordings themselves wait on the user.
3. **Phase 4 — mistake notebook** as a visible core loop.
4. **Phase 5 — pricing intent** capture.
5. **Phase 3 — content scale** to 40/40/10/120/120 via the 6-role pipeline (reading publishable;
   listening text generated but `awaiting_recording` until human audio exists).
6. **Phase 6 — live black-box acceptance**.
