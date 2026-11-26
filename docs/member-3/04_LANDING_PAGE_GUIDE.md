# 04 — Landing Page Guide (`frontend/src/pages/LandingPage.tsx`)

`LandingPage.tsx` is SafeHER's public entry point (`/`). It is protected by strict visual stability guidelines: **do not redesign its layout, typography, or CTA routes without explicit approval**.

---

## Visual Layering in the Hero Section

1. **Background Layer:** `SpiralGalaxyHeroBackground.tsx` — Interactive WebGPU spiral galaxy (`vgpu` + `.wgsl` shaders) behind the hero content.
2. **Brand Watermark Layer:** Large, low-opacity uppercase `SAFEHER` watermark behind the central 3D logo with soft Aurora Violet ambient glow.
3. **Central 3D Hero Visual:** `SafeHERLogoLed3D.tsx` — Official SafeHER emblem inside animated circular violet/cyan WebGPU LED rings.
4. **Foreground Copy & CTAs:** Hero headline, supporting copy, and primary navigation actions into `/detect`, `/dashboard`, `/login`, and `/register`.

---

## Landing Sub-Components (`frontend/src/components/landing/`)

| Component | Purpose |
|---|---|
| `HolographicWhitePaperCard.tsx` | Interactive WebGPU holographic 3D research card on the left side of the White Paper section |
| `TechnicalPaperCard.tsx` | White Paper section wrapper paired with the "Download the Paper" action |
| `RiskCoverageGrid.tsx` | Grid of covered digital abuse categories |
| `StackedCardCarousel.tsx` | Interactive stacked card showcase |
| `ThreeDImageConveyor.tsx` | 3D perspective conveyor strip |
| `CircularRevealManifesto.tsx` | Scroll-driven circular reveal manifesto section |
| `ConnectedSvgCurve.tsx` | SVG path connector animated on scroll |
| `MarqueeBand.tsx` / `ButtonMarquee.tsx` | Continuous marquee bands and button hover marquees |
| `IntroModal.tsx` | Optional introductory modal |

---

## Preserved Unused Component
- `frontend/src/components/3d/TrustShield3D.tsx` is intentionally **preserved** in the codebase even though the hero now displays `SafeHERLogoLed3D.tsx`. Do not delete `TrustShield3D.tsx`.
