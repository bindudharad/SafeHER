# 12 — Build & Deployment

> Also see the root [DEPLOYMENT.md](../DEPLOYMENT.md) for deployment checklists.

## Production Frontend Build

```bash
npm --prefix frontend run build
```

This runs:
1. `tsc -b` (strict TypeScript project compilation)
2. `vite build` (bundles React, Three.js, GSAP, Tailwind CSS, and compiles `.wgsl` shaders via `wgslVitePlugin()`)

Output artifact: `frontend/dist/`

---

## Production Backend Launch

Set required environment variables before launching Uvicorn:
```bash
export SAFEHER_ENV=production
export SAFEHER_JWT_SECRET="<random-string-at-least-32-chars>"
export SAFEHER_CORS_ORIGINS="https://your-domain.example"
export SAFEHER_DB_PATH="/var/lib/safeher/safeher.db"
export SAFEHER_STORAGE_DIR="/var/lib/safeher/evidence"

python -m uvicorn app:app --app-dir backend --host 0.0.0.0 --port 8000
```

---

## Reverse Proxy Requirements

In production (Nginx / Caddy / Cloud Load Balancer), forward:
- `/api/*`, `/check-text`, `/check-image` -> FastAPI (`127.0.0.1:8000`)
- All other routes -> static `frontend/dist/index.html` (SPA history fallback for React Router)
- Set `client_max_body_size 20M;` (to accommodate the 15 MB evidence limit + multipart overhead).
