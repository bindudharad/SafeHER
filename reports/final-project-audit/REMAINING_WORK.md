# Remaining Work (Updated After Final Completion)

## Completed Code-Level Gaps
- Production JWT secret enforcement (`backend/auth.py` + `backend/test_security_hardening.py`): **DONE**
- Database WAL mode, config inspection, and deployment/migration documentation (`backend/db.py`, `DEPLOYMENT.md`): **DONE**
- FastAPI `lifespan` migration & `HTTP_422_UNPROCESSABLE_CONTENT` deprecation cleanup (`backend/app.py`, `backend/ai_service.py`): **DONE**

## Remaining External / Deferred Items
1. **[Deferred Future Research — Member 1] Audio Voice-Clone & Multi-Frame Video Detection**: Outside agreed release scope; disclosed as planned research in UI & `DEPLOYMENT.md`.
2. **[External Hardware Sign-Off — Member 3] Physical GPU WebGPU Visual Verification**: Run manual WebGPU check in Chrome/Edge on a physical GPU machine per `MEMBER_3_FRONTEND_AUDIT.md`.
3. **[External Infrastructure — Ops] Production Environment Provisioning**: Set `SAFEHER_ENV=production`, strong `SAFEHER_JWT_SECRET`, managed PostgreSQL (`DATABASE_URL`), and encrypted storage volume before public launch.
