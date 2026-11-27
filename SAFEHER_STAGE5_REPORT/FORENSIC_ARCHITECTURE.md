# SafeHER Stage 5 Forensic Architecture

## 1. System Overview
Stage 5 builds directly on SafeHER's existing FastAPI + SQLite WAL + React 19 + AES-256-GCM architecture without duplicating evidence, timeline, or case tables.

```mermaid
flowchart TD
    UI["React 19 SPA: Graph, Timeline, Tampering, Case Workspace"]
    API["FastAPI Gateway + Stage 5 Router (/api/v1)"]
    DB[(SQLite WAL: safeher.db)]
    Vault["Stage 1 AES-256-GCM Envelope Vault"]
    Worker["Stage 3 ThreadPoolExecutor Worker"]

    UI -->|JWT Bearer| API
    API --> Graph["Evidence Graph Service"]
    API --> Timeline["Normalized Timeline Service"]
    API --> CaseMgmt["Case Management & Custody Service"]
    API --> Tampering["Tampering Localization Service"]
    API --> Worker
    Worker --> Tampering
    Tampering -->|Memory-only decrypt / Encrypted artifacts| Vault
    Graph --> DB
    Timeline --> DB
    CaseMgmt --> DB
    Tampering --> DB
```

## 2. New Modules
- `backend/forensics/graph_service.py`
- `backend/forensics/timeline_service.py`
- `backend/forensics/case_service.py`
- `backend/forensics/router.py`
- `backend/ai/tampering_localization.py`
- `frontend/src/pages/forensics/EvidenceGraphPage.tsx`
- `frontend/src/pages/forensics/NormalizedTimelinePage.tsx`
- `frontend/src/pages/forensics/TamperingAnalysisPage.tsx`
- `frontend/src/pages/cases/CaseWorkspacePage.tsx`
