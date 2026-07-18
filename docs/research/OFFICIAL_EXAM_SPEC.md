# Official TCF Canada exam specification (verified)

Everything in this file is encoded in versioned config (`src/lib/exam/config.ts`,
`src/lib/exam/nclc.ts`, `SPEC_VERSION = "2026.1"`, `NCLC_TABLE_VERSION = "IRCC-2026-01"`),
never hard-coded in components.

## Sources & retrieval

The official France Éducation international and IRCC (canada.ca) pages return
`403 / ERR-BOT-403` to automated fetching, so exact figures were corroborated across
multiple TCF-specialist references and cross-checked for agreement. Retrieved **2026-07-18**.

| Field group | Source | URL |
| --- | --- | --- |
| Section counts, timing, task word/second limits | prep2pass.ca — exam explanation | https://prep2pass.ca/exam-explanation |
| Section counts, scoring scales, CEFR bands | tcfprep.ca — exam overview | https://tcfprep.ca/tcf-canada-exam-overview/ |
| Score → NCLC conversion table | ouizami.com — TCF→NCLC/CEFR chart (2025) | https://www.ouizami.com/blog/tcf-canada-score-to-nclc-and-cefr-equivalency-chart-2025-update |
| NCLC = min across skills; NCLC 7 Express Entry threshold | IRCC (canada.ca) language-test guidance (blocked to bots; corroborated) | https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html |

> All in-app score numbers are labelled **unofficial estimates** and do not replace an
> official TCF Canada result. CapTCF is independent and not affiliated with FEI or IRCC.

## Structure (4 mandatory sections)

| Section | Code | Format | Count | Time | Scoring |
| --- | --- | --- | --- | --- | --- |
| Compréhension orale | CO | QCM, audio played once | 39 | 35 min | 0–699 |
| Compréhension écrite | CE | QCM, progressive difficulty | 39 | 60 min | 0–699 |
| Expression écrite | EE | 3 progressive tasks | 3 | 60 min | 0–20 |
| Expression orale | EO | 3 tasks (recorded) | 3 | ~12 min | 0–20 |

**Writing tasks:** T1 message 60–120 words · T2 article/récit 120–150 words ·
T3 comparaison argumentée 120–180 words.
**Speaking tasks:** T1 entretien dirigé ~2 min (no prep) · T2 interaction 5.5 min (+2 min prep) ·
T3 point de vue ~4.5 min (no prep).

## CEFR bands

- **0–699 (CO/CE):** A1 101–199 · A2 200–299 · B1 300–399 · B2 400–499 · C1 500–599 · C2 600–699.
- **0–20 (EE/EO):** A1 1 · A2 2–5 · B1 6–9 · B2 10–13 · C1 14–17 · C2 18–20.

## Official score → NCLC/CLB conversion (IRCC)

| NCLC | Listening (0–699) | Reading (0–699) | Writing (0–20) | Speaking (0–20) | CEFR |
| ---: | --- | --- | --- | --- | --- |
| 10+ | 549–699 | 549–699 | 16–20 | 16–20 | C1–C2 |
| 9 | 523–548 | 524–548 | 14–15 | 14–15 | C1 |
| 8 | 503–522 | 499–523 | 12–13 | 12–13 | B2 |
| 7 | 458–502 | 453–498 | 10–11 | 10–11 | B2 |
| 6 | 398–457 | 406–452 | 7–9 | 7–9 | B1 |
| 5 | 369–397 | 375–405 | 6 | 6 | B1 |
| 4 | 331–368 | 342–374 | 4–5 | 4–5 | A2 |

Notes encoded in code:
- Listening and reading use **different** thresholds (CLB 7 needs 458 listening but 453 reading).
- **Overall NCLC = the minimum across the four skills** (`overallNclc()`), because IRCC
  requires every skill to reach the target level.
- NCLC 7 is the common French threshold for Express Entry points.
