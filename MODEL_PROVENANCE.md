# SafeHER Pretrained AI Model Provenance Ledger

This document maintains the cryptographically verified provenance of all pretrained artificial intelligence and machine learning models utilized across the SafeHER platform.

**Core Mandate**: SafeHER does NOT train or fine-tune models from scratch. Only authentic upstream pretrained checkpoints with verified cryptographic checksums are utilized.

---

## 1. Computer Vision & Facial Localization

### 1.1 RetinaFace ResNet-50 Pretrained Weights
- **Model Identifier**: `retinaface_resnet50`
- **File System Location**: `~/.deepface/weights/retinaface.pth` (auto-downloaded by `retina-face`)
- **File Size**: 118,142,391 bytes (112.66 MB)
- **SHA-256 Checksum**: `89a3b1eb5366829ea72e8cd4a935b7131920c65787cef68f19466c2a853ddbf7`
- **Upstream Repository**: https://github.com/serengil/retinaface
- **Upstream Release URL**: https://github.com/serengil/deepface_models/releases/download/v1.0/retinaface.pth
- **Original Architecture**: Deng et al., "RetinaFace: Single-shot Multi-level Face Localisation in the Wild" (CVPR 2020)
- **License**: MIT License
- **Inference Engine**: PyTorch (`torch 2.5.1+cpu`) via `DEEPFACE_BACKEND_ENGINE=pytorch`
- **Operational Task**: Spatial face localization (bounding boxes), 5-point facial landmark extraction (eyes, nose, mouth corners), and aligned 256x256 face crop generation.
- **Explicit Boundary**: Does NOT classify deepfakes or score manipulation.

---

## 2. Cryptographic Content Credentials Verification

### 2.1 C2PA Python SDK & Rust Engine
- **Engine**: `c2pa-python` v0.39.0 / `c2pa-rs` v0.92.0
- **Upstream Repository**: https://github.com/contentauth/c2pa-python
- **License**: Apache-2.0 / MIT
- **Operational Task**: JUMBF box extraction, cryptographic digital signature validation, X.509 certificate chain inspection, editing action graph extraction.

---

## 3. Active & Verified Downstream Classifiers (Stage 3–5)

SafeHER strictly refuses to simulate, mock, or hardcode predictions for models lacking authenticated checkpoints. Current verified status:

| Model Pipeline | Architecture | Checkpoint / Source | License | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **Model A: Effort-AIGI** | CLIP ViT-L/14 + Orthogonal SVD | `models/effort_clip_l14_genimage.pth` (`7c32ceb4...fb813`) | CC BY-NC 4.0 (Non-Commercial) | **Operational** (Stage 3) |
| **Model B: Facial Deepfake** | DeepfakeBench Xception on RetinaFace 256×256 crops | `models/xception_best.pth` (`dd61186f...8ba47`) | CC BY-NC 4.0 (Non-Commercial) | **Operational** (Stage 3) |
| **NSFW Content Screening** | ViT-base (`AdamCodd/vit-base-nsfw-detector`) | HuggingFace Hub | Apache-2.0 | **Operational** (Stage 3) |
| **Multilingual NLP** | `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` + `unitary/toxic-bert` + `Hate-speech-CNERG/deoffxlmr-mono-kannada` | HuggingFace Hub | AFL-3.0 / Apache-2.0 | **Operational** (Stage 4; `Guardify` LinearSVC excluded) |
| **Tampering Localization (IMDL)** | TruFor / CAT-Net / ManTra-Net (`IMDLBenCo`) | External (`models/trufor.pth.tar` absent) | Research / Academic | **`unavailable`** (honest blocker; no fake heatmaps) |

> **Commercial Deployment Note**: Model A (`effort_clip_l14_genimage.pth`) and Model B (`xception_best.pth`) are licensed under **CC BY-NC 4.0** (Non-Commercial). For commercial SaaS deployment, set `SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS=false` and swap in commercially cleared Apache-2.0 / MIT weights (e.g. `abacusai/Smaug-AI-Image-Detector` or `shivani1511/deepfake-image-detector-new-latest-v2`).
