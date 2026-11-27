# SafeHER — AI-Powered Digital Abuse Intelligence & Forensic Evidence Platform

**SafeHER** is an independent, survivor-centered platform engineered to detect, preserve, analyze, and document digital abuse, online harassment, blackmail, extortion, impersonation, and manipulated synthetic media.

---

## Product Overview & Core Capabilities

SafeHER is organized into seven integrated operational stages:

1. **Encrypted Evidence Vault (Stage 1):** AES-256-GCM authenticated encryption with 96-bit CSPRNG nonces, Associated Authenticated Data (AAD) binding, RSA-OAEP / KEK dual key-wrapping, RSA-PSS digital signatures, and tamper-evident hash-chained custody logs.
2. **Content Credentials & Face Localization (Stage 2):** C2PA digital provenance verification (`c2pa-python` / `c2pa-rs`), EXIF/TIFF/GPS metadata extraction (`ExifRead`), magic-byte MIME verification (`filetype`), perceptual hashing (`ImageHash`), and RetinaFace ResNet-50 spatial face localization with 5-point landmarks.
3. **Synthetic Media & Deepfake Detection (Stage 3):**
   - **Model A (AI-Generated Image Detection):** Effort-AIGI (CLIP ViT-L/14 + Orthogonal SVD) for synthetic vs. authentic image classification.
   - **Model B (Facial Deepfake Detection):** Xception (FaceForensics++ benchmark) evaluated on RetinaFace-aligned 256×256 face crops.
   - **NSFW Content Screening:** `AdamCodd/vit-base-nsfw-detector` (Apache-2.0).
   - **Zero-Fabrication Policy:** When a checkpoint is unavailable, SafeHER explicitly reports `status="unavailable"` and `prediction="undetermined"` rather than fabricating scores.
4. **Multilingual Indic Threat & Abuse NLP (Stage 4):** Multi-label 12-category threat taxonomy supporting **Kannada (`kn`)**, **Romanized Kannada (`kn-Latn`)**, **Kannada-English code-mixed (`kn-en`)**, **Hindi (`hi`)**, **Hinglish (`hi-Latn`)**, and **English (`en`)** using `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL`, `unitary/toxic-bert`, and `Hate-speech-CNERG/deoffxlmr-mono-kannada`.
5. **Forensic Intelligence & Case Management (Stage 5):** Evidence relationship graph, normalized multi-source incident timeline, tampering localization interface, and deny-by-default RBAC case management.
6. **Survivor Safety Tools (Stage 6):** Emergency quick-access drawer, one-click Quick Exit, Fake Call simulation, audible Siren, trusted contacts management, and journey check-in timers.
7. **Production Hardening (Stage 7):** PBKDF2-HMAC-SHA256 password hashing, HS256 JWT authentication, SlowAPI rate limiting, security headers, malware/magic-byte scanning, CycloneDX SBOM generation, and encrypted backup/recovery.

---

## Architecture & Repository Structure

