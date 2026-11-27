# SafeHER Pretrained Model & Forensics Inventory Report

**Report ID:** SH-AI-INV-001  
**Project:** SafeHER – AI-Powered Digital Safety and Digital Abuse Platform  
**Target Repository:** `C:\Users\Bindudhara D\Downloads\VSB\SafeHER`  
**Research Codebase:** `C:\Projects\SafeHER\SafeHER-Research`  
**Implementation Methodology:** Zero-Training Integration (No fine-tuning, no custom training, zero fabricated predictions)  
**Date of Audit:** November 2026  

---

## 1. Executive Summary

This inventory report details all pretrained artificial intelligence models, computer vision architectures, digital forensics tools, and cryptographic implementations audited across the 8 reference research repositories and integrated into SafeHER.

SafeHER's core architectural principle is **forensic honesty and zero fabrication**:
- No random numbers or simulated confidence scores.
- No pixel-variance heuristics disguised as neural image authenticity detection.
- Honest, unambiguous status reporting (`complete`, `unavailable`, `no_faces`, `error`) with transparent explanations whenever external weights must be downloaded.
- Complete separation of NSFW/nudity content screening from synthetic/AI-generated authenticity detection.
- Multi-face RetinaFace localization preserving per-face bounding boxes and landmark vectors for judicial evidence.

---

## 2. Audited Repositories & Checkpoint Matrix

The following table summarizes the discovery status across all audited repositories:

| Repository Name | Focus Area | Key Architecture / Algorithm | Discovered Checkpoints / Artifacts | Checkpoint Size | License | SafeHER Readiness |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Effort-AIGI-Detection** | AI-Generated Image (AIGI) Detection | CLIP-L/14 with Orthogonal Subspace Tuning ($r=1023$) | `effort_clip_l14.pth` (hosted on Google Drive / Releases) | ~1.71 GB | CC BY-NC 4.0 | **INTEGRATED (Config-driven)** |
| **DeepfakeBench** | Facial Deepfake Forensics | Xception / EfficientNet-B4 (FaceForensics++ c23) | `ff_xception.pth`, `ff_efficientnetb4.pth` (GitHub Release v1.0.1) | 88 MB / 140 MB | CC BY-NC 4.0 | **INTEGRATED (Config-driven)** |
| **ForensicHub** | General Image Forgery & AIGC | UnivFD, Co-Spy, SPSL, F3-Net | Checkpoints hosted via Baidu Netdisk & Google Drive | 200 MB – 1.8 GB | Academic / Non-commercial | **REFERENCE EVALUATED** |
| **retinaface** | Multi-Face Localization & Landmarks | ResNet-50 Feature Pyramid Network (FPN) | `~/.deepface/weights/retinaface.pth` | 118,129,936 bytes (~118.1 MB) | MIT License | **READY & OPERATIONAL** |
| **c2pa-python** | Content Credentials & Provenance | Rust `c2pa-rs` Core + Python C-Bindings | Compiled wheels (`c2pa 0.39.0`), fixtures (`C.jpg`) | 12.8 MB | Apache 2.0 / MIT | **READY & OPERATIONAL** |
| **Guardify** | Indic Cyberbullying & Harassment | TF-IDF Vectorizer + LinearSVC on HASOC | `artifacts/baseline/sample-baseline/estimator.joblib` | 134,965 bytes (~134 KB) | Unspecified / Academic | **LOADED & BENCHMARKED** |
| **CipherVault** | End-to-End Evidence Encryption | AES-256-GCM + RSA-OAEP + RSA-PSS | Software CSPRNG + Master Keys (`master-v1_*.pem`) | N/A (Cryptographic) | MIT License | **READY & OPERATIONAL** |
| **DEMS** | Digital Evidence Management | SHA-256 Hash Chaining & Chain-of-Custody | SQLite schema + audit logging | N/A | MIT License | **READY & OPERATIONAL** |

---

## 3. Component Categorization & Status

### Category 1: Operational Out-of-the-Box (Ready & Verified)
1. **RetinaFace (ResNet-50):** Checkpoint verified at `C:\Users\Bindudhara D\.deepface\weights\retinaface.pth`. Successfully detects human faces, outputs 5 landmark points per face, and generates affine-aligned $256 \times 256$ face crops.
2. **C2PA Content Credentials Engine:** Native `c2pa-python` SDK (v0.39.0) operational. Successfully extracts manifests, signatures, and assertions from CAI fixtures (`C.jpg`) and identifies plain unsigned images.
3. **Toxic-BERT Text Classifier:** `unitary/toxic-bert` running via HuggingFace Transformers (PyTorch backend). Provides 6-class multi-label toxicity and threat scoring.
4. **ViT NSFW Screening Classifier:** `AdamCodd/vit-base-nsfw-detector` running via HuggingFace Transformers. Separately screens for non-consensual sexual imagery without affecting synthetic image scoring.
5. **CipherVault AES-256-GCM Vault:** Envelope encryption with 96-bit CSPRNG nonce, AAD verification, and RSA-PSS digital signatures.

### Category 2: Downloadable Research Models (Architecture Integrated, Awaiting External .pth)
1. **Model A (Effort-AIGI-Detection):** CLIP-L/14 SVD pipeline implemented in `backend/ai/image_authenticity.py`. When `SAFEHER_EFFORT_AIGI_CHECKPOINT` is set, inference executes. When unset, system transparently returns `status="unavailable"`, `synthetic_score=None`, preserving forensic integrity.
2. **Model B (DeepfakeBench Facial Classifier):** Multi-stage deepfake pipeline in `backend/ai/deepfake_detection.py`. RetinaFace face localization runs first; if the DeepfakeBench checkpoint is absent, facial crops and landmarks are preserved and reported while `status="unavailable"` is cleanly recorded for deepfake classification.

### Category 3: Reference & Academic Baselines
1. **Guardify Sample Baseline:** Loaded and evaluated in `backend/ai/multilingual_nlp.py`. Demonstrates high out-of-vocabulary error rates on un-normalized social slang; retained as a comparative reference.
2. **Google MuRIL (`google/muril-base-cased`):** Audited and confirmed unsuitable for zero-training abuse classification due to lack of a trained task-specific classification head.
