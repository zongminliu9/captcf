# Round 2 gap audit

Baseline: `0023d26` (== origin/main), verified against DB, seed, mock data, tests, routes.
Status legend: ✅ VERIFIED_COMPLETE · 🟡 PARTIALLY_COMPLETE · ❌ NOT_IMPLEMENTED ·
🟠 IMPLEMENTED_BUT_UNVERIFIED · ⏸ INTENTIONALLY_DEFERRED.

## Hard DB evidence (measured 2026-07-18)

| Metric | Measured | Round-2 target | Status |
| --- | --- | --- | --- |
| Listening published | **108** | ≥ 220 | 🟡 |
| Reading published | **126** | ≥ 280 | 🟡 |
| Writing tasks | **45** | ≥ 50 | 🟡 |
| Speaking tasks | **45** | ≥ 50 | 🟡 |
| Vocabulary | **453** | ≥ 600 | 🟡 |
| Mocks × sections | 4 × (39 CO + 39 CE + 3 EE + 3 EO) | same | ✅ structure |
| Distinct CO across mocks / slots | **108 / 156** | 156 / 156 | ❌ 48 items reused across forms |
| Distinct CE across mocks / slots | **126 / 156** | 156 / 156 | ❌ 30 items reused across forms |
| Standalone (non-mock) items | derived | ≥ 150 | 🟡 |

## Spec-item verification

| Item | Status | Evidence / route / table / test | Missing |
| --- | --- | --- | --- |
| Guest-first loop, 2-click start | ✅ | `/`, `/practice/start`, E2E core #1–3 | — |
| Guest→account merge (idempotent) | ✅ | `lib/auth/merge`, integration + E2E #4 | — |
| Practice engine + autosave + resume | ✅ | `lib/practice/session`, `practice_sessions`/`responses` | — |
| Server-authoritative grading | ✅ | `submitSession`, integration test | — |
| Listening audio exists & plays | ✅ (quality 🟠) | 108 m4a in `public/audio`, `audio_assets` | not QA-graded; TTS naturalness unproven |
| Reading UI | ✅ | `question-card`, E2E #5 | — |
| Writing local feedback (no AI) | ✅ | `lib/writing/analyze`, E2E #14 | AI adapter is stub |
| Speaking record + fallback | ✅ | `speaking-recorder`, E2E #15/16 | ASR/AI stub |
| Mock timed CO+CE, refresh-safe, auto-submit | ✅ | `lib/practice/mock`, E2E #8–11 | only 2 of 4 sections timed |
| **Unified 4-section mock (one attempt, EE/EO inside)** | ❌ | EE/EO are separate tools | unified `mockAttemptId`, per-section timing, unified result |
| **4 mocks with non-overlapping CO/CE** | ❌ | 48 CO / 30 CE reused across forms | reserve 156+156 distinct; overlap-fails-audit test |
| Content scale (220/280/50/50/600) | 🟡 | counts above | +112 CO, +154 CE, +5 EE, +5 EO, +147 vocab |
| ≥150 standalone specialized items | 🟡 | ~ (108−mock)+(126−mock) | ensure ≥150 non-mock published |
| Adaptive recommendation + reason codes | ✅ | `lib/recommend`, dashboard | — |
| SM-2 review / mistakes / bookmarks | ✅ | `review_queue`/`mistakes`/`bookmarks` | — |
| Entitlements + gating (free/premium) | ✅ | `lib/entitlements`, E2E #20–22 | — |
| Payments | 🟡 | simulator works; Stripe adapter path | webhook idempotency, cancel |
| Admin CRUD/status/version/import | 🟡 | `/admin/*` edit+status+import work | publish-permission checks; re-assemble UI; report workflow states |
| i18n fr/en/zh | 🟡 | chrome + reason codes translated | many product strings still French-only |
| Privacy: export + delete | ✅ | `/api/account/export`, delete action | recording cleanup on delete unverified |
| Password reset | ❌ | none | provider interface + email abstraction |
| Health/readiness, logging, error boundary, 404/500 | ❌ | none | add |
| Rate limiting | ❌ | none | persistent adapter |
| Audio QA system (tiers, normalization, admin queue) | ❌ | none | build |

## Round-2 execution order (proceeding immediately, no pause)

B: scale content + non-overlapping mock assembler + overlap-fails audit test + audio for new items →
C: unified 4-section mock → D: audio QA → E: UX audit + fixes + commercial closure → F: DoD + report.
