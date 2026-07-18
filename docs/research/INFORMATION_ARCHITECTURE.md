# Information architecture

Route groups: `(marketing)` (header/footer), `(app)` (product shell with sidebar + mobile
bottom nav + focus mode), `(auth)` (centered). Focus mode (no chrome) applies to
`/practice/session`, `/mock/run`, `/diagnostic`, `/onboarding`, `/writing/[id]`, `/speaking/[id]`.

## Public (marketing)

| Route | Purpose |
| --- | --- |
| `/` | Home — value prop, guest-first CTAs, product preview |
| `/tcf-canada` | What the exam is + independence disclaimer |
| `/exam-format` | Per-section breakdown (from config) |
| `/nclc` | Score→NCLC table + explainer |
| `/mock-tests` | Mock exams overview |
| `/pricing` | Free vs Premium (from PLAN_LIMITS) |
| `/faq` `/privacy` `/terms` | Support & legal |
| `/login` `/register` | Auth |

## Product (`(app)`)

| Area | Routes |
| --- | --- |
| Home | `/dashboard` |
| Onboarding/diagnostic | `/onboarding`, `/diagnostic` |
| Practice | `/practice`, `/practice/custom`, `/practice/start` (route handler), `/practice/session/[id]`, `/attempts/[id]/results` |
| Skills | `/listening`, `/reading`, `/writing`, `/writing/[id]`, `/speaking`, `/speaking/[id]` |
| Mock | `/mock`, `/mock/[id]`, `/mock/[id]/begin` (handler), `/mock/run/[id]` |
| Learning state | `/review`, `/mistakes`, `/bookmarks`, `/vocabulary`, `/progress`, `/study-plan` |
| Account | `/settings` |
| Admin | `/admin`, `/admin/questions`, `/admin/questions/[id]`, `/admin/import`, `/admin/reports` |

## API route handlers

`/api/locale`, `/api/account/export`, `/api/billing/checkout`, `/api/speaking/submit`,
`/api/speaking/audio/[id]`. "Start" flows are route handlers (not pages) because they set the
guest cookie, which page renders may not do.

## Navigation

- Desktop: left sidebar (primary + secondary + plan card).
- Mobile: bottom nav (Dashboard, Practice, Mock, Review, Progress) with a due-review badge.
- Every nav item routes to a real, working page (no dead links).
