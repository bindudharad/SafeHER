# SafeHER — Frontend & Product Experience Layer

## Overview
**SafeHER** is an AI-powered digital abuse intelligence and evidence response platform designed for people facing online harassment, cyberbullying, threatening messages, blackmail, extortion, profile impersonation, and manipulated synthetic media.

This repository layer contains the complete, production-ready React + TypeScript frontend engineered by **Member 3 (Frontend & Product Experience Engineer)**.

---

## Architecture & Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 19 + TypeScript | Type-safe component architecture |
| **Build & Tooling** | Vite 8 + Vitest | Lightning-fast development & testing |
| **Styling** | Tailwind CSS 3.4 | Charcoal/slate dark design system & glassmorphism |
| **Navigation** | React Router 7 | Protected routes, layout nested routing |
| **Data Visualization** | Recharts 3.11 | Incident category & evidence distribution charts |
| **Document Export** | jsPDF | Client-side verified PDF complaint compilation |
| **Cryptographic Hashing** | Web Crypto API (`SHA-256`) | Real-time client-side evidence fingerprinting |
| **Icons** | Lucide React | Consistent cybersecurity iconography |

---

## Core Product Capabilities

### 1. Zero-Knowledge Evidence Vault
- **Client-Side SHA-256 Hashing:** The exact 64-character SHA-256 checksum of every evidence file is calculated in browser memory before/during upload.
- **Integrity Notice:** Explains that SHA-256 detects later file tampering, rather than proving the subjective truthfulness of media.
- **Malware Scanning Feedback:** Clear multi-step status feedback (`Format Check` → `SHA-256 Hash` → `Malware Scan` → `Encrypted Vault`).
- **Duplicate Detection:** Categorizes items as unique, exact duplicate, or visual match.

### 2. Transparent AI Intelligence
- **Media & Deepfake Scanner:** Displays ViT manipulation scores, NSFW detection, facial anomaly signals, and C2PA provenance headers.
- **Explicit Calibration Banners:** Accurately labels uncalibrated model outputs to prevent misleading probability assertions.
- **Threat & Harassment Intelligence:** Analyzes hostile text against semantic urgency markers (blackmail, financial extortion, time deadlines) with non-alarmist explanations.
- **Five-Point Explainability Breakdown:**
  1. What was checked.
  2. What was detected.
  3. What the result means.
  4. What the result does NOT prove.
  5. What the victim can do next.

### 3. AI-Assisted Complaint Preparation Wizard
- **Eight-Step Wizard:** Incident selection → Fact review → Evidence attachment → Context review → Completeness check → Draft generation → Edit & confirm → PDF export.
- **Strict Anti-Hallucination Rule:** Generates drafts strictly from complainant-provided and verified facts. Never invents names, dates, amounts, threats, or police details.
- **Completeness Checker:** Informs the user of missing parameters without forcing them to fabricate unknown information.
- **Official PDF Export:** Exports structured complaints with embedded SHA-256 evidence inventories.

### 4. Multi-Platform Reporting Assistant
- **Verified Official Portals:**
  - National Cyber Crime Reporting Portal (cybercrime.gov.in / Helpline: 1930)
  - Instagram Abuse & Impersonation Grievance
  - WhatsApp Threat & Grievance Reporting
  - StopNCII.org (Non-Consensual Image Hash Coalition)
- **Reference Tracking:** Users can record their official complaint reference numbers, submission dates, and follow-up schedules.

### 5. Victim Safety & Privacy Controls
- **Quick Exit (`Alt + Q`):** Persistent button and keyboard shortcut that immediately replaces the active tab with `weather.com` without back-button history trails.
- **Standard Escape Key Preservation:** `Escape` safely dismisses modals and dialogs without triggering Quick Exit, strictly adhering to WCAG standards.
- **Ephemeral Draft Protection:** Incident drafts are held strictly in component memory by default. An optional, explicit opt-in checkbox allows temporary `sessionStorage` with clear warnings. Prominent **"Discard Draft Immediately"** button purges all state instantly.

### 6. Trilingual Accessibility
- Full language support for **English**, **Kannada (ಕನ್ನಡ)**, and **Hindi (हिन्दी)** with persistent language switching and non-intrusive translation notes.

---

## Getting Started

### Prerequisites
- Node.js `v18+` (Tested on `v24.20.0`)
- npm `v9+` (Tested on `v11.19.0`)

### Installation & Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Launch development server
npm run dev
```
The app will be accessible at `http://localhost:5173`.

### Running Tests
```bash
npm run test
```
Executes 18 comprehensive unit and integration tests across:
- Cryptographic SHA-256 calculation & foundation components
- Authentication context & consent agreement
- Dashboard metrics & ephemeral draft privacy controls
- Evidence Vault upload & integrity indicators
- Transparent AI analysis results
- Complaint wizard & case tracking lifecycle
- Reporting assistant & multilingual translation

### Production Build
```bash
npm run build
```
Typechecks with TypeScript (`tsc -b`) and compiles optimized production assets to `dist/`.

---

## Environment Configuration

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `VITE_USE_MOCK_API` | `false` | When `true`, enables offline fallback provider for standalone review |
| `VITE_API_BASE_URL` | `/api/v1` | Base URL for FastAPI backend endpoints |

---

## Integration Contracts (Member 1 & Member 2)

### Backend API Bridge
- Proxies `/api/*`, `/check-text`, and `/check-image` directly to FastAPI on `http://127.0.0.1:8000`.
- Seamlessly communicates with existing prototype endpoints (`POST /check-text` and `POST /check-image`) in `backend/api_sk1.py`.
- Ready for full production endpoints (`/api/v1/incidents`, `/api/v1/evidence`, `/api/v1/complaints`, `/api/v1/cases`).
