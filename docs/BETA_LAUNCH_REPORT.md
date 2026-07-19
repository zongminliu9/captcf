# CapTCF — Private Beta launch report

**Live URL:** <https://captcf.onrender.com> · **Recommendation: YES — ready to invite friends** (with the free-tier caveats in §6).

## 1. Deployment

| Item | Value |
| --- | --- |
| Host | Render (Blueprint from `render.yaml`) |
| Web service | `captcf` · `srv-d9e66m3rjlhs73bq0c1g` (Node, free plan, Oregon) |
| Database | `captcf-db` · `dpg-d9e66bjrjlhs73bpvp90-a` (managed PostgreSQL 17, free) |
| Live commit | `0bdd009` (HEAD == `origin/main`, tree clean) |
| Final deploy | `dep-d9e75nn5u8tc73es4aog` → **succeeded / live** |
| HTTPS | ✅ (Render-managed TLS) |
| Health / Readiness | `/api/health` 200 · `/api/ready` 200 (DB `SELECT 1`) |

Deployed and driven entirely via the Render CLI after a single browser authorization. No duplicate
service or database was created.

## 2. Database (live, managed — not local)

Migrations applied (3) and the idempotent seed ran on deploy. Verified by direct `render psql`:

| questions (pub) | listening | reading | audio | mocks | sections | items | writing | speaking | vocab |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **606** | 266 | 340 | 266 | 4 | 16 | 336 | 69 | 69 | 615 |

No Playwright/test data, local recordings, or dev issue-reports were imported. The throwaway
acceptance account was deleted afterward → **0 users** (pristine for real testers).

## 3. Issues found & fixed during deployment/acceptance

| # | Sev | Issue | Root cause | Fix (commit) | Verified |
| --- | --- | --- | --- | --- | --- |
| D1 | Blocker | Render build failed | `corepack enable` writes to read-only `/usr/bin` (EROFS); Render also picked Node 26 | invoke pnpm via `npx pnpm@9.15.4`, pin `NODE_VERSION=22.11.0` | `bba9e2a` build live |
| D2 | Blocker (free tier) | app would boot against empty DB | `preDeployCommand` is paid-only on Render | run migrate+seed in `startCommand` (both idempotent) | `c73eba1` |
| **L1** | **Critical** | "Commencer gratuitement" (and every Route-Handler redirect: mock start, locale, checkout) sent the browser to `https://localhost:10000` — blank page | behind Render's proxy, `req.url` is the internal origin, so `new URL(path, req.url)` built an absolute Location to localhost | `redirectTo()` emits a **relative** Location (browser resolves against the real origin) | `0bdd009` — live 307 → `/practice/session/…`; guest flow works end-to-end |

No other product defects were found. (Two "button does nothing" observations during automated
clicking were confirmed to be automation coordinate artifacts, not bugs — the real React handlers
for logout and login work; verified directly.)

## 4. Black-box acceptance on the live URL (fresh context)

**Persona A — new visitor:** home is clear at a glance; **2 clicks → real question** (L1 fix);
no forced signup; listening audio streams (`/audio/…m4a → 206`); answering shows **Correct** +
a rationale for the correct answer **and each distractor**; register preserves guest progress.

**Persona B — targeted candidate + mobile:** registration writes to the live DB; **guest→account
merge** confirmed in DB (1 response + 3 sessions carried over); dashboard, mobile bottom-nav, and
relogin all work; data persists across logout/login and across a redeploy (managed DB).

**Persona C — full mock:** `Examen blanc 2` loads the unified 4-section runner (CO 39 / 35 min →
CE → EE → EO) with the correct server-timer contract shown ("le chronomètre… ne se réinitialise pas
si vous rechargez… une section terminée ne peut pas être rouverte"); Premium gating works. The full
start→CO→CE→EE→EO→results + resume + auto-submit + no-redo flow passes in E2E.

**Persona D — errors:** wrong password → "Courriel ou mot de passe incorrect."; duplicate email →
"Cette adresse est déjà utilisée."; mic-denied fallback is E2E-covered with a clear message.

**Devices:** 0px horizontal page overflow at **360 / 375 / 1280**; the wide NCLC table scrolls inside
its own container; mobile shows a bottom nav that doesn't obstruct content. No unexplained console
errors on any page visited.

**Content sampling:** structural audit clean across all 606 (exactly 4 options, valid correct
answer, real explanations, distractor rationales); hand-read listening/reading/writing/speaking
samples are natural French, single-answer, well-targeted, with Canadian context; productive tasks
balanced 23/23/23 across the 3 official types.

## 5. Acceptance gate — status

Real HTTPS URL ✅ · new-visitor flow ✅ · registration ✅ · guest merge ✅ · mobile core ✅ ·
full 4-section mock ✅ · audio from live URL ✅ · mic on HTTPS ✅ (E2E) · live DB persistence ✅ ·
data survives redeploy ✅ · no severe console errors ✅ · no failed critical requests ✅ ·
no admin credentials exposed ✅ · no real-payment risk ✅ (checkout grants nothing, pricing shows
"Beta — paiements bientôt disponibles") · demo credentials hidden ✅ · fresh-browser black-box done ✅ ·
all critical/high issues fixed ✅ · pushed, HEAD == origin/main, clean ✅.

## 6. Honest limitations (unchanged by launch)

1. **Free hosting tier:** first hit after idle wakes in ~1 min (cold start); speaking recordings are
   on ephemeral disk and won't survive a redeploy. A paid Render *Starter* web + disk removes both.
   The free **Postgres expires 2026-08-18** — upgrade before then to keep data.
2. **Audio is synthesised (TTS)** — clear but robotic; honestly labelled, never presented as human.
3. **Writing/speaking feedback + speech-to-text are local rubrics** (adapter stubs) until AI keys are
   set; every score is labelled unofficial.
4. **Email and Stripe are interface-complete but not wired to a live service** — the beta disables
   real payments and grants Premium to invited testers via **Admin → Accès Beta**.
5. i18n covers chrome + reason codes; deep learning strings are French-first (safe fallback).

## 7. How to invite friends

Share <https://captcf.onrender.com> plus [`BETA_TEST_GUIDE.md`](BETA_TEST_GUIDE.md) (browsers, what
not to enter, three flows to try, the in-app "Donner mon avis" button, and a short feedback form).
To give a tester Premium: register as admin (promote your row per
[`DEPLOYMENT.md`](DEPLOYMENT.md#first-admin)), then **Admin → Accès Beta → grant** by email.
