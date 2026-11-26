# 01 — Project Overview

## What is SafeHER?

**SafeHER** is an AI-powered digital abuse intelligence, forensic evidence preservation, and incident response platform built to support individuals facing online harassment, cyberbullying, threatening communications, blackmail/extortion, impersonation, non-consensual imagery, and synthetic media abuse.

SafeHER combines:
1. **Real-Time AI Abuse Screening** — Classifies abusive/threatening text (`unitary/toxic-bert`) and explicit/NSFW imagery (`AdamCodd/vit-base-nsfw-detector`) with transparent uncertainty and calibration disclosures.
2. **Tamper-Evident Evidence Vault** — Computes browser-native SHA-256 cryptographic hashes (`crypto.subtle.digest`) and verifies file integrity server-side on upload, storing files in protected local storage (`backend/storage/evidence/`).
3. **Structured Incident & Timeline Management** — Organizes incidents by category, platform, timestamps, and chronological timeline events.
4. **Guided Legal Complaint Generation & Reporting** — Produces editable complaint drafts, exports PDFs (`jspdf`), tracks case progression, and records submissions to external portals (e.g., Cyber Crime portals, NCW, platform safety teams).
5. **Multilingual & Trauma-Informed UX** — Supports English (`en`), Kannada (`kn`), and Hindi (`hi`), includes a single-click **Quick Exit** button (`QuickExitButton.tsx`), and pairs a dark **Midnight Aurora** aesthetic with interactive Three.js and WebGPU (`vgpu`) 3D experiences.

---

## Team Ownership Structure (Three-Member Architecture)

| Member | Domain | Primary Directory | Core Responsibilities |
|---|---|---|---|
| **Member 1** | AI / ML Engineering | `backend/ai_service.py` (plus preserved prototypes `api_sk1.py`, `app_sk1.py`, `image_detector_sk1.py`, `image_modelsk1.py`) | HuggingFace text toxicity & image NSFW inference, thread-safe lazy model loading, fallback scoring, and uncertainty metadata |
| **Member 2** | Backend & Database | `backend/app.py`, `backend/auth.py`, `backend/db.py`, `backend/schemas.py` | FastAPI REST API, PBKDF2 + JWT auth, SQLite WAL persistence (9 tables), multipart evidence storage, timeline/complaint/case/reporting endpoints |
| **Member 3** | Frontend & UX | `frontend/` | React 19 + TypeScript + Tailwind SPA, 17 routes, `apiClient` + offline resilience, i18n (`en`/`kn`/`hi`), GSAP/Lenis animations, Three.js & WebGPU (`vgpu`) 3D visuals |

---

## Technology Stack Summary

| Layer | Technologies |
|---|---|
| **Frontend Core** | React `19.3.1`, TypeScript `~7.0.2`, Vite `^8.3.6`, React Router DOM `^7.13.1`, Tailwind CSS `^3.4.19` |
| **3D & WebGPU** | `vgpu` (`wgslVitePlugin`), Three.js `^0.187.0`, custom `.wgsl` compute & render shaders |
| **Animations & UX** | GSAP `^3.15.1`, Lenis `^1.3.27`, Recharts `^3.11.0`, `lucide-react` `^1.78.0`, `jspdf` `^4.2.1` |
| **Backend** | Python FastAPI, Uvicorn, Pydantic (`schemas.py`), SQLite3 (WAL mode) |
| **AI / ML** | HuggingFace `transformers`, PyTorch (`torch`), Pillow (`PIL`) |
| **Testing & Tooling** | `pytest` (12 backend tests), `vitest` `^5.1.1` + Testing Library (44 frontend tests across 14 files), `oxlint` `^1.90.0`, `tsc -b` |

---

## Related Documents

- [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md)
- [03_THREE_MEMBER_INTEGRATION_GUIDE.md](03_THREE_MEMBER_INTEGRATION_GUIDE.md)
- [Member 3 Handover Hub](member-3/README.md)
