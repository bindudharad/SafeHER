# SafeHER — AI-Powered Digital Abuse Intelligence & Evidence Response Platform

**SafeHER** is an end-to-end platform engineered to detect, preserve, protect, and empower individuals targeted by digital abuse, online harassment, cyberbullying, threatening communications, blackmail, extortion, impersonation, and manipulated synthetic media.

---

## Documentation Hub

- **Full Engineering Documentation:** [docs/README.md](docs/README.md)
- **Member 3 (Frontend & UX) Handover Hub:** [docs/member-3/README.md](docs/member-3/README.md)
- **Day-1 Frontend Developer Checklist:** [docs/member-3/20_MEMBER3_DEVELOPER_HANDOVER.md](docs/member-3/20_MEMBER3_DEVELOPER_HANDOVER.md)
- **Current Status & Audit Reports:** [docs/releases/CURRENT_PROJECT_STATUS.md](docs/releases/CURRENT_PROJECT_STATUS.md) · [reports/final-project-audit/FINAL_PROJECT_AUDIT.md](reports/final-project-audit/FINAL_PROJECT_AUDIT.md)

---

## Repository Structure

```text
SafeHER/
├── backend/                     # FastAPI REST API, SQLite WAL DB & HuggingFace AI services
│   ├── app.py                   # Production FastAPI application (28 endpoints)
│   ├── auth.py                  # PBKDF2-HMAC-SHA256 + HS256 JWT authentication
│   ├── db.py                    # SQLite WAL schema (9 tables) & evidence storage config
│   ├── schemas.py               # Pydantic v2 request/response schemas
│   ├── ai_service.py            # Toxic-BERT & ViT NSFW detector with lazy thread-safe loading
│   ├── test_backend_integration.py
│   ├── test_security_hardening.py
│   └── requirements.txt
│
├── frontend/                    # React 19 + TypeScript + Vite 8 + WebGPU (vgpu) + Three.js SPA
│   ├── src/
│   │   ├── app/                 # App.tsx provider tree & router.tsx (17 routes)
│   │   ├── components/          # 3D/WebGPU, landing, layout, evidence, incident & UI primitives
│   │   ├── contexts/            # AuthContext, I18nContext, SplashContext, ToastContext
│   │   ├── i18n/                # English (en), Kannada (kn), Hindi (hi)
│   │   ├── pages/               # Landing, Auth, Detect, Dashboard, Incidents, Vault, AI, Complaints, Cases, Knowledge, Trust, Settings
│   │   ├── services/api/        # Unified apiClient with live/offline_demo resilience
│   │   └── tests/               # 14 Vitest test suites (44 tests)
│   ├── package.json
│   └── vite.config.ts           # Vite + wgslVitePlugin + /api proxy to 127.0.0.1:8000
│
├── docs/                        # 43-document project & Member 3 handover knowledge base
├── reports/final-project-audit/ # Independent engineering audit reports
└── DEPLOYMENT.md                # Production deployment checklist
```

---

## Quick Start

### 1. Backend Setup & Run (`127.0.0.1:8000`)
```bash
cd backend
pip install -r requirements.txt
cd ..
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup & Run (`localhost:5173`)
```bash
cd frontend
npm install
cd ..
npm --prefix frontend run dev
```

Open `http://localhost:5173`.

### 3. Verification Suite
```bash
# Backend integration & security tests (12 tests)
python -m pytest backend/ -v

# Frontend lint (oxlint)
npm --prefix frontend run lint

# Frontend tests (14 files, 44 tests)
npm --prefix frontend test -- --run

# Frontend TypeScript check + production build
npm --prefix frontend run build
```
