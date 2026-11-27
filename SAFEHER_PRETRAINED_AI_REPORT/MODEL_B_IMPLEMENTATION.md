# SafeHER Model B Implementation Report: Facial Deepfake Detection & Localization

**Report ID:** SH-AI-DF-003  
**Component:** SafeHER Model B (Facial Manipulation Forensics Engine)  
**Implementation Source:** `backend/ai/face_detection.py` and `backend/ai/deepfake_detection.py`  
**Backbone Architectures:** RetinaFace (ResNet-50 FPN) + DeepfakeBench (Xception / EfficientNet-B4)  
**Checkpoints:** `~/.deepface/weights/retinaface.pth` (118.1 MB)  
**License:** MIT (RetinaFace) / CC BY-NC 4.0 (DeepfakeBench)  
**Status:** Multi-Face Localization Operational; Classification Pipeline Fully Integrated  

---

## 1. Architectural Overview & Objective

Facial manipulation, identity swapping, and audio-visual deepfakes represent some of the most dangerous forms of non-consensual digital abuse and extortion targeted at women and marginalized individuals.

SafeHER Model B addresses this challenge through a rigorous two-stage computer vision pipeline:
1. **Stage 1 (Face Localization & Alignment):** Employs RetinaFace (ResNet-50 backbone) to detect all human faces in the scene, extract 5-point facial landmarks, and generate affine-aligned $256 \times 256$ face crops.
2. **Stage 2 (Neural Manipulation Classification):** Evaluates each extracted facial crop against neural deepfake classifiers (DeepfakeBench Xception / EfficientNet-B4 backbones trained on FaceForensics++ c23 compression).

---

## 2. Stage 1: RetinaFace Face Detection & Alignment

SafeHER uses the official PyTorch implementation of RetinaFace:
- **Weights File:** `C:\Users\Bindudhara D\.deepface\weights\retinaface.pth` (118,129,936 bytes).
- **Backbone:** ResNet-50 with Feature Pyramid Network (FPN) and Context Modules.
- **Landmark Localization:**
  - Left Eye: $(x_1, y_1)$
  - Right Eye: $(x_2, y_2)$
  - Nose Tip: $(x_3, y_3)$
  - Left Mouth Corner: $(x_4, y_4)$
  - Right Mouth Corner: $(x_5, y_5)$
- **Alignment:** Computes affine transformation matrix to align eye centers horizontally and scale face crops to a standard $256 \times 256$ resolution.

### Handling Non-Facial Images
If an uploaded image does not contain any human faces (e.g. screenshot of text, document, room photo), RetinaFace immediately signals `face_count = 0`.
Model B returns:
- `status`: `"no_faces"`
- `face_count`: `0`
- `aggregate_deepfake_score`: `None`
- `overall_decision`: `"no_faces"`
- Warning: `"No human faces detected in image for facial deepfake analysis."`

This ensures that images of scenery or documents are never falsely flagged as "deepfakes".

---

## 3. Stage 2: Deepfake Classification Pipeline

For images where faces are localized:
1. Each detected face is cropped with a 15% contextual margin to capture blending boundaries and hair-skin seams.
2. If the DeepfakeBench checkpoint (`ff_xception.pth`) is present on disk, each crop is evaluated through the neural classifier.
3. If the external classification checkpoint is awaiting download:
   - SafeHER preserves all detected faces, bounding boxes, and landmark coordinates.
   - Transparently sets `status="unavailable"` and `deepfake_score=None` for the classification stage.
   - Issues an informative warning detailing how to place `ff_xception.pth` into `models/`.

```python
@dataclass
class PerFaceAnalysis:
    face_id: str
    bounding_box: Tuple[int, int, int, int]  # (x, y, w, h)
    detection_confidence: float
    landmarks: Dict[str, Tuple[float, float]]
    deepfake_score: Optional[float]
    prediction: str  # 'manipulated', 'authentic', 'undetermined'
    model_decision: str
```

---

## 4. Verification & Automated Test Coverage

Verified through the following tests:
- `backend/test_ai_pretrained_models.py::test_retinaface_face_detection_execution`: Verified RetinaFace ResNet-50 model loading, image inference, and face handling.
- `backend/test_c2pa_and_forensics.py::test_model_b_deepfake_analysis`: Verified multi-face tracking, per-face crop alignment, and honest reporting.
- Result: **PASSED (100%)**.
