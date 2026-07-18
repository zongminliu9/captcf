# Lighthouse report

Measured against the **production build** (`next start`, port 3300) using the Playwright
Chromium binary, Lighthouse 12, `--preset=desktop`. Public pages were audited (they are the
SEO/performance-critical entry points; authed pages require a session). Raw JSON is written to
`docs/lighthouse-raw/` (gitignored). Run date: 2026-07-18.

| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` (home) | **100** | **96** | **96** | **100** | 0.65 s | 0.000 |
| `/pricing` | **100** | **96** | **96** | **100** | 0.63 s | 0.000 |
| `/exam-format` | **100** | **96** | **96** | **100** | 0.55 s | 0.000 |

## Targets vs measured

| Metric | Target | Measured | Status |
| --- | --- | --- | --- |
| Performance | ≥ 90 | 100 | ✅ |
| Accessibility | ≥ 95 | 96 | ✅ |
| Best Practices | ≥ 90 | 96 | ✅ |
| SEO | ≥ 90 | 100 | ✅ |
| LCP | < 2.5 s | 0.55–0.65 s | ✅ |
| CLS | < 0.1 | 0.000 | ✅ |

## Why it's fast

- **No external fonts** — a system/serif stack, so zero blocking font requests (great LCP).
- **No external CSS/JS/CDN** — self-contained; a strict provider-free surface.
- **RSC-first** — most pages ship minimal client JS; interactive islands only where needed.
- **Static-ish public pages** with tokenized CSS (Tailwind v4) and no layout shift.

## Reproduce

```bash
pnpm build && pnpm start -p 3300
CHROME_PATH=<chromium> npx lighthouse http://localhost:3300/ --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo
```
