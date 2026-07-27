# Round 3 — exact resume point

Single source of truth for "what to do next". Update it at the end of every work stage.

## Immediate next task

**Ingest the recovered reading items into the branch bank, then keep generating.**

1. `git checkout round3/pro-review-remediation && git pull`
2. Ingest the 493 recovered accepted reading items (`content/round3-staging/accepted/*.json`) into
   `src/content/reading.json` via the merge-ingest (continues IDs, re-validates, dedupes):
   - the accepted files use the workflow item shape (`passageTitle`/`passageText` + `_qa`), which
     `normalizeReading` already understands.
   - stage them where `content:ingest2` reads raw input (`scripts/content/raw/`) or extend the
     ingest to accept `content/round3-staging/accepted/`.
3. `pnpm content:audit` (must be 0 critical errors) → `pnpm content:audio:qa`.
4. Recompute the true gap to 40 sets; commit + push; tag if it's a milestone.

## Then, in order (each: generate → QA → checkpoint → push)

- **Reading B2 / C1 / C2** (~318 + 144 + 86 to target) via `scripts/workflows/round3/reading-scale.wf.js`
  (edit the hard-coded `BUCKETS`). **Persist each batch to disk AND commit/push per batch** — do not
  wait for the whole run (that is what lost work last time).
- **Listening text + scripts** for the remaining sets → status `awaiting_recording`; regenerate
  packets with `pnpm content:packets`; never publish as official without approved human audio.
- **Writing → 120, Speaking → 120** (productive pipeline).
- **10 four-skill mocks** structure.
- **Phase 6**: merge a green milestone to main, deploy via Render CLI, live black-box acceptance.

## Guardrails (learned the hard way)

- **Checkpoint + push after every batch**, not at the end — the last run lost 61 batches to a
  usage-limit hit at the persist stage (recovered from the journal, but do not rely on that).
- If a workflow is interrupted, recover with `scripts/workflows/round3/recover-reading.py <journal-dir>`
  (pure parsing, no model calls) before doing anything else.
- Never merge unfinished Round 3 to `main`; only fully-gated stability/content milestones.
- Migrations must be additive/backward-compatible; never drop a column the live version still uses.

## Recovery / handoff

- `bash scripts/verify-restore.sh` proves a clean checkout is healthy.
- `docs/CURRENT_PROJECT_STATE.md` has the live snapshot; `docs/NEW_MACHINE_RESTORE.md` the full
  from-GitHub restore.
