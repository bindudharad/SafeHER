# SafeHER Stage 3: Pretrained Model & Checkpoint Registry

## 1. Registry Overview

This registry records all evaluated, integrated, and candidate pretrained artificial intelligence models for SafeHER Stage 3, in compliance with the **Zero-Training & High-Integrity Forensic Policy**. Every model architecture, checkpoint source, cryptographic digest, preprocessing requirement, and legal license has been independently investigated.

---

## 2. Model Inventory & Detailed Specifications

### 2.1 Model A: AI-Generated Image (AIGI) Detector — Effort-AIGI-Detection
- **Model Identifier**: `effort_clip_l14_genimage`
- **Exact Architecture**: Effort Orthogonal Subspace Decomposition over OpenAI CLIP-L/14 Vision Transformer (`ViT-L/14`, 24 transformer blocks, 1024 embedding dimension, patch size 14x14) with SVD residual parameter tuning (`r = 1023`) and binary classification linear head (`nn.Linear(1024, 2)`).
- **Intended Detection Task**: Distinguishing synthetic/AI-generated images (Diffusion models such as Stable Diffusion, Midjourney, DALL-E, and GANs) from authentic camera captures.
- **Official Repository**: `https://github.com/YZY-stack/Effort-AIGI-Detection` (`C:\Projects\SafeHER\SafeHER-Research\Effort-AIGI-Detection`)
- **Inference Implementation Path**: `backend/ai/models/model_a.py` (derived from `DeepfakeBench/training/detectors/effort_detector.py` and `demo.py`).
- **Checkpoint Source**: Official Google Drive release provided by the authors (ICML 2025 Oral): `https://drive.google.com/file/d/1UXf1hC9FC1yV93uKwXSkdtepsgpIAU9d` (GenImage sdv1.4 benchmark).
- **Checkpoint Filename**: `effort_clip_l14_genimage.pth`
- **Download Size**: 1,299,657,321 bytes (1.21 GB)
- **Expected File Format**: PyTorch State Dictionary (`.pth` serialized with `torch.save`)
- **Framework & Compatible Versions**: PyTorch >= 1.11, verified on PyTorch `2.5.1+cpu` / `torchvision 0.20.1` / `transformers 4.49.0`.
- **Input Dimensions**: RGB image resized to `224x224` pixels (`(3, 224, 224)` tensor).
- **Preprocessing Method**: 
  - RGB conversion: BGR -> RGB
  - Bilinear resize to 224x224
  - Tensor normalization: `mean = [0.48145466, 0.4578275, 0.40821073]`, `std = [0.26862954, 0.26130258, 0.27577711]` (standard OpenAI CLIP normalization).
- **Output Labels**: Binary classification: Class 0 = Authentic/Real, Class 1 = Synthetic/AI-Generated (`Fake`).
- **Postprocessing Requirements**: Softmax over 2-dimensional logits (`torch.softmax(logits, dim=1)[:, 1]`) yielding calibrated `synthetic_score` in `[0.0, 1.0]`.
- **Hardware Requirements**: CPU compatible (~1.6 GB RAM peak), GPU optional (>= 6 GB VRAM for accelerated batch inference).
- **Code License**: CC BY-NC 4.0 (Non-Commercial Academic Research)
- **Checkpoint License**: CC BY-NC 4.0 (Non-Commercial Academic Research)
- **Dataset Restrictions**: GenImage benchmark dataset restrictions (academic non-commercial use only).
- **Integration Status**: `READY_LOCAL` (Stage 3 Primary Integration).

---

### 2.2 Model B: Facial Manipulation & Deepfake Detector — DeepfakeBench Xception
- **Model Identifier**: `deepfakebench_ff_xception`
- **Exact Architecture**: Xception Convolutional Neural Network (Modified FaceForensics++ architecture with 36 separable convolutional layers across Entry Flow, Middle Flow, and Exit Flow, 2048-dim embedding pooling, and `nn.Linear(2048, 2)` binary classification head).
- **Intended Detection Task**: Classifying human facial regions for digital manipulation (face-swapping, expression reenactment, facial attribute alteration, DeepFakes, Face2Face, FaceSwap, NeuralTextures).
- **Official Repository**: `https://github.com/SCLBD/DeepfakeBench` (`C:\Projects\SafeHER\SafeHER-Research\DeepfakeBench`)
- **Inference Implementation Path**: `backend/ai/models/model_b.py` (derived from `DeepfakeBench/training/detectors/xception_detector.py` and `networks/xception.py`).
- **Checkpoint Source**: Official GitHub release v1.0.1: `https://github.com/SCLBD/DeepfakeBench/releases/download/v1.0.1/xception_best.pth`.
- **Checkpoint Filename**: `xception_best.pth`
- **Download Size**: 87,763,531 bytes (83.7 MB)
- **Expected File Format**: PyTorch OrderedDict state dictionary (`.pth`).
- **Checkpoint SHA-256 Digest**: `dd61186f9ac8e99aae85982cae338b555dfaeef042f6b699e5a55cae3998ba47`
- **Framework & Compatible Versions**: PyTorch >= 1.11, verified on PyTorch `2.5.1+cpu` / `torchvision 0.20.1`.
- **Input Dimensions**: Aligned face crop resized to `256x256` pixels (`(3, 256, 256)` tensor).
- **Preprocessing Method**:
  - Facial localization provided by Stage 2 RetinaFace.
  - Aligned bounding box crop with 15% contextual boundary padding.
  - RGB conversion and bilinear resize to 256x256.
  - ImageNet normalization: `mean = [0.5, 0.5, 0.5]`, `std = [0.5, 0.5, 0.5]` or `mean = [0.485, 0.456, 0.406]`, `std = [0.229, 0.224, 0.225]`.
