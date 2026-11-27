# SafeHER Stage 2: RetinaFace Implementation Report
## Pretrained Facial Detection, Localization & Landmark Extraction

## 1. Model Overview & Checkpoint Provenance

- **Architecture**: RetinaFace Deep Face Detector (ResNet-50 Backbone)
- **Framework**: PyTorch (`torch 2.5.1+cpu`)
- **Backend Configuration**: `DEEPFACE_BACKEND_ENGINE=pytorch`
- **Checkpoint Location**: `C:\Users\Bindudhara D\.deepface\weights\retinaface.pth`
- **Checkpoint Size**: 118,142,391 bytes (112.66 MB)
- **SHA-256 Digest**: `89a3b1eb5366829ea72e8cd4a935b7131920c65787cef68f19466c2a853ddbf7`
- **Provenance Source**: Serengil deepface_models release v1.0 (`https://github.com/serengil/deepface_models/releases/download/v1.0/retinaface.pth`)
- **License**: MIT License

SafeHER uses authentic pretrained weights without fine-tuning, training, or modification.

---

## 2. Detection Pipeline & Coordinate Normalization

RetinaFace is wrapped in `backend/ai/face_detection.py` with singleton model caching to ensure low latency and resource efficiency.

### 2.1 Input Preprocessing
- Accepts raw image bytes (`io.BytesIO`), PIL Images, or OpenCV BGR numpy arrays.
- Automatic EXIF orientation normalization so rotated smartphone evidence is accurately processed.
- No arbitrary downsampling that destroys fine facial landmarks.

### 2.2 Output Schema
Each detected face is structured into a validated dictionary schema:
```json
{
  "face_id": 1,
  "confidence": 0.9995,
  "box": {
    "x1": 52,
    "y1": 41,
    "x2": 189,
    "y2": 215,
    "width": 137,
    "height": 174
  },
  "landmarks": {
    "right_eye": [82, 102],
    "left_eye": [146, 105],
    "nose": [112, 145],
    "mouth_right": [88, 178],
    "mouth_left": [140, 180]
  },
  "aligned_crop_size": [256, 256],
  "context_padding_pct": 15.0
}
```

### 2.3 Boundary Clamping
To prevent rendering glitches or out-of-bounds slicing exceptions:
- Coordinates `[x1, y1, x2, y2]` are clamped: `0 <= x1 < x2 <= image_width` and `0 <= y1 < y2 <= image_height`.
- 15% context padding is computed defensively with boundary assertions.

---

## 3. Evaluation on Authentic Datasets

Evaluation was conducted against authentic reference images from `SafeHER-Research/retinaface/tests/dataset`:

### 3.1 Multi-Face Localization (`couple.jpg`)
- **Ground Truth**: 2 persons standing side-by-side.
- **RetinaFace Output**:
  - `face_count`: 2
  - Face 1 Confidence: `0.9993`
  - Face 2 Confidence: `0.9995`
  - All 5 facial landmarks localized cleanly for both subjects.
  - Aligned crops generated successfully.

### 3.2 Zero-Face Handling
- Evaluated against a synthetic plain background without human faces.
- **Output**:
  - `face_count`: 0
  - `faces`: `[]`
  - Graceful exit with zero errors or false positive detections.

### 3.3 Extreme Aspect Ratio & Resolution Invariance
- Evaluated against high-resolution and narrow images.
- Detected bounding boxes remained strictly proportional and clamped.

---

## 4. Performance & Resource Benchmarks

| Metric | Measured Value (CPU: Intel i7 / 16GB RAM) |
| :--- | :--- |
| Checkpoint Cold Load Time | ~1.20 seconds (one-time singleton init) |
| Warm Inference Latency (Single Face) | 0.28 – 0.38 seconds |
| Warm Inference Latency (Multi-Face) | 0.35 – 0.45 seconds |
| Peak RAM Overhead | ~280 MB during model residency |
| GPU Acceleration Support | Automatic if CUDA/MPS is present (`torch.cuda.is_available()`) |

---

## 5. Scope Boundaries: Detection vs. Deepfake Classification

RetinaFace is strictly a **facial detection and alignment engine**.
- It provides:
  - Spatial coordinates of human faces in evidence media.
  - Geometric eye, nose, and mouth anchor points.
  - High-precision crops prepared for downstream deepfake classifiers.
- It does **NOT**:
  - Classify images as "deepfakes" or "authentic".
  - Produce deepfake manipulation probability scores.
  - Replace frequency-domain or temporal deepfake classifiers (DeepfakeBench / Effort-AIGI).

By establishing this clear separation of concerns, SafeHER ensures legal defensibility and technical integrity for survivor evidence.
