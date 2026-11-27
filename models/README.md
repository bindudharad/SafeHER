# SafeHER Pretrained Model Checkpoint Directory & Setup Guide

This directory (`models/`) stores official pretrained neural network weights and checkpoints required by SafeHER's multi-modal forensic engines. Large `.pth` files are excluded from Git tracking via `.gitignore`.

In accordance with SafeHER's **Zero-Training & High-Integrity Forensic Policy**:
1. **No Fake Heuristics:** SafeHER never fabricates predictions or substitutes pixel variance for deep neural network inference.
2. **Transparent Readiness:** When a model checkpoint is absent, SafeHER explicitly reports `status="unavailable"` and `prediction="undetermined"`.
3. **Checksum Verification:** All local checkpoints are verified against their expected SHA-256 digests.

---

## 1. Checkpoint Inventory & Setup Instructions

### 1.1 Model A: AI-Generated Image (AIGI) Detection Engine
- **Model Name:** Effort-AIGI (CLIP ViT-L/14 with Orthogonal SVD)
- **Publication:** ICML 2025 Oral Presentation
- **Task:** Discerning synthetic images (Diffusion / GAN) from authentic camera captures
- **Upstream Source:** `https://github.com/Daisy-ycguo/Effort-AIGI-Detection`
- **Local Path:** `models/effort_clip_l14_genimage.pth`
- **Expected SHA-256:** `7c32ceb4e66d303050e8fc5dc7543fa347693fb4ee6b5df4d6eaf9f6a92fb813`
- **Environment Variable (Optional Override):** `SAFEHER_EFFORT_AIGI_CHECKPOINT=models/effort_clip_l14_genimage.pth`
- **License:** CC BY-NC 4.0 (Non-Commercial Academic Research)

---

### 1.2 Model B: Facial Manipulation & Deepfake Classifier
- **Face Localization:** RetinaFace (ResNet-50)
  - **Location:** `~/.deepface/weights/retinaface.pth` (auto-fetched by `retina-face`)
  - **Expected SHA-256:** `89a3b1eb5366829ea72e8cd4a935b7131920c65787cef68f19466c2a853ddbf7`
  - **License:** MIT License
- **Deepfake Classification Backbone:** Xception (FaceForensics++ c23 benchmark)
  - **Upstream Source:** `https://github.com/SCLBD/DeepfakeBench/releases/tag/v1.0.1`
  - **Local Path:** `models/xception_best.pth`
  - **Expected SHA-256:** `dd61186f9ac8e99aae85982cae338b555dfaeef042f6b699e5a55cae3998ba47`
  - **Environment Variable (Optional Override):** `SAFEHER_DEEPFAKE_CHECKPOINT=models/xception_best.pth`
  - **License:** CC BY-NC 4.0 (Non-Commercial Academic Research)

---

### 1.3 Content Credentials & Provenance (C2PA)
- **Engine:** `c2pa-python` (`c2pa-rs`)
- **License:** Apache-2.0 / MIT

---

### 1.4 Multilingual NLP & NSFW Screening (HuggingFace Hub)
- **Multilingual Indic Abuse Classifier:** `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` (AFL-3.0 / Research)
- **Kannada Offensive Language Classifier:** `Hate-speech-CNERG/deoffxlmr-mono-kannada` (Apache-2.0 / Research)
- **English Toxicity Classifier:** `unitary/toxic-bert` (Apache-2.0)
- **NSFW Screening Engine:** `AdamCodd/vit-base-nsfw-detector` (Apache-2.0)

---

## 2. License & Commercial Compliance Advisory

1. Checkpoints derived from **Effort-AIGI** (`effort_clip_l14_genimage.pth`) and **DeepfakeBench Xception** (`xception_best.pth`) carry **CC BY-NC 4.0** licenses and are restricted to non-commercial research, academic, and evaluation use.
2. For commercial deployments, set `SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS=false` and configure commercially cleared **Apache-2.0 / MIT** weights.
