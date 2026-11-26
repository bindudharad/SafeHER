# 06 — Backend FastAPI Reference

## Module Layout (`backend/`)

| File | Responsibility |
|---|---|
| `backend/app.py` | Main FastAPI application, startup lifecycle (`init_db()`, `validate_jwt_configuration()`), CORS middleware, and all 28 HTTP endpoints |
| `backend/auth.py` | PBKDF2-HMAC-SHA256 password hashing (120,000 iterations), HS256 JWT issuance/verification (24h TTL), `get_current_user` dependency |
| `backend/db.py` | SQLite connection factory (`WAL`, `foreign_keys = ON`, `busy_timeout = 5000`), schema initialization (9 tables), and `SAFEHER_STORAGE_DIR` management |
| `backend/schemas.py` | Pydantic v2 request/response models and field validation constraints |
| `backend/ai_service.py` | Thread-safe lazy AI model loader (`unitary/toxic-bert`, `AdamCodd/vit-base-nsfw-detector`) and inference functions |
| `backend/test_backend_integration.py` | End-to-end API & DB integration test suite |
| `backend/test_security_hardening.py` | Security regression suite (JWT validation, PBKDF2, user isolation, upload limits) |

---

## Startup Lifecycle (`backend/app.py`)

On application startup:
1. `validate_jwt_configuration()` verifies that production environments do not use the development fallback JWT secret.
2. `init_db()` creates all 9 SQLite tables if absent and ensures `SAFEHER_STORAGE_DIR` (`backend/storage/evidence/`) exists.
3. CORS middleware is configured using `SAFEHER_CORS_ORIGINS` (defaulting to `http://localhost:5173,http://127.0.0.1:5173`).

---

## Multipart Evidence Handling & Ownership Isolation

- Evidence uploads via `POST /api/v1/incidents/{incident_id}/evidence` enforce:
  - Authenticated ownership check (`incident.user_id == current_user["id"]`).
  - Allowed file types and size limits (15 MB max).
  - Server-side SHA-256 computation (`hashlib.sha256`) and duplicate detection against existing evidence hashes.
  - Files are stored outside web roots in `backend/storage/evidence/` with sanitized UUID filenames, never trusting raw user paths.
- Downloads (`GET /api/v1/evidence/{evidence_id}/download`) and deletions (`DELETE /api/v1/evidence/{evidence_id}`) verify `user_id` ownership before streaming or removing files.

---

## Related Documents

- [07_DATABASE_SCHEMA_AND_STORAGE.md](07_DATABASE_SCHEMA_AND_STORAGE.md)
- [09_API_CONTRACT_REFERENCE.md](09_API_CONTRACT_REFERENCE.md)
- [10_AUTHENTICATION_AND_SECURITY.md](10_AUTHENTICATION_AND_SECURITY.md)
