# SafeHER Pretrained Model Checkpoint Directory & Setup Guide

This directory (`models/`) is designated for storing official pretrained neural network weights and checkpoints required by SafeHER's multi-modal forensic engines.

In accordance with SafeHER's **Zero-Training & High-Integrity Forensic Policy**:
1. **No Fake Heuristics:** SafeHER will never fabricate predictions, use random numbers, or substitute pixel variance for real deep neural network inference.
2. **Transparent Readiness:** When a model checkpoint is absent, SafeHER explicitly reports `status="unavailable"` and `prediction="undetermined"`, preserving chain-of-custody credibility.
3. **Local Operational Weights:** Pretrained weights stored in standard locations (e.g. `~/.deepface/weights/retinaface.pth` and HuggingFace cache) are automatically loaded and executed.

---

## 1. Checkpoint Inventory & Setup Instructions

### 1.1 Model A: AI-Generated Image (AIGI) Detection Engine
- **Model Name:** Effort-AIGI-Detection (CLIP-L/14 with Orthogonal Subspace Tuning)
- **Publication:** ICML 2025 Oral Presentation
- **Task:** Discerning synthetic images (Diffusion / GAN) from authentic camera captures
- **Official Checkpoint Source:**
  - Source Repository: `C:\Projects\SafeHER\SafeHER-Research\Effort-AIGI-Detection`
  - GitHub: `https://github.com/Daisy-ycguo/Effort-AIGI-Detection`
  - Download Links (Release / Google Drive):
    - GenImage Checkpoint: `effort_clip_l14_genimage.pth` (~1.71 GB)
    - Chameleon Checkpoint: `effort_clip_l14_chameleon.pth` (~1.71 GB)
- **Destination Path:** `models/effort_clip_l14.pth`
- **Environment Variable:**
  ```bash
  export SAFEHER_EFFORT_AIGI_CHECKPOINT="models/effort_clip_l14.pth"
  # Windows PowerShell:
  $env:SAFEHER_EFFORT_AIGI_CHECKPOINT = "models\effort_clip_l14.pth"
  ```
- **License:** CC BY-NC 4.0 (Non-Commercial Academic Research)

---

### 1.2 Model B: Facial Manipulation & Deepfake Classifier
- **Face Localization:** RetinaFace (ResNet-50)
  - **Status:** **OPERATIONAL & VERIFIED**
  - **Location:** `C:\Users\<User>\.deepface\weights\retinaface.pth`
  - **Size:** 118,129,936 bytes (~118.1 MB)
  - **License:** MIT License
  - **Execution Engine:** PyTorch ResNet-50 FPN
- **Deepfake Classification Backbone:** DeepfakeBench Xception / EfficientNet-B4
  - **Source Repository:** `C:\Projects\SafeHER\SafeHER-Research\DeepfakeBench`
  - **GitHub Release:** `https://github.com/SCLBD/DeepfakeBench/releases/tag/v1.0.1`
  - **Checkpoint File:** `ff_xception.pth` (88 MB) or `ff_efficientnetb4.pth` (140 MB)
  - **Dataset:** FaceForensics++ (c23 high-quality compressed benchmark)
  - **Destination Path:** `models/ff_xception.pth`
  - **Environment Variable:**
    ```bash
    export SAFEHER_DEEPFAKE_CHECKPOINT="models/ff_xception.pth"
    # Windows PowerShell:
    $env:SAFEHER_DEEPFAKE_CHECKPOINT = "models\ff_xception.pth"
    ```
  - **License:** CC BY-NC 4.0 (Non-Commercial Academic Research)

---

### 1.3 Content Credentials & Provenance (C2PA)
- **Engine:** `c2pa-python` (Adobe Content Authenticity Initiative)
- **Status:** **OPERATIONAL & VERIFIED**
- **Architecture:** Rust `c2pa-rs` library wrapped in Python C-extension
- **Fixtures:** `C:\Projects\SafeHER\SafeHER-Research\c2pa-python\tests\fixtures\C.jpg`
- **License:** Apache 2.0 / MIT

---

### 1.4 Multilingual NLP & Toxicity Screening
- **Primary Toxicity Engine:** `unitary/toxic-bert`
  - **Status:** **OPERATIONAL & VERIFIED**
  - **Location:** HuggingFace Hub Cache (`unitary/toxic-bert`)
  - **Size:** ~438 MB
  - **License:** Apache 2.0
- **NSFW Screening Engine:** `AdamCodd/vit-base-nsfw-detector`
  - **Status:** **OPERATIONAL & VERIFIED**
  - **Location:** HuggingFace Hub Cache
  - **Size:** ~343 MB
  - **License:** Apache 2.0
- **Guardify Baseline (HASOC Cyberbullying Reference):**
  - **Location:** `C:\Projects\SafeHER\SafeHER-Research\Guardify\artifacts\baseline\sample-baseline\estimator.joblib`
  - **Size:** 134,965 bytes (~134 KB)
  - **Architecture:** TF-IDF Vectorizer + LinearSVC
  - **Status:** Loaded dynamically for comparative baseline analysis.
- **Google MuRIL Feasibility:**
  - Evaluated: `google/muril-base-cased` is a foundational Masked Language Model (236M parameters) lacking task-specific abuse/extortion fine-tuning. It is not used as a zero-shot abuse classifier to prevent misleading claims.

---

## 2. Directory Layout

```
models/
├── README.md                          <- This setup and checkpoint guide
├── effort_clip_l14.pth                <- (Optional) Effort-AIGI-Detection checkpoint
├── ff_xception.pth                    <- (Optional) DeepfakeBench Xception checkpoint
└── baseline_estimator.joblib          <- (Optional) Guardify baseline classifier
```

---

## 3. License & Commercial Compliance Advisory

1. Checkpoints derived from **Effort-AIGI-Detection** and **DeepfakeBench** carry **CC BY-NC 4.0** licenses and are restricted to non-commercial research, academic, and evaluation use.
2. For commercial production deployments, SafeHER utilizes **Apache 2.0 / MIT** licensed components (`retinaface`, `c2pa-python`, `unitary/toxic-bert`, `AES-256-GCM`, `RSA-OAEP`) and supports training proprietary production classifiers under approved institutional data protocols.
