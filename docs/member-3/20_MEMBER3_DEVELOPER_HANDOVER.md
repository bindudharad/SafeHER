# 20 — Member 3 Developer Handover Checklist

Welcome! Follow this checklist to take over **Member 3 (Frontend & UX)** cleanly and safely.

---

## Day-1 Onboarding Steps

1. **Clone & Install**
   ```bash
   cd backend && pip install -r requirements.txt
   cd ../frontend && npm install
   ```
2. **Start Both Servers**
   - Terminal 1: `python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000 --reload`
   - Terminal 2: `npm --prefix frontend run dev`
3. **Run Baseline Verification (must all pass before you edit anything)**
   ```bash
   python -m pytest backend/ -v
   npm --prefix frontend run lint
   npm --prefix frontend test -- --run
   npm --prefix frontend run build
   ```
4. **Explore the App Live** at `http://localhost:5173` (landing page, `/detect`, `/dashboard`, `/incidents`, `/evidence`, `/analysis/media`, `/analysis/threat`, `/complaints`, `/reporting`, `/cases`, `/knowledge-hub`, `/reality-trust-center`, `/settings`).

---

## Strict Change-Control Rules (Preserve Working Features)

- **Do not break `LandingPage.tsx` hero/navigation/brand identity** (`SpiralGalaxyHeroBackground`, `SAFEHER` watermark, `SafeHERLogoLed3D`, `HolographicWhitePaperCard`, `SafeHERSplash`).
- **Keep `TrustShield3D.tsx` intact** (preserved component).
- **Never mask HTTP `4xx/5xx` errors** in `apiClient` (`client.ts`) as offline mock successes.
- **Keep `frontend/src/types/index.ts` aligned** with `backend/schemas.py`.
- **Always run lint + Vitest + build** after every frontend change.

---

## Common Member 3 Tasks

- **Add a new page:** Create page in `frontend/src/pages/`, add route in `frontend/src/app/router.tsx`, add nav item in `Sidebar.tsx`, add i18n keys in `frontend/src/i18n/translations.ts`, and add a Vitest suite in `frontend/src/tests/`.
- **Add a new API call:** Add method to `apiClient` in `frontend/src/services/api/client.ts` (using `apiFetch` + Bearer token) and add offline fallback in `mockData.ts`.
- **Update 3D/WebGPU visuals:** Always provide a clean CSS/SVG fallback when `navigator.gpu` or WebGL is unavailable, and clean up animation frames / GPU resources on unmount.
