# CapTCF — Human audio recording guide

The professional reviewer is right: **synthetic (TTS) audio must not be shipped as official
listening material.** This guide is how we replace it with **real human recordings** (original or
properly licensed). Until approved human audio exists, the current TTS clips stay clearly labelled
as "audio synthétique (prototype)" and are **never** treated as official.

> **Legal boundary.** Record originals, or use audio with a written commercial licence (keep the
> licence name + URL). Do **not** download, scrape, rename, or reuse a competitor's audio. Never
> present AI-generated or voice-cloned audio as a human recording.

## What to record

- Every published listening item has a packet in `content/recording-packets/<CEFR>/<id>.md` and a
  row in `content/recording-manifest.csv` (`record_status = awaiting_recording`).
- Each packet gives the scenario, the cast, the exact script (read only the lines after `>`), pace,
  pronunciation notes, target duration, and what NOT to add.
- Shared pronunciation of names/places/numbers: `content/pronunciation-guide.md`.

## Voice cast (keep voices distinct and consistent)

| Role | Who |
| --- | --- |
| `narrator` | Neutral, poised, radio/announcement style |
| `f1` | Adult woman, 25–40, standard French, warm |
| `f2` | Adult woman, 30–45, understandable Canadian French |
| `m1` | Adult man, 25–40, standard French, poised |
| `m2` | Adult man, 30–45, understandable Canadian French |
| `elder_f` | Older woman, 55+, slightly slower |
| `elder_m` | Older man, 55+, slightly slower |
| `youth` | Young speaker, 16–22, natural energy |

No exaggerated accents. The same person should keep the same role across clips where possible.

## Technical standard

**Master (archive):**
- WAV, **48 kHz, 24-bit**, mono (stereo only if the scene truly needs it).
- No clipping; controlled room noise and reverb; a clean, quiet room.
- **No AI voice cloning.** Real human voice only.

**Delivery (web):**
- AAC/M4A or Opus, browser-compatible.
- Loudness ≈ **−16 LUFS**; true peak **≤ −1 dBTP**.
- ~200–400 ms of silence at start and end — do not clip the first/last syllable.
- No long dead air; compression must not hurt intelligibility.

**File names:** master `content/audio-master/<id>.wav`, delivery `<id>.m4a` (same id as the packet).

## Workflow (per batch)

1. Pick rows from `recording-manifest.csv` (`awaiting_recording`).
2. Record from each packet; export a delivery file per `<id>`.
3. Hand the delivery files to the app: **Admin → Audio → import** (batch upload, auto-matched by
   filename), or drop them in `public/audio/` and run `pnpm content:audio:import` (Phase 2.4).
4. The item moves `awaiting_recording → awaiting_qa`.
5. QA in the admin queue (below). On pass → `approved` + `published`; on fail → `rejected` (re-record).
6. Only `human_original|human_licensed` + `approved` clips are served as official content; the
   `isOfficialAudio` gate enforces this — TTS can never pass it.

## QA gates (all must pass — existence is not enough)

1. **Transcript consistency** — audio matches the packet script word-for-word.
2. **Technical** — loudness/true-peak in range, no clipping, no truncation, no long silence, correct
   duration.
3. **Independent human listen** — a second person confirms it sounds natural and clear.
4. **Pronunciation** — names/places/numbers correct and consistent with the guide.
5. **Pace** — appropriate for the CEFR level.
6. **Scene plausibility** — sounds like the stated situation (phone / broadcast / counter…).
7. **Answer consistency** — the audio actually supports the keyed correct answer and the distractor
   rationales.

## Status of this deliverable

The **system** (schema, packets, manifest, guide, import + QA + gating) is complete and tested.
The **recordings themselves are an external input** — see `docs/ROUND3_FINAL_REPORT.md` for the exact
count still needed and the minimum publishable batch. No new TTS will be passed off as human audio.
