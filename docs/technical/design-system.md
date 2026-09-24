# Design System

The look from the 2026 UX refresh (epic #484): photos carry the colour, the UI
stays quiet. Warm white surfaces, soft neutrals, one ink colour, and orange
only on things you can press. No gradients behind content.

Everything lives in `frontend/src/app/globals.css` (the `@theme` block and the
`:root` / `.dark` variables) and `frontend/src/app/layout.tsx` (fonts).

## Type

| Role | Face | Utility |
| --- | --- | --- |
| Display: dog names, headings | Bricolage Grotesque | `font-display` (h1–h3 get it by default) |
| Body, UI, facts | Figtree | `font-sans` (the body default) |

Both load through `next/font/google` with `display: "swap"`. They are variable
fonts, so any weight works without extra downloads. Inter and Caveat are gone.

## Colour

### Neutrals and accent

The Tailwind `gray`, `zinc` and `slate` ramps are **redefined** as one set of
warm neutrals, and `orange` as the accent. Existing `gray-*` and `orange-*`
classes therefore already use the new palette; don't reach for `stone`,
`neutral` or raw hex values.

| Step | Gray | Orange |
| --- | --- | --- |
| 50 | `#FAF9F6` page | `#FFF5EC` |
| 100 | `#F2EFEA` soft fill | `#FFE6D4` |
| 200 | `#E5E1DA` lines | `#FFC9A3` |
| 300 | `#D3CEC5` | `#FFA066` |
| 400 | `#A39D94` muted text (dark) | `#FF7A33` accent (dark) |
| 500 | `#736D66` muted text (light) | `#E0560E` |
| 600 | `#5C5750` | `#C4470A` accent (light) |
| 700 | `#45413C` | `#A63C08` hover |
| 800 | `#2F2C28` lines (dark) | `#85320A` |
| 900 | `#1C1A18` panels (dark) | `#6B2A0B` |
| 950 | `#131211` page (dark) | `#3A1405` |

Accent pairs: `bg-orange-600 text-white` in light mode (4.9:1) and
`bg-orange-400 text-gray-950` in dark mode (7.3:1). `orange-600` on the page
background passes for text too (4.7:1).

### Semantic tokens

For new code prefer these; they switch with the theme on their own.

| Utility | Light | Dark | Use |
| --- | --- | --- | --- |
| `ink` | `#1D1B18` | `#EEEAE3` | Primary text |
| `subtle` | `#736D66` | `#A39D94` | Secondary text |
| `line` | `#E5E1DA` | `#2F2C28` | Borders, dividers |
| `soft` | `#F2EFEA` | `#24211E` | Chips, inputs, quiet fills |
| `surface` | `#FFFFFF` | `#1C1A18` | Cards, panels |
| `good` / `good-soft` | `#1F7A4D` / `#E8F4EC` | `#5BC48A` / `#17281E` | "Good with…" facts |
| `bad` / `bad-soft` | `#B42318` / `#FBECEA` | `#F2877B` / `#2E1916` | "Not with…" facts |
| `unknown` | `#736D66` | `#A39D94` | "Not assessed", shown once and quietly |

The shadcn variables (`background`, `foreground`, `primary`, `muted`,
`border`, `ring`…) use the same values, so `bg-background`, `text-primary` and
the `ui/` components match.

## Shape

- **Radius:** `--radius` is `0.75rem`. Cards and panels use `rounded-xl`
  (12px), controls `rounded-lg`, chips and badges `rounded-full`.
- **Shadow:** one, `shadow-card`. Everything else is a 1px `line` border.

## Missing data

LLM-extracted facts are missing for some dogs and whole rescues. Leave a
missing fact out; never render "Unknown", empty bars or placeholder chips on
cards. On the dog page an unknown compatibility can appear once, in `unknown`.

## Header and navigation

- Desktop (≥1024px): compact "rescuedogs" wordmark, a slot for global search
  (#492), then Dogs / Breeds / Rescues / Guides / Saved (with count badge) and
  the theme toggle. Swipe is not in the desktop header.
- Below 1024px: the mobile tab bar (Browse, Breeds, Swipe, Saved with count
  badge, Menu). About, FAQ and Privacy are in the footer and the menu drawer.