```text
SafeHER/
├── backend/                     # FastAPI REST API, SQLite WAL DB, Cryptography, Forensics & AI
│   ├── ai/                      # C2PA, RetinaFace, Effort-AIGI, Xception, Multilingual NLP, Workers
│   ├── forensics/               # Case service, timeline service, evidence graph, metadata service
│   ├── security/                # AES-256-GCM crypto engine, key manager, malware & header hardening
│   ├── scripts/                 # Backup/recovery, SBOM generation (CycloneDX)
│   ├── app.py                   # Production FastAPI application
│   ├── auth.py                  # PBKDF2-HMAC-SHA256 + HS256 JWT authentication
│   ├── db.py                    # SQLite WAL schema & storage configuration
│   ├── schemas.py               # Pydantic v2 request/response schemas
│   ├── Dockerfile               # Multi-stage hardened non-root container
│   └── requirements.txt         # Verified Python dependencies
│
├── frontend/                    # React 19 + TypeScript + Vite 8 + WebGPU (vgpu) + Three.js SPA
│   ├── src/
│   │   ├── app/                 # App.tsx provider tree & router.tsx
│   │   ├── components/          # 3D/WebGPU, landing, layout, evidence, incident & UI primitives
│   │   ├── contexts/            # AuthContext, I18nContext, SplashContext, ToastContext
│   │   ├── i18n/                # English (en), Kannada (kn), Hindi (hi)
│   │   ├── pages/               # Landing, Auth, Detect, Dashboard, Incidents, Vault, AI, Cases, Settings
│   │   ├── services/api/        # Unified apiClient with live/offline resilience
│   │   └── tests/               # Vitest unit & integration test suites
│   ├── package.json
│   └── vite.config.ts
│
├── models/                      # Pretrained AI model weights & provenance guide
├── SAFEHER_MULTILINGUAL_DATASET/# Clean-room synthetic CC0-1.0 Stage 4 evaluation benchmark
├── docs/                        # Engineering architecture, setup, API & frontend documentation
├── nginx/                       # Reverse proxy & TLS configuration
├── .github/workflows/           # CI/CD (pytest, flake8, bandit, oxlint, vitest, build, SBOM, Trivy)
├── docker-compose.prod.yml      # Production multi-container orchestration
├── DEPLOYMENT.md                # Production deployment checklist
├── MODEL_PROVENANCE.md          # Cryptographic checksums & license ledger for AI models
└── THIRD_PARTY_NOTICES.md       # Open-source software & model attributions
```

---

## Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 20+ and npm

### 1. Backend Setup (`127.0.0.1:8000`)
```bash
cd backend
pip install -r requirements.txt
cd ..
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup (`localhost:5173`)
```bash
cd frontend
npm ci
cd ..
npm --prefix frontend run dev
```

Open `http://localhost:5173`.

---

## Configuration, Database & Evidence Storage

- Copy `.env.example` to `.env` for local overrides (never commit `.env`).
- **Required in Production:** `SAFEHER_ENV=production`, `SAFEHER_JWT_SECRET` (≥ 32 chars), and `SAFEHER_KEK` / key-wrapping configuration.
- **Database:** SQLite in WAL mode (`backend/safeher.db` by default, configurable via `SAFEHER_DB_PATH`).
- **Evidence Storage:** Encrypted binary blobs stored under `backend/storage/` (configurable via `SAFEHER_STORAGE_DIR`) with `0700` directory permissions in Docker.

---

## AI Models & Licensing

See [MODEL_PROVENANCE.md](MODEL_PROVENANCE.md) and [models/README.md](models/README.md) for SHA-256 checksums, upstream sources, and licensing boundaries.

- **Commercial-Cleared Components:** `c2pa-python` (Apache-2.0 / MIT), `retina-face` (MIT), `unitary/toxic-bert` (Apache-2.0), `AdamCodd/vit-base-nsfw-detector` (Apache-2.0).
- **Non-Commercial Research Models:** Effort-AIGI (`effort_clip_l14_genimage.pth`) and Xception (`xception_best.pth`) are licensed under **CC BY-NC 4.0** and must be disabled (`SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS=false`) for commercial deployments.

---

## Testing & Verification

```bash
# Backend test suite
cd backend && python -m pytest -v

# Frontend lint, tests & production build
npm --prefix frontend run lint
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

---

## Security, Privacy & Deployment

- **Privacy:** SafeHER is designed for zero-PII evaluation benchmarks and encrypted survivor evidence isolation. Never commit `.env`, database files, or real survivor evidence.
- **Security Scanning:** CI runs `flake8`, `bandit`, `Trivy`, and CycloneDX SBOM generation (`backend/scripts/generate_sbom.py`).
- **Deployment:** See [DEPLOYMENT.md](DEPLOYMENT.md) and `docker-compose.prod.yml`.

---

## Documentation & Third-Party Acknowledgements

- **Full Engineering Documentation:** [docs/README.md](docs/README.md)
- **Model Provenance:** [MODEL_PROVENANCE.md](MODEL_PROVENANCE.md)
- **Third-Party Notices & Licenses:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

SafeHER is an independent application that integrates standard open-source libraries and pretrained models with full upstream attribution. Architectural concepts for encrypted key-wrapping, normalized timelines, and case custody were independently implemented and hardened for SafeHER.
