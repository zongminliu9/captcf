# User journeys

## 1. First-time visitor → first value (guest)

Home → **Commencer gratuitement** → a real question renders (≤ 2 clicks, verified in E2E #1).
Answer → instant feedback with the correct answer + *why each distractor is wrong* + transcript
(listening). Complete the short session → per-skill unofficial estimate (score/699, CEFR, NCLC,
confidence) + full review. No account required at any point.

## 2. Quick diagnostic

`/diagnostic` → 12 mixed listening/reading items of progressive difficulty → results with a
CEFR/NCLC estimate range and the weakest skill highlighted, plus a nudge to set a goal.

## 3. Register and keep progress (guest → account)

After practising as a guest, **Créer un compte** → the guest's sessions, attempts, mastery,
mistakes, bookmarks and reviews are **idempotently merged** into the new account (verified in
E2E #4 and integration tests). No duplicated attempts/mistakes.

## 4. Returning learner → daily loop

`/dashboard` shows one **primary recommendation** (reason code + estimated minutes + CTA),
streak, weekly minutes, due-review count, four skill mastery meters, goal gap, and recent
activity. The recommendation changes as the learner's data changes.

## 5. Targeted practice & review

Practice hub → quick / by-skill / custom / mistakes / bookmarks / due-review. Wrong answers
become mistakes and enter an SM-2 review queue; correct answers on due items advance them.

## 6. Full mock exam

`/mock` → choose a form (form 1 free, others Premium) → per-section timed runner (CO 35 min,
CE 60 min) with limited audio plays, no answer reveal, autosave, a **refresh-safe** clock, and
**auto-submit** on timeout → per-section results. (Verified in E2E #8–11.)

## 7. Writing

`/writing` → task → editor with autosave, word count, timer, focus mode → submit → deterministic
local rubric (length, content coverage, organisation, cohesion, variety) + unofficial 0–20 band
+ model answer. Works with no AI key. (E2E #14.)

## 8. Speaking

`/speaking` → task → mic check → (prep countdown) → record with a live volume meter → playback →
up to two takes to compare → self-eval checklist → submit → local rubric (duration, audibility,
fluency, coverage). Mic denied/absent → a sensible fallback path. (E2E #15, #16.)

## 9. Upgrade & account

Free daily limits → `/pricing` → checkout (Stripe when configured, else dev simulator) →
Premium unlocks. Settings → export data (JSON) or delete account. (E2E #20–22.)

## 10. Admin (content ops)

`/admin` → questions list/filter/edit/status, atomic JSON import with validation preview,
issue reports. Non-admins are redirected. (E2E #18, #19.)
