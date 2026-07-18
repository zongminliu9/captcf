# Audio manifest

Real French-Canadian listening audio, generated locally: macOS `say` (per-line, multi-voice) →
Python `wave` concatenation with silence gaps → `afconvert` (AAC/m4a). Idempotent via a text-hash
manifest at `public/audio/manifest.json`. Regenerate with `pnpm content:audio` (`--force` to rebuild all).

- Clips: **108** (one per listening item)
- Total duration: **2 821 s** (~47.0 min)
- Average clip: **26.1 s**

## Voice-role usage (roster key → clips used in)

| Voice role | Clips |
| --- | ---: |
| f1 | 51 |
| narrator | 49 |
| m1 | 45 |
| f2 | 36 |
| m2 | 27 |
| elder_f | 2 |
| elder_m | 2 |
| youth | 2 |

Roster keys map to distinct macOS voices in `scripts/content/audio.ts`:
`f1→Amélie`, `f2→Sandy (fr_CA)`, `m1→Thomas`, `m2→Reed (fr_CA)`, `narrator→Jacques`,
`elder_f→Grandma (fr_CA)`, `elder_m→Grandpa (fr_CA)`, `youth→Flo (fr_CA)` — verified to render
distinct audio (different md5s), so speakers in a dialogue actually differ.

Per-clip manifest fields: `file`, `duration`, `textHash`, `voices`, `status`. The `.m4a` files
are committed under `public/audio/` so a clean clone has playable audio without regenerating.
