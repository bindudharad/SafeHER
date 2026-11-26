# 03 — Three-Member Integration Guide

SafeHER integrates work across three engineering tracks into a single cohesive repository.

---

## Ownership Matrix

| Track | Owner | Key Files | Integration Boundary |
|---|---|---|---|
| **Member 1 (AI / ML)** | AI Engineer | `backend/ai_service.py` (plus legacy `*_sk1.py` prototypes) | Exposes `analyze_text()`, `analyze_image()`, `get_ai_status()`, and model calibration/uncertainty flags |
| **Member 2 (Backend / DB)** | Backend Engineer | `backend/app.py`, `backend/auth.py`, `backend/db.py`, `backend/schemas.py` | Exposes REST endpoints (`/api/v1/*`, `/check-text`, `/check-image`), enforces JWT auth, persists 9 SQLite tables, stores evidence bytes |
| **Member 3 (Frontend / UX)** | Frontend Engineer | `frontend/src/**` | Consumes REST endpoints via `frontend/src/services/api/client.ts`, aligns TypeScript interfaces in `frontend/src/types/index.ts` with `backend/schemas.py` |

---

## How the Three Layers Connect

### 1. Member 1 -> Member 2
`backend/app.py` imports `ai_service` functions directly:
- `/check-text` and `/api/v1/analysis/threat` call `ai_service.analyze_text(...)`.
- `/check-image` and `/api/v1/analysis/media` call `ai_service.analyze_image(...)`.
- `/api/v1/health` calls `ai_service.get_ai_status()` to report model readiness and active mode (`huggingface` vs fallback).

### 2. Member 2 -> Member 3
`frontend/src/services/api/client.ts` calls Member 2's FastAPI endpoints:
- **Authentication**: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me` with `Authorization: Bearer <token>` stored under `localStorage` key `safeher_jwt_token`.
- **Incidents & Timeline**: `/api/v1/incidents`, `/api/v1/incidents/{id}`, `/api/v1/incidents/{id}/timeline`.
- **Evidence Vault**: `multipart/form-data` upload to `/api/v1/incidents/{id}/evidence`, binary download via `/api/v1/evidence/{id}/download`, delete via `/api/v1/evidence/{id}`.
- **AI Analysis**: `/check-text`, `/check-image`, `/api/v1/analysis/threat`, `/api/v1/analysis/media`, `/api/v1/analysis/media/{evidence_id}`.
- **Complaints, Cases & Reporting**: `/api/v1/complaints/generate`, `/api/v1/complaints/{id}`, `/api/v1/cases`, `/api/v1/cases/{id}`, `/api/v1/reporting/destinations`, `/api/v1/reporting/records`, `/api/v1/dashboard/summary`.

### 3. Schema Alignment Rule
Whenever Member 2 modifies a Pydantic model in `backend/schemas.py`, Member 3 must update the corresponding TypeScript interface in `frontend/src/types/index.ts` and the fallback data in `frontend/src/services/api/mockData.ts`.

---

## Preserved Prototype Files

The `backend/` folder intentionally preserves Member 1's early prototype scripts (`api_sk1.py`, `app_sk1.py`, `image_detector_sk1.py`, `image_modelsk1.py`, `index_sk1.html`). The **active production backend** is `backend/app.py` (not `api_sk1.py`).
