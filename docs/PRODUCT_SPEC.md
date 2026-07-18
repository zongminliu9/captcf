# CapTCF — Product specification

An original TCF Canada intelligent exam-prep platform. Not a question-list site — a learning
system that connects practice, mock exams, mistake review and a study plan, and that decides
what the learner should do next and explains why.

## Principles

1. **Value on arrival** — a real question in ≤ 2 clicks, no signup.
2. **Guest-first** — full functionality anonymously; lossless merge on register.
3. **One primary action** — the dashboard highlights a single recommendation with a reason.
4. **Every mistake becomes learning** — rich review + spaced repetition.
5. **Study vs exam modes are strictly separated** — instant feedback vs timed/no-reveal.
6. **Runs with zero paid APIs** — real audio, deterministic feedback, entitlement simulator.
7. **Honest** — all scores are unofficial estimates tied to the exam-structure version.

## Feature areas

- **Practice engine** — quick, by-skill, custom, mistakes, bookmarks, due-review; a session
  state machine (`created → in_progress → paused → submitted → graded → reviewed → abandoned →
  expired`); autosave; refresh/reopen-safe; server-authoritative grading.
- **Listening** — real French-Canadian multi-voice audio; player with play/pause/replay/speed/
  transcript (study) and limited plays / no transcript (exam).
- **Reading** — original documents A1–C2 (notices, correspondence, informative, argumentative,
  abstract); desktop passage+question, mobile scroll.
- **Writing** — 3 official task types; editor with autosave, word count, timer, focus mode;
  deterministic local rubric + unofficial band; AI provider adapter (optional).
- **Speaking** — real recording, volume metering, two-take comparison, self-eval; permission
  fallback; local rubric; AI/ASR adapter (optional).
- **Mock exams** — 4 complete forms mirroring the official structure; timed CO+CE runner with
  refresh-safe per-section clocks and auto-submit; EE/EO via their tools; per-section results.
- **Adaptivity** — transparent mastery per skill/subtype; SM-2 review; a rules-based
  recommendation engine emitting machine-readable reason codes.
- **Entitlements** — Free vs Premium gating (daily limits, bank cap, mocks, analytics, AI);
  Stripe adapter or dev simulator.
- **Admin** — question CRUD/status/versioning, atomic JSON import, issue reports, audit view.
- **i18n** — fr (default) / en / zh with safe French fallback for missing keys.
- **Privacy** — data export + account deletion; owner-scoped queries; secure sessions.

## Scoring & levels

Difficulty-weighted **unofficial** estimate on the official 0–699 / 0–20 scales, mapped to CEFR
and the official IRCC NCLC table; overall NCLC = minimum across skills. Confidence grows with
volume + CEFR breadth. See `docs/research/OFFICIAL_EXAM_SPEC.md`.

## Reason codes

`WEAK_SKILL`, `REVIEW_DUE`, `EXAM_SOON`, `GOAL_GAP`, `LOW_CONFIDENCE`, `PACE_TOO_SLOW`,
`RECENT_REGRESSION`, `NEW_SKILL`, `MAINTAIN_MASTERY` — rendered into specific human sentences
via i18n.

## Content scale (audited, honest)

Listening **108**, Reading **126**, Writing **45**, Speaking **45**, Vocabulary **453**,
Mock forms **4** (complete). See `docs/content/` for the live inventory, distribution,
quality and duplicate reports. Aspirational targets (200 listening / 250 reading) were not
fully reached in this build; actual audited counts are reported honestly (see
`docs/PRODUCT_DECISIONS.md`).
