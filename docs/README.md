# SafeHER Documentation Hub

Welcome to the official engineering documentation for **SafeHER** — an AI-Powered Digital Abuse Intelligence, Evidence Preservation & Response Platform.

> **New to the project or taking over Member 3 (Frontend & UX)?**
> Start with [01_PROJECT_OVERVIEW.md](01_PROJECT_OVERVIEW.md), run the app via [04_LOCAL_SETUP_AND_RUNNING.md](04_LOCAL_SETUP_AND_RUNNING.md), and then dive into the dedicated [Member 3 Frontend Handover Hub](member-3/README.md).

---

## Documentation Map

### Project-Wide Engineering Docs (`docs/`)
| # | Document | Purpose |
|---|---|---|
| 01 | [Project Overview](01_PROJECT_OVERVIEW.md) | Vision, target users, core capabilities, and tech stack |
| 02 | [System Architecture](02_SYSTEM_ARCHITECTURE.md) | End-to-end architecture, Mermaid diagrams, and data flow |
| 03 | [Three-Member Integration Guide](03_THREE_MEMBER_INTEGRATION_GUIDE.md) | How Member 1 (AI/ML), Member 2 (Backend/DB), and Member 3 (Frontend/UX) connect |
| 04 | [Local Setup & Running](04_LOCAL_SETUP_AND_RUNNING.md) | Step-by-step installation, startup, and verification commands |
| 05 | [Environment & Configuration](05_ENVIRONMENT_AND_CONFIGURATION.md) | Backend and Vite environment variables, ports, and proxy rules |
| 06 | [Backend FastAPI Reference](06_BACKEND_FASTAPI_REFERENCE.md) | FastAPI app structure, middleware, routers, and static/media handling |
| 07 | [Database Schema & Storage](07_DATABASE_SCHEMA_AND_STORAGE.md) | SQLite WAL schema (9 tables), indexes, and evidence file storage |
| 08 | [AI/ML Models & Inference](08_AI_ML_MODELS_AND_INFERENCE.md) | Toxic-BERT, ViT NSFW detector, thread-safe loading, and deferred models |
| 09 | [API Contract Reference](09_API_CONTRACT_REFERENCE.md) | Complete REST API endpoint catalog aligned with `backend/app.py` |
| 10 | [Authentication & Security](10_AUTHENTICATION_AND_SECURITY.md) | PBKDF2-HMAC-SHA256, HS256 JWT, CORS, validation, and privacy controls |
| 11 | [Testing & QA Guide](11_TESTING_AND_QA_GUIDE.md) | Pytest, Vitest, oxlint, TypeScript build, and E2E verification |
| 12 | [Build & Deployment](12_BUILD_AND_DEPLOYMENT.md) | Production build, WGSL shader bundling, and hosting checklist |
| 13 | [Troubleshooting Guide](13_TROUBLESHOOTING_GUIDE.md) | Common setup, WebGPU, CORS, SQLite, and model-loading fixes |
| 14 | [Known Limitations & Tech Debt](14_KNOWN_LIMITATIONS_AND_TECH_DEBT.md) | Deferred features (audio/video deepfake), uncalibrated scores, and gaps |
| 15 | [Contributing & Git Workflow](15_CONTRIBUTING_AND_GIT_WORKFLOW.md) | Branching, commit conventions, PR checks, and secret hygiene |
| 16 | [Glossary](16_GLOSSARY.md) | Domain, cybersecurity, legal, and WebGPU terminology |

---

### Member 3 — Frontend & UX Handover (`docs/member-3/`)
A complete 21-document handover package for the frontend engineer taking over `frontend/`:
- **Start here:** [Member 3 Handover Index](member-3/README.md)
- **Fastest onboarding path:** [Developer Handover Checklist](member-3/20_MEMBER3_DEVELOPER_HANDOVER.md)

---

### End-to-End Workflows (`docs/workflows/`)
- [User Workflows](workflows/USER_WORKFLOWS.md) — Visitor, survivor, and investigator journeys
- [Incident-to-Complaint Workflow](workflows/INCIDENT_TO_COMPLAINT_WORKFLOW.md) — From logging an incident to exporting legal PDFs and tracking cases
- [AI Analysis Workflow](workflows/AI_ANALYSIS_WORKFLOW.md) — Live text/image detection and vault evidence forensic analysis

---

### Project Status & Audit Context (`docs/releases/` & `reports/`)
- [Current Project Status](releases/CURRENT_PROJECT_STATUS.md) — Verified test counts, completion summary, and milestones
- [Remaining Work](releases/REMAINING_WORK.md) — Deferred scope and future roadmap items
- Existing independent audit reports (preserved): [Final Project Audit](../reports/final-project-audit/FINAL_PROJECT_AUDIT.md)
