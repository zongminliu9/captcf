# Audio QA report

TTS clips are QA-graded automatically (loudness-normalized, silence/truncation checked, voice
distinctness). `premium_ready` is reserved for explicit admin approval; automation tops out at
`reviewed_tts`. All audio is synthesised (macOS `say`), honestly labelled — not human-recorded.

- Published listening items: **266**
- Usable in mocks (reviewed_tts + premium_ready): **125**

| Tier | Count |
| --- | ---: |
| premium_ready | 0 |
| reviewed_tts | 125 |
| prototype_tts | 141 |
| rejected | 0 |
| missing audio | 0 |

Rejected: none

Missing: none

Review + approve/regenerate clips in the admin QA queue at `/admin/audio`.
