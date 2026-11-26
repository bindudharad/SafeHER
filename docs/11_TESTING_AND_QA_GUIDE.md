# 11 — Testing & QA Guide

## Test Suites Overview

| Layer | Runner | Location | Verified Baseline |
|---|---|---|---|
| **Backend Integration & Security** | `pytest` | `backend/test_backend_integration.py`, `backend/test_security_hardening.py` | **12 passed** |
| **Frontend Unit & Component Tests** | `vitest` (`jsdom`) | `frontend/src/tests/*.test.tsx` (14 files) | **44 passed** (14 files) |
| **Frontend Linter** | `oxlint` | `frontend/src/` | **0 errors** |
| **Frontend Typecheck & Bundle** | `tsc -b && vite build` | `frontend/` | **Exit 0** |

---

## Running All Checks

Run from the `SafeHER/` root directory:

```bash
# 1. Backend tests (uses isolated temp SQLite DB + storage)
python -m pytest backend/ -v

# 2. Frontend linter
npm --prefix frontend run lint

# 3. Frontend unit & component tests
npm --prefix frontend test -- --run

# 4. Frontend TypeScript check + production build
npm --prefix frontend run build
```

---

## Frontend Test Files (`frontend/src/tests/`)

1. `foundation.test.tsx` — Crypto SHA-256, formatting helpers, core utils
2. `auth.test.tsx` — Login, register, `ProtectedRoute`, `AuthContext`
3. `splash_animation.test.tsx` — `SafeHERSplash` & `SplashContext` 4-stage lifecycle
4. `landing_page.test.tsx` — Hero, branding, navigation, CTA, White Paper section
5. `spiral_galaxy.test.tsx` — `SpiralGalaxyHeroBackground` WebGPU + fallback behavior
6. `logo_led_3d.test.tsx` — `SafeHERLogoLed3D` + animated watermark layer
7. `holographic_whitepaper.test.tsx` — `HolographicWhitePaperCard` + fallback
8. `animations.test.tsx` — GSAP/Lenis + `useReducedMotion`
9. `dashboard_incidents.test.tsx` — Dashboard summary & incident list/detail/new
10. `evidence_vault.test.tsx` — Evidence dropzone, SHA-256, card badges
11. `ai_analysis.test.tsx` — `DetectPage`, `MediaAnalysisPage`, `ThreatAnalysisPage`
12. `complaint_case.test.tsx` — Complaint wizard & case tracking
13. `reporting_settings.test.tsx` — Reporting assistant & privacy settings
14. `multi_page_platform.test.tsx` — Knowledge Hub, Reality & Trust Center, 3D cards

---

## Manual Visual QA

When modifying 3D/WebGPU components or Landing Page sections, visually verify in a live Chromium browser at `1440px`, `1280px`, and `390px` viewports and confirm zero console errors.
