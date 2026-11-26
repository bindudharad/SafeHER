# 13 — Troubleshooting Guide

## 1. Frontend Shows "Offline Demo Mode" Banner
- **Cause:** Backend is not running on `http://127.0.0.1:8000` or `VITE_USE_MOCK_API=true` is set.
- **Fix:** Start FastAPI (`python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000 --reload`) and verify `http://127.0.0.1:8000/api/v1/health`.

## 2. WebGPU 3D Visuals Show CSS/SVG Fallback Instead of Shaders
- **Cause:** Browser lacks WebGPU (`navigator.gpu` undefined), hardware acceleration is disabled, or `requestAdapter()` returned `null` (common in headless environments).
- **Expected Behavior:** `SpiralGalaxyHeroBackground`, `SafeHERLogoLed3D`, and `HolographicWhitePaperCard` are designed to degrade gracefully to CSS/SVG fallbacks without throwing errors.
- **Fix (if WebGPU is expected):** Use Chrome/Edge 113+ with hardware acceleration enabled.

## 3. First AI Request Takes Several Seconds or Falls Back
- **Cause:** `unitary/toxic-bert` and `AdamCodd/vit-base-nsfw-detector` are lazy-loaded on first request; if weights are not cached locally, HuggingFace downloads them.
- **Fix:** Wait for initial weight download to finish, or check `/api/v1/health` `ai` status.

## 4. `database is locked` in SQLite
- **Cause:** Multiple writers hitting SQLite without WAL mode.
- **Fix:** `backend/db.py` enables `WAL` and `busy_timeout=5000`; ensure only one Uvicorn worker process writes to the same SQLite file in development (`--workers 1`).

## 5. Production Startup Fails with JWT Secret Error
- **Cause:** `SAFEHER_ENV=production` is set while `SAFEHER_JWT_SECRET` is unset or under 32 characters.
- **Fix:** Export a strong `SAFEHER_JWT_SECRET` (32+ characters).