- **Output Labels**: Binary classification: Class 0 = Real Human Face, Class 1 = Manipulated / Deepfake Face.
- **Postprocessing Requirements**: Softmax over 2-dimensional logits (`torch.softmax(logits, dim=1)[:, 1]`) yielding `manipulation_score` in `[0.0, 1.0]`.
- **Hardware Requirements**: CPU lightweight (~180 MB RAM peak, ~0.15s latency), GPU optional (< 1 GB VRAM).
- **Code License**: CC BY-NC 4.0 (CUHK Shenzhen)
- **Checkpoint License**: CC BY-NC 4.0 (Trained on FaceForensics++ c23)
- **Dataset Restrictions**: FaceForensics++ benchmark research usage rules.
- **Integration Status**: `READY_LOCAL` (Stage 3 Primary Integration).

---

### 2.3 Face Localization Engine — RetinaFace ResNet-50
- **Model Identifier**: `retinaface_resnet50`
- **Exact Architecture**: RetinaFace Single-stage Multi-task Face Localization with ResNet-50 Feature Pyramid Network (FPN) backbone, context modules, and cascade bounding box / 5-point landmark regression heads.
- **Intended Detection Task**: Precise spatial face detection, boundary coordinates, and 5-point geometric facial landmarks (`right_eye`, `left_eye`, `nose`, `mouth_right`, `mouth_left`).
- **Official Repository**: `https://github.com/serengil/retinaface` (`C:\Projects\SafeHER\SafeHER-Research\retinaface`)
- **Inference Implementation Path**: `backend/ai/face_detection.py`
- **Checkpoint Source**: Official serengil/deepface_models v1.0 release: `https://github.com/serengil/deepface_models/releases/download/v1.0/retinaface.pth`.
- **Checkpoint Filename**: `retinaface.pth`
- **Download Size**: 118,142,391 bytes (112.66 MB)
- **Checkpoint SHA-256 Digest**: `89a3b1eb5366829ea72e8cd4a935b7131920c65787cef68f19466c2a853ddbf7`
- **Framework**: PyTorch (`torch 2.5.1+cpu`) via `DEEPFACE_BACKEND_ENGINE=pytorch`.
- **Code & Checkpoint License**: MIT License
- **Integration Status**: `READY_LOCAL` (Operational since Stage 2).

---

### 2.4 Candidate Model B Alternative — DeepfakeBench EfficientNet-B4
- **Model Identifier**: `deepfakebench_ff_effnb4`
- **Architecture**: EfficientNet-B4 compound-scaled convolutional network.
- **Official Checkpoint Source**: `https://github.com/SCLBD/DeepfakeBench/releases/download/v1.0.1/effnb4_best.pth` (70.9 MB).
- **Integration Status**: `OFFICIALLY_DOWNLOADABLE` (Available secondary classifier).

---

### 2.5 Alternative Localization & Tampering — ForensicHub TruFor / Cat-Net
- **Model Identifier**: `forensichub_trufor`
- **Intended Task**: Pixel-level splicing, copy-move, and manipulation heatmaps.
- **Official Repository**: `C:\Projects\SafeHER\SafeHER-Research\ForensicHub`
- **Integration Status**: `OFFICIALLY_DOWNLOADABLE` (Candidate for post-Stage 3 spatial tampering analysis).

---

## 3. Checkpoint Classification Summary Matrix

| Model Identifier | Primary Task | Checkpoint Status | Checkpoint Size | License |
| :--- | :--- | :--- | :--- | :--- |
| `effort_clip_l14_genimage` | Model A: AI-Generated Image (AIGI) | `READY_LOCAL` | 1.21 GB | CC BY-NC 4.0 |
| `deepfakebench_ff_xception` | Model B: Facial Deepfake Classification | `READY_LOCAL` | 83.7 MB | CC BY-NC 4.0 |
| `retinaface_resnet50` | Face Localization & Landmarks | `READY_LOCAL` | 112.66 MB | MIT |
| `deepfakebench_ff_effnb4` | Model B Alternative (EfficientNet-B4) | `OFFICIALLY_DOWNLOADABLE` | 70.9 MB | CC BY-NC 4.0 |
| `c2pa_rs_engine` | Cryptographic Content Credentials | `READY_LOCAL` | Native PyPI wheel | MIT / Apache-2.0 |
| `google/muril-base-cased` | Indic Multilingual Harassment NLP | `OFFICIALLY_DOWNLOADABLE` | ~450 MB | Apache-2.0 |
