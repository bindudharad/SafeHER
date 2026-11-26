# SafeHER — Setup & Deployment Readiness Guide

## Architecture Overview
- **Frontend**: React 19 + TypeScript + Vite 8 (`wgslVitePlugin`) + Tailwind CSS + Three.js + `vgpu` (WebGPU with CSS/SVG fallbacks)
- **Backend**: FastAPI (`lifespan` managed) + SQLite (`WAL` mode in local dev) / configurable `DATABASE_URL` + PBKDF2-SHA256 / HS256 JWT authentication
- **AI/ML**: HuggingFace `unitary/toxic-bert` (text threat/toxicity) and `AdamCodd/vit-base-nsfw-detector` (single-frame image screening). Audio voice-cloning and multi-frame video detection are deferred future research and not part of the current release.

## Environment Variables
- `SAFEHER_ENV`: Set to `production` in production deployments (defaults to `development`).
- `SAFEHER_JWT_SECRET`: **Mandatory in production** (`>= 32` random characters). Startup fails safely if missing or weak when `SAFEHER_ENV=production`. Generate with:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```
- `SAFEHER_DB_PATH`: SQLite file path for single-node / local dev (defaults to `backend/safeher.db`).
- `DATABASE_URL`: Set to a managed PostgreSQL connection string for multi-worker production deployments.
- `SAFEHER_STORAGE_DIR`: Evidence file storage directory (local dev).
- `SAFEHER_STORAGE_MODE`: `local` (default) or `s3` for managed object storage.

## Database Backup & PostgreSQL Migration Procedure
1. **Backup existing SQLite database before migration**:
   ```bash
   python -c "import sqlite3; src=sqlite3.connect('backend/safeher.db'); dst=sqlite3.connect('backend/safeher.db.bak'); src.backup(dst); dst.close(); src.close()"
   ```
2. **Evidence Storage Encryption at Rest**: SafeHER computes client/server SHA-256 integrity digests and enforces user-scoped access control; it does not apply application-layer AES encryption to files at rest. In production, host evidence volumes on encrypted block storage (LUKS / AWS EBS KMS / Azure Disk Encryption) or KMS-encrypted object storage.

## Local Startup
1. **Backend**:
   ```bash
   pip install -r backend/requirements.txt
   python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
   ```
2. **Frontend**:
   ```bash
   npm --prefix frontend install
   npm --prefix frontend run build
   npm --prefix frontend run dev
   ```

## Verification Suites
- **Backend & AI Integration Tests**: `python -m pytest backend/ -v`
- **Frontend Unit & Component Tests**: `npm --prefix frontend test -- --run`
- **Frontend Lint**: `npm --prefix frontend run lint`
- **Production Build & TypeScript Check**: `npm --prefix frontend run build`
