# SafeHER Model B Implementation Report: DeepfakeBench Xception + RetinaFace
**Module:** `backend/ai/models/model_b.py`  
**Task:** Genuine Facial Deepfake & Manipulation Detection with Face Localization  
**Benchmark:** DeepfakeBench / FaceForensics++ (c23 compression benchmark)  
**Face Localization Backbone:** Stage 2 RetinaFace-ResNet50 (`ai.face_detection.detect_faces`)  
**Manipulation Classifier Backbone:** DeepfakeBench Xception (36 separable conv layers + `adjust_channel` adapter)  
**Checkpoint:** `xception_best.pth` (87,763,531 bytes, SHA-256: `dd61186f9ac8e99aae85982cae338b555dfaeef042f6b699e5a55cae3998ba47`)  

---

## 1. Architectural Design & Pipeline

Deepfake detection in SafeHER follows a multi-stage computer vision pipeline designed to eliminate false positives caused by non-facial visual artifacts (background scenery, compression noise, metadata).

### 1.1 Multi-Stage Pipeline Architecture

```
[ Ingested Image Buffer (Decrypted In-Memory) ]
                       │
                       ▼
            [ Stage 2: RetinaFace ]
  ResNet-50 + Feature Pyramid Network (FPN)
  - Detects N human faces
  - Clamps bounding boxes: [x1, y1, x2, y2]
  - Extracts 5 facial landmarks (eyes, nose, mouth corners)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ If N == 0 Faces ]          [ If N >= 1 Faces ]
Status: no_faces_detected            │
Score: 0.0 (safe)                    ▼
                            For each detected face:
                            1. Apply 15% context expansion padding
                            2. Crop face region defensively
                            3. Resize to 256x256
                            4. Normalize: (x - 0.5) / 0.5 -> [-1, 1]
                                     │
                                     ▼
                          [ DeepfakeBench Xception ]
                          - 36 Separable Conv layers
                          - adjust_channel Conv2d(2048 -> 512)
                          - Global Average Pooling -> 512
                          - Linear(512 -> 2)
                                     │
                                     ▼
                          [ Calibrated Probabilities ]
                          - Index 0: Authentic Face
                          - Index 1: Manipulated / Deepfake Face
                                     │
                                     ▼
                       [ Peak Manipulation Synthesis ]
                       max_manipulation_score = max(face_scores)
```

---

## 2. DeepfakeBench Xception Architecture Details

The Xception architecture implemented in `backend/ai/models/model_b.py` comprises three sequential processing flows:
1. **Entry Flow:**
   - Conv2d(3 -> 32, k=3, s=2), Conv2d(32 -> 64, k=3, s=1)
   - 3 Residual blocks with SeparableConv2d and MaxPooling(k=3, s=2)
   - Channel transitions: 64 -> 128 -> 256 -> 728
2. **Middle Flow:**
   - 8 Repeated Residual blocks (728 channels) with 3 SeparableConv2d layers each.
3. **Exit Flow:**
   - Residual block with SeparableConv2d (728 -> 728 -> 1024) + MaxPooling(3, 2).
   - SeparableConv2d(1024 -> 1536), SeparableConv2d(1536 -> 2048).
4. **Channel Adapter & Classification Head:**
   - In standard DeepfakeBench, a feature adapter bridges the 2048 feature map:
     $$\text{adjust\_channel} = \text{Conv2d}(2048 \to 512, 1 \times 1) \to \text{BatchNorm2d}(512) \to \text{ReLU}()$$
   - Followed by AdaptiveAvgPool2d((1, 1)) and Linear(512, 2).

All 283 parameters in `models/xception_best.pth` match 100% with `strict=True`.

---

## 3. Context Expansion Padding Rationale

Many deepfake synthesis tools (DeepFaceLab, SimSwap, Roop, FaceShifter) exhibit boundary blending artifacts along the jawline, forehead hairline, and neck margins. Cropping strictly at the face bounding box removes these boundary artifacts, reducing detection accuracy.

SafeHER applies a **15% context expansion padding** along each dimension:
$$pad_x = 0.15 \times (x_2 - x_1), \quad pad_y = 0.15 \times (y_2 - y_1)$$
$$crop = [ \max(0, x_1 - pad_x), \max(0, y_1 - pad_y), \min(W, x_2 + pad_x), \min(H, y_2 + pad_y) ]$$

---

## 4. Structured Output Contract

```json
{
  "model_id": "deepfakebench_ff_xception",
  "model_name": "DeepfakeBench-Xception",
  "model_version": "1.0.0",
  "checkpoint_id": "xception_best.pth",
  "checkpoint_hash": "dd61186f9ac8e99aae85982cae338b555dfaeef042f6b699e5a55cae3998ba47",
  "face_count": 2,
  "max_manipulation_score": 0.2592,
  "overall_prediction": "authentic",
  "processing_time_ms": 2810.5,
  "device": "cpu",
  "analysis_status": "completed",
  "faces": [
    {
      "face_id": 1,
      "face_bounding_box": {"x1": 53, "y1": 66, "x2": 157, "y2": 204, "width": 104, "height": 138},
      "landmarks": {
        "right_eye": [82, 110],
        "left_eye": [128, 112],
        "nose": [105, 142],
        "mouth_right": [86, 168],
        "mouth_left": [124, 170]
      },
      "prediction": "authentic",
      "manipulation_score": 0.1604,
      "authentic_face_score": 0.8396,
      "raw_logits": [1.6552, 0.0000]
    },
    {
      "face_id": 2,
      "face_bounding_box": {"x1": 156, "y1": 98, "x2": 248, "y2": 218, "width": 92, "height": 120},
      "landmarks": {
        "right_eye": [178, 137],
        "left_eye": [217, 136],
        "nose": [198, 163],
        "mouth_right": [182, 186],
        "mouth_left": [216, 185]
      },
      "prediction": "authentic",
      "manipulation_score": 0.2592,
      "authentic_face_score": 0.7408,
      "raw_logits": [1.0498, 0.0000]
    }
  ],
  "warnings": [
    "Per-face manipulation detection evaluated under CC BY-NC 4.0 research terms.",
    "Predictions reflect FaceForensics++ benchmark domain calibration."
  ]
}
```
