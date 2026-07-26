# CapTCF — human recording requirements (Phase F)

Exact, honest numbers for the human listening audio. **The 266 existing packets are NOT the full
40-set requirement** — they cover only today's listening bank.

All figures below are computed from the real content (`src/content/listening.json`), not estimated
by hand: 266 published items, 932 script lines, 22 063 words, 3.5 lines and ~83 words per item,
8 distinct voice roles.

## 1. Where we stand

| | Count |
| --- | ---: |
| Listening questions that exist today | **266** |
| Recording packets generated for them | **266** (`content/recording-packets/`) |
| Human recordings delivered so far | **0** |
| Human recordings approved (official) | **0** |
| Clips publicly served as official human audio | **0** |

Every existing clip is TTS, labelled in the UI as *« Audio synthétique (prototype) — enregistrement
humain à venir »*, and is blocked from official status by `isOfficialAudio()`.

## 2. What 40 complete listening sets actually needs

40 sets × 39 questions = **1 560 unique listening questions**, each with its own recording.

| | Count |
| --- | ---: |
| Unique listening questions required | **1 560** |
| Already authored (text + script) | 266 |
| Still to author (text + script) | **1 294** |
| **Human recordings still needed for the full 40 sets** | **1 560** |

Note the last row: even the 266 already-authored items have **no** human recording yet, so the
40-set target requires recording **all 1 560**, not 1 294.

## 3. Effort estimate (derived from the real scripts)

Per item: ~83 words ≈ **33 s of finished speech** at a natural 150 wpm.

| Batch | Items | Finished audio | Studio time @3.5× | Post-production @1.5× |
| --- | ---: | ---: | ---: | ---: |
| 1 set | 39 | ~21 min | ~1.3 h | ~32 min |
| 4 sets | 156 | ~86 min | ~5 h | ~2.2 h |
| 10 sets | 390 | ~3.6 h | ~12.6 h | ~5.4 h |
| **40 sets** | **1 560** | **~14.3 h** | **~50 h** | **~21 h** |

"Studio time" allows for slating, retakes and direction; "post" covers editing, loudness
normalisation to −16 LUFS, true-peak limiting and export. Both are industry rules of thumb, not
measurements — treat them as planning figures.

## 4. Voice cast

**8 distinct roles** are already used across the scripts (`narrator`, `f1`, `f2`, `m1`, `m2`,
`elder_f`, `elder_m`, `youth`). A minimum viable cast is **4 speakers** (2 women, 2 men) with two of
them also covering the older/younger roles; **6–8 speakers** gives properly distinct voices.

Each speaker can be reused across all 40 sets — casting is a one-time cost, not per set.

## 5. Minimum publishable batches

A set only becomes officially publishable when **all 39** of its clips are `human_*` + `approved`.

| Milestone | Recordings needed | What it unlocks |
| --- | ---: | --- |
| **1 set** | **39** | First fully-human listening test — provable quality, real user feedback |
| **4 sets** | **156** | Replaces today's 4 mock forms with human audio end-to-end |
| **10 sets** | **390** | The 10 four-skill integrated mocks can all use human audio |
| **40 sets** | **1 560** | Full advertised catalogue |

**Recommended first order: 39 recordings (1 complete set).** It is the smallest batch that produces
something honestly publishable, and it validates the cast, the packets and the QA pipeline before
committing to volume.

## 6. What is ready and waiting

The pipeline is complete and tested — only the audio files themselves are missing:

- packets, manifest CSV and pronunciation guide (`pnpm content:packets`)
- technical standards + 7 QA gates (`docs/AUDIO_RECORDING_GUIDE.md`)
- admin import (`/admin/recordings`): batch upload, filename matching, quarantine of unmatched /
  duplicate / 0-byte files, WAV master analysis (duration, LUFS, true peak, silence, clipping)
- approval enforced by `canApprove()`: human source, licence metadata when licensed, transcript-hash
  match, technical pass, confirmed human listen — a synthetic clip can never pass
- versioning, reject, request-re-record and rollback, all keeping history

Send recordings (or a licensed source with its licence name + URL) and they can be imported,
QA'd, approved and published the same day.
