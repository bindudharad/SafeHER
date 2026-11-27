# SafeHER Stage 2: Evidence Analysis Architecture

## 1. System Overview

SafeHER Stage 2 bridges cryptographic evidence storage (Stage 1) with multi-modal forensic inspection. All analysis is performed **in-memory** on decrypted streams, preserving strict confidentiality while enabling deep provenance and visual inspection.

---

## 2. Evidence Analysis Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Survivor as Survivor / Advocate
    participant UI as SafeHER Frontend (React)
    participant API as FastAPI Backend (/api/v1/evidence/{id}/analyze)
    participant Vault as Crypto Vault (AES-256-GCM)
    participant Disk as Encrypted Evidence Storage
    participant C2PA as C2PA Service (c2pa-rs)
    participant Retina as RetinaFace Engine (ResNet-50)
    participant DB as SQLite Database (media_analyses)

    Survivor->>UI: Request Deep Forensic Analysis
    UI->>API: POST /api/v1/evidence/{id}/analyze
    API->>DB: Query Evidence Metadata (path, wrapped_dek, nonce)
    DB-->>API: Metadata Record
    API->>Disk: Read Encrypted Ciphertext
    Disk-->>API: Ciphertext Bytes
    API->>Vault: retrieve_and_decrypt_evidence(ciphertext, wrapped_dek, ...)
    Vault-->>API: Decrypted Plaintext Bytes (RAM only)

    par Independent Pipeline Execution
        API->>C2PA: inspect_content_credentials(BytesIO(plaintext))
        C2PA-->>API: C2PA Analysis (validity, issuer, claim_generator, actions)
    and
        API->>Retina: detect_faces(BytesIO(plaintext))
        Retina-->>API: Face Localization (boxes, 5-point landmarks, crops)
    end

    API->>DB: Persist c2pa_result and face_localization JSON
    DB-->>API: Commit OK
    API-->>UI: 200 OK (c2pa_analysis, face_localization, audit_trail)
    UI-->>Survivor: Render C2PA Credentials & RetinaFace Localization Cards
```

---

## 3. Forensic Flow & Pipeline Independence

```mermaid
flowchart TD
    subgraph Storage [Stage 1 Encrypted Storage]
        ENC["Encrypted File (*.enc)"]
        META["Evidence DB Record (wrapped_dek, nonce, hash)"]
    end

    subgraph Memory [RAM-Only Security Boundary]
        DEK["Unwrap DEK via KEK"]
        DEC["AES-256-GCM Decrypt into RAM"]
        STREAM["io.BytesIO Stream"]
    end

    subgraph Pipelines [Independent Analysis Pipelines]
        C2PA_P["C2PA Service (Official c2pa SDK)"]
        RETINA_P["RetinaFace Service (PyTorch ResNet-50)"]
        MOD_A["Model A: Effort-AIGI (Honest Status: not_configured)"]
        MOD_B["Model B: Deepfake Classifiers (Honest Baseline)"]
    end

    subgraph Synthesis [Coordinator & Output]
        COORD["Inference Coordinator (ai/inference_coordinator.py)"]
        DB_SAVE["media_analyses Table (c2pa_result, face_localization)"]
        JSON_OUT["REST API Response (200 OK)"]
    end

    ENC --> DEC
    META --> DEK
    DEK --> DEC
    DEC --> STREAM
    STREAM --> C2PA_P
    STREAM --> RETINA_P
    STREAM --> MOD_A
    STREAM --> MOD_B

    C2PA_P --> COORD
    RETINA_P --> COORD
    MOD_A --> COORD
    MOD_B --> COORD

    COORD --> DB_SAVE
    COORD --> JSON_OUT
```

---

## 4. Database Schema Integration

The `media_analyses` table was updated with non-destructive migrations to store granular Stage 2 forensic outputs:

```mermaid
erDiagram
    EVIDENCE {
        INTEGER id PK
        TEXT file_name
        TEXT file_path
        TEXT mime_type
        INTEGER file_size
        TEXT file_hash_sha256
        TEXT storage_status
        TEXT wrapped_dek
        TEXT wrapping_nonce
        TEXT key_id
        INTEGER key_version
        INTEGER encryption_version
    }

    MEDIA_ANALYSES {
        INTEGER id PK
        INTEGER evidence_id FK
        REAL visual_authenticity_score
        REAL facial_deepfake_score
        REAL physical_forensic_score
        REAL metadata_integrity_score
        REAL multi_modal_composite_score
        TEXT risk_level
        TEXT c2pa_result
        TEXT face_localization
        TEXT created_at
    }

    EVIDENCE ||--o{ MEDIA_ANALYSES : "analyzed_by"
```

---

## 5. Security & Privacy Guarantees

1. **Zero Intermediate Plaintext**: Plaintext survivor images exist exclusively inside process memory during the lifecycle of the analysis request. No temporary swap files, thumbnail dumps, or scratch files are created on disk.
2. **Graceful Degradation**: The C2PA pipeline and RetinaFace pipeline execute inside guarded exception scopes. A failure or metadata absence in one domain cannot prevent execution or alter results in the other.
3. **Traceability**: All forensic responses include an analysis ID, SHA-256 evidence fingerprint, SDK version stamps, and execution timestamps for legal provenance.
