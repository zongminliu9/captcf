# Product & technical decisions (honest log)

Decisions made autonomously as product/tech lead, with rationale and trade-offs.

## Stack

- **Next 16 / React 19 / Tailwind v4 / Drizzle / Postgres 17 / Zod 4** — current stable, verified
  against the npm registry rather than memory. **Biome** instead of ESLint (avoids Next-16 plugin
  churn; fast). **Custom cookie-session auth** instead of Auth.js — fully controllable, testable,
  and works with **no OAuth key**.

## Environment substitutions (first-class, not degraded)

- **No Docker** → native project-local Postgres (`scripts/pg.ts`, `.pgdata/`, port 5433).
  `docker-compose.yml` provided for parity.
- **No ffmpeg** → macOS `afconvert` for AAC/m4a; Python `wave` for concatenation.
- **macOS `say`** provides genuine multi-speaker French-**Canadian** audio.
These produce a fully working product; they are not compromises on the user experience.

## Content generation

- Original content generated via **author → independent blind reviewer → editor-fix** workflows
  (parallel subagents), then normalized, **Zod-validated**, deduped, and audited. Independence of
  author and reviewer is enforced (reviewer re-answers blind, never sees the key).
- **Actual audited counts** (honest): Listening 108, Reading 126, Writing 45, Speaking 45,
  Vocabulary 453. The aspirational minimums in the brief (200 listening / 250 reading / 150
  standalone) were **not fully reached** in the time available. Everything shipped passed schema +
  quality audit (0 errors, 0 warnings) rather than padding counts with unreviewed items — this is
  the explicit trade the brief allows ("质量优先… 诚实给出实际已通过审核的数量"). Scaling further is
  a matter of re-running `content:*` workflows; the pipeline is in place.

## Mock exams

- **All 4 forms are complete** in the data model (39 CO + 39 CE + 3 EE + 3 EO each), assembled
  deterministically from the audited bank with **≤ 2 reuse** of any item across forms (reported in
  the distribution report). Because the bank (108/126) is smaller than 4 fully-distinct 39-item
  forms would require, forms share items with bounded overlap — standard practice for a shared bank.
- The **timed runner** covers the two auto-scored sections (CO + CE) with per-section
  refresh-safe clocks and auto-submit; **EE + EO** are completed with their dedicated editor/
  recorder (which apply the same local rubrics) and contribute to the learner's record. This keeps
  the timed exam robust and honest rather than shipping a half-working four-section monster.
  Fully embedding EE/EO inside the timed runner is the top follow-up.

## Scoring

- Score estimation is a **transparent difficulty-weighted** model, not IRT. It is always labelled
  **unofficial** and tied to `SPEC_VERSION`. NCLC/CEFR mapping uses the **official IRCC table**.

## Writing/Speaking without AI

- Deterministic local rubrics give real, specific feedback with **no AI key**. AI/ASR are optional
  adapters that layer on richer feedback when keys exist; their scores are never called official.

## Payments

- **Dev entitlement simulator** grants Premium locally so all gated features are testable without
  Stripe. A Stripe adapter path exists for when keys are configured. No fake discount countdowns.

## Testing host quirk (fixed)

- Next's dev server emits redirect `Location` with host `localhost`; a client on `127.0.0.1`
  therefore didn't receive guest cookies across redirects. E2E uses `localhost` to match. In
  production `req.url` reflects the real Host, so this is dev-only.

## Known limitations (see FINAL_DELIVERY_REPORT for the full list)

Content below aspirational scale; EE/EO not inside the timed runner; recommendation/mastery are
rules-based (by design, for transparency) not ML; no email delivery (password reset is a
local-dev flow); Lighthouse measured in production build (numbers in `docs/LIGHTHOUSE_REPORT.md`).
