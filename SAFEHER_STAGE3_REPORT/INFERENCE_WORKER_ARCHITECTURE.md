# SafeHER Isolated Inference Worker & Queue Architecture Report
**Modules:** `backend/ai/workers/inference_worker.py`, `backend/ai/inference_queue.py`  
**Purpose:** Asynchronous, non-blocking AI inference worker pool integrated with cryptographic storage  
**Concurrency Engine:** `concurrent.futures.ThreadPoolExecutor(max_workers=2)`  
**Persistence Store:** SQLite `analysis_jobs` table (with WAL mode)  

---

## 1. Problem Statement & Motivation

Prior to Stage 3, media analysis ran synchronously within the FastAPI request-response loop:
- Running heavy vision transformers (CLIP-ViT-L/14) and deep convolutional networks (RetinaFace + Xception) on CPU takes 5 to 25 seconds per image.
- Synchronous processing blocked the FastAPI async event loop, starved web client connections, triggered HTTP 504 gateway timeouts, and caused UI freezing.
- Furthermore, unhandled model exceptions during inference crashed client requests.

---

## 2. Worker Architecture & Lifecycle

SafeHER introduces an isolated worker model that decouples HTTP ingestion from heavy neural computation while maintaining strict zero-trust security boundaries.

### 2.1 State Machine Lifecycle

```
[ POST /api/v1/evidence/{evidence_id}/jobs ]
                      │
                      ▼
            Status: "queued" ────(Immediate 202 Accepted Response with job_id)
                      │
                      ▼
            [ ThreadPoolExecutor ]
                      │
                      ▼
            Status: "processing"
                      │
     ┌────────────────┴────────────────┐
     ▼                                 ▼
[ In-Memory Inference ]        [ User Cancellation ]
 - AES-256-GCM Decrypt           POST /cancel
 - Model A Inference                   │
 - RetinaFace + Model B                ▼
 - C2PA Verification          Status: "cancelled"
 - del plaintext_bytes
     │
     ├─────────────────────────────────┐
     ▼                                 ▼
[ Successful Run ]             [ Unhandled Failure ]
Status: "completed"            Status: "failed"
Persist result_json            Persist error_message
```

---

## 3. Cryptographic In-Memory Roundtrip Guarantee

To ensure compliance with SafeHER's Survivor Privacy Charter:
1. Evidence files reside strictly as AES-256-GCM encrypted blobs (`.enc`) in `storage/evidence/`.
2. When a worker thread executes an analysis job:
   - Queries `evidence` table to retrieve `stored_filename`, `wrapped_dek`, `wrapping_nonce`, and pre-encryption `sha256_hash`.
   - Invokes `retrieve_and_decrypt_evidence()` from `backend/security/evidence_storage.py`.
   - The DEK is unwrapped using the KEK provider.
   - The ciphertext is decrypted directly into memory (`plaintext_bytes`).
   - Plaintext SHA-256 is verified against the database record.
3. Neural models operate on `plaintext_bytes` in RAM.
4. Upon completion or failure, `del plaintext_bytes` is executed immediately, leaving zero persistent decrypted artifacts on disk.

---

## 4. SQLite Schema & Job Management

```sql
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    model_type TEXT NOT NULL DEFAULT 'all',
    status TEXT NOT NULL DEFAULT 'queued',
    result_json TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY(evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4.1 Multi-Tenant Authorization Isolation

SafeHER enforces multi-tenant security on all job operations:
- Every query to `/api/v1/evidence/{evidence_id}/jobs/{job_id}` joins against `owner_id = current_user.id`.
- If an unauthorized user attempts to query or cancel an analysis job belonging to another user, the API immediately returns `HTTP 404 Not Found` or `HTTP 403 Forbidden`.
- Worker threads verify ownership before decrypting evidence:
  ```python
  if str(evi["user_id"]) != str(owner_id):
      raise PermissionError("Unauthorized: evidence does not belong to the job owner.")
  ```
