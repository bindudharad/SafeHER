# 05 — Environment & Configuration

## Backend Environment Variables (`backend/`)

Configured across `backend/auth.py`, `backend/db.py`, and `backend/app.py`:

| Variable | Default (Dev) | Purpose | Source |
|---|---|---|---|
| `SAFEHER_ENV` / `ENVIRONMENT` | `development` | Controls environment mode (`production` enforces strict JWT secret rules) | `backend/auth.py` |
| `SAFEHER_JWT_SECRET` | Dev fallback secret (blocked in production) | HS256 signing key for JWT access tokens (minimum 32 chars in production) | `backend/auth.py` |
| `SAFEHER_DB_PATH` | `backend/safeher.db` | Path to the SQLite database file | `backend/db.py` |
| `SAFEHER_STORAGE_DIR` | `backend/storage/evidence` | Directory where uploaded evidence files are stored | `backend/db.py` |
| `SAFEHER_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed CORS origins | `backend/app.py` |

> **Security Rule:** Never set `SAFEHER_ENV=production` without a strong `SAFEHER_JWT_SECRET` (at least 32 characters). `validate_jwt_configuration()` in `backend/auth.py` will raise a startup error if production runs with a weak or default secret.

---

## Frontend Environment Variables (`frontend/`)

Configured in `frontend/vite.config.ts` and `frontend/src/services/api/client.ts`:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_USE_MOCK_API` | `false` (unset) | When `'true'`, skips live HTTP calls and runs `apiClient` strictly in `offline_demo` mode using `mockData.ts` |

---

## Vite Dev Server & Proxy Configuration

From `frontend/vite.config.ts`:
- **Port:** `5173` (`strictPort: true`)
- **Path Alias:** `@` -> `./src`
- **Plugins:** `@vitejs/plugin-react` + `wgslVitePlugin()` (from `vgpu` for `.wgsl` shader imports)
- **Proxied Paths -> `http://127.0.0.1:8000`:**
  - `/api`
  - `/check-text`
  - `/check-image`
- **Test Environment:** Vitest with `environment: 'jsdom'`, `globals: true`, and `setupFiles: './src/tests/setup.ts'`.
