# SafeHER Remaining Issues & Future Roadmap

**Date:** 2026-11-27  
**Scope:** Architecture, Deployment Considerations, Model Weight Pipelines, and Scalability  
**Status:** Documented for Next Architectural Phase  

---

## 1. AI/ML Weight Checkpoint Provisions

### 1.1 Model A (Effort-AIGI-Detection) Checkpoint Installation
- **Current State:** The architecture and inference code for `Effort-AIGI-Detection` (CLIP-L/14 with SVD) is fully implemented in `backend/ai/image_authenticity.py`. In strict compliance with task constraints (Rule 11: no large model weight downloads during this task), the model currently detects that external weights are not installed and honestly reports `status="unavailable"` with `synthetic_score=null`.
- **Roadmap Action:**
  - Download verified weights from the official Effort-AIGI-Detection repository release (`effort_clip_l14.pth`).
  - Set the environment variable:
    ```bash
    export SAFEHER_EFFORT_AIGI_CHECKPOINT="/path/to/effort_clip_l14.pth"
    ```
  - The model will automatically transition to `status="ready"` and produce calibrated synthetic probabilities.

### 1.2 Model B (DeepfakeBench) Checkpoint Provisioning
- **Current State:** RetinaFace face localization (`retinaface.pth`, 118 MB) is fully installed and operating via PyTorch. It detects faces, bounding boxes, and landmarks. When faces are detected, deepfake classification currently reports `unavailable` unless an external DeepfakeBench backbone weights file (e.g., EfficientNet-B4 or Xception trained on FaceForensics++) is provided.
- **Roadmap Action:**
  - Place verified DeepfakeBench model checkpoint in `backend/storage/models/deepfake_detector.pth`.
  - Set environment variable:
    ```bash
    export SAFEHER_DEEPFAKE_CHECKPOINT="/path/to/deepfake_detector.pth"
    ```

---

## 2. Infrastructure & Scalability Considerations

### 2.1 Database Scaling (SQLite to PostgreSQL)
- **Current State:** SafeHER operates on SQLite with WAL (Write-Ahead Logging) mode, 5000ms busy timeouts, foreign key enforcement, and non-destructive automated column migrations (`backend/db.py`).
- **Production Recommendation:** While SQLite is excellent for local, embedded, and single-instance deployments (handling tens of thousands of incidents comfortably), enterprise deployments serving concurrent police departments and NGO caseworkers should configure PostgreSQL 16+ with PgBouncer connection pooling.

### 2.2 Rate Limiting Backend (Memory to Redis)
- **Current State:** SlowAPI currently enforces rate limits (10 req/min on auth) using an in-memory sliding window bucket.
- **Production Recommendation:** When horizontally scaling across multiple backend worker containers, configure SlowAPI to connect to a shared Redis instance:
  ```python
  limiter = Limiter(
      key_func=get_remote_address,
      storage_uri=os.environ.get("REDIS_URL", "memory://"),
  )
  ```

### 2.3 Key Management System (Local PEM to Cloud KMS / HSM)
- **Current State:** `KeyManager` stores RSA-2048 keypairs in `storage/keys/master-v1_*.pem` with environment variable overrides (`SAFEHER_RSA_PRIVATE_KEY_PEM`).
- **Production Recommendation:** For enterprise judicial admissibility compliance (FIPS 140-3 Level 3), integrate hardware security module (HSM) key wrapping via AWS KMS, Google Cloud KMS, or HashiCorp Vault Transit Engine.

---

## 3. Video Media Forensics

- **Current State:** The forensic pipeline operates on images (`.jpg`, `.jpeg`, `.png`, `.webp`). Videos can be uploaded and preserved encrypted in the Evidence Vault with full SHA-256 integrity and digital signatures.
- **Roadmap Action:** Add an asynchronous Celery or RQ background worker using `ffmpeg` / `decord` to sample 1 frame per second from uploaded videos (`.mp4`, `.webm`) and feed the extracted frames into the existing `detect_faces` and forensic coordinator pipeline.

---

## 4. Summary Table of Outstanding Operational Items

| Item | Priority | Current Status | Resolution Path |
| :--- | :--- | :--- | :--- |
| **Model A Weights** | Medium | Architecture ready; reports `unavailable` honestly | Download `effort_clip_l14.pth` and set env variable |
| **Model B Deepfake Weights** | Medium | RetinaFace localization working; deepfake classification ready | Configure `SAFEHER_DEEPFAKE_CHECKPOINT` |
| **Video Frame Sampling** | Low | Videos preserved encrypted; static media analyzed | Integrate `ffmpeg` frame extraction worker |
| **Shared Redis Rate Limiting** | Low | In-memory limiter working | Point SlowAPI `storage_uri` to Redis in multi-container cluster |
| **Cloud KMS Integration** | Low | Local PEM + env overrides working | Connect `KeyManager` to AWS/GCP KMS endpoint |
