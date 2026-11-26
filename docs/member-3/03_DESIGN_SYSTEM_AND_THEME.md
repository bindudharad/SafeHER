# 03 — Design System & Theme ("Midnight Aurora")

SafeHER's visual identity is built around the **Midnight Aurora** cybersecurity palette — calm, authoritative, high-contrast, and trauma-informed (avoiding harsh neon reds except for genuine critical alerts).

---

## Core Color Tokens

| Token / Role | Hex / Value | Usage |
|---|---|---|
| **Void Canvas** | `#080B18` | Primary page background |
| **Deep Surface** | `#0F1428` / `#131A33` | Cards, panels, sidebar, modals |
| **Aurora Violet** | `#8B7CFF` | Primary brand accent, focus rings, active states, 3D LED rings |
| **Aurora Cyan / Teal** | `#5EEAD4` / `#22D3EE` | Secondary cyber highlight, telemetry badges, shader trails |
| **Primary Text** | `#F8FAFC` / `#E2E8F0` | Headings and primary body copy |
| **Muted Text** | `#A6AEC8` / `#94A3B8` | Supporting labels, metadata, timestamps |

---

## Stylesheets

- `frontend/tailwind.config.js` — Tailwind utility configuration and theme extensions.
- `frontend/src/index.css` — Tailwind directives (`@tailwind base/components/utilities`), font imports, scrollbar styling, and base dark theme rules.
- `frontend/src/zsure.css` — Custom landing-page marquee, glassmorphism, and aurora glow utilities.

---

## Common UI Primitives (`frontend/src/components/common/`)

Reuse these instead of inventing raw HTML controls:
- `Button.tsx` — Primary, secondary, ghost, and danger variants
- `Card.tsx` — Dark glass surface container
- `Input.tsx` — Styled text/textarea inputs with error labels
- `Modal.tsx` — Accessible overlay dialog
- `Badge.tsx` — Severity/status pills (`SAFE`, `WARNING`, `SUSPICIOUS`, `BLOCKED`)
- `Tooltip.tsx` — Contextual helper popovers
- `SafeHERLogo.tsx` — Official brand emblem (`SAFEHER_LOGO_SRC`, size presets)
- `AnimatedDataPanel.tsx` — Interactive subtle 3D tilt/glow wrapper for data cards
