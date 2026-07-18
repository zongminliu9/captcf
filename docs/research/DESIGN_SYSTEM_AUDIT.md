# Design system

Tailwind v4 CSS-first tokens in `src/app/globals.css`, exposed as semantic utilities.
No external fonts (offline-safe build, best LCP) — a refined system stack; a serif
display stack (`--font-display`) gives a French-editorial touch on hero/headings.

## Tokens

- **Surfaces:** `canvas` (warm off-white / deep navy-black), `surface`, `surface-2`, `surface-3`.
- **Text:** `ink`, `muted`, `faint`.
- **Core information colour:** deep navy (`navy`, `navy-600`, `navy-500`, `navy-100`, `navy-50`).
- **Accents (restrained):** French red `accent`, `gold`.
- **Semantic states:** `success`, `warning`, `danger` each with a `-50` tint.
- **Focus ring:** `--ring` (2px, offset 2px, visible on `:focus-visible`).
- **Radii:** `--radius`, `--radius-sm`, `--radius-lg`. **Shadows:** layered via `--shadow-color`.

## Theming

Light + dark, driven by `prefers-color-scheme` and an explicit `data-theme` toggle
(no-flash inline `ThemeScript`). Both themes are fully specified; the toggle wins in both
directions.

## Components (`src/components/ui`)

`Button` (cva variants), `Card`, `Badge` (+ CEFR colour map), `Meter` (accessible
progressbar), `Input`/`Textarea`/`Label`/`FieldError`, `Alert`, `Skeleton`, `Toast`.
Interactive primitives are keyboard-operable with visible focus.

## Motion & accessibility

- Subtle `rise-in` transition for status changes; `@media (prefers-reduced-motion)` disables it.
- Skip link, semantic headings, form labels, `role="radiogroup"`/`radio`, `role="timer"`,
  `aria-live` for recording state, meters expose `aria-valuenow`.
- Verified breakpoints: 360 / 390 / 768 / 1024 / 1280 / 1440. Mobile is a dedicated layout
  (bottom nav), not a squeezed desktop. Home has no horizontal overflow on mobile (E2E #23).
