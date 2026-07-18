# Round 2 UX audit

Real-browser review across viewports (390 mobile, 768 tablet, 1280/1440 desktop) plus the
Playwright E2E suite (30 tests, chromium + mobile Pixel-7 + WebKit). Findings below are fixed
in-tree; each links to the commit and the verifying test.

## Findings (fixed)

| # | Severity | Route | Issue | Fix | Verification |
| --- | --- | --- | --- | --- | --- |
| U1 | High | `/mock/run/[id]` (QCM) | Section could only be submitted from the *last* question — no way to end a section early; blocked a natural exam action and hung automation | Added an always-visible "Terminer la section / l'examen" button (real-exam behaviour) | `full-mock.spec.ts` §9, §resume |
| U2 | Medium | http preview envs | Secure cookies over http broke guest/auth on non-TLS preview deployments | `COOKIE_INSECURE=1` escape hatch (still secure by default in prod) | manual (prod server on http) |
| U3 | Medium | `/mock/[id]` overview | Copy still said EE/EO were "separate tools" after unification | Rewrote to describe the single 4-section flow | screenshot `r2-mock-results` |
| U4 | Low | `/attempts/[id]/results` (mock) | Needed to distinguish auto-scored vs local self-eval | Separate cards: CO/CE `/699` + "confiance", EE/EO `/20` + "auto-évaluation locale" | `full-mock.spec.ts` §9 |

## Checks performed (pass)

- **No horizontal overflow** at 390px on `/`, `/nclc` (wide table scrolls inside its own
  `overflow-x-auto` container), `/pricing`, `/exam-format`, `/mock-tests`, `/faq` — measured
  `scrollWidth - clientWidth = 0`. Mobile "no overflow" also asserted in `mobile.mobile.spec.ts`.
- **Two-click start** to a real question (E2E §1); instant feedback with rationales (§2).
- **Guest → account merge** preserves data (E2E §4 + integration).
- **One primary action** on the dashboard (single reason-coded recommendation), verified visually
  (`docs/screenshots/03-dashboard.png`).
- **Mock**: refresh-safe per-section timer; finished sections can't be reopened (no grade
  tampering); auto-submit on timeout; unified 4-skill result (E2E §9, §resume, §10).
- **States**: empty (guest/new-user dashboard hero, empty mistakes/bookmarks/review), loading
  (skeleton/pending buttons), error (`error.tsx`, `global-error.tsx`, `not-found.tsx`), disabled
  (nav guards, gated CTAs), success (toasts, "Enregistré").
- **No dead buttons / links**: every nav + CTA resolves to a real route (verified by the route
  list in the build + E2E navigation).
- **Mic-denied** speaking fallback path (E2E §16); recording controls are large tap targets.
- **Focus states** visible (`:focus-visible` ring); skip link; semantic headings; `role="timer"`,
  `role="radiogroup"`, `aria-live` for recording.
- **Console/hydration**: no unexplained console errors or hydration warnings observed in E2E runs.

## New Round-2 screens

`docs/screenshots/r2-*.png`: `mock-listening`, `mock-writing`, `mock-speaking`, `mock-results`
(unified 4-skill), `admin-audio-qa`, `forgot-password`.

## Residual UX notes (non-blocking)

- Full i18n (fr/en/zh) covers chrome + reason codes; learning content stays French by design, and
  many deep product strings remain French-only (safe French fallback, never a raw key). Broadening
  translations is a follow-up.
- TTS audio is honestly labelled; ~53% is `reviewed_tts`, the rest `prototype_tts` — admins can
  promote/regenerate in `/admin/audio`.
